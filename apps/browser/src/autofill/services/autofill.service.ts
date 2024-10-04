import { filter, firstValueFrom, Observable, scan, startWith } from "rxjs";
import { pairwise } from "rxjs/operators";

import { EventCollectionService } from "@bitwarden/common/abstractions/event/event-collection.service";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { AuthService } from "@bitwarden/common/auth/abstractions/auth.service";
import { UserVerificationService } from "@bitwarden/common/auth/abstractions/user-verification/user-verification.service.abstraction";
import { AuthenticationStatus } from "@bitwarden/common/auth/enums/authentication-status";
import { AutofillOverlayVisibility } from "@bitwarden/common/autofill/constants";
import { AutofillSettingsServiceAbstraction } from "@bitwarden/common/autofill/services/autofill-settings.service";
import { DomainSettingsService } from "@bitwarden/common/autofill/services/domain-settings.service";
import { InlineMenuVisibilitySetting } from "@bitwarden/common/autofill/types";
import { BillingAccountProfileStateService } from "@bitwarden/common/billing/abstractions/account/billing-account-profile-state.service";
import { EventType } from "@bitwarden/common/enums";
import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import {
  UriMatchStrategySetting,
  UriMatchStrategy,
} from "@bitwarden/common/models/domain/domain-service";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { MessageListener } from "@bitwarden/common/platform/messaging";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { TotpService } from "@bitwarden/common/vault/abstractions/totp.service";
import { FieldType, CipherType } from "@bitwarden/common/vault/enums";
import { CipherRepromptType } from "@bitwarden/common/vault/enums/cipher-reprompt-type";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { FieldView } from "@bitwarden/common/vault/models/view/field.view";
import { IdentityView } from "@bitwarden/common/vault/models/view/identity.view";

import { BrowserApi } from "../../platform/browser/browser-api";
import { ScriptInjectorService } from "../../platform/services/abstractions/script-injector.service";
import { openVaultItemPasswordRepromptPopout } from "../../vault/popup/utils/vault-popout-window";
import { AutofillMessageCommand, AutofillMessageSender } from "../enums/autofill-message.enums";
import { AutofillPort } from "../enums/autofill-port.enum";
import AutofillField from "../models/autofill-field";
import AutofillPageDetails from "../models/autofill-page-details";
import AutofillScript from "../models/autofill-script";

import {
  AutoFillOptions,
  AutofillService as AutofillServiceInterface,
  COLLECT_PAGE_DETAILS_RESPONSE_COMMAND,
  FormData,
  GenerateFillScriptOptions,
  PageDetail,
} from "./abstractions/autofill.service";
import {
  AutoFillConstants,
  ContactAutoFillConstants,
  CreditCardAutoFillConstants,
  IdentityAutoFillConstants,
  PaperAutoFillConstants,
} from "./autofill-constants";

/* start Cozy imports */
/* eslint-disable */
import { CozyClientService } from "src/popup/services/cozyClient.service";
import { generateIdentityViewFromContactId } from "../../../../../libs/cozy/contact.helper";
import { getCozyValue } from "../../../../../libs/cozy/getCozyValue";
/* eslint-enable */
/* end Cozy imports */

export default class AutofillService implements AutofillServiceInterface {
  private openVaultItemPasswordRepromptPopout = openVaultItemPasswordRepromptPopout;
  private openPasswordRepromptPopoutDebounce: number | NodeJS.Timeout;
  private currentlyOpeningPasswordRepromptPopout = false;
  private autofillScriptPortsSet = new Set<chrome.runtime.Port>();
  static searchFieldNamesSet = new Set(AutoFillConstants.SearchFieldNames);

  constructor(
    private cipherService: CipherService,
    private autofillSettingsService: AutofillSettingsServiceAbstraction,
    private totpService: TotpService,
    private eventCollectionService: EventCollectionService,
    private logService: LogService,
    private domainSettingsService: DomainSettingsService,
    private userVerificationService: UserVerificationService,
    private billingAccountProfileStateService: BillingAccountProfileStateService,
    private scriptInjectorService: ScriptInjectorService,
    private accountService: AccountService,
    private authService: AuthService,
    private configService: ConfigService,
    private messageListener: MessageListener,
    private cozyClientService: CozyClientService,
  ) {}

  /**
   * Collects page details from the specific tab. This method returns an observable that can
   * be subscribed to in order to build the results from all collectPageDetailsResponse
   * messages from the given tab.
   *
   * @param tab The tab to collect page details from
   */
  collectPageDetailsFromTab$(tab: chrome.tabs.Tab): Observable<PageDetail[]> {
    const pageDetailsFromTab$ = this.messageListener
      .messages$(COLLECT_PAGE_DETAILS_RESPONSE_COMMAND)
      .pipe(
        filter(
          (message) =>
            message.tab.id === tab.id &&
            message.sender === AutofillMessageSender.collectPageDetailsFromTabObservable,
        ),
        scan(
          (acc, message) => [
            ...acc,
            {
              frameId: message.webExtSender.frameId,
              tab: message.tab,
              details: message.details,
            },
          ],
          [] as PageDetail[],
        ),
      );

    void BrowserApi.tabSendMessage(tab, {
      tab: tab,
      command: AutofillMessageCommand.collectPageDetails,
      sender: AutofillMessageSender.collectPageDetailsFromTabObservable,
    });

    return pageDetailsFromTab$;
  }

  /**
   * Triggers on installation of the extension Handles injecting
   * content scripts into all tabs that are currently open, and
   * sets up a listener to ensure content scripts can identify
   * if the extension context has been disconnected.
   */
  async loadAutofillScriptsOnInstall() {
    BrowserApi.addListener(chrome.runtime.onConnect, this.handleInjectedScriptPortConnection);
    void this.injectAutofillScriptsInAllTabs();
    this.autofillSettingsService.inlineMenuVisibility$
      .pipe(startWith(undefined), pairwise())
      .subscribe(([previousSetting, currentSetting]) =>
        this.handleInlineMenuVisibilityChange(previousSetting, currentSetting),
      );
  }

  /**
   * Triggers a complete reload of all autofill scripts on tabs open within
   * the user's browsing session. This is done by first disconnecting all
   * existing autofill content script ports, which cleans up existing object
   * instances, and then re-injecting the autofill scripts into all tabs.
   */
  async reloadAutofillScripts() {
    this.autofillScriptPortsSet.forEach((port) => {
      port.disconnect();
      this.autofillScriptPortsSet.delete(port);
    });

    // FIXME: Verify that this floating promise is intentional. If it is, add an explanatory comment and ensure there is proper error handling.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.injectAutofillScriptsInAllTabs();
  }

  /**
   * Injects the autofill scripts into the current tab and all frames
   * found within the tab. Temporarily, will conditionally inject
   * the refactor of the core autofill script if the feature flag
   * is enabled.
   * @param {chrome.tabs.Tab} tab
   * @param {number} frameId
   * @param {boolean} triggeringOnPageLoad
   */
  async injectAutofillScripts(
    tab: chrome.tabs.Tab,
    frameId = 0,
    triggeringOnPageLoad = true,
  ): Promise<void> {
    // Autofill user settings loaded from state can await the active account state indefinitely
    // if not guarded by an active account check (e.g. the user is logged in)
    const activeAccount = await firstValueFrom(this.accountService.activeAccount$);
    const authStatus = await firstValueFrom(this.authService.activeAccountStatus$);
    const accountIsUnlocked = authStatus === AuthenticationStatus.Unlocked;
    let inlineMenuVisibility: InlineMenuVisibilitySetting = AutofillOverlayVisibility.Off;
    let autoFillOnPageLoadIsEnabled = false;

    if (activeAccount) {
      inlineMenuVisibility = await this.getInlineMenuVisibility();
    }

    let mainAutofillScript = "bootstrap-autofill.js";

    if (inlineMenuVisibility) {
      const inlineMenuPositioningImprovements = await this.configService.getFeatureFlag(
        FeatureFlag.InlineMenuPositioningImprovements,
      );
      mainAutofillScript = inlineMenuPositioningImprovements
        ? "bootstrap-autofill-overlay.js"
        : "bootstrap-legacy-autofill-overlay.js";
    }

    const injectedScripts = [mainAutofillScript];

    if (activeAccount && accountIsUnlocked) {
      autoFillOnPageLoadIsEnabled = await this.getAutofillOnPageLoad();
    }

    if (triggeringOnPageLoad && autoFillOnPageLoadIsEnabled) {
      injectedScripts.push("autofiller.js");
    }

    if (!triggeringOnPageLoad) {
      await this.scriptInjectorService.inject({
        tabId: tab.id,
        injectDetails: { file: "content/content-message-handler.js", runAt: "document_start" },
      });
    }

    injectedScripts.push("notificationBar.js", "contextMenuHandler.js");

    for (const injectedScript of injectedScripts) {
      await this.scriptInjectorService.inject({
        tabId: tab.id,
        injectDetails: {
          file: `content/${injectedScript}`,
          runAt: "document_start",
          frame: frameId,
        },
      });
    }
  }

  /**
   * Gets all forms with password fields and formats the data
   * for both forms and password input elements.
   * @param {AutofillPageDetails} pageDetails
   * @returns {FormData[]}
   */
  getFormsWithPasswordFields(pageDetails: AutofillPageDetails): FormData[] {
    const formData: FormData[] = [];

    const passwordFields = AutofillService.loadPasswordFields(pageDetails, true, true, false, true);

    // TODO: this logic prevents multi-step account creation forms (that just start with email)
    // from being passed on to the notification bar content script - even if autofill-init.js found the form and email field.
    // ex: https://signup.live.com/
    if (passwordFields.length === 0) {
      return formData;
    }

    // Back up check for cases where there are several password fields detected,
    // but they are not all part of the form b/c of bad HTML

    // gather password fields that don't have an enclosing form
    const passwordFieldsWithoutForm = passwordFields.filter((pf) => pf.form === undefined);
    const formKeys = Object.keys(pageDetails.forms);
    const formCount = formKeys.length;

    // if we have 3 password fields and only 1 form, and there are password fields that are not within a form
    // but there is at least one password field within the form, then most likely this is a poorly built password change form
    if (passwordFields.length === 3 && formCount == 1 && passwordFieldsWithoutForm.length > 0) {
      // Only one form so get the singular form key
      const soloFormKey = formKeys[0];

      const atLeastOnePasswordFieldWithinSoloForm =
        passwordFields.filter((pf) => pf.form !== null && pf.form === soloFormKey).length > 0;

      if (atLeastOnePasswordFieldWithinSoloForm) {
        // We have a form with at least one password field,
        // so let's make an assumption that the password fields without a form are actually part of this form
        passwordFieldsWithoutForm.forEach((pf) => {
          pf.form = soloFormKey;
        });
      }
    }

    for (const formKey in pageDetails.forms) {
      // eslint-disable-next-line
      if (!pageDetails.forms.hasOwnProperty(formKey)) {
        continue;
      }

      const formPasswordFields = passwordFields.filter((pf) => formKey === pf.form);
      if (formPasswordFields.length > 0) {
        let uf = this.findUsernameField(pageDetails, formPasswordFields[0], false, false, false);
        if (uf == null) {
          // not able to find any viewable username fields. maybe there are some "hidden" ones?
          uf = this.findUsernameField(pageDetails, formPasswordFields[0], true, true, false);
        }
        formData.push({
          form: pageDetails.forms[formKey],
          password: formPasswordFields[0],
          username: uf,
          passwords: formPasswordFields,
        });
      }
    }

    return formData;
  }

  /**
   * Gets the overlay's visibility setting from the autofill settings service.
   */
  async getInlineMenuVisibility(): Promise<InlineMenuVisibilitySetting> {
    return await firstValueFrom(this.autofillSettingsService.inlineMenuVisibility$);
  }

  /**
   * Gets the setting for automatically copying TOTP upon autofill from the autofill settings service.
   */
  async getShouldAutoCopyTotp(): Promise<boolean> {
    return await firstValueFrom(this.autofillSettingsService.autoCopyTotp$);
  }

  /**
   * Gets the autofill on page load setting from the autofill settings service.
   */
  async getAutofillOnPageLoad(): Promise<boolean> {
    return await firstValueFrom(this.autofillSettingsService.autofillOnPageLoad$);
  }

  /**
   * Gets the default URI match strategy setting from the domain settings service.
   */
  async getDefaultUriMatchStrategy(): Promise<UriMatchStrategySetting> {
    return await firstValueFrom(this.domainSettingsService.defaultUriMatchStrategy$);
  }

