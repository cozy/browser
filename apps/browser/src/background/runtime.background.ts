import { firstValueFrom, map, mergeMap } from "rxjs";

import { NotificationsService } from "@bitwarden/common/abstractions/notifications.service";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { AutofillOverlayVisibility } from "@bitwarden/common/autofill/constants";
import { AutofillSettingsServiceAbstraction } from "@bitwarden/common/autofill/services/autofill-settings.service";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { MessagingService } from "@bitwarden/common/platform/abstractions/messaging.service";
import { SystemService } from "@bitwarden/common/platform/abstractions/system.service";
import { devFlagEnabled } from "@bitwarden/common/platform/misc/flags";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { CipherType } from "@bitwarden/common/vault/enums";

import { MessageListener, isExternalMessage } from "../../../../libs/common/src/platform/messaging";
import {
  closeUnlockPopout,
  openSsoAuthResultPopout,
  openTwoFactorAuthPopout,
} from "../auth/popup/utils/auth-popout-window";
import { LockedVaultPendingNotificationsData } from "../autofill/background/abstractions/notification.background";
import { AutofillService } from "../autofill/services/abstractions/autofill.service";
import { BrowserApi } from "../platform/browser/browser-api";
import { BrowserEnvironmentService } from "../platform/services/browser-environment.service";
import { BrowserPlatformUtilsService } from "../platform/services/platform-utils/browser-platform-utils.service";
import { Fido2Background } from "../vault/fido2/background/abstractions/fido2.background";

import MainBackground from "./main.background";

// Cozy Imports
/* eslint-disable */
import { AuthService } from "@bitwarden/common/auth/services/auth.service";
import { AuthenticationStatus } from "@bitwarden/common/auth/enums/authentication-status";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { CipherWithIdExport as CipherExport } from "@bitwarden/common/models/export/cipher-with-ids.export";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CipherType } from "@bitwarden/common/vault/enums/cipher-type";
import { CozyClientService } from "src/popup/services/cozyClient.service";
import { CryptoService } from "@bitwarden/common/abstractions/crypto.service";
import { EncString } from "@bitwarden/common/models/domain/enc-string";
import { HashPurpose } from "@bitwarden/common/enums/hashPurpose";
import { PasswordRequest } from "@bitwarden/common/auth/models/request/password.request";
import { PasswordLogInCredentials } from "@bitwarden/common/auth/models/domain/log-in-credentials";
import { SyncService } from "@bitwarden/common/vault/abstractions/sync/sync.service.abstraction";
import { BrowserStateService as StateService } from "src/services/browser-state.service";
import { VaultTimeoutService } from "@bitwarden/common/abstractions/vaultTimeout/vaultTimeout.service";
import { VaultTimeoutSettingsService } from "@bitwarden/common/abstractions/vaultTimeout/vaultTimeoutSettings.service";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
/* eslint-enable */
// End Cozy imports

export default class RuntimeBackground {
  private autofillTimeout: any;
  private pageDetailsToAutoFill: any[] = [];
  private onInstalledReason: string = null;
  private lockedVaultPendingNotifications: LockedVaultPendingNotificationsData[] = [];

  constructor(
    private main: MainBackground,
    private autofillService: AutofillService,
    private platformUtilsService: BrowserPlatformUtilsService,
    private notificationsService: NotificationsService,
    private autofillSettingsService: AutofillSettingsServiceAbstraction,
    private systemService: SystemService,
    private environmentService: BrowserEnvironmentService,
    private messagingService: MessagingService,
    private logService: LogService,
    private configService: ConfigService,
    private fido2Background: Fido2Background,
    private messageListener: MessageListener,
    private accountService: AccountService,
  ) {
    // onInstalled listener must be wired up before anything else, so we do it in the ctor
    chrome.runtime.onInstalled.addListener((details: any) => {
      this.onInstalledReason = details.reason;
    });
  }

  async init() {
    if (!chrome.runtime) {
      return;
    }

    await this.checkOnInstalled();
    const backgroundMessageListener = (
      msg: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: any) => void,
    ) => {
      const messagesWithResponse = ["biometricUnlock"];

      if (messagesWithResponse.includes(msg.command)) {
        this.processMessageWithSender(msg, sender).then(
          (value) => sendResponse({ result: value }),
          (error) => sendResponse({ error: { ...error, message: error.message } }),
        );
        return true;
      }

      void this.processMessageWithSender(msg, sender).catch((err) =>
        this.logService.error(
          `Error while processing message in RuntimeBackground '${msg?.command}'.`,
          err,
        ),
      );
      return false;
    };

    this.messageListener.allMessages$
      .pipe(
        mergeMap(async (message: any) => {
          try {
            await this.processMessage(message);
          } catch (err) {
            this.logService.error(err);
          }
        }),
      )
      .subscribe();