  /**
   * Autofill a given tab with a given login item
   * @param {AutoFillOptions} options Instructions about the autofill operation, including tab and login item
   * @returns {Promise<string | null>} The TOTP code of the successfully autofilled login, if any
   */
  async doAutoFill(options: AutoFillOptions): Promise<string | null> {
    const tab = options.tab;
    if (!tab || !options.cipher || !options.pageDetails || !options.pageDetails.length) {
      throw new Error("Nothing to autofill.");
    }

    let totp: string | null = null;

    const canAccessPremium = await firstValueFrom(
      this.billingAccountProfileStateService.hasPremiumFromAnySource$,
    );
    const defaultUriMatch = await this.getDefaultUriMatchStrategy();

    if (!canAccessPremium) {
      options.cipher.login.totp = null;
    }

    let didAutofill = false;
    await Promise.all(
      options.pageDetails.map(async (pd) => {
        // make sure we're still on correct tab
        if (pd.tab.id !== tab.id || pd.tab.url !== tab.url) {
          return;
        }

        const fillScript = await this.generateFillScript(pd.details, {
          skipUsernameOnlyFill: options.skipUsernameOnlyFill || false,
          onlyEmptyFields: options.onlyEmptyFields || false,
          onlyVisibleFields: options.onlyVisibleFields || false,
          fillNewPassword: options.fillNewPassword || false,
          allowTotpAutofill: options.allowTotpAutofill || false,
          cipher: options.cipher,
          tabUrl: tab.url,
          defaultUriMatch: defaultUriMatch,
          cozyAutofillOptions: options.cozyAutofillOptions, // Cozy customization
        });

        if (!fillScript || !fillScript.script || !fillScript.script.length) {
          return;
        }

        if (
          fillScript.untrustedIframe &&
          options.allowUntrustedIframe != undefined &&
          !options.allowUntrustedIframe
        ) {
          this.logService.info("Autofill on page load was blocked due to an untrusted iframe.");
          return;
        }

        // Add a small delay between operations
        fillScript.properties.delay_between_operations = 20;

        didAutofill = true;
        if (!options.skipLastUsed) {
          // FIXME: Verify that this floating promise is intentional. If it is, add an explanatory comment and ensure there is proper error handling.
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.cipherService.updateLastUsedDate(options.cipher.id);
        }

        // FIXME: Verify that this floating promise is intentional. If it is, add an explanatory comment and ensure there is proper error handling.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        BrowserApi.tabSendMessage(
          tab,
          {
            command: "fillForm",
            fillScript: fillScript,
            url: tab.url,
            pageDetailsUrl: pd.details.url,
          },
          { frameId: pd.frameId },
        );

        // Skip getting the TOTP code for clipboard in these cases
        if (
          options.cipher.type !== CipherType.Login ||
          totp !== null ||
          !options.cipher.login.totp ||
          (!canAccessPremium && !options.cipher.organizationUseTotp)
        ) {
          return;
        }

        const shouldAutoCopyTotp = await this.getShouldAutoCopyTotp();

        totp = shouldAutoCopyTotp
          ? await this.totpService.getCode(options.cipher.login.totp)
          : null;
      }),
    );

    if (didAutofill) {
      // FIXME: Verify that this floating promise is intentional. If it is, add an explanatory comment and ensure there is proper error handling.
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.eventCollectionService.collect(EventType.Cipher_ClientAutofilled, options.cipher.id);
      if (totp !== null) {
        return totp;
      } else {
        return null;
      }
    } else {
      throw new Error("Did not autofill.");
    }
  }

  /**
   * Autofill the specified tab with the next login item from the cache
   * @param {PageDetail[]} pageDetails The data scraped from the page
   * @param {chrome.tabs.Tab} tab The tab to be autofilled
   * @param {boolean} fromCommand Whether the autofill is triggered by a keyboard shortcut (`true`) or autofill on page load (`false`)
   * @returns {Promise<string | null>} The TOTP code of the successfully autofilled login, if any
   */
  async doAutoFillOnTab(
    pageDetails: PageDetail[],
    tab: chrome.tabs.Tab,
    fromCommand: boolean,
  ): Promise<string | null> {
    let cipher: CipherView;
    if (fromCommand) {
      cipher = await this.cipherService.getNextCipherForUrl(tab.url);
    } else {
      const lastLaunchedCipher = await this.cipherService.getLastLaunchedForUrl(tab.url, true);
      if (
        lastLaunchedCipher &&
        Date.now().valueOf() - lastLaunchedCipher.localData?.lastLaunched?.valueOf() < 30000
      ) {
        cipher = lastLaunchedCipher;
      } else {
        cipher = await this.cipherService.getLastUsedForUrl(tab.url, true);
      }
    }

    if (cipher == null || (cipher.reprompt === CipherRepromptType.Password && !fromCommand)) {
      return null;
    }

    if (await this.isPasswordRepromptRequired(cipher, tab)) {
      if (fromCommand) {
        this.cipherService.updateLastUsedIndexForUrl(tab.url);
      }

      return null;
    }

    const totpCode = await this.doAutoFill({
      tab: tab,
      cipher: cipher,
      pageDetails: pageDetails,
      skipLastUsed: !fromCommand,
      skipUsernameOnlyFill: !fromCommand,
      onlyEmptyFields: !fromCommand,
      onlyVisibleFields: !fromCommand,
      fillNewPassword: fromCommand,
      allowUntrustedIframe: fromCommand,
      allowTotpAutofill: fromCommand,
    });

    // Update last used index as autofill has succeeded
    if (fromCommand) {
      this.cipherService.updateLastUsedIndexForUrl(tab.url);
    }

    return totpCode;
  }

  /**
   * Checks if the cipher requires password reprompt and opens the password reprompt popout if necessary.
   *
   * @param cipher - The cipher to autofill
   * @param tab - The tab to autofill
   */
  async isPasswordRepromptRequired(cipher: CipherView, tab: chrome.tabs.Tab): Promise<boolean> {
    const userHasMasterPasswordAndKeyHash =
      await this.userVerificationService.hasMasterPasswordAndMasterKeyHash();
    if (cipher.reprompt === CipherRepromptType.Password && userHasMasterPasswordAndKeyHash) {
      if (!this.isDebouncingPasswordRepromptPopout()) {
        await this.openVaultItemPasswordRepromptPopout(tab, {
          cipherId: cipher.id,
          action: "autofill",
        });
      }

      return true;
    }

    return false;
  }

  /**
   * Autofill the active tab with the next cipher from the cache
   * @param {PageDetail[]} pageDetails The data scraped from the page
   * @param {boolean} fromCommand Whether the autofill is triggered by a keyboard shortcut (`true`) or autofill on page load (`false`)
   * @returns {Promise<string | null>} The TOTP code of the successfully autofilled login, if any
   */
  async doAutoFillActiveTab(
    pageDetails: PageDetail[],
    fromCommand: boolean,
    cipherType?: CipherType,
  ): Promise<string | null> {
    if (!pageDetails[0]?.details?.fields?.length) {
      return null;
    }

    const tab = await this.getActiveTab();

    if (!tab || !tab.url) {
      return null;
    }

    if (!cipherType || cipherType === CipherType.Login) {
      return await this.doAutoFillOnTab(pageDetails, tab, fromCommand);
    }

    let cipher: CipherView;
    let cacheKey = "";

    if (cipherType === CipherType.Card) {
      cacheKey = "cardCiphers";
      cipher = await this.cipherService.getNextCardCipher();
    } else {
      cacheKey = "identityCiphers";
      cipher = await this.cipherService.getNextIdentityCipher();
    }

    if (!cipher || !cacheKey || (cipher.reprompt === CipherRepromptType.Password && !fromCommand)) {
      return null;
    }

    if (await this.isPasswordRepromptRequired(cipher, tab)) {
      if (fromCommand) {
        this.cipherService.updateLastUsedIndexForUrl(cacheKey);
      }

      return null;
    }

    const totpCode = await this.doAutoFill({
      tab: tab,
      cipher: cipher,
      pageDetails: pageDetails,
      skipLastUsed: !fromCommand,
      skipUsernameOnlyFill: !fromCommand,
      onlyEmptyFields: !fromCommand,
      onlyVisibleFields: !fromCommand,
      fillNewPassword: false,
      allowUntrustedIframe: fromCommand,
      allowTotpAutofill: false,
    });

    if (fromCommand) {
      this.cipherService.updateLastUsedIndexForUrl(cacheKey);
    }

    return totpCode;
  }

  /**
   * Activates the autofill on page load org policy.
   */
  async setAutoFillOnPageLoadOrgPolicy(): Promise<void> {
    const autofillOnPageLoadOrgPolicy = await firstValueFrom(
      this.autofillSettingsService.activateAutofillOnPageLoadFromPolicy$,
    );

    if (autofillOnPageLoadOrgPolicy) {
      await this.autofillSettingsService.setAutofillOnPageLoad(true);
    }
  }

  /**
   * Gets the active tab from the current window.
   * Throws an error if no tab is found.
   * @returns {Promise<chrome.tabs.Tab>}
   * @private
   */
  private async getActiveTab(): Promise<chrome.tabs.Tab> {
    const tab = await BrowserApi.getTabFromCurrentWindow();
    if (!tab) {
      throw new Error("No tab found.");
    }

    return tab;
  }

  /**
   * Generates the autofill script for the specified page details and cipher.
   * @param {AutofillPageDetails} pageDetails
   * @param {GenerateFillScriptOptions} options
   * @returns {Promise<AutofillScript | null>}
   * @private
   */
  private async generateFillScript(
    pageDetails: AutofillPageDetails,
    options: GenerateFillScriptOptions,
  ): Promise<AutofillScript | null> {
    if (!pageDetails || !options.cipher) {
      return null;
    }

    // Cozy customization; filter fields to autofill

    // Autofill only field by ID
    if (options.cozyAutofillOptions?.fillOnlyThisFieldHtmlID) {
      pageDetails = {
        ...pageDetails,
        fields: pageDetails.fields.filter(
          (field) => field.htmlID === options.cozyAutofillOptions.fillOnlyThisFieldHtmlID,
        ),
      };
    }

    // Autofill only fields by type
    if (options.cozyAutofillOptions?.fillOnlyTheseFieldQualifiers) {
      pageDetails = {
        ...pageDetails,
        fields: pageDetails.fields.filter((field) =>
          options.cozyAutofillOptions.fillOnlyTheseFieldQualifiers.includes(field.fieldQualifier),
        ),
      };
    }
    // Cozy customization end

    let fillScript = new AutofillScript();
    const filledFields: { [id: string]: AutofillField } = {};
    const fields = options.cipher.fields;

    // Cozy customization, skip cipher fields autofill to avoid autofilling two times the same HTML field
    // It can happens because we added every contact data in cipher fields
    //*
    if (fields && fields.length && options.cipher.type !== CipherType.Contact) {
      /*/
    if (fields && fields.length) {
    //*/
      const fieldNames: string[] = [];

      fields.forEach((f) => {
        if (AutofillService.hasValue(f.name)) {
          fieldNames.push(f.name.toLowerCase());
        }
      });

      pageDetails.fields.forEach((field) => {
        // eslint-disable-next-line
        if (filledFields.hasOwnProperty(field.opid)) {
          return;
        }

        if (!field.viewable && field.tagName !== "span") {
          return;
        }

        // Check if the input is an untyped/mistyped search input
        if (AutofillService.isSearchField(field)) {
          return;
        }

        const matchingIndex = this.findMatchingFieldIndex(field, fieldNames);
        if (matchingIndex > -1) {
          const matchingField: FieldView = fields[matchingIndex];
          let val: string;
          if (matchingField.type === FieldType.Linked) {
            // Assumption: Linked Field is not being used to autofill a boolean value
            val = options.cipher.linkedFieldValue(matchingField.linkedId) as string;
          } else {
            val = matchingField.value;
            if (val == null && matchingField.type === FieldType.Boolean) {
              val = "false";
            }
          }

          filledFields[field.opid] = field;
          AutofillService.fillByOpid(fillScript, field, val);
        }
      });
    }

    switch (options.cipher.type) {
      case CipherType.Login:
        fillScript = await this.generateLoginFillScript(
          fillScript,
          pageDetails,
          filledFields,
          options,
        );
        break;
      case CipherType.Card:
        fillScript = this.generateCardFillScript(fillScript, pageDetails, filledFields, options);
        break;
      case CipherType.Identity:
        fillScript = await this.generateIdentityFillScript(
          fillScript,
          pageDetails,
          filledFields,
          options,
        );
        break;
      // Cozy customization
      case CipherType.Paper:
        //  For papers, we only use the custom fields matching
        break;
      case CipherType.Contact:
        // If we have two fields of the same type, for example tel1 and tel2.
        // If we focus on tel2, we ignore tel1 and autofill tel2 and the rest of the form.
        if (options.cozyAutofillOptions?.focusedFieldData) {
          pageDetails = {
            ...pageDetails,
            fields: pageDetails.fields.filter(
              (field) =>
                field.fieldQualifier !==
                  options.cozyAutofillOptions?.focusedFieldData.fieldQualifier || // on garde tous les champs d'un type autre que le champ focus
                field.htmlID === options.cozyAutofillOptions?.focusedFieldData.fieldHtmlID, // par contre pour les champs du meme type que le champ focus, on garde que celui focus
            ),
          };
        }
        // For contacts, we create an IdentityView with the contact content to leverage the generateIdentityFillScript
        try {
          const client = await this.cozyClientService.getClientInstance();

          options.cipher.identity = await generateIdentityViewFromContactId(
            client,
            options.cipher.id,
            pageDetails,
            options.cozyAutofillOptions,
          );
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log("Failed to convert CipherView to IdentityView", e);
        }

        fillScript = await this.generateIdentityFillScript(
          fillScript,
          pageDetails,
          filledFields,
          options,
        );

        fillScript = await this.generateContactAddressFillScript(
          fillScript,
          pageDetails,
          filledFields,
          options,
        );

        fillScript = await this.generatePaperFillScript(
          fillScript,
          pageDetails,
          filledFields,
          options,
        );

        options.cipher.identity = new IdentityView();
        break;
      // Cozy customization end
      default:
        return null;
    }

    return fillScript;
  }

  /**
   * Generates the autofill script for the specified page details and login cipher item.
   * @param {AutofillScript} fillScript
   * @param {AutofillPageDetails} pageDetails
   * @param {{[p: string]: AutofillField}} filledFields
   * @param {GenerateFillScriptOptions} options
   * @returns {Promise<AutofillScript | null>}
   * @private
   */
  private async generateLoginFillScript(
    fillScript: AutofillScript,
    pageDetails: AutofillPageDetails,
    filledFields: { [id: string]: AutofillField },
    options: GenerateFillScriptOptions,
  ): Promise<AutofillScript | null> {
    if (!options.cipher.login) {
      return null;
    }

    const passwords: AutofillField[] = [];
    const usernames: AutofillField[] = [];
    const totps: AutofillField[] = [];
    let pf: AutofillField = null;
    let username: AutofillField = null;
    let totp: AutofillField = null;
    const login = options.cipher.login;
    fillScript.savedUrls =
      login?.uris?.filter((u) => u.match != UriMatchStrategy.Never).map((u) => u.uri) ?? [];

    fillScript.untrustedIframe = await this.inUntrustedIframe(pageDetails.url, options);

    let passwordFields = AutofillService.loadPasswordFields(
      pageDetails,
      false,
      false,
      options.onlyEmptyFields,
      options.fillNewPassword,
    );
    if (!passwordFields.length && !options.onlyVisibleFields) {
      // not able to find any viewable password fields. maybe there are some "hidden" ones?
      passwordFields = AutofillService.loadPasswordFields(
        pageDetails,
        true,
        true,
        options.onlyEmptyFields,
        options.fillNewPassword,
      );
    }

    for (const formKey in pageDetails.forms) {
      // eslint-disable-next-line
      if (!pageDetails.forms.hasOwnProperty(formKey)) {
        continue;
      }

      passwordFields.forEach((passField) => {
        pf = passField;
        passwords.push(pf);

        if (login.username) {
          username = this.findUsernameField(pageDetails, pf, false, false, false);

          if (!username && !options.onlyVisibleFields) {
            // not able to find any viewable username fields. maybe there are some "hidden" ones?
            username = this.findUsernameField(pageDetails, pf, true, true, false);
          }

          if (username) {
            usernames.push(username);
          }
        }

        if (options.allowTotpAutofill && login.totp) {
          totp = this.findTotpField(pageDetails, pf, false, false, false);

          if (!totp && !options.onlyVisibleFields) {
            // not able to find any viewable totp fields. maybe there are some "hidden" ones?
            totp = this.findTotpField(pageDetails, pf, true, true, false);
          }

          if (totp) {
            totps.push(totp);
          }
        }
      });
    }

    if (passwordFields.length && !passwords.length) {
      // The page does not have any forms with password fields. Use the first password field on the page and the
      // input field just before it as the username.

      pf = passwordFields[0];
      passwords.push(pf);

      if (login.username && pf.elementNumber > 0) {
        username = this.findUsernameField(pageDetails, pf, false, false, true);

        if (!username && !options.onlyVisibleFields) {
          // not able to find any viewable username fields. maybe there are some "hidden" ones?
          username = this.findUsernameField(pageDetails, pf, true, true, true);
        }

        if (username) {
          usernames.push(username);
        }
      }

      if (options.allowTotpAutofill && login.totp && pf.elementNumber > 0) {
        totp = this.findTotpField(pageDetails, pf, false, false, true);

        if (!totp && !options.onlyVisibleFields) {
          // not able to find any viewable username fields. maybe there are some "hidden" ones?
          totp = this.findTotpField(pageDetails, pf, true, true, true);
        }

        if (totp) {
          totps.push(totp);
        }
      }
    }

    if (!passwordFields.length) {
      // No password fields on this page. Let's try to just fuzzy fill the username.
      pageDetails.fields.forEach((f) => {
        if (
          !options.skipUsernameOnlyFill &&
          f.viewable &&
          (f.type === "text" || f.type === "email" || f.type === "tel") &&
          AutofillService.fieldIsFuzzyMatch(f, AutoFillConstants.UsernameFieldNames)
        ) {
          usernames.push(f);
        }

        if (
          options.allowTotpAutofill &&
          f.viewable &&
          (f.type === "text" || f.type === "number") &&
          (AutofillService.fieldIsFuzzyMatch(f, AutoFillConstants.TotpFieldNames) ||
            f.autoCompleteType === "one-time-code")
        ) {
          totps.push(f);
        }
      });
    }

    usernames.forEach((u) => {
      // eslint-disable-next-line
      if (filledFields.hasOwnProperty(u.opid)) {
        return;
      }

      filledFields[u.opid] = u;
      AutofillService.fillByOpid(fillScript, u, login.username);
    });

    passwords.forEach((p) => {
      // eslint-disable-next-line
      if (filledFields.hasOwnProperty(p.opid)) {
        return;
      }

      filledFields[p.opid] = p;
      AutofillService.fillByOpid(fillScript, p, login.password);
    });

    if (options.allowTotpAutofill) {
      await Promise.all(
        totps.map(async (t) => {
          if (Object.prototype.hasOwnProperty.call(filledFields, t.opid)) {
            return;
          }

          filledFields[t.opid] = t;
          const totpValue = await this.totpService.getCode(login.totp);
          AutofillService.fillByOpid(fillScript, t, totpValue);
        }),
      );
    }

    fillScript = AutofillService.setFillScriptForFocus(filledFields, fillScript);
    return fillScript;
  }

  /**
   * Generates the autofill script for the specified page details and credit card cipher item.
   * @param {AutofillScript} fillScript
   * @param {AutofillPageDetails} pageDetails
   * @param {{[p: string]: AutofillField}} filledFields
   * @param {GenerateFillScriptOptions} options
   * @returns {AutofillScript|null}
   * @private
   */
  private generateCardFillScript(
    fillScript: AutofillScript,
    pageDetails: AutofillPageDetails,
    filledFields: { [id: string]: AutofillField },
    options: GenerateFillScriptOptions,
  ): AutofillScript | null {
    if (!options.cipher.card) {
      return null;
    }

    const fillFields: { [id: string]: AutofillField } = {};

    pageDetails.fields.forEach((f) => {
      if (AutofillService.isExcludedFieldType(f, AutoFillConstants.ExcludedAutofillTypes)) {
        return;
      }

      for (let i = 0; i < CreditCardAutoFillConstants.CardAttributes.length; i++) {
        const attr = CreditCardAutoFillConstants.CardAttributes[i];
        // eslint-disable-next-line
        if (!f.hasOwnProperty(attr) || !f[attr] || !f.viewable) {
          continue;
        }

        // ref https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill
        // ref https://developers.google.com/web/fundamentals/design-and-ux/input/forms/
        if (
          !fillFields.cardholderName &&
          AutofillService.isFieldMatch(
            f[attr],
            CreditCardAutoFillConstants.CardHolderFieldNames,
            CreditCardAutoFillConstants.CardHolderFieldNameValues,
          )
        ) {
          fillFields.cardholderName = f;
          break;
        } else if (
          !fillFields.number &&
          AutofillService.isFieldMatch(
            f[attr],
            CreditCardAutoFillConstants.CardNumberFieldNames,
            CreditCardAutoFillConstants.CardNumberFieldNameValues,
          )
        ) {
          fillFields.number = f;
          break;
        } else if (
          !fillFields.exp &&
          AutofillService.isFieldMatch(
            f[attr],
            CreditCardAutoFillConstants.CardExpiryFieldNames,
            CreditCardAutoFillConstants.CardExpiryFieldNameValues,
          )
        ) {
          fillFields.exp = f;
          break;
        } else if (
          !fillFields.expMonth &&
          AutofillService.isFieldMatch(f[attr], CreditCardAutoFillConstants.ExpiryMonthFieldNames)
        ) {
          fillFields.expMonth = f;
          break;
        } else if (
          !fillFields.expYear &&
          AutofillService.isFieldMatch(f[attr], CreditCardAutoFillConstants.ExpiryYearFieldNames)
        ) {
          fillFields.expYear = f;
          break;
        } else if (
          !fillFields.code &&
          AutofillService.isFieldMatch(f[attr], CreditCardAutoFillConstants.CVVFieldNames)
        ) {
          fillFields.code = f;
          break;
        } else if (
          !fillFields.brand &&
          AutofillService.isFieldMatch(f[attr], CreditCardAutoFillConstants.CardBrandFieldNames)
        ) {
          fillFields.brand = f;
          break;
        }
      }
    });

    const card = options.cipher.card;
    this.makeScriptAction(fillScript, card, fillFields, filledFields, "cardholderName");
    this.makeScriptAction(fillScript, card, fillFields, filledFields, "number");
    this.makeScriptAction(fillScript, card, fillFields, filledFields, "code");
    this.makeScriptAction(fillScript, card, fillFields, filledFields, "brand");

    if (fillFields.expMonth && AutofillService.hasValue(card.expMonth)) {
      let expMonth: string = card.expMonth;

      if (fillFields.expMonth.selectInfo && fillFields.expMonth.selectInfo.options) {
        let index: number = null;
        const siOptions = fillFields.expMonth.selectInfo.options;
        if (siOptions.length === 12) {
          index = parseInt(card.expMonth, null) - 1;
        } else if (siOptions.length === 13) {
          if (
            siOptions[0][0] != null &&
            siOptions[0][0] !== "" &&
            (siOptions[12][0] == null || siOptions[12][0] === "")
          ) {
            index = parseInt(card.expMonth, null) - 1;
          } else {
            index = parseInt(card.expMonth, null);
          }
        }

        if (index != null) {
          const option = siOptions[index];
          if (option.length > 1) {
            expMonth = option[1];
          }
        }
      } else if (
        (this.fieldAttrsContain(fillFields.expMonth, "mm") ||
          fillFields.expMonth.maxLength === 2) &&
        expMonth.length === 1
      ) {
        expMonth = "0" + expMonth;
      }

      filledFields[fillFields.expMonth.opid] = fillFields.expMonth;
      AutofillService.fillByOpid(fillScript, fillFields.expMonth, expMonth);
    }

    if (fillFields.expYear && AutofillService.hasValue(card.expYear)) {
      let expYear: string = card.expYear;
      if (fillFields.expYear.selectInfo && fillFields.expYear.selectInfo.options) {
        for (let i = 0; i < fillFields.expYear.selectInfo.options.length; i++) {
          const o: [string, string] = fillFields.expYear.selectInfo.options[i];
          if (o[0] === card.expYear || o[1] === card.expYear) {
            expYear = o[1];
            break;
          }
          if (
            o[1].length === 2 &&
            card.expYear.length === 4 &&
            o[1] === card.expYear.substring(2)
          ) {
            expYear = o[1];
            break;
          }
          const colonIndex = o[1].indexOf(":");
          if (colonIndex > -1 && o[1].length > colonIndex + 1) {
            const val = o[1].substring(colonIndex + 2);
            if (val != null && val.trim() !== "" && val === card.expYear) {
              expYear = o[1];
              break;
            }
          }
        }
      } else if (
        this.fieldAttrsContain(fillFields.expYear, "yyyy") ||
        fillFields.expYear.maxLength === 4
      ) {
        if (expYear.length === 2) {
          expYear = "20" + expYear;
        }
      } else if (
        this.fieldAttrsContain(fillFields.expYear, "yy") ||
        fillFields.expYear.maxLength === 2
      ) {
        if (expYear.length === 4) {
          expYear = expYear.substr(2);
        }
      }

      filledFields[fillFields.expYear.opid] = fillFields.expYear;
      AutofillService.fillByOpid(fillScript, fillFields.expYear, expYear);
    }

    if (
      fillFields.exp &&
      AutofillService.hasValue(card.expMonth) &&
      AutofillService.hasValue(card.expYear)
    ) {
      const fullMonth = ("0" + card.expMonth).slice(-2);

      let fullYear: string = card.expYear;
      let partYear: string = null;
      if (fullYear.length === 2) {
        partYear = fullYear;
        fullYear = "20" + fullYear;
      } else if (fullYear.length === 4) {
        partYear = fullYear.substr(2, 2);
      }

      let exp: string = null;
      for (let i = 0; i < CreditCardAutoFillConstants.MonthAbbr.length; i++) {
        if (
          this.fieldAttrsContain(
            fillFields.exp,
            CreditCardAutoFillConstants.MonthAbbr[i] +
              "/" +
              CreditCardAutoFillConstants.YearAbbrLong[i],
          )
        ) {
          exp = fullMonth + "/" + fullYear;
        } else if (
          this.fieldAttrsContain(
            fillFields.exp,
            CreditCardAutoFillConstants.MonthAbbr[i] +
              "/" +
              CreditCardAutoFillConstants.YearAbbrShort[i],
          ) &&
          partYear != null
        ) {
          exp = fullMonth + "/" + partYear;
        } else if (
          this.fieldAttrsContain(
            fillFields.exp,
            CreditCardAutoFillConstants.YearAbbrLong[i] +
              "/" +
              CreditCardAutoFillConstants.MonthAbbr[i],
          )
        ) {
          exp = fullYear + "/" + fullMonth;
        } else if (
          this.fieldAttrsContain(
            fillFields.exp,
            CreditCardAutoFillConstants.YearAbbrShort[i] +
              "/" +
              CreditCardAutoFillConstants.MonthAbbr[i],
          ) &&
          partYear != null
        ) {
          exp = partYear + "/" + fullMonth;
        } else if (
          this.fieldAttrsContain(
            fillFields.exp,
            CreditCardAutoFillConstants.MonthAbbr[i] +
              "-" +
              CreditCardAutoFillConstants.YearAbbrLong[i],
          )
        ) {
          exp = fullMonth + "-" + fullYear;
        } else if (
          this.fieldAttrsContain(
            fillFields.exp,
            CreditCardAutoFillConstants.MonthAbbr[i] +
              "-" +
              CreditCardAutoFillConstants.YearAbbrShort[i],
          ) &&
          partYear != null
        ) {
          exp = fullMonth + "-" + partYear;
        } else if (
          this.fieldAttrsContain(
            fillFields.exp,
            CreditCardAutoFillConstants.YearAbbrLong[i] +
              "-" +
              CreditCardAutoFillConstants.MonthAbbr[i],
          )
        ) {
          exp = fullYear + "-" + fullMonth;
        } else if (
          this.fieldAttrsContain(
            fillFields.exp,
            CreditCardAutoFillConstants.YearAbbrShort[i] +
              "-" +
              CreditCardAutoFillConstants.MonthAbbr[i],
          ) &&
          partYear != null
        ) {
          exp = partYear + "-" + fullMonth;
        } else if (
          this.fieldAttrsContain(
            fillFields.exp,
            CreditCardAutoFillConstants.YearAbbrLong[i] + CreditCardAutoFillConstants.MonthAbbr[i],
          )
        ) {
          exp = fullYear + fullMonth;
        } else if (
          this.fieldAttrsContain(
            fillFields.exp,
            CreditCardAutoFillConstants.YearAbbrShort[i] + CreditCardAutoFillConstants.MonthAbbr[i],
          ) &&
          partYear != null
        ) {
          exp = partYear + fullMonth;
        } else if (
          this.fieldAttrsContain(
            fillFields.exp,
            CreditCardAutoFillConstants.MonthAbbr[i] + CreditCardAutoFillConstants.YearAbbrLong[i],
          )
        ) {
          exp = fullMonth + fullYear;
        } else if (
          this.fieldAttrsContain(
            fillFields.exp,
            CreditCardAutoFillConstants.MonthAbbr[i] + CreditCardAutoFillConstants.YearAbbrShort[i],
          ) &&
          partYear != null
        ) {
          exp = fullMonth + partYear;
        }

        if (exp != null) {
          break;
        }
      }

      if (exp == null) {
        exp = fullYear + "-" + fullMonth;
      }

      this.makeScriptActionWithValue(fillScript, exp, fillFields.exp, filledFields);
    }

    return fillScript;
  }

  /**
   * Determines whether an iframe is potentially dangerous ("untrusted") to autofill
   * @param {string} pageUrl The url of the page/iframe, usually from AutofillPageDetails
   * @param {GenerateFillScriptOptions} options The GenerateFillScript options
   * @returns {boolean} `true` if the iframe is untrusted and a warning should be shown, `false` otherwise
   * @private
   */
  private async inUntrustedIframe(
    pageUrl: string,
    options: GenerateFillScriptOptions,
  ): Promise<boolean> {
    // If the pageUrl (from the content script) matches the tabUrl (from the sender tab), we are not in an iframe
    // This also avoids a false positive if no URI is saved and the user triggers autofill anyway
    if (pageUrl === options.tabUrl) {
      return false;
    }

    // Check the pageUrl against cipher URIs using the configured match detection.
    // Remember: if we are in this function, the tabUrl already matches a saved URI for the login.
    // We need to verify the pageUrl also matches.
    const equivalentDomains = await firstValueFrom(
      this.domainSettingsService.getUrlEquivalentDomains(pageUrl),
    );
    const matchesUri = options.cipher.login.matchesUri(
      pageUrl,
      equivalentDomains,
      options.defaultUriMatch,
    );
    return !matchesUri;
  }

  /**
   * Used when handling autofill on credit card fields. Determines whether
   * the field has an attribute that matches the given value.
   * @param {AutofillField} field
   * @param {string} containsVal
   * @returns {boolean}
   * @private
   */
  private fieldAttrsContain(field: AutofillField, containsVal: string): boolean {
    if (!field) {
      return false;
    }

    let doesContain = false;
    CreditCardAutoFillConstants.CardAttributesExtended.forEach((attr) => {
      // eslint-disable-next-line
      if (doesContain || !field.hasOwnProperty(attr) || !field[attr]) {
        return;
      }

      let val = field[attr];
      val = val.replace(/ /g, "").toLowerCase();
      doesContain = val.indexOf(containsVal) > -1;
    });

    return doesContain;
  }

  /**
   * Generates the autofill script for the specified page details and identify cipher item.
   * @param {AutofillScript} fillScript
   * @param {AutofillPageDetails} pageDetails
   * @param {{[p: string]: AutofillField}} filledFields
   * @param {GenerateFillScriptOptions} options
   * @returns {AutofillScript}
   * @private
   */
  private async generateIdentityFillScript(
    fillScript: AutofillScript,
    pageDetails: AutofillPageDetails,
    filledFields: { [id: string]: AutofillField },
    options: GenerateFillScriptOptions,
  ): Promise<AutofillScript> {
    if (await this.configService.getFeatureFlag(FeatureFlag.GenerateIdentityFillScriptRefactor)) {
      return this._generateIdentityFillScript(fillScript, pageDetails, filledFields, options);
    }

    if (!options.cipher.identity) {
      return null;
    }

    const fillFields: { [id: string]: AutofillField } = {};

    pageDetails.fields.forEach((f) => {
      if (
        AutofillService.isExcludedFieldType(f, AutoFillConstants.ExcludedAutofillTypes) ||
        ["current-password", "new-password"].includes(f.autoCompleteType)
      ) {
        return;
      }

      for (let i = 0; i < IdentityAutoFillConstants.IdentityAttributes.length; i++) {
        const attr = IdentityAutoFillConstants.IdentityAttributes[i];
        // eslint-disable-next-line
        if (!f.hasOwnProperty(attr) || !f[attr] || !f.viewable) {
          continue;
        }

        // ref https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill
        // ref https://developers.google.com/web/fundamentals/design-and-ux/input/forms/
        if (
          !fillFields.name &&
          AutofillService.isFieldMatch(
            f[attr],
            IdentityAutoFillConstants.FullNameFieldNames,
            IdentityAutoFillConstants.FullNameFieldNameValues,
          )
        ) {
          fillFields.name = f;
          break;
        } else if (
          !fillFields.firstName &&
          AutofillService.isFieldMatch(f[attr], IdentityAutoFillConstants.FirstnameFieldNames)
        ) {
          fillFields.firstName = f;
          break;
        } else if (
          !fillFields.middleName &&
          AutofillService.isFieldMatch(f[attr], IdentityAutoFillConstants.MiddlenameFieldNames)
        ) {
          fillFields.middleName = f;
          break;
        } else if (
          !fillFields.lastName &&
          AutofillService.isFieldMatch(f[attr], IdentityAutoFillConstants.LastnameFieldNames)
        ) {
          fillFields.lastName = f;
          break;
        } else if (
          !fillFields.title &&
          AutofillService.isFieldMatch(f[attr], IdentityAutoFillConstants.TitleFieldNames)
        ) {
          fillFields.title = f;
          break;
        } else if (
          !fillFields.email &&
          AutofillService.isFieldMatch(f[attr], IdentityAutoFillConstants.EmailFieldNames)
        ) {
          fillFields.email = f;
          break;
        } else if (
          !fillFields.address &&
          AutofillService.isFieldMatch(
            f[attr],
            IdentityAutoFillConstants.AddressFieldNames,
            IdentityAutoFillConstants.AddressFieldNameValues,
          )
        ) {
          fillFields.address = f;
          break;
        } else if (
          !fillFields.address1 &&
          AutofillService.isFieldMatch(f[attr], IdentityAutoFillConstants.Address1FieldNames)
        ) {
          fillFields.address1 = f;
          break;
        } else if (
          !fillFields.address2 &&
          AutofillService.isFieldMatch(f[attr], IdentityAutoFillConstants.Address2FieldNames)
        ) {
          fillFields.address2 = f;
          break;
        } else if (
          !fillFields.address3 &&
          AutofillService.isFieldMatch(f[attr], IdentityAutoFillConstants.Address3FieldNames)
        ) {
          fillFields.address3 = f;
          break;
        } else if (
          !fillFields.postalCode &&
          AutofillService.isFieldMatch(f[attr], IdentityAutoFillConstants.PostalCodeFieldNames)
        ) {
          fillFields.postalCode = f;
          break;
        } else if (
          !fillFields.city &&
          AutofillService.isFieldMatch(f[attr], IdentityAutoFillConstants.CityFieldNames)
        ) {
          fillFields.city = f;
          break;
        } else if (
          !fillFields.state &&
          AutofillService.isFieldMatch(f[attr], IdentityAutoFillConstants.StateFieldNames)
        ) {
          fillFields.state = f;
          break;
        } else if (
          !fillFields.country &&
          AutofillService.isFieldMatch(f[attr], IdentityAutoFillConstants.CountryFieldNames)
        ) {
          fillFields.country = f;
          break;
        } else if (
          !fillFields.phone &&
          AutofillService.isFieldMatch(f[attr], IdentityAutoFillConstants.PhoneFieldNames)
        ) {
          fillFields.phone = f;
          break;
        } else if (
          !fillFields.username &&
          AutofillService.isFieldMatch(f[attr], IdentityAutoFillConstants.UserNameFieldNames)
        ) {
          fillFields.username = f;
          break;
        } else if (
          !fillFields.company &&
          AutofillService.isFieldMatch(f[attr], IdentityAutoFillConstants.CompanyFieldNames)
        ) {
          fillFields.company = f;
          break;
        }
      }
    });

    const identity = options.cipher.identity;
    this.makeScriptAction(fillScript, identity, fillFields, filledFields, "title");
    this.makeScriptAction(fillScript, identity, fillFields, filledFields, "firstName");
    this.makeScriptAction(fillScript, identity, fillFields, filledFields, "middleName");
    this.makeScriptAction(fillScript, identity, fillFields, filledFields, "lastName");
    this.makeScriptAction(fillScript, identity, fillFields, filledFields, "address1");
    this.makeScriptAction(fillScript, identity, fillFields, filledFields, "address2");
    this.makeScriptAction(fillScript, identity, fillFields, filledFields, "address3");
    this.makeScriptAction(fillScript, identity, fillFields, filledFields, "city");
    this.makeScriptAction(fillScript, identity, fillFields, filledFields, "postalCode");
    this.makeScriptAction(fillScript, identity, fillFields, filledFields, "company");
    this.makeScriptAction(fillScript, identity, fillFields, filledFields, "email");
    this.makeScriptAction(fillScript, identity, fillFields, filledFields, "phone");
    this.makeScriptAction(fillScript, identity, fillFields, filledFields, "username");

    let filledState = false;
    if (fillFields.state && identity.state && identity.state.length > 2) {
      const stateLower = identity.state.toLowerCase();
      const isoState =
        IdentityAutoFillConstants.IsoStates[stateLower] ||
        IdentityAutoFillConstants.IsoProvinces[stateLower];
      if (isoState) {
        filledState = true;
        this.makeScriptActionWithValue(fillScript, isoState, fillFields.state, filledFields);
      }
    }

    if (!filledState) {
      this.makeScriptAction(fillScript, identity, fillFields, filledFields, "state");
    }

    let filledCountry = false;
    if (fillFields.country && identity.country && identity.country.length > 2) {
      const countryLower = identity.country.toLowerCase();
      const isoCountry = IdentityAutoFillConstants.IsoCountries[countryLower];
      if (isoCountry) {
        filledCountry = true;
        this.makeScriptActionWithValue(fillScript, isoCountry, fillFields.country, filledFields);
      }
    }

    if (!filledCountry) {
      this.makeScriptAction(fillScript, identity, fillFields, filledFields, "country");
    }

    if (fillFields.name && (identity.firstName || identity.lastName)) {
      let fullName = "";
      if (AutofillService.hasValue(identity.firstName)) {
        fullName = identity.firstName;
      }
      if (AutofillService.hasValue(identity.middleName)) {
        if (fullName !== "") {
          fullName += " ";
        }
        fullName += identity.middleName;
      }
      if (AutofillService.hasValue(identity.lastName)) {
        if (fullName !== "") {
          fullName += " ";
        }
        fullName += identity.lastName;
      }

      this.makeScriptActionWithValue(fillScript, fullName, fillFields.name, filledFields);
    }

    if (fillFields.address && AutofillService.hasValue(identity.address1)) {
      let address = "";
      if (AutofillService.hasValue(identity.address1)) {
        address = identity.address1;
      }
      if (AutofillService.hasValue(identity.address2)) {
        if (address !== "") {
          address += ", ";
        }
        address += identity.address2;
      }
      if (AutofillService.hasValue(identity.address3)) {
        if (address !== "") {
          address += ", ";
        }
        address += identity.address3;
      }

      this.makeScriptActionWithValue(fillScript, address, fillFields.address, filledFields);
    }

    return fillScript;
  }

  // Cozy customization

  /**
   * Generates the autofill script for the specified page details and contact data that is not already generated in the generateIdentityFillScript method.
   * We decided to add a new generateFillScript method because :
   * - we prefer to keep the generateIdentityFillScript from Bitwarden untouched
   * - it makes no sense in our generatePaperFillScript
   * @param {AutofillScript} fillScript
   * @param {AutofillPageDetails} pageDetails
   * @param {{[p: string]: AutofillField}} filledFields
   * @param {GenerateFillScriptOptions} options
   * @returns {AutofillScript}
   * @private
   */
  private async generateContactAddressFillScript(
    fillScript: AutofillScript,
    pageDetails: AutofillPageDetails,
    filledFields: { [id: string]: AutofillField },
    options: GenerateFillScriptOptions,
  ): Promise<AutofillScript> {
    const fillFields: { [id: string]: AutofillField } = {};

    pageDetails.fields.forEach((f) => {
      if (
        AutofillService.isExcludedFieldType(f, AutoFillConstants.ExcludedAutofillTypes) ||
        ["current-password", "new-password"].includes(f.autoCompleteType)
      ) {
        return;
      }

      for (let i = 0; i < ContactAutoFillConstants.ContactAttributes.length; i++) {
        const attr = ContactAutoFillConstants.ContactAttributes[i];
        // eslint-disable-next-line
        if (!f.hasOwnProperty(attr) || !f[attr] || !f.viewable) {
          continue;
        }
        if (
          !fillFields.contactBirthDay &&
          AutofillService.isFieldMatch(f[attr], ContactAutoFillConstants.ContactBirthDayFieldNames)
        ) {
          fillFields.contactBirthDay = f;
          break;
        }
        if (
          !fillFields.contactBirthMonth &&
          AutofillService.isFieldMatch(
            f[attr],
            ContactAutoFillConstants.ContactBirthMonthFieldNames,
          )
        ) {
          fillFields.contactBirthMonth = f;
          break;
        }
        if (
          !fillFields.contactBirthYear &&
          AutofillService.isFieldMatch(f[attr], ContactAutoFillConstants.ContactBirthYearFieldNames)
        ) {
          fillFields.contactBirthYear = f;
          break;
        }
        if (
          !fillFields.contactAddressNumber &&
          AutofillService.isFieldMatch(f[attr], ContactAutoFillConstants.AddressNumberFieldNames)
        ) {
          fillFields.contactAddressNumber = f;
          break;
        }
        if (
          !fillFields.contactAddressLocality &&
          AutofillService.isFieldMatch(f[attr], ContactAutoFillConstants.AddressLocalityFieldNames)
        ) {
          fillFields.contactAddressLocality = f;
          break;
        }
        if (
          !fillFields.contactAddressFloor &&
          AutofillService.isFieldMatch(f[attr], ContactAutoFillConstants.AddressFloorFieldNames)
        ) {
          fillFields.contactAddressFloor = f;
          break;
        }
        if (
          !fillFields.contactAddressBuilding &&
          AutofillService.isFieldMatch(f[attr], ContactAutoFillConstants.AddressBuildingFieldNames)
        ) {
          fillFields.contactAddressBuilding = f;
          break;
        }
        if (
          !fillFields.contactAddressStairs &&
          AutofillService.isFieldMatch(f[attr], ContactAutoFillConstants.AddressStairsFieldNames)
        ) {
          fillFields.contactAddressStairs = f;
          break;
        }
        if (
          !fillFields.contactAddressApartment &&
          AutofillService.isFieldMatch(f[attr], ContactAutoFillConstants.AddressApartmentFieldNames)
        ) {
          fillFields.contactAddressApartment = f;
          break;
        }
        if (
          !fillFields.contactAddressEntrycode &&
          AutofillService.isFieldMatch(f[attr], ContactAutoFillConstants.AddressEntrycodeFieldNames)
        ) {
          fillFields.contactAddressEntrycode = f;
          break;
        }
      }
    });

    const client = await this.cozyClientService.getClientInstance();

    if (fillFields.contactBirthDay) {
      const contactBirthDay = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "contactBirthDay",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });

      this.makeScriptActionWithValue(
        fillScript,
        contactBirthDay,
        fillFields.contactBirthDay,
        filledFields,
      );
    }

    if (fillFields.contactBirthMonth) {
      const contactBirthMonth = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "contactBirthMonth",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });

      this.makeScriptActionWithValue(
        fillScript,
        contactBirthMonth,
        fillFields.contactBirthMonth,
        filledFields,
      );
    }

    if (fillFields.contactBirthYear) {
      const contactBirthYear = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "contactBirthYear",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });

      this.makeScriptActionWithValue(
        fillScript,
        contactBirthYear,
        fillFields.contactBirthYear,
        filledFields,
      );
    }

    if (fillFields.contactAddressNumber) {
      const addressNumber = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "addressNumber",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });

      this.makeScriptActionWithValue(
        fillScript,
        addressNumber,
        fillFields.contactAddressNumber,
        filledFields,
      );
    }

    if (fillFields.contactAddressLocality) {
      const addressLocality = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "addressLocality",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });

      this.makeScriptActionWithValue(
        fillScript,
        addressLocality,
        fillFields.contactAddressLocality,
        filledFields,
      );
    }

    if (fillFields.contactAddressFloor) {
      const addressFloor = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "addressFloor",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });

      this.makeScriptActionWithValue(
        fillScript,
        addressFloor,
        fillFields.contactAddressFloor,
        filledFields,
      );
    }

    if (fillFields.contactAddressBuilding) {
      const addressBuilding = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "addressBuilding",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });

      this.makeScriptActionWithValue(
        fillScript,
        addressBuilding,
        fillFields.contactAddressBuilding,
        filledFields,
      );
    }

    if (fillFields.contactAddressStairs) {
      const addressStairs = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "addressStairs",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });

      this.makeScriptActionWithValue(
        fillScript,
        addressStairs,
        fillFields.contactAddressStairs,
        filledFields,
      );
    }

    if (fillFields.contactAddressApartment) {
      const addressApartment = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "addressApartment",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });

      this.makeScriptActionWithValue(
        fillScript,
        addressApartment,
        fillFields.contactAddressApartment,
        filledFields,
      );
    }

    if (fillFields.contactAddressEntrycode) {
      const addressEntrycode = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "addressEntrycode",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });

      this.makeScriptActionWithValue(
        fillScript,
        addressEntrycode,
        fillFields.contactAddressEntrycode,
        filledFields,
      );
    }

    return fillScript;
  }

  // Cozy customization end

  /**
   * Generates the autofill script for the specified page details and paper data.
   * @param {AutofillScript} fillScript
   * @param {AutofillPageDetails} pageDetails
   * @param {{[p: string]: AutofillField}} filledFields
   * @param {GenerateFillScriptOptions} options
   * @returns {AutofillScript}
   * @private
   */
  private async generatePaperFillScript(
    fillScript: AutofillScript,
    pageDetails: AutofillPageDetails,
    filledFields: { [id: string]: AutofillField },
    options: GenerateFillScriptOptions,
  ): Promise<AutofillScript> {
    const fillFields: { [id: string]: AutofillField } = {};

    // Special case because we can have multiple tax notice ref tax income with different dates for a form
    // like "Revenu fiscal de référence 2022" and "Revenu fiscal de référence 2023" so we need to be able to
    // fill multiple fields of this type
    const paperTaxNoticeRefTaxIncomeFillFields: AutofillField[] = [];

    pageDetails.fields.forEach((f) => {
      if (
        AutofillService.isExcludedFieldType(f, AutoFillConstants.ExcludedAutofillTypes) ||
        ["current-password", "new-password"].includes(f.autoCompleteType)
      ) {
        return;
      }

      for (let i = 0; i < PaperAutoFillConstants.PaperAttributes.length; i++) {
        const attr = PaperAutoFillConstants.PaperAttributes[i];
        // eslint-disable-next-line
        if (!f.hasOwnProperty(attr) || !f[attr] || !f.viewable) {
          continue;
        }
        // FIXME: Check if we will be able to factorize the code
        if (
          !fillFields.paperIdentityCardNumber &&
          AutofillService.isFieldMatch(f[attr], PaperAutoFillConstants.IdentityCardNumberFieldNames)
        ) {
          fillFields.paperIdentityCardNumber = f;
          break;
        }
        if (
          !fillFields.paperPassportNumber &&
          AutofillService.isFieldMatch(f[attr], PaperAutoFillConstants.PassportNumberFieldNames)
        ) {
          fillFields.paperPassportNumber = f;
          break;
        }
        if (
          !fillFields.paperSocialSecurityNumber &&
          AutofillService.isFieldMatch(
            f[attr],
            PaperAutoFillConstants.SocialSecurityNumberFieldNames,
          )
        ) {
          fillFields.paperSocialSecurityNumber = f;
          break;
        }
        if (
          !fillFields.paperResidencePermitNumber &&
          AutofillService.isFieldMatch(
            f[attr],
            PaperAutoFillConstants.ResidencePermitNumberFieldNames,
          )
        ) {
          fillFields.paperResidencePermitNumber = f;
          break;
        }
        if (
          !fillFields.paperDrivingLicenseNumber &&
          AutofillService.isFieldMatch(f[attr], PaperAutoFillConstants.DrivingLicenseFieldNames)
        ) {
          fillFields.paperDrivingLicenseNumber = f;
          break;
        }
        if (
          !fillFields.paperVehicleRegistrationNumber &&
          AutofillService.isFieldMatch(
            f[attr],
            PaperAutoFillConstants.VehicleRegistrationNumberFieldNames,
          )
        ) {
          fillFields.paperVehicleRegistrationNumber = f;
          break;
        }
        if (
          !fillFields.paperVehicleRegistrationConfidentialCode &&
          AutofillService.isFieldMatch(
            f[attr],
            PaperAutoFillConstants.VehicleRegistrationConfidentialCodeFieldNames,
          )
        ) {
          fillFields.paperVehicleRegistrationConfidentialCode = f;
          break;
        }
        if (
          !fillFields.paperVehicleRegistrationLicensePlateNumber &&
          AutofillService.isFieldMatch(
            f[attr],
            PaperAutoFillConstants.VehicleRegistrationLicensePlateNumberFieldNames,
          )
        ) {
          fillFields.paperVehicleRegistrationLicensePlateNumber = f;
          break;
        }
        if (
          !fillFields.paperBankIbanNumber &&
          AutofillService.isFieldMatch(f[attr], PaperAutoFillConstants.BankIbanNumberFieldNames)
        ) {
          fillFields.paperBankIbanNumber = f;
          break;
        }
        if (
          !fillFields.paperBankBicNumber &&
          AutofillService.isFieldMatch(f[attr], PaperAutoFillConstants.BankBicNumberFieldNames)
        ) {
          fillFields.paperBankBicNumber = f;
          break;
        }
        if (
          !fillFields.paperGrossSalaryAmount &&
          AutofillService.isFieldMatch(f[attr], PaperAutoFillConstants.GrossSalaryAmountFieldNames)
        ) {
          fillFields.paperGrossSalaryAmount = f;
          break;
        }
        if (
          !fillFields.paperNetSalaryAmount &&
          AutofillService.isFieldMatch(f[attr], PaperAutoFillConstants.NetSalaryAmountFieldNames)
        ) {
          fillFields.paperNetSalaryAmount = f;
          break;
        }
        if (
          !fillFields.paperTaxNoticeNumber &&
          AutofillService.isFieldMatch(f[attr], PaperAutoFillConstants.TaxNoticeNumberFieldNames)
        ) {
          fillFields.paperTaxNoticeNumber = f;
          break;
        }
        if (
          AutofillService.isFieldMatch(
            f[attr],
            PaperAutoFillConstants.TaxNoticeRefTaxIncomeFieldNames,
          )
        ) {
          paperTaxNoticeRefTaxIncomeFillFields.push(f);
          break;
        }
      }
    });

    const client = await this.cozyClientService.getClientInstance();

    // FIXME: Check if we will be able to factorize the code
    if (fillFields.paperIdentityCardNumber) {
      const paperIdentityCardNumber = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "paperIdentityCardNumber",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });
      this.makeScriptActionWithValue(
        fillScript,
        paperIdentityCardNumber,
        fillFields.paperIdentityCardNumber,
        filledFields,
      );
    }

    if (fillFields.paperPassportNumber) {
      const paperPassportNumber = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "paperPassportNumber",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });
      this.makeScriptActionWithValue(
        fillScript,
        paperPassportNumber,
        fillFields.paperPassportNumber,
        filledFields,
      );
    }

    if (fillFields.paperSocialSecurityNumber) {
      const paperSocialSecurityNumber = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "paperSocialSecurityNumber",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });
      this.makeScriptActionWithValue(
        fillScript,
        paperSocialSecurityNumber,
        fillFields.paperSocialSecurityNumber,
        filledFields,
      );
    }

    if (fillFields.paperResidencePermitNumber) {
      const paperResidencePermitNumber = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "paperResidencePermitNumber",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });
      this.makeScriptActionWithValue(
        fillScript,
        paperResidencePermitNumber,
        fillFields.paperResidencePermitNumber,
        filledFields,
      );
    }

    if (fillFields.paperDrivingLicenseNumber) {
      const paperDrivingLicenseNumber = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "paperDrivingLicenseNumber",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });
      this.makeScriptActionWithValue(
        fillScript,
        paperDrivingLicenseNumber,
        fillFields.paperDrivingLicenseNumber,
        filledFields,
      );
    }

    if (fillFields.paperVehicleRegistrationNumber) {
      const paperVehicleRegistrationNumber = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "paperVehicleRegistrationNumber",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });
      this.makeScriptActionWithValue(
        fillScript,
        paperVehicleRegistrationNumber,
        fillFields.paperVehicleRegistrationNumber,
        filledFields,
      );
    }

    if (fillFields.paperVehicleRegistrationConfidentialCode) {
      const paperVehicleRegistrationConfidentialCode = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "paperVehicleRegistrationConfidentialCode",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });
      this.makeScriptActionWithValue(
        fillScript,
        paperVehicleRegistrationConfidentialCode,
        fillFields.paperVehicleRegistrationConfidentialCode,
        filledFields,
      );
    }

    if (fillFields.paperVehicleRegistrationLicensePlateNumber) {
      const paperVehicleRegistrationLicensePlateNumber = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "paperVehicleRegistrationLicensePlateNumber",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });
      this.makeScriptActionWithValue(
        fillScript,
        paperVehicleRegistrationLicensePlateNumber,
        fillFields.paperVehicleRegistrationLicensePlateNumber,
        filledFields,
      );
    }

    if (fillFields.paperBankIbanNumber) {
      const paperBankIbanNumber = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "paperBankIbanNumber",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });
      this.makeScriptActionWithValue(
        fillScript,
        paperBankIbanNumber,
        fillFields.paperBankIbanNumber,
        filledFields,
      );
    }

    if (fillFields.paperBankBicNumber) {
      const paperBankBicNumber = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "paperBankBicNumber",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });
      this.makeScriptActionWithValue(
        fillScript,
        paperBankBicNumber,
        fillFields.paperBankBicNumber,
        filledFields,
      );
    }

    if (fillFields.paperGrossSalaryAmount) {
      const paperGrossSalaryAmount = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "paperGrossSalaryAmount",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });
      this.makeScriptActionWithValue(
        fillScript,
        paperGrossSalaryAmount,
        fillFields.paperGrossSalaryAmount,
        filledFields,
      );
    }

    if (fillFields.paperNetSalaryAmount) {
      const paperNetSalaryAmount = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "paperNetSalaryAmount",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });
      this.makeScriptActionWithValue(
        fillScript,
        paperNetSalaryAmount,
        fillFields.paperNetSalaryAmount,
        filledFields,
      );
    }

    if (fillFields.paperTaxNoticeNumber) {
      const paperTaxNoticeNumber = await getCozyValue({
        client,
        contactId: options.cipher.id,
        fieldQualifier: "paperTaxNoticeNumber",
        cozyAutofillOptions: options.cozyAutofillOptions,
      });
      this.makeScriptActionWithValue(
        fillScript,
        paperTaxNoticeNumber,
        fillFields.paperTaxNoticeNumber,
        filledFields,
      );
    }

    if (paperTaxNoticeRefTaxIncomeFillFields.length > 0) {
      for (const paperTaxNoticeRefTaxIncomeFillField of paperTaxNoticeRefTaxIncomeFillFields) {
        const paperTaxNoticeRefTaxIncome = await getCozyValue({
          client,
          contactId: options.cipher.id,
          contactEmail: options.cipher.contact.primaryEmail,
          me: options.cipher.contact.me,
          field: paperTaxNoticeRefTaxIncomeFillField,
          fieldQualifier: "paperTaxNoticeRefTaxIncome",
          cozyAutofillOptions: options.cozyAutofillOptions,
          filterName: "yearFilter",
        });
        this.makeScriptActionWithValue(
          fillScript,
          paperTaxNoticeRefTaxIncome,
          paperTaxNoticeRefTaxIncomeFillField,
          filledFields,
        );
      }
    }

    return fillScript;
  }

  // Cozy customization end

  /**
   * Generates the autofill script for the specified page details and identity cipher item.
   *
   * @param fillScript - Object to store autofill script, passed between method references
   * @param pageDetails - The details of the page to autofill
   * @param filledFields - The fields that have already been filled, passed between method references
   * @param options - Contains data used to fill cipher items
   */
  private _generateIdentityFillScript(
    fillScript: AutofillScript,
    pageDetails: AutofillPageDetails,
    filledFields: { [id: string]: AutofillField },
    options: GenerateFillScriptOptions,
  ): AutofillScript {
    const identity = options.cipher.identity;
    if (!identity) {
      return null;
    }

    for (let fieldsIndex = 0; fieldsIndex < pageDetails.fields.length; fieldsIndex++) {
      const field = pageDetails.fields[fieldsIndex];
      if (this.excludeFieldFromIdentityFill(field)) {
        continue;
      }

      const keywordsList = this.getIdentityAutofillFieldKeywords(field);
      const keywordsCombined = keywordsList.join(",");
      if (this.shouldMakeIdentityTitleFillScript(filledFields, keywordsCombined)) {
        this.makeScriptActionWithValue(fillScript, identity.title, field, filledFields);
        continue;
      }

      if (this.shouldMakeIdentityNameFillScript(filledFields, keywordsList)) {
        this.makeIdentityNameFillScript(fillScript, filledFields, field, identity);
        continue;
      }

      if (this.shouldMakeIdentityFirstNameFillScript(filledFields, keywordsCombined)) {
        this.makeScriptActionWithValue(fillScript, identity.firstName, field, filledFields);
        continue;
      }

      if (this.shouldMakeIdentityMiddleNameFillScript(filledFields, keywordsCombined)) {
        this.makeScriptActionWithValue(fillScript, identity.middleName, field, filledFields);
        continue;
      }

      if (this.shouldMakeIdentityLastNameFillScript(filledFields, keywordsCombined)) {
        this.makeScriptActionWithValue(fillScript, identity.lastName, field, filledFields);
        continue;
      }

      if (this.shouldMakeIdentityEmailFillScript(filledFields, keywordsCombined)) {
        this.makeScriptActionWithValue(fillScript, identity.email, field, filledFields);
        continue;
      }

      if (this.shouldMakeIdentityAddressFillScript(filledFields, keywordsList)) {
        this.makeIdentityAddressFillScript(fillScript, filledFields, field, identity);
        continue;
      }

      if (this.shouldMakeIdentityAddress1FillScript(filledFields, keywordsCombined)) {
        this.makeScriptActionWithValue(fillScript, identity.address1, field, filledFields);
        continue;
      }

      if (this.shouldMakeIdentityAddress2FillScript(filledFields, keywordsCombined)) {
        this.makeScriptActionWithValue(fillScript, identity.address2, field, filledFields);
        continue;
      }

      if (this.shouldMakeIdentityAddress3FillScript(filledFields, keywordsCombined)) {
        this.makeScriptActionWithValue(fillScript, identity.address3, field, filledFields);
        continue;
      }

      if (this.shouldMakeIdentityPostalCodeFillScript(filledFields, keywordsCombined)) {
        this.makeScriptActionWithValue(fillScript, identity.postalCode, field, filledFields);
        continue;
      }

      if (this.shouldMakeIdentityCityFillScript(filledFields, keywordsCombined)) {
        this.makeScriptActionWithValue(fillScript, identity.city, field, filledFields);
        continue;
      }

      if (this.shouldMakeIdentityStateFillScript(filledFields, keywordsCombined)) {
        this.makeIdentityStateFillScript(fillScript, filledFields, field, identity);
        continue;
      }

      if (this.shouldMakeIdentityCountryFillScript(filledFields, keywordsCombined)) {
        this.makeIdentityCountryFillScript(fillScript, filledFields, field, identity);
        continue;
      }

      if (this.shouldMakeIdentityPhoneFillScript(filledFields, keywordsCombined)) {
        this.makeScriptActionWithValue(fillScript, identity.phone, field, filledFields);
        continue;
      }

      if (this.shouldMakeIdentityUserNameFillScript(filledFields, keywordsCombined)) {
        this.makeScriptActionWithValue(fillScript, identity.username, field, filledFields);
        continue;
      }

      if (this.shouldMakeIdentityCompanyFillScript(filledFields, keywordsCombined)) {
        this.makeScriptActionWithValue(fillScript, identity.company, field, filledFields);
      }
    }

    return fillScript;
  }

  /**
   * Identifies if the current field should be excluded from triggering autofill of the identity cipher.
   *
   * @param field - The field to check
   */
  private excludeFieldFromIdentityFill(field: AutofillField): boolean {
    return (
      AutofillService.isExcludedFieldType(field, AutoFillConstants.ExcludedAutofillTypes) ||
      AutoFillConstants.ExcludedIdentityAutocompleteTypes.has(field.autoCompleteType) ||
      !field.viewable
    );
  }

  /**
   * Gathers all unique keyword identifiers from a field that can be used to determine what
   * identity value should be filled.
   *
   * @param field - The field to gather keywords from
   */
  private getIdentityAutofillFieldKeywords(field: AutofillField): string[] {
    const keywords: Set<string> = new Set();
    for (let index = 0; index < IdentityAutoFillConstants.IdentityAttributes.length; index++) {
      const attribute = IdentityAutoFillConstants.IdentityAttributes[index];
      if (field[attribute]) {
        keywords.add(
          field[attribute]
            .trim()
            .toLowerCase()
            .replace(/[^a-zA-Z0-9]+/g, ""),
        );
      }
    }

    return Array.from(keywords);
  }

  /**
   * Identifies if a fill script action for the identity title
   * field should be created for the provided field.
   *
   * @param filledFields - The fields that have already been filled
   * @param keywords - The keywords from the field
   */
  private shouldMakeIdentityTitleFillScript(
    filledFields: Record<string, AutofillField>,
    keywords: string,
  ): boolean {
    return (
      !filledFields.title &&
      AutofillService.isFieldMatch(keywords, IdentityAutoFillConstants.TitleFieldNames)
    );
  }

  /**
   * Identifies if a fill script action for the identity name
   * field should be created for the provided field.
   *
   * @param filledFields - The fields that have already been filled
   * @param keywords - The keywords from the field
   */
  private shouldMakeIdentityNameFillScript(
    filledFields: Record<string, AutofillField>,
    keywords: string[],
  ): boolean {
    return (
      !filledFields.name &&
      keywords.some((keyword) =>
        AutofillService.isFieldMatch(
          keyword,
          IdentityAutoFillConstants.FullNameFieldNames,
          IdentityAutoFillConstants.FullNameFieldNameValues,
        ),
      )
    );
  }

  /**
   * Identifies if a fill script action for the identity first name
   * field should be created for the provided field.
   *
   * @param filledFields - The fields that have already been filled
   * @param keywords - The keywords from the field
   */
  private shouldMakeIdentityFirstNameFillScript(
    filledFields: Record<string, AutofillField>,
    keywords: string,
  ): boolean {
    return (
      !filledFields.firstName &&
      AutofillService.isFieldMatch(keywords, IdentityAutoFillConstants.FirstnameFieldNames)
    );
  }

  /**
   * Identifies if a fill script action for the identity middle name
   * field should be created for the provided field.
   *
   * @param filledFields - The fields that have already been filled
   * @param keywords - The keywords from the field
   */
  private shouldMakeIdentityMiddleNameFillScript(
    filledFields: Record<string, AutofillField>,
    keywords: string,
  ): boolean {
    return (
      !filledFields.middleName &&
      AutofillService.isFieldMatch(keywords, IdentityAutoFillConstants.MiddlenameFieldNames)
    );
  }

  /**
   * Identifies if a fill script action for the identity last name
   * field should be created for the provided field.
   *
   * @param filledFields - The fields that have already been filled
   * @param keywords - The keywords from the field
   */
  private shouldMakeIdentityLastNameFillScript(
    filledFields: Record<string, AutofillField>,
    keywords: string,
  ): boolean {
    return (
      !filledFields.lastName &&
      AutofillService.isFieldMatch(keywords, IdentityAutoFillConstants.LastnameFieldNames)
    );
  }

  /**
   * Identifies if a fill script action for the identity email
   * field should be created for the provided field.
   *
   * @param filledFields - The fields that have already been filled
   * @param keywords - The keywords from the field
   */
  private shouldMakeIdentityEmailFillScript(
    filledFields: Record<string, AutofillField>,
    keywords: string,
  ): boolean {
    return (
      !filledFields.email &&
      AutofillService.isFieldMatch(keywords, IdentityAutoFillConstants.EmailFieldNames)
    );
  }

  /**
   * Identifies if a fill script action for the identity address
   * field should be created for the provided field.
   *
   * @param filledFields - The fields that have already been filled
   * @param keywords - The keywords from the field
   */
  private shouldMakeIdentityAddressFillScript(
    filledFields: Record<string, AutofillField>,
    keywords: string[],
  ): boolean {
    return (
      !filledFields.address &&
      keywords.some((keyword) =>
        AutofillService.isFieldMatch(
          keyword,
          IdentityAutoFillConstants.AddressFieldNames,
          IdentityAutoFillConstants.AddressFieldNameValues,
        ),
      )
    );
  }

  /**
   * Identifies if a fill script action for the identity address1
   * field should be created for the provided field.
   *
   * @param filledFields - The fields that have already been filled
   * @param keywords - The keywords from the field
   */
  private shouldMakeIdentityAddress1FillScript(
    filledFields: Record<string, AutofillField>,
    keywords: string,
  ): boolean {
    return (
      !filledFields.address1 &&
      AutofillService.isFieldMatch(keywords, IdentityAutoFillConstants.Address1FieldNames)
    );
  }

  /**
   * Identifies if a fill script action for the identity address2
   * field should be created for the provided field.
   *
   * @param filledFields - The fields that have already been filled
   * @param keywords - The keywords from the field
   */
  private shouldMakeIdentityAddress2FillScript(
    filledFields: Record<string, AutofillField>,
    keywords: string,
  ): boolean {
    return (
      !filledFields.address2 &&
      AutofillService.isFieldMatch(keywords, IdentityAutoFillConstants.Address2FieldNames)
    );
  }

  /**
   * Identifies if a fill script action for the identity address3
   * field should be created for the provided field.
   *
   * @param filledFields - The fields that have already been filled
   * @param keywords - The keywords from the field
   */
  private shouldMakeIdentityAddress3FillScript(
    filledFields: Record<string, AutofillField>,
    keywords: string,
  ): boolean {
    return (
      !filledFields.address3 &&
      AutofillService.isFieldMatch(keywords, IdentityAutoFillConstants.Address3FieldNames)
    );
  }

  /**
   * Identifies if a fill script action for the identity postal code
   * field should be created for the provided field.
   *
   * @param filledFields - The fields that have already been filled
   * @param keywords - The keywords from the field
   */
  private shouldMakeIdentityPostalCodeFillScript(
    filledFields: Record<string, AutofillField>,
    keywords: string,
  ): boolean {
    return (
      !filledFields.postalCode &&
      AutofillService.isFieldMatch(keywords, IdentityAutoFillConstants.PostalCodeFieldNames)
    );
  }

  /**
   * Identifies if a fill script action for the identity city
   * field should be created for the provided field.
   *
   * @param filledFields - The fields that have already been filled
   * @param keywords - The keywords from the field
   */
  private shouldMakeIdentityCityFillScript(
    filledFields: Record<string, AutofillField>,
    keywords: string,
  ): boolean {
    return (
      !filledFields.city &&
      AutofillService.isFieldMatch(keywords, IdentityAutoFillConstants.CityFieldNames)
    );
  }

  /**
   * Identifies if a fill script action for the identity state
   * field should be created for the provided field.
   *
   * @param filledFields - The fields that have already been filled
   * @param keywords - The keywords from the field
   */
  private shouldMakeIdentityStateFillScript(
    filledFields: Record<string, AutofillField>,
    keywords: string,
  ): boolean {
    return (
      !filledFields.state &&
      AutofillService.isFieldMatch(keywords, IdentityAutoFillConstants.StateFieldNames)
    );
  }

  /**
   * Identifies if a fill script action for the identity country
   * field should be created for the provided field.
   *
   * @param filledFields - The fields that have already been filled
   * @param keywords - The keywords from the field
   */
  private shouldMakeIdentityCountryFillScript(
    filledFields: Record<string, AutofillField>,
    keywords: string,
  ): boolean {
    return (
      !filledFields.country &&
      AutofillService.isFieldMatch(keywords, IdentityAutoFillConstants.CountryFieldNames)
    );
  }

  /**
   * Identifies if a fill script action for the identity phone
   * field should be created for the provided field.
   *
   * @param filledFields - The fields that have already been filled
   * @param keywords - The keywords from the field
   */
  private shouldMakeIdentityPhoneFillScript(
    filledFields: Record<string, AutofillField>,
    keywords: string,
  ): boolean {
    return (
      !filledFields.phone &&
      AutofillService.isFieldMatch(keywords, IdentityAutoFillConstants.PhoneFieldNames)
    );
  }

  /**
   * Identifies if a fill script action for the identity username
   * field should be created for the provided field.
   *
   * @param filledFields - The fields that have already been filled
   * @param keywords - The keywords from the field
   */
  private shouldMakeIdentityUserNameFillScript(
    filledFields: Record<string, AutofillField>,
    keywords: string,
  ): boolean {
    return (
      !filledFields.username &&
      AutofillService.isFieldMatch(keywords, IdentityAutoFillConstants.UserNameFieldNames)
    );
  }

  /**
   * Identifies if a fill script action for the identity company
   * field should be created for the provided field.
   *
   * @param filledFields - The fields that have already been filled
   * @param keywords - The keywords from the field
   */
  private shouldMakeIdentityCompanyFillScript(
    filledFields: Record<string, AutofillField>,
    keywords: string,
  ): boolean {
    return (
      !filledFields.company &&
      AutofillService.isFieldMatch(keywords, IdentityAutoFillConstants.CompanyFieldNames)
    );
  }

  /**
   * Creates an identity name fill script action for the provided field. This is used
   * when filling a `full name` field, using the first, middle, and last name from the
   * identity cipher item.
   *
   * @param fillScript - The autofill script to add the action to
   * @param filledFields - The fields that have already been filled
   * @param field - The field to fill
   * @param identity - The identity cipher item
   */
  private makeIdentityNameFillScript(
    fillScript: AutofillScript,
    filledFields: Record<string, AutofillField>,
    field: AutofillField,
    identity: IdentityView,
  ) {
    let name = "";
    if (identity.firstName) {
      name += identity.firstName;
    }

    if (identity.middleName) {
      name += !name ? identity.middleName : ` ${identity.middleName}`;
    }

    if (identity.lastName) {
      name += !name ? identity.lastName : ` ${identity.lastName}`;
    }

    this.makeScriptActionWithValue(fillScript, name, field, filledFields);
  }

  /**
   * Creates an identity address fill script action for the provided field. This is used
   * when filling a generic `address` field, using the address1, address2, and address3
   * from the identity cipher item.
   *
   * @param fillScript - The autofill script to add the action to
   * @param filledFields - The fields that have already been filled
   * @param field - The field to fill
   * @param identity - The identity cipher item
   */
  private makeIdentityAddressFillScript(
    fillScript: AutofillScript,
    filledFields: Record<string, AutofillField>,
    field: AutofillField,
    identity: IdentityView,
  ) {
    if (!identity.address1) {
      return;
    }

    let address = identity.address1;

    if (identity.address2) {
      address += `, ${identity.address2}`;
    }

    if (identity.address3) {
      address += `, ${identity.address3}`;
    }

    this.makeScriptActionWithValue(fillScript, address, field, filledFields);
  }

  /**
   * Creates an identity state fill script action for the provided field. This is used
   * when filling a `state` field, using the state value from the identity cipher item.
   * If the state value is a full name, it will be converted to an ISO code.
   *
   * @param fillScript - The autofill script to add the action to
   * @param filledFields - The fields that have already been filled
   * @param field - The field to fill
   * @param identity - The identity cipher item
   */
  private makeIdentityStateFillScript(
    fillScript: AutofillScript,
    filledFields: Record<string, AutofillField>,
    field: AutofillField,
    identity: IdentityView,
  ) {
    if (!identity.state) {
      return;
    }

    if (identity.state.length <= 2) {
      this.makeScriptActionWithValue(fillScript, identity.state, field, filledFields);
      return;
    }

    const stateLower = identity.state.toLowerCase();
    const isoState =
      IdentityAutoFillConstants.IsoStates[stateLower] ||
      IdentityAutoFillConstants.IsoProvinces[stateLower];
    if (isoState) {
      this.makeScriptActionWithValue(fillScript, isoState, field, filledFields);
    }
  }

  /**
   * Creates an identity country fill script action for the provided field. This is used
   * when filling a `country` field, using the country value from the identity cipher item.
   * If the country value is a full name, it will be converted to an ISO code.
   *
   * @param fillScript - The autofill script to add the action to
   * @param filledFields - The fields that have already been filled
   * @param field - The field to fill
   * @param identity - The identity cipher item
   */
  private makeIdentityCountryFillScript(
    fillScript: AutofillScript,
    filledFields: Record<string, AutofillField>,
    field: AutofillField,
    identity: IdentityView,
  ) {
    if (!identity.country) {
      return;
    }

    if (identity.country.length <= 2) {
      this.makeScriptActionWithValue(fillScript, identity.country, field, filledFields);
      return;
    }

    const countryLower = identity.country.toLowerCase();
    const isoCountry = IdentityAutoFillConstants.IsoCountries[countryLower];
    if (isoCountry) {
      this.makeScriptActionWithValue(fillScript, isoCountry, field, filledFields);
    }
  }

  /**
   * Accepts an HTMLInputElement type value and a list of
   * excluded types and returns true if the type is excluded.
   * @param {string} type
   * @param {string[]} excludedTypes
   * @returns {boolean}
   * @private
   */
  private static isExcludedType(type: string, excludedTypes: string[]) {
    return excludedTypes.indexOf(type) > -1;
  }

  /**
   * Identifies if a passed field contains text artifacts that identify it as a search field.
   *
   * @param field - The autofill field that we are validating as a search field
   */
  private static isSearchField(field: AutofillField) {
    const matchFieldAttributeValues = [field.type, field.htmlName, field.htmlID, field.placeholder];
    for (let attrIndex = 0; attrIndex < matchFieldAttributeValues.length; attrIndex++) {
      if (!matchFieldAttributeValues[attrIndex]) {
        continue;
      }

      // Separate camel case words and case them to lower case values
      const camelCaseSeparatedFieldAttribute = matchFieldAttributeValues[attrIndex]
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .toLowerCase();
      // Split the attribute by non-alphabetical characters to get the keywords
      const attributeKeywords = camelCaseSeparatedFieldAttribute.split(/[^a-z]/gi);

      for (let keywordIndex = 0; keywordIndex < attributeKeywords.length; keywordIndex++) {
        if (AutofillService.searchFieldNamesSet.has(attributeKeywords[keywordIndex])) {
          return true;
        }
      }
    }

    return false;
  }

  static isExcludedFieldType(field: AutofillField, excludedTypes: string[]) {
    if (AutofillService.forCustomFieldsOnly(field)) {
      return true;
    }

    if (this.isExcludedType(field.type, excludedTypes)) {
      return true;
    }

    // Check if the input is an untyped/mistyped search input
    return this.isSearchField(field);
  }

  /**
   * Accepts the value of a field, a list of possible options that define if
   * a field can be matched to a vault cipher, and a secondary optional list
   * of options that define if a field can be matched to a vault cipher. Returns
   * true if the field value matches one of the options.
   * @param {string} value
   * @param {string[]} options
   * @param {string[]} containsOptions
   * @returns {boolean}
   * @private
   */
  private static isFieldMatch(
    value: string,
    options: string[],
    containsOptions?: string[],
  ): boolean {
    value = value
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+/g, "");
    for (let i = 0; i < options.length; i++) {
      let option = options[i];
      const checkValueContains = containsOptions == null || containsOptions.indexOf(option) > -1;
      option = option.toLowerCase().replace(/-/g, "");
      if (value === option || (checkValueContains && value.indexOf(option) > -1)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Helper method used to create a script action for a field. Conditionally
   * accepts a fieldProp value that will be used in place of the dataProp value.
   * @param {AutofillScript} fillScript
   * @param cipherData
   * @param {{[p: string]: AutofillField}} fillFields
   * @param {{[p: string]: AutofillField}} filledFields
   * @param {string} dataProp
   * @param {string} fieldProp
   * @private
   */
  private makeScriptAction(
    fillScript: AutofillScript,
    cipherData: any,
    fillFields: { [id: string]: AutofillField },
    filledFields: { [id: string]: AutofillField },
    dataProp: string,
    fieldProp?: string,
  ) {
    fieldProp = fieldProp || dataProp;
    this.makeScriptActionWithValue(
      fillScript,
      cipherData[dataProp],
      fillFields[fieldProp],
      filledFields,
    );
  }

  /**
   * Handles updating the list of filled fields and adding a script action
   * to the fill script. If a select field is passed as part of the fill options,
   * we iterate over the options to check if the passed value matches one of the
   * options. If it does, we add a script action to select the option.
   * @param {AutofillScript} fillScript
   * @param dataValue
   * @param {AutofillField} field
   * @param {{[p: string]: AutofillField}} filledFields
   * @private
   */
  private makeScriptActionWithValue(
    fillScript: AutofillScript,
    dataValue: any,
    field: AutofillField,
    filledFields: { [id: string]: AutofillField },
  ) {
    let doFill = false;
    if (AutofillService.hasValue(dataValue) && field) {
      if (field.type === "select-one" && field.selectInfo && field.selectInfo.options) {
        for (let i = 0; i < field.selectInfo.options.length; i++) {
          const option = field.selectInfo.options[i];
          for (let j = 0; j < option.length; j++) {
            if (
              AutofillService.hasValue(option[j]) &&
              option[j].toLowerCase() === dataValue.toLowerCase()
            ) {
              doFill = true;
              if (option.length > 1) {
                dataValue = option[1];
              }
              break;
            }
          }

          if (doFill) {
            break;
          }
        }
      } else {
        doFill = true;
      }
    }

    if (doFill) {
      filledFields[field.opid] = field;
      AutofillService.fillByOpid(fillScript, field, dataValue);
    }
  }

  static valueIsLikePassword(value: string) {
    if (value == null) {
      return false;
    }
    // Removes all whitespace, _ and - characters
    const cleanedValue = value.toLowerCase().replace(/[\s_-]/g, "");

    if (cleanedValue.indexOf("password") < 0) {
      return false;
    }

    return !AutoFillConstants.PasswordFieldExcludeList.some((i) => cleanedValue.indexOf(i) > -1);
  }

  static fieldHasDisqualifyingAttributeValue(field: AutofillField) {
    const checkedAttributeValues = [field.htmlID, field.htmlName, field.placeholder];
    let valueIsOnExclusionList = false;

    for (let i = 0; i < checkedAttributeValues.length; i++) {
      const checkedAttributeValue = checkedAttributeValues[i];
      const cleanedValue = checkedAttributeValue?.toLowerCase().replace(/[\s_-]/g, "");

      valueIsOnExclusionList = Boolean(
        cleanedValue && AutoFillConstants.FieldIgnoreList.some((i) => cleanedValue.indexOf(i) > -1),
      );

      if (valueIsOnExclusionList) {
        break;
      }
    }

    return valueIsOnExclusionList;
  }

  /**
   * Accepts a pageDetails object with a list of fields and returns a list of
   * fields that are likely to be password fields.
   * @param {AutofillPageDetails} pageDetails
   * @param {boolean} canBeHidden
   * @param {boolean} canBeReadOnly
   * @param {boolean} mustBeEmpty
   * @param {boolean} fillNewPassword
   * @returns {AutofillField[]}
   */
  static loadPasswordFields(
    pageDetails: AutofillPageDetails,
    canBeHidden: boolean,
    canBeReadOnly: boolean,
    mustBeEmpty: boolean,
    fillNewPassword: boolean,
  ) {
    const arr: AutofillField[] = [];

    pageDetails.fields.forEach((f) => {
      const isPassword = f.type === "password";
      if (
        !isPassword &&
        AutofillService.isExcludedFieldType(f, AutoFillConstants.ExcludedAutofillLoginTypes)
      ) {
        return;
      }

      // If any attribute values match disqualifying values, the entire field should not be used
      if (AutofillService.fieldHasDisqualifyingAttributeValue(f)) {
        return;
      }

      const isLikePassword = () => {
        if (f.type !== "text") {
          return false;
        }

        const testedValues = [f.htmlID, f.htmlName, f.placeholder];
        for (let i = 0; i < testedValues.length; i++) {
          if (AutofillService.valueIsLikePassword(testedValues[i])) {
            return true;
          }
        }

        return false;
      };

      if (
        !f.disabled &&
        (canBeReadOnly || !f.readonly) &&
        (isPassword || isLikePassword()) &&
        (canBeHidden || f.viewable) &&
        (!mustBeEmpty || f.value == null || f.value.trim() === "") &&
        (fillNewPassword || f.autoCompleteType !== "new-password")
      ) {
        arr.push(f);
      }
    });

    return arr;
  }

  /**
   * Accepts a pageDetails object with a list of fields and returns a list of
   * fields that are likely to be username fields.
   * @param {AutofillPageDetails} pageDetails
   * @param {AutofillField} passwordField
   * @param {boolean} canBeHidden
   * @param {boolean} canBeReadOnly
   * @param {boolean} withoutForm
   * @returns {AutofillField}
   * @private
   */
  private findUsernameField(
    pageDetails: AutofillPageDetails,
    passwordField: AutofillField,
    canBeHidden: boolean,
    canBeReadOnly: boolean,
    withoutForm: boolean,
  ): AutofillField | null {
    let usernameField: AutofillField = null;
    for (let i = 0; i < pageDetails.fields.length; i++) {
      const f = pageDetails.fields[i];
      if (AutofillService.forCustomFieldsOnly(f)) {
        continue;
      }

      if (f.elementNumber >= passwordField.elementNumber) {
        break;
      }

      if (
        !f.disabled &&
        (canBeReadOnly || !f.readonly) &&
        (withoutForm || f.form === passwordField.form) &&
        (canBeHidden || f.viewable) &&
        (f.type === "text" || f.type === "email" || f.type === "tel")
      ) {
        usernameField = f;

        if (this.findMatchingFieldIndex(f, AutoFillConstants.UsernameFieldNames) > -1) {
          // We found an exact match. No need to keep looking.
          break;
        }
      }
    }

    return usernameField;
  }

  /**
   * Accepts a pageDetails object with a list of fields and returns a list of
   * fields that are likely to be TOTP fields.
   * @param {AutofillPageDetails} pageDetails
   * @param {AutofillField} passwordField
   * @param {boolean} canBeHidden
   * @param {boolean} canBeReadOnly
   * @param {boolean} withoutForm
   * @returns {AutofillField}
   * @private
   */
  private findTotpField(
    pageDetails: AutofillPageDetails,
    passwordField: AutofillField,
    canBeHidden: boolean,
    canBeReadOnly: boolean,
    withoutForm: boolean,
  ): AutofillField | null {
    let totpField: AutofillField = null;
    for (let i = 0; i < pageDetails.fields.length; i++) {
      const f = pageDetails.fields[i];
      if (AutofillService.forCustomFieldsOnly(f)) {
        continue;
      }

      const fieldIsDisqualified = AutofillService.fieldHasDisqualifyingAttributeValue(f);

      if (
        !fieldIsDisqualified &&
        !f.disabled &&
        (canBeReadOnly || !f.readonly) &&
        (withoutForm || f.form === passwordField.form) &&
        (canBeHidden || f.viewable) &&
        (f.type === "text" || f.type === "number") &&
        AutofillService.fieldIsFuzzyMatch(f, AutoFillConstants.TotpFieldNames)
      ) {
        totpField = f;

        if (
          this.findMatchingFieldIndex(f, AutoFillConstants.TotpFieldNames) > -1 ||
          f.autoCompleteType === "one-time-code"
        ) {
          // We found an exact match. No need to keep looking.
          break;
        }
      }
    }

    return totpField;
  }

  /**
   * Accepts a field and returns the index of the first matching property
   * present in a list of attribute names.
   * @param {AutofillField} field
   * @param {string[]} names
   * @returns {number}
   * @private
   */
  private findMatchingFieldIndex(field: AutofillField, names: string[]): number {
    for (let i = 0; i < names.length; i++) {
      if (names[i].indexOf("=") > -1) {
        if (this.fieldPropertyIsPrefixMatch(field, "htmlID", names[i], "id")) {
          return i;
        }
        if (this.fieldPropertyIsPrefixMatch(field, "htmlName", names[i], "name")) {
          return i;
        }
        if (this.fieldPropertyIsPrefixMatch(field, "label-left", names[i], "label")) {
          return i;
        }
        if (this.fieldPropertyIsPrefixMatch(field, "label-right", names[i], "label")) {
          return i;
        }
        if (this.fieldPropertyIsPrefixMatch(field, "label-tag", names[i], "label")) {
          return i;
        }
        if (this.fieldPropertyIsPrefixMatch(field, "label-aria", names[i], "label")) {
          return i;
        }
        if (this.fieldPropertyIsPrefixMatch(field, "placeholder", names[i], "placeholder")) {
          return i;
        }
      }

      if (this.fieldPropertyIsMatch(field, "htmlID", names[i])) {
        return i;
      }
      if (this.fieldPropertyIsMatch(field, "htmlName", names[i])) {
        return i;
      }
      if (this.fieldPropertyIsMatch(field, "label-left", names[i])) {
        return i;
      }
      if (this.fieldPropertyIsMatch(field, "label-right", names[i])) {
        return i;
      }
      if (this.fieldPropertyIsMatch(field, "label-tag", names[i])) {
        return i;
      }
      if (this.fieldPropertyIsMatch(field, "label-aria", names[i])) {
        return i;
      }
      if (this.fieldPropertyIsMatch(field, "placeholder", names[i])) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Accepts a field, property, name, and prefix and returns true if the field
   * contains a value that matches the given prefixed property.
   * @param field
   * @param {string} property
   * @param {string} name
   * @param {string} prefix
   * @param {string} separator
   * @returns {boolean}
   * @private
   */
  private fieldPropertyIsPrefixMatch(
    field: any,
    property: string,
    name: string,
    prefix: string,
    separator = "=",
  ): boolean {
    if (name.indexOf(prefix + separator) === 0) {
      const sepIndex = name.indexOf(separator);
      const val = name.substring(sepIndex + 1);
      return val != null && this.fieldPropertyIsMatch(field, property, val);
    }
    return false;
  }

  /**
   * Identifies if a given property within a field matches the value
   * of the passed "name" parameter. If the name starts with "regex=",
   * the value is tested against a case-insensitive regular expression.
   * If the name starts with "csv=", the value is treated as a
   * comma-separated list of values to match.
   * @param field
   * @param {string} property
   * @param {string} name
   * @returns {boolean}
   * @private
   */
  private fieldPropertyIsMatch(field: any, property: string, name: string): boolean {
    let fieldVal = field[property] as string;
    if (!AutofillService.hasValue(fieldVal)) {
      return false;
    }

    fieldVal = fieldVal.trim().replace(/(?:\r\n|\r|\n)/g, "");
    if (name.startsWith("regex=")) {
      try {
        const regexParts = name.split("=", 2);
        if (regexParts.length === 2) {
          const regex = new RegExp(regexParts[1], "i");
          return regex.test(fieldVal);
        }
      } catch (e) {
        this.logService.error(e);
      }
    } else if (name.startsWith("csv=")) {
      const csvParts = name.split("=", 2);
      if (csvParts.length === 2) {
        const csvVals = csvParts[1].split(",");
        for (let i = 0; i < csvVals.length; i++) {
          const val = csvVals[i];
          if (val != null && val.trim().toLowerCase() === fieldVal.toLowerCase()) {
            return true;
          }
        }
        return false;
      }
    }

    return fieldVal.toLowerCase() === name;
  }

  /**
   * Accepts a field and returns true if the field contains a
   * value that matches any of the names in the provided list.
   * @param {AutofillField} field
   * @param {string[]} names
   * @returns {boolean}
   */
  static fieldIsFuzzyMatch(field: AutofillField, names: string[]): boolean {
    if (AutofillService.hasValue(field.htmlID) && this.fuzzyMatch(names, field.htmlID)) {
      return true;
    }
    if (AutofillService.hasValue(field.htmlName) && this.fuzzyMatch(names, field.htmlName)) {
      return true;
    }
    if (
      AutofillService.hasValue(field["label-tag"]) &&
      this.fuzzyMatch(names, field["label-tag"])
    ) {
      return true;
    }
    if (AutofillService.hasValue(field.placeholder) && this.fuzzyMatch(names, field.placeholder)) {
      return true;
    }
    if (
      AutofillService.hasValue(field["label-left"]) &&
      this.fuzzyMatch(names, field["label-left"])
    ) {
      return true;
    }
    if (
      AutofillService.hasValue(field["label-top"]) &&
      this.fuzzyMatch(names, field["label-top"])
    ) {
      return true;
    }
    if (
      AutofillService.hasValue(field["label-aria"]) &&
      this.fuzzyMatch(names, field["label-aria"])
    ) {
      return true;
    }

    return false;
  }

  /**
   * Accepts a list of options and a value and returns
   * true if the value matches any of the options.
   * @param {string[]} options
   * @param {string} value
   * @returns {boolean}
   * @private
   */
  private static fuzzyMatch(options: string[], value: string): boolean {
    if (options == null || options.length === 0 || value == null || value === "") {
      return false;
    }

    value = value
      .replace(/(?:\r\n|\r|\n)/g, "")
      .trim()
      .toLowerCase();

    for (let i = 0; i < options.length; i++) {
      if (value.indexOf(options[i]) > -1) {
        return true;
      }
    }

    return false;
  }

  /**
   * Accepts a string and returns true if the
   * string is not falsy and not empty.
   * @param {string} str
   * @returns {boolean}
   */
  static hasValue(str: string): boolean {
    return Boolean(str && str !== "");
  }

  /**
   * Sets the `focus_by_opid` autofill script
   * action to the last field that was filled.
   * @param {{[p: string]: AutofillField}} filledFields
   * @param {AutofillScript} fillScript
   * @returns {AutofillScript}
   */
  static setFillScriptForFocus(
    filledFields: { [id: string]: AutofillField },
    fillScript: AutofillScript,
  ): AutofillScript {
    let lastField: AutofillField = null;
    let lastPasswordField: AutofillField = null;

    for (const opid in filledFields) {
      // eslint-disable-next-line
      if (filledFields.hasOwnProperty(opid) && filledFields[opid].viewable) {
        lastField = filledFields[opid];

        if (filledFields[opid].type === "password") {
          lastPasswordField = filledFields[opid];
        }
      }
    }

    // Prioritize password field over others.
    if (lastPasswordField) {
      fillScript.script.push(["focus_by_opid", lastPasswordField.opid]);
    } else if (lastField) {
      fillScript.script.push(["focus_by_opid", lastField.opid]);
    }

    return fillScript;
  }

  /**
   * Updates a fill script to place the `cilck_on_opid`, `focus_on_opid`, and `fill_by_opid`
   * fill script actions associated with the provided field.
   * @param {AutofillScript} fillScript
   * @param {AutofillField} field
   * @param {string} value
   */
  static fillByOpid(fillScript: AutofillScript, field: AutofillField, value: string): void {
    if (field.maxLength && value && value.length > field.maxLength) {
      value = value.substr(0, value.length);
    }
    if (field.tagName !== "span") {
      fillScript.script.push(["click_on_opid", field.opid]);
      fillScript.script.push(["focus_by_opid", field.opid]);
    }
    fillScript.script.push(["fill_by_opid", field.opid, value]);
  }

  /**
   * Identifies if the field is a custom field, a custom
   * field is defined as a field that is a `span` element.
   * @param {AutofillField} field
   * @returns {boolean}
   */
  static forCustomFieldsOnly(field: AutofillField): boolean {
    return field.tagName === "span";
  }

  /**
   * Handles debouncing the opening of the master password reprompt popout.
   */
  private isDebouncingPasswordRepromptPopout() {
    if (this.currentlyOpeningPasswordRepromptPopout) {
      return true;
    }

    this.currentlyOpeningPasswordRepromptPopout = true;
    clearTimeout(this.openPasswordRepromptPopoutDebounce);

    this.openPasswordRepromptPopoutDebounce = setTimeout(() => {
      this.currentlyOpeningPasswordRepromptPopout = false;
    }, 100);

    return false;
  }

  /**
   * Handles incoming long-lived connections from injected autofill scripts.
   * Stores the port in a set to facilitate disconnecting ports if the extension
   * needs to re-inject the autofill scripts.
   *
   * @param port - The port that was connected
   */
  private handleInjectedScriptPortConnection = (port: chrome.runtime.Port) => {
    if (port.name !== AutofillPort.InjectedScript) {
      return;
    }

    this.autofillScriptPortsSet.add(port);
    port.onDisconnect.addListener(this.handleInjectScriptPortOnDisconnect);
  };

  /**
   * Handles disconnecting ports that relate to injected autofill scripts.

   * @param port - The port that was disconnected
   */
  private handleInjectScriptPortOnDisconnect = (port: chrome.runtime.Port) => {
    if (port.name !== AutofillPort.InjectedScript) {
      return;
    }

    this.autofillScriptPortsSet.delete(port);
  };

  /**
   * Queries all open tabs in the user's browsing session
   * and injects the autofill scripts into the page.
   */
  private async injectAutofillScriptsInAllTabs() {
    const tabs = await BrowserApi.tabsQuery({});
    for (let index = 0; index < tabs.length; index++) {
      const tab = tabs[index];
      if (tab.url?.startsWith("http")) {
        const frames = await BrowserApi.getAllFrameDetails(tab.id);
        frames.forEach((frame) => this.injectAutofillScripts(tab, frame.frameId, false));
      }
    }
  }

  /**
   * Updates the autofill inline menu visibility setting in all active tabs
   * when the InlineMenuVisibilitySetting observable is updated.
   *
   * @param previousSetting - The previous setting value
   * @param currentSetting - The current setting value
   */
  private async handleInlineMenuVisibilityChange(
    previousSetting: InlineMenuVisibilitySetting,
    currentSetting: InlineMenuVisibilitySetting,
  ) {
    if (previousSetting === undefined || previousSetting === currentSetting) {
      return;
    }

    const inlineMenuPreviouslyDisabled = previousSetting === AutofillOverlayVisibility.Off;
    const inlineMenuCurrentlyDisabled = currentSetting === AutofillOverlayVisibility.Off;
    if (!inlineMenuPreviouslyDisabled && !inlineMenuCurrentlyDisabled) {
      const tabs = await BrowserApi.tabsQuery({});
      tabs.forEach((tab) =>
        BrowserApi.tabSendMessageData(tab, "updateAutofillInlineMenuVisibility", {
          inlineMenuVisibility: currentSetting,
        }),
      );
      return;
    }

    await this.reloadAutofillScripts();
  }
}