    // For messages that require the full on message interface
    BrowserApi.messageListener("runtime.background", backgroundMessageListener);
  }

  // Messages that need the chrome sender and send back a response need to be registered in this method.
  async processMessageWithSender(msg: any, sender: chrome.runtime.MessageSender) {
    switch (msg.command) {
      case "triggerAutofillScriptInjection":
        await this.autofillService.injectAutofillScripts(sender.tab, sender.frameId);
        break;
      case "bgCollectPageDetails":
        await this.main.collectPageDetailsForContentScript(sender.tab, msg.sender, sender.frameId);
        break;
      case "collectPageDetailsResponse":
        switch (msg.sender) {
          case "notificationBar": {
            /* auttofill.js sends the page details requested by the notification bar.
                Result will be used by both the notificationBar and for the inPageMenu.
                inPageMenu requires a fillscrip to know wich fields are relevant for the menu and which
                is the type of each field in order to adapt the menu content (cards, identities, login or
                existing logins)
              */
            // 1- request a fill script for the in-page-menu (if activated)
            let enableInPageMenu = await this.stateService.getEnableInPageMenu();
            // default to true
            if (enableInPageMenu === null) {
              enableInPageMenu = true;
            }
            if (enableInPageMenu) {
              // If goes here : means that the page has just been loaded while addon was already connected
              // get scripts for logins, cards and identities

              const fieldsForAutofillMenuScripts =
                await this.autofillService.generateFieldsForInPageMenuScripts(
                  msg.details,
                  true,
                  sender.frameId
                );
              // get script for existing logins.
              // the 4 scripts (existing logins, logins, cards and identities) will be sent
              // to autofill.js by autofill.service
              try {
                await this.autofillService.doAutoFillActiveTab(
                  [
                    {
                      frameId: sender.frameId,
                      tab: msg.tab,
                      details: msg.details,
                      fieldsForInPageMenuScripts: fieldsForAutofillMenuScripts,
                      sender: "notifBarForInPageMenu", // to prepare a fillscript for the in-page-menu
                    },
                  ],
                  true
                );
              } catch (error) {
                // the `doAutoFillActiveTab` is run in a `try` because the original BW code
                // casts an error when no autofill is detected;
              }
            }
            // 2- send page details to the notification bar
            const forms = this.autofillService.getFormsWithPasswordFields(msg.details);
            await BrowserApi.tabSendMessageData(msg.tab, "notificationBarPageDetails", {
              details: msg.details,
              forms: forms,
            });

            break;
          }
          case "autofiller":
          case "autofill_cmd": {
            const activeUserId = await firstValueFrom(
              this.accountService.activeAccount$.pipe(map((a) => a?.id)),
            );
            await this.accountService.setAccountActivity(activeUserId, new Date());
            const totpCode = await this.autofillService.doAutoFillActiveTab(
              [
                {
                  frameId: sender.frameId,
                  tab: msg.tab,
                  details: msg.details,
                  sender: msg.sender,
                },
              ],
              msg.sender === "autofill_cmd",
            );
            if (totpCode != null) {
              this.platformUtilsService.copyToClipboard(totpCode);
            }
            break;
          }
          case "autofill_card": {
            await this.autofillService.doAutoFillActiveTab(
              [
                {
                  frameId: sender.frameId,
                  tab: msg.tab,
                  details: msg.details,
                },
              ],
              false,
              CipherType.Card,
            );
            break;
          }
          case "autofill_identity": {
            await this.autofillService.doAutoFillActiveTab(
              [
                {
                  frameId: sender.frameId,
                  tab: msg.tab,
                  details: msg.details,
                },
              ],
              false,
              CipherType.Identity,
            );
            break;
          }
          case "contextMenu":
            clearTimeout(this.autofillTimeout);
            this.pageDetailsToAutoFill.push({
              frameId: sender.frameId,
              tab: msg.tab,
              details: msg.details,
            });
            this.autofillTimeout = setTimeout(async () => await this.autofillPage(msg.tab), 300);
            break;
          default:
            break;
        }
        break;
      case "biometricUnlock": {
        const result = await this.main.biometricUnlock();
        return result;
      }
    }
  }

  async processMessage(msg: any) {
    switch (msg.command) {
      case "loggedIn":
      case "unlocked": {
        let item: LockedVaultPendingNotificationsData;

        if (msg.command === "loggedIn") {
          await this.sendBwInstalledMessageToVault();
        }

        if (this.lockedVaultPendingNotifications?.length > 0) {
          item = this.lockedVaultPendingNotifications.pop();
          await closeUnlockPopout();
        }

        await this.notificationsService.updateConnection(msg.command === "loggedIn");
        this.systemService.cancelProcessReload();

        if (item) {
          await BrowserApi.focusWindow(item.commandToRetry.sender.tab.windowId);
          await BrowserApi.focusTab(item.commandToRetry.sender.tab.id);
          await BrowserApi.tabSendMessageData(
            item.commandToRetry.sender.tab,
            "unlockCompleted",
            item,
          );
        }

        // @TODO these need to happen last to avoid blocking `tabSendMessageData` above
        // The underlying cause exists within `cipherService.getAllDecrypted` via
        // `getAllDecryptedForUrl` and is anticipated to be refactored
        await this.main.refreshBadge();
        await this.main.refreshMenu(false);

        break;
      }
      case "addToLockedVaultPendingNotifications":
        this.lockedVaultPendingNotifications.push(msg.data);
        break;
      case "logout":
        await this.main.logout(msg.expired, msg.userId);
        break;
      case "syncCompleted":
        if (msg.successfully) {
          setTimeout(async () => {
            await this.main.refreshBadge();
            await this.main.refreshMenu();
          }, 2000);
          await this.configService.ensureConfigFetched();
        }
        break;
      case "openPopup":
        await this.main.openPopup();
        break;
      case "bgUpdateContextMenu":
      case "editedCipher":
      case "addedCipher":
      case "deletedCipher":
        await this.main.refreshBadge();
        await this.main.refreshMenu();
        break;
      case "bgReseedStorage":
        await this.main.reseedStorage();
        break;
      case "authResult": {
        const env = await firstValueFrom(this.environmentService.environment$);
        const vaultUrl = env.getWebVaultUrl();

        if (msg.referrer == null || Utils.getHostname(vaultUrl) !== msg.referrer) {
          return;
        }

        if (msg.lastpass) {
          this.messagingService.send("importCallbackLastPass", {
            code: msg.code,
            state: msg.state,
          });
        } else {
          try {
            await openSsoAuthResultPopout(msg);
          } catch {
            this.logService.error("Unable to open sso popout tab");
          }
        }
        break;
      }
      case "webAuthnResult": {
        const env = await firstValueFrom(this.environmentService.environment$);
        const vaultUrl = env.getWebVaultUrl();

        if (msg.referrer == null || Utils.getHostname(vaultUrl) !== msg.referrer) {
          return;
        }

        await openTwoFactorAuthPopout(msg);
        break;
      }
      case "reloadPopup":
        if (isExternalMessage(msg)) {
          this.messagingService.send("reloadPopup");
        }
        break;
      case "emailVerificationRequired":
        this.messagingService.send("showDialog", {
          title: { key: "emailVerificationRequired" },
          content: { key: "emailVerificationRequiredDesc" },
          acceptButtonText: { key: "ok" },
          cancelButtonText: null,
          type: "info",
        });
        break;
      case "getClickedElementResponse":
        this.platformUtilsService.copyToClipboard(msg.identifier);
        break;
      case "switchAccount": {
        await this.main.switchAccount(msg.userId);
        break;
      }
      case "clearClipboard": {
        await this.main.clearClipboard(msg.clipboardValue, msg.timeoutMs);
        break;
      }
    }
  }

  private async autofillPage(tabToAutoFill: chrome.tabs.Tab) {
    const totpCode = await this.autofillService.doAutoFill({
      tab: tabToAutoFill,
      cipher: this.main.loginToAutoFill,
      pageDetails: this.pageDetailsToAutoFill,
      fillNewPassword: true,
      allowTotpAutofill: true,
    });

    if (totpCode != null) {
      this.platformUtilsService.copyToClipboard(totpCode);
    }

    // reset
    this.main.loginToAutoFill = null;
    this.pageDetailsToAutoFill = [];
  }

  private async checkOnInstalled() {
    setTimeout(async () => {
      void this.fido2Background.injectFido2ContentScriptsInAllTabs();
      void this.autofillService.loadAutofillScriptsOnInstall();

      if (this.onInstalledReason != null) {
        if (this.onInstalledReason === "install") {
          if (!devFlagEnabled("skipWelcomeOnInstall")) {
            void BrowserApi.createNewTab("https://bitwarden.com/browser-start/");
          }

          await this.autofillSettingsService.setInlineMenuVisibility(
            AutofillOverlayVisibility.OnFieldFocus,
          );

          if (await this.environmentService.hasManagedEnvironment()) {
            await this.environmentService.setUrlsToManagedEnvironment();
          }
        end custo */
        }

        // Execute the content-script on all tabs in case cozy-passwords is waiting for an answer
        const allTabs = await BrowserApi.getAllTabs();
        for (const tab of allTabs) {
          chrome.tabs.executeScript(tab.id, { file: "content/appInfo.js" });
        }
        this.onInstalledReason = null;
      }
    }, 100);
  }

  async sendBwInstalledMessageToVault() {
    try {
      const env = await firstValueFrom(this.environmentService.environment$);
      const vaultUrl = env.getWebVaultUrl();
      const urlObj = new URL(vaultUrl);

      const tabs = await BrowserApi.tabsQuery({ url: `${urlObj.href}*` });

      if (!tabs?.length) {
        return;
      }

      for (const tab of tabs) {
        await BrowserApi.executeScriptInTab(tab.id, {
          file: "content/send-on-installed-message.js",
          runAt: "document_end",
        });
      }
    } catch (e) {
      this.logService.error(`Error sending on installed message to vault: ${e}`);
    }
  }
}
