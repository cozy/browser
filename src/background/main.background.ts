import { CipherRepromptType } from "jslib-common/enums/cipherRepromptType";
import { CipherType } from "jslib-common/enums/cipherType";

import { CipherView } from "jslib-common/models/view/cipherView";

import { GlobalState } from "jslib-common/models/domain/globalState";

// import { ApiService } from "jslib-common/services/api.service";
import { AppIdService } from "jslib-common/services/appId.service";
import { AuditService } from "jslib-common/services/audit.service";
// import { AuthService } from 'jslib-common/services/auth.service';
// import { CipherService } from 'jslib-common/services/cipher.service';
import { CollectionService } from "jslib-common/services/collection.service";
import { ConsoleLogService } from "jslib-common/services/consoleLog.service";
import { ContainerService } from "jslib-common/services/container.service";
import { EnvironmentService } from "jslib-common/services/environment.service";
import { EventService } from "jslib-common/services/event.service";
// import { ExportService } from "jslib-common/services/export.service";
import { FileUploadService } from "jslib-common/services/fileUpload.service";
import { FolderService } from "jslib-common/services/folder.service";
import { KeyConnectorService } from "jslib-common/services/keyConnector.service";
import { NotificationsService } from "jslib-common/services/notifications.service";
// import { OrganizationService } from "jslib-common/services/organization.service";
import { PasswordGenerationService } from "jslib-common/services/passwordGeneration.service";
import { PolicyService } from "jslib-common/services/policy.service";
import { ProviderService } from "jslib-common/services/provider.service";
import { SearchService } from "jslib-common/services/search.service";
import { SendService } from "jslib-common/services/send.service";
import { SettingsService } from "jslib-common/services/settings.service";
import { StateMigrationService } from "jslib-common/services/stateMigration.service";
// import { SyncService } from 'jslib-common/services/sync.service';
import { SystemService } from "jslib-common/services/system.service";
import { TokenService } from "jslib-common/services/token.service";
import { TotpService } from "jslib-common/services/totp.service";
import { TwoFactorService } from "jslib-common/services/twoFactor.service";
import { UserVerificationService } from "jslib-common/services/userVerification.service";
import { WebCryptoFunctionService } from "jslib-common/services/webCryptoFunction.service";

import { ApiService as ApiServiceAbstraction } from "jslib-common/abstractions/api.service";
import { AppIdService as AppIdServiceAbstraction } from "jslib-common/abstractions/appId.service";
import { AuditService as AuditServiceAbstraction } from "jslib-common/abstractions/audit.service";
import { AuthService as AuthServiceAbstraction } from "jslib-common/abstractions/auth.service";
import { CipherService as CipherServiceAbstraction } from "jslib-common/abstractions/cipher.service";
import { CollectionService as CollectionServiceAbstraction } from "jslib-common/abstractions/collection.service";
import { CryptoService as CryptoServiceAbstraction } from "jslib-common/abstractions/crypto.service";
import { CryptoFunctionService as CryptoFunctionServiceAbstraction } from "jslib-common/abstractions/cryptoFunction.service";
import { EnvironmentService as EnvironmentServiceAbstraction } from "jslib-common/abstractions/environment.service";
import { EventService as EventServiceAbstraction } from "jslib-common/abstractions/event.service";
import { ExportService as ExportServiceAbstraction } from "jslib-common/abstractions/export.service";
import { FileUploadService as FileUploadServiceAbstraction } from "jslib-common/abstractions/fileUpload.service";
import { FolderService as FolderServiceAbstraction } from "jslib-common/abstractions/folder.service";
import { I18nService as I18nServiceAbstraction } from "jslib-common/abstractions/i18n.service";
import { KeyConnectorService as KeyConnectorServiceAbstraction } from "jslib-common/abstractions/keyConnector.service";
import { LogService as LogServiceAbstraction } from "jslib-common/abstractions/log.service";
// import { MessagingService as MessagingServiceAbstraction } from 'jslib-common/abstractions/messaging.service';
import { NotificationsService as NotificationsServiceAbstraction } from "jslib-common/abstractions/notifications.service";
import { OrganizationService as OrganizationServiceAbstraction } from "jslib-common/abstractions/organization.service";
import { PasswordGenerationService as PasswordGenerationServiceAbstraction } from "jslib-common/abstractions/passwordGeneration.service";
import { PlatformUtilsService as PlatformUtilsServiceAbstraction } from "jslib-common/abstractions/platformUtils.service";
import { PolicyService as PolicyServiceAbstraction } from "jslib-common/abstractions/policy.service";
import { ProviderService as ProviderServiceAbstraction } from "jslib-common/abstractions/provider.service";
import { SearchService as SearchServiceAbstraction } from "jslib-common/abstractions/search.service";
import { SendService as SendServiceAbstraction } from "jslib-common/abstractions/send.service";
import { SettingsService as SettingsServiceAbstraction } from "jslib-common/abstractions/settings.service";
import { StorageService as StorageServiceAbstraction } from "jslib-common/abstractions/storage.service";
import { SyncService as SyncServiceAbstraction } from "jslib-common/abstractions/sync.service";
import { SystemService as SystemServiceAbstraction } from "jslib-common/abstractions/system.service";
import { TokenService as TokenServiceAbstraction } from "jslib-common/abstractions/token.service";
import { TotpService as TotpServiceAbstraction } from "jslib-common/abstractions/totp.service";
import { TwoFactorService as TwoFactorServiceAbstraction } from "jslib-common/abstractions/twoFactor.service";
import { UserVerificationService as UserVerificationServiceAbstraction } from "jslib-common/abstractions/userVerification.service";
import { VaultTimeoutService as VaultTimeoutServiceAbstraction } from "jslib-common/abstractions/vaultTimeout.service";

import { AutofillService as AutofillServiceAbstraction } from "../services/abstractions/autofill.service";

import { BrowserApi } from "../browser/browserApi";
import { SafariApp } from "../browser/safariApp";

import CommandsBackground from "./commands.background";
import ContextMenusBackground from "./contextMenus.background";
import IdleBackground from "./idle.background";
import { NativeMessagingBackground } from "./nativeMessaging.background";
import NotificationBackground from "./notification.background";
import RuntimeBackground from "./runtime.background";
import TabsBackground from "./tabs.background";
import WebRequestBackground from "./webRequest.background";
import WindowsBackground from "./windows.background";

import { StateService as StateServiceAbstraction } from "../services/abstractions/state.service";

import { PopupUtilsService } from "../popup/services/popup-utils.service";
import AutofillService from "../services/autofill.service";
import { BrowserCryptoService } from "../services/browserCrypto.service";
import BrowserMessagingService from "../services/browserMessaging.service";
import BrowserPlatformUtilsService from "../services/browserPlatformUtils.service";
import BrowserStorageService from "../services/browserStorage.service";
import I18nService from "../services/i18n.service";
import { StateService } from "../services/state.service";
import VaultTimeoutService from "../services/vaultTimeout.service";

import { Account } from "../models/account";

import { GlobalStateFactory } from "jslib-common/factories/globalStateFactory";
import { StateFactory } from "jslib-common/factories/stateFactory";

/* start Cozy imports */
import { ApiService } from "../services/api.service";
import { AuthService } from "../services/auth.service";
import { BrowserCryptoService as CryptoService } from "../services/browserCrypto.service";
import { CipherService } from "../popup/services/cipher.service";
import { CozyClientService } from "../popup/services/cozyClient.service";
import { ExportService } from "../services/export.service";
import { KonnectorsService } from "../popup/services/konnectors.service";
import { MessagingService as MessagingServiceAbstraction } from "../services/abstractions/messaging.service";
import { OrganizationService } from "../popup/services/organization.service";
import { SyncService } from "../popup/services/sync.service";
import { UserService } from "../popup/services/user.service";
/* end Cozy imports */

export default class MainBackground {
  messagingService: MessagingServiceAbstraction;
  storageService: StorageServiceAbstraction;
  secureStorageService: StorageServiceAbstraction;
  i18nService: I18nServiceAbstraction;
  platformUtilsService: PlatformUtilsServiceAbstraction;
  logService: LogServiceAbstraction;
  cryptoService: CryptoService;
  cryptoFunctionService: CryptoFunctionServiceAbstraction;
  tokenService: TokenServiceAbstraction;
  appIdService: AppIdServiceAbstraction;
  apiService: ApiServiceAbstraction;
  environmentService: EnvironmentServiceAbstraction;
  userService: UserService;
  settingsService: SettingsServiceAbstraction;
  cipherService: CipherService;
  folderService: FolderServiceAbstraction;
  collectionService: CollectionServiceAbstraction;
  vaultTimeoutService: VaultTimeoutServiceAbstraction;
  syncService: SyncServiceAbstraction;
  passwordGenerationService: PasswordGenerationServiceAbstraction;
  totpService: TotpServiceAbstraction;
  autofillService: AutofillServiceAbstraction;
  containerService: ContainerService;
  auditService: AuditServiceAbstraction;
  authService: AuthService;
  exportService: ExportServiceAbstraction;
  searchService: SearchServiceAbstraction;
  notificationsService: NotificationsServiceAbstraction;
  stateService: StateServiceAbstraction;
  stateMigrationService: StateMigrationService;
  systemService: SystemServiceAbstraction;
  eventService: EventServiceAbstraction;
  policyService: PolicyServiceAbstraction;
  popupUtilsService: PopupUtilsService;
  sendService: SendServiceAbstraction;
  fileUploadService: FileUploadServiceAbstraction;
  organizationService: OrganizationServiceAbstraction;
  providerService: ProviderServiceAbstraction;
  keyConnectorService: KeyConnectorServiceAbstraction;
  userVerificationService: UserVerificationServiceAbstraction;
  twoFactorService: TwoFactorServiceAbstraction;
  cozyClientService: CozyClientService;
  konnectorsService: KonnectorsService;

  onUpdatedRan: boolean;
  onReplacedRan: boolean;
  loginToAutoFill: CipherView = null;

  private commandsBackground: CommandsBackground;
  private contextMenusBackground: ContextMenusBackground;
  private idleBackground: IdleBackground;
  private notificationBackground: NotificationBackground;
  private runtimeBackground: RuntimeBackground;
  private tabsBackground: TabsBackground;
  private webRequestBackground: WebRequestBackground;
  private windowsBackground: WindowsBackground;

  private sidebarAction: any;
  private buildingContextMenu: boolean;
  private menuOptionsLoaded: any[] = [];
  private syncTimeout: any;
  private isSafari: boolean;
  private nativeMessagingBackground: NativeMessagingBackground;

  constructor() {
    // Services
    this.messagingService = new BrowserMessagingService();
    this.storageService = new BrowserStorageService();
    this.secureStorageService = new BrowserStorageService();
    this.logService = new ConsoleLogService(false);
    this.stateMigrationService = new StateMigrationService(
      this.storageService,
      this.secureStorageService,
      new StateFactory(GlobalState, Account)
    );
    this.stateService = new StateService(
      this.storageService,
      this.secureStorageService,
      this.logService,
      this.stateMigrationService,
      new StateFactory(GlobalState, Account)
    );
    this.platformUtilsService = new BrowserPlatformUtilsService(
      this.messagingService,
      this.stateService,
      (clipboardValue, clearMs) => {
        if (this.systemService != null) {
          this.systemService.clearClipboard(clipboardValue, clearMs);
        }
      },
      async () => {
        if (this.nativeMessagingBackground != null) {
          const promise = this.nativeMessagingBackground.getResponse();

          try {
            await this.nativeMessagingBackground.send({ command: "biometricUnlock" });
          } catch (e) {
            return Promise.reject(e);
          }

          return promise.then((result) => result.response === "unlocked");
        }
      }
    );
    this.i18nService = new I18nService(BrowserApi.getUILanguage(window));
    this.cryptoFunctionService = new WebCryptoFunctionService(window, this.platformUtilsService);
    this.cryptoService = new BrowserCryptoService(
      this.cryptoFunctionService,
      this.platformUtilsService,
      this.logService,
      this.stateService
    );
    this.tokenService = new TokenService(this.stateService);
    this.appIdService = new AppIdService(this.storageService);
    this.environmentService = new EnvironmentService(this.stateService);
    this.apiService = new ApiService(
      this.tokenService,
      this.platformUtilsService,
      this.environmentService,
      (expired: boolean) => this.logout(expired),
      this.buildUserAgent()
    );
    this.userService = new UserService(this.tokenService, this.storageService);
    this.cozyClientService = new CozyClientService(
      this.environmentService,
      this.apiService,
      this.messagingService
    );

    this.settingsService = new SettingsService(this.userService);
    this.fileUploadService = new FileUploadService(this.logService, this.apiService);
    this.cipherService = new CipherService(
      this.cryptoService,
      this.settingsService,
      this.apiService,
      this.fileUploadService,
      this.i18nService,
      () => this.searchService,
      this.logService,
      this.stateService
    );
    this.folderService = new FolderService(
      this.cryptoService,
      this.apiService,
      this.i18nService,
      this.cipherService,
      this.stateService
    );
    this.collectionService = new CollectionService(
      this.cryptoService,
      this.i18nService,
      this.stateService
    );
    this.searchService = new SearchService(this.cipherService, this.logService, this.i18nService);
    this.sendService = new SendService(
      this.cryptoService,
      this.apiService,
      this.fileUploadService,
      this.i18nService,
      this.cryptoFunctionService,
      this.stateService
    );
    this.organizationService = new OrganizationService(this.stateService);
    this.policyService = new PolicyService(
      this.stateService,
      this.organizationService,
      this.apiService
    );
    this.keyConnectorService = new KeyConnectorService(
      this.stateService,
      this.cryptoService,
      this.apiService,
      this.tokenService,
      this.logService,
      this.organizationService,
      this.cryptoFunctionService
    );

    const vaultTimeoutServiceCallbacks = {
      locked: async (userId?: string) => {
        /* @override by Cozy :
          This callback is the lockedCallback of the VaultTimeoutService
          (see jslib/src/services/vaultTimeout.service.ts )
          When CB is fired, ask all tabs to activate login-in-page-menu
        */
        const allTabs = await BrowserApi.getAllTabs();
        for (const tab of allTabs) {
          BrowserApi.tabSendMessage(tab, {
            command: "autofillAnswerRequest",
            subcommand: "loginIPMenuActivate",
            tab: tab,
          });
        }
        /* end @override by Cozy */
        if (this.notificationsService != null) {
          this.notificationsService.updateConnection(false);
        }
        await this.setIcon();
        await this.refreshBadgeAndMenu(true);
        if (this.systemService != null) {
          /* @override by Cozy :
                    BUG : TODO BJA : BW has added bellow `this.reloadProcess()` wich might solve the bug. This comment would then be pointless.
                    * if you lock or logout, the background script is reloaded, preventing current injected content
                      script to communicate with the background
                      (see for exemple : https://stackoverflow.com/questions/53939205)
                    * Consequence : when user locks ou logouts, then background is reloaded, and then all
                      content scripts no longer can exchange with background script : form filling will not work until
                      you reload the web page and therefore its content scripts
                    * Analysis of the background lifecycle :
                        * in browserApi `reloadExtension()` => `chrome.runtime.reload()` or `win.location.reload()`
                          (if win is a frame, ie the popup or other window)
                        * `reloadExtension()` is called
                            - by  `SystemService.startProcessReload()`
                                - which is called a two places, in main.background, in lockedCallback and in logout
                            - by the msg 'reloadProcess' in popup/app.component.ts (which only triggers the reload of
                              the frame because the window is transmited in the parameters
                              `BrowserApi.reloadExtension(window)`)
                              => 'reloadProcess' has no impact on the background script, therefore not involved in
                              the bug.
                    * solutions :
                        1. reload content script on background init => then content scripts are loaded multiple
                          times : not clean at all...
                        2. don't reload... solution used here.
                    */
          // this.systemService.startProcessReload(); // commented by Cozy
          /* end @override by Cozy */
          await this.systemService.clearPendingClipboard();
          await this.reloadProcess();
        }
      },
      logout: async (userId?: string) => {
        /* @override by Cozy :
                This callback is the loggedOutCallback of the VaultTimeoutService
                (see jslib/src/services/vaultTimeout.service.ts )
                When CB is fired, ask all tabs to activate login-in-page-menu
                */
        const allTabs = await BrowserApi.getAllTabs();
        for (const tab of allTabs) {
          BrowserApi.tabSendMessage(tab, {
            command: "autofillAnswerRequest",
            subcommand: "loginIPMenuActivate",
            isPinLocked: false,
            tab: tab,
          });
        }
        /* end @override by Cozy */
        await this.logout(false, userId);
      },
    };

    this.vaultTimeoutService = new VaultTimeoutService(
      this.cipherService,
      this.folderService,
      this.collectionService,
      this.cryptoService,
      this.platformUtilsService,
      this.messagingService,
      this.searchService,
      this.tokenService,
      this.policyService,
      this.keyConnectorService,
      this.stateService,
      vaultTimeoutServiceCallbacks.locked,
      vaultTimeoutServiceCallbacks.logout
    );
    this.providerService = new ProviderService(this.stateService);
    this.syncService = new SyncService(
      this.apiService,
      this.settingsService,
      this.folderService,
      this.cipherService,
      this.cryptoService,
      this.collectionService,
      this.messagingService,
      this.policyService,
      this.sendService,
      this.logService,
      this.keyConnectorService,
      this.stateService,
      this.organizationService,
      this.providerService,
      async (expired: boolean) => await this.logout(expired),
      this.cozyClientService,
      this.tokenService
    );
    this.eventService = new EventService(
      this.apiService,
      this.cipherService,
      this.stateService,
      this.logService,
      this.organizationService
    );
    this.passwordGenerationService = new PasswordGenerationService(
      this.cryptoService,
      this.policyService,
      this.stateService
    );
    this.totpService = new TotpService(
      this.cryptoFunctionService,
      this.logService,
      this.stateService
    );
    this.autofillService = new AutofillService(
      this.cipherService,
      this.stateService,
      this.totpService,
      this.eventService,
      this.logService
    );
    this.containerService = new ContainerService(this.cryptoService);
    this.auditService = new AuditService(this.cryptoFunctionService, this.apiService);
    this.exportService = new ExportService(
      this.folderService,
      this.cipherService,
      this.apiService,
      this.cryptoService,
      this.cryptoFunctionService
    );
    this.notificationsService = new NotificationsService(
      this.syncService,
      this.appIdService,
      this.apiService,
      this.vaultTimeoutService,
      this.environmentService,
      () => this.logout(true),
      this.logService,
      this.stateService
    );
    this.popupUtilsService = new PopupUtilsService(this.platformUtilsService);

    this.userVerificationService = new UserVerificationService(
      this.cryptoService,
      this.i18nService,
      this.apiService
    );

    const systemUtilsServiceReloadCallback = () => {
      const forceWindowReload =
        this.platformUtilsService.isSafari() ||
        this.platformUtilsService.isFirefox() ||
        this.platformUtilsService.isOpera();
      BrowserApi.reloadExtension(forceWindowReload ? window : null);
      return Promise.resolve();
    };

    this.systemService = new SystemService(
      this.messagingService,
      this.platformUtilsService,
      systemUtilsServiceReloadCallback,
      this.stateService
    );

    this.konnectorsService = new KonnectorsService(
      this.cipherService,
      this.storageService,
      this.settingsService,
      this.cozyClientService
    );

    // Other fields
    this.isSafari = this.platformUtilsService.isSafari();
    this.sidebarAction = this.isSafari
      ? null
      : typeof opr !== "undefined" && opr.sidebarAction
      ? opr.sidebarAction
      : (window as any).chrome.sidebarAction;

    // Background
    /** creation Commented and moved further by Cozy 
    this.runtimeBackground = new RuntimeBackground(
      this,
      this.autofillService,
      this.platformUtilsService as BrowserPlatformUtilsService,
      this.i18nService,
      this.notificationsService,
      this.systemService,
      this.environmentService,
      this.messagingService,
      this.stateService,
      this.logService
    );
    this.nativeMessagingBackground = new NativeMessagingBackground(
      this.cryptoService,
      this.cryptoFunctionService,
      this.runtimeBackground,
      this.i18nService,
      this.messagingService,
      this.appIdService,
      this.platformUtilsService,
      this.stateService,
      this.logService,
      this.vaultTimeoutService
    );
    END commented by Cozy */
    this.commandsBackground = new CommandsBackground(
      this,
      this.passwordGenerationService,
      this.platformUtilsService,
      this.vaultTimeoutService
    );
    this.notificationBackground = new NotificationBackground(
      this,
      this.autofillService,
      this.cipherService,
      this.vaultTimeoutService,
      this.policyService,
      this.folderService,
      this.stateService
    );

    this.tabsBackground = new TabsBackground(this, this.notificationBackground);
    this.contextMenusBackground = new ContextMenusBackground(
      this,
      this.cipherService,
      this.passwordGenerationService,
      this.platformUtilsService,
      this.vaultTimeoutService,
      this.eventService,
      this.totpService
    );
    this.idleBackground = new IdleBackground(
      this.vaultTimeoutService,
      this.stateService,
      this.notificationsService
    );
    this.webRequestBackground = new WebRequestBackground(
      this.platformUtilsService,
      this.cipherService,
      this.vaultTimeoutService
    );
    this.windowsBackground = new WindowsBackground(this);

    this.twoFactorService = new TwoFactorService(this.i18nService, this.platformUtilsService);

    const that = this;
    const backgroundMessagingService = new (class extends MessagingServiceAbstraction {
      // AuthService should send the messages to the background not popup.
      send = (subscriber: string, arg: any = {}) => {
        const message = Object.assign({}, { command: subscriber }, arg);
        that.runtimeBackground.processMessage(message, that, null);
      };
    })();
    this.authService = new AuthService(
      this.cryptoService,
      this.apiService,
      this.tokenService,
      this.appIdService,
      this.platformUtilsService,
      backgroundMessagingService,
      this.logService,
      this.keyConnectorService,
      this.environmentService,
      this.stateService,
      this.twoFactorService,
      true,
      this.cozyClientService
    );

    // Background (Cozy version)
    this.runtimeBackground = new RuntimeBackground(
      this,
      this.autofillService,
      this.platformUtilsService as BrowserPlatformUtilsService,
      this.storageService,
      this.i18nService,
      this.notificationsService,
      this.systemService,
      this.environmentService,
      this.messagingService,
      this.logService,
      this.cozyClientService,
      this.konnectorsService,
      this.syncService,
      this.authService,
      this.cryptoService,
      this.apiService,
      this.cipherService,
      this.userService,
      this.vaultTimeoutService
    );
    this.messagingService.setRuntimeBackground(this.runtimeBackground);
  }

  async bootstrap() {
    this.containerService.attachToWindow(window);

    await this.stateService.init();

    await (this.vaultTimeoutService as VaultTimeoutService).init(true);
    await (this.i18nService as I18nService).init();
    await (this.eventService as EventService).init(true);
    await this.runtimeBackground.init();
    await this.notificationBackground.init();
    await this.commandsBackground.init();

    this.twoFactorService.init();

    await this.tabsBackground.init();
    await this.contextMenusBackground.init();
    await this.idleBackground.init();
    await this.webRequestBackground.init();
    await this.windowsBackground.init();

    /** added by Cozy */
    const checkCurrentStatus = async (msg: any) => {
      const isAuthenticatedNow = await this.stateService.getIsAuthenticated();
      const status = isAuthenticatedNow ? "connected" : "installed";
      return status;
    };

    const isAuthenticated = await this.stateService.getIsAuthenticated(); // = connected or installed
    const isLocked = await this.vaultTimeoutService.isLocked();
    // Cozy explanations :
    // For information, to make the difference betweend locked and loggedout :
    // const isAuthenticated = await this.stateService.getIsAuthenticated(); // = connected or installed
    // const isLocked        = await this.vaultTimeoutService.isLocked()
    //    if  isAuthenticated == false  &  isLocked == true   => loggedout
    //    if  isAuthenticated == true   &  isLocked == true   => locked
    //    if  isAuthenticated == true   &  isLocked == false  => logged in
    const pinSet = await this.vaultTimeoutService.isPinLockSet();
    const isPinLocked =
      (pinSet[0] && this.vaultTimeoutService.pinProtectedKey != null) || pinSet[1];

    BrowserApi.messageListener("main.background", (msg: any, sender: any, sendResponse: any) => {
      if (msg.command === "checkextensionstatus") {
        checkCurrentStatus(msg).then(sendResponse);

        // The callback should return true if it's sending the
        // response asynchronously.
        // See https://developer.chrome.com/apps/runtime#event-onMessage
        return true;
      } else if (msg.command === "queryFlag") {
        this.cozyClientService.notifyFlagStatus(msg.flagName);
      }
    });
    /** END added by Cozy */

    return new Promise<void>((resolve) => {
      setTimeout(async () => {
        await this.environmentService.setUrlsFromStorage();
        await this.setIcon();
        this.fullSync(true);
        setTimeout(() => this.notificationsService.init(), 2500);
        resolve();
      }, 500);
    });
  }

  async setIcon() {
    if (!chrome.browserAction && !this.sidebarAction) {
      return;
    }

    const isAuthenticated = await this.stateService.getIsAuthenticated();
    const locked = await this.vaultTimeoutService.isLocked();

    let suffix = "";
    if (!isAuthenticated) {
      suffix = "_gray";
    } else if (locked) {
      suffix = "_locked";
    }

    await this.actionSetIcon(chrome.browserAction, suffix);
    await this.actionSetIcon(this.sidebarAction, suffix);
  }

  async refreshBadgeAndMenu(forLocked: boolean = false) {
    if (!chrome.windows || !chrome.contextMenus) {
      return;
    }

    const menuDisabled = await this.stateService.getDisableContextMenuItem();
    if (!menuDisabled) {
      await this.buildContextMenu();
    } else {
      await this.contextMenusRemoveAll();
    }

    if (forLocked) {
      await this.loadMenuAndUpdateBadgeForNoAccessState(!menuDisabled);
      this.onUpdatedRan = this.onReplacedRan = false;
      return;
    }

    const tab = await BrowserApi.getTabFromCurrentWindow();
    if (tab) {
      await this.contextMenuReady(tab, !menuDisabled);
    }
  }

  async logout(expired: boolean, userId?: string) {
    await this.eventService.uploadEvents(userId);

    await Promise.all([
      this.eventService.clearEvents(userId),
      this.syncService.setLastSync(new Date(0), userId),
      this.cryptoService.clearKeys(userId),
      this.settingsService.clear(userId),
      this.cipherService.clear(userId),
      this.folderService.clear(userId),
      this.collectionService.clear(userId),
      this.policyService.clear(userId),
      this.passwordGenerationService.clear(userId),
      this.vaultTimeoutService.clear(userId),
      this.keyConnectorService.clear(),
    ]);

    // Clear auth and token afterwards, as previous services might need it (by Cozy) note TODO BJA : the cmd `await this.stateService.clean({ userId: userId });` has been added by bw, our `tokenService.clean()` might be useless now.
    await this.tokenService.clearToken();
    await this.stateService.clean({ userId: userId });

    if (userId == null || userId === (await this.stateService.getUserId())) {
      this.searchService.clearIndex();
      this.messagingService.send("doneLoggingOut", { expired: expired, userId: userId });
    }

    await this.setIcon();
    await this.refreshBadgeAndMenu();
    await this.reseedStorage();
    this.notificationsService.updateConnection(false);
    /* @override by Cozy : TODO BJA : BW has adde `await this.reloadProcess();` below : it might correct the bug, this comment might be useless.
        BUG :
        * if you lock or logout, the background script is reloaded, preventing current injected content
           script to communicate with the background
           (see for exemple : https://stackoverflow.com/questions/53939205)
        * Consequence : when user locks ou logouts, then background is reloaded, and then all
          content scripts no longer can exchange with background script : form filling will not work until
          you reload the web page and therefore its content scripts
        * Analysis of the background lifecycle :
            * in browserApi `reloadExtension()` => `chrome.runtime.reload()` or `win.location.reload()`
              (if win is a frame, ie the popup or other window)
            * `reloadExtension()` is called
                - by  `SystemService.startProcessReload()`
                    - which is called a two places, in main.background, in lockedCallback and in logout
                - by the msg 'reloadProcess' in popup/app.component.ts (which only triggers the reload of
                  the frame because the window is transmited in the parameters
                  `BrowserApi.reloadExtension(window)`)
                  => 'reloadProcess' has no impact on the background script, therefore not involved in
                  the bug.
        * solutions :
            1. reload content script on background init => then content scripts are loaded multiple
              times : not clean at all...
            2. don't reload... solution used here.
        */
    // this.systemService.startProcessReload();
    /* end @override by Cozy */
    await this.systemService.clearPendingClipboard();
    await this.reloadProcess();
  }

  async collectPageDetailsForContentScript(tab: any, sender: string, frameId: number = null) {
    if (tab == null || !tab.id) {
      return;
    }

    const options: any = {};
    if (frameId != null) {
      options.frameId = frameId;
    }

    BrowserApi.tabSendMessage(
      tab,
      {
        command: "collectPageDetails",
        tab: tab,
        sender: sender,
      },
      options
    );
  }

  async openPopup() {
    // Chrome APIs cannot open popup

    // TODO: Do we need to open this popup?
    if (!this.isSafari) {
      return;
    }
    await SafariApp.sendMessageToApp("showPopover", null, true);
  }

  async reseedStorage() {
    if (
      !this.platformUtilsService.isChrome() &&
      !this.platformUtilsService.isVivaldi() &&
      !this.platformUtilsService.isOpera()
    ) {
      return;
    }

    const currentVaultTimeout = await this.stateService.getVaultTimeout();
    if (currentVaultTimeout == null) {
      return;
    }

    const getStorage = (): Promise<any> =>
      new Promise((resolve) => {
        chrome.storage.local.get(null, (o: any) => resolve(o));
      });

    const clearStorage = (): Promise<void> =>
      new Promise((resolve) => {
        chrome.storage.local.clear(() => resolve());
      });

    const storage = await getStorage();
    await clearStorage();

    for (const key in storage) {
      if (!storage.hasOwnProperty(key)) {
        continue;
      }
      await this.storageService.save(key, storage[key]);
    }
  }

  private async buildContextMenu() {
    if (!chrome.contextMenus || this.buildingContextMenu) {
      return;
    }

    this.buildingContextMenu = true;
    await this.contextMenusRemoveAll();

    await this.contextMenusCreate({
      type: "normal",
      id: "root",
      contexts: ["all"],
      title: "Cozy",
    });

    await this.contextMenusCreate({
      type: "normal",
      id: "autofill",
      parentId: "root",
      contexts: ["all"],
      title: this.i18nService.t("autoFill"),
    });

    await this.contextMenusCreate({
      type: "normal",
      id: "copy-username",
      parentId: "root",
      contexts: ["all"],
      title: this.i18nService.t("copyUsername"),
    });

    await this.contextMenusCreate({
      type: "normal",
      id: "copy-password",
      parentId: "root",
      contexts: ["all"],
      title: this.i18nService.t("copyPassword"),
    });

    if (await this.stateService.getCanAccessPremium()) {
      await this.contextMenusCreate({
        type: "normal",
        id: "copy-totp",
        parentId: "root",
        contexts: ["all"],
        title: this.i18nService.t("copyVerificationCode"),
      });
    }

    await this.contextMenusCreate({
      type: "separator",
      parentId: "root",
    });

    await this.contextMenusCreate({
      type: "normal",
      id: "generate-password",
      parentId: "root",
      contexts: ["all"],
      title: this.i18nService.t("generatePasswordCopied"),
    });

    await this.contextMenusCreate({
      type: "normal",
      id: "copy-identifier",
      parentId: "root",
      contexts: ["all"],
      title: this.i18nService.t("copyElementIdentifier"),
    });

    this.buildingContextMenu = false;
  }

  private async contextMenuReady(tab: any, contextMenuEnabled: boolean) {
    await this.loadMenuAndUpdateBadge(tab.url, tab.id, contextMenuEnabled);
    this.onUpdatedRan = this.onReplacedRan = false;
  }

  private async loadMenuAndUpdateBadge(url: string, tabId: number, contextMenuEnabled: boolean) {
    if (!url || (!chrome.browserAction && !this.sidebarAction)) {
      return;
    }

    this.actionSetBadgeBackgroundColor(chrome.browserAction);
    this.actionSetBadgeBackgroundColor(this.sidebarAction);

    this.menuOptionsLoaded = [];
    const locked = await this.vaultTimeoutService.isLocked();
    if (!locked) {
      try {
        const ciphers = await this.cipherService.getAllDecryptedForUrl(url);
        ciphers.sort((a, b) => this.cipherService.sortCiphersByLastUsedThenName(a, b));

        if (contextMenuEnabled) {
          ciphers.forEach((cipher) => {
            this.loadLoginContextMenuOptions(cipher);
          });
        }

        const disableBadgeCounter = await this.stateService.getDisableBadgeCounter();
        let theText = "";

        if (!disableBadgeCounter) {
          if (ciphers.length > 0 && ciphers.length <= 9) {
            theText = ciphers.length.toString();
          } else if (ciphers.length > 0) {
            theText = "9+";
          }
        }

        if (contextMenuEnabled && ciphers.length === 0) {
          await this.loadNoLoginsContextMenuOptions(this.i18nService.t("noMatchingLogins"));
        }

        this.sidebarActionSetBadgeText(theText, tabId);
        this.browserActionSetBadgeText(theText, tabId);

        return;
      } catch (e) {
        this.logService.error(e);
      }
    }

    await this.loadMenuAndUpdateBadgeForNoAccessState(contextMenuEnabled);
  }

  private async loadMenuAndUpdateBadgeForNoAccessState(contextMenuEnabled: boolean) {
    if (contextMenuEnabled) {
      const authed = await this.stateService.getIsAuthenticated();
      await this.loadNoLoginsContextMenuOptions(
        this.i18nService.t(authed ? "unlockVaultMenu" : "loginToVaultMenu")
      );
    }

    const tabs = await BrowserApi.getActiveTabs();
    if (tabs != null) {
      tabs.forEach((tab) => {
        if (tab.id != null) {
          this.browserActionSetBadgeText("", tab.id);
          this.sidebarActionSetBadgeText("", tab.id);
        }
      });
    }
  }

  private async loadLoginContextMenuOptions(cipher: any) {
    if (
      cipher == null ||
      cipher.type !== CipherType.Login ||
      cipher.reprompt !== CipherRepromptType.None
    ) {
      return;
    }

    let title = cipher.name;
    if (cipher.login.username && cipher.login.username !== "") {
      title += " (" + cipher.login.username + ")";
    }
    await this.loadContextMenuOptions(title, cipher.id, cipher);
  }

  private async loadNoLoginsContextMenuOptions(noLoginsMessage: string) {
    await this.loadContextMenuOptions(noLoginsMessage, "noop", null);
  }

  private async loadContextMenuOptions(title: string, idSuffix: string, cipher: any) {
    if (
      !chrome.contextMenus ||
      this.menuOptionsLoaded.indexOf(idSuffix) > -1 ||
      (cipher != null && cipher.type !== CipherType.Login)
    ) {
      return;
    }

    this.menuOptionsLoaded.push(idSuffix);

    if (cipher == null || (cipher.login.password && cipher.login.password !== "")) {
      await this.contextMenusCreate({
        type: "normal",
        id: "autofill_" + idSuffix,
        parentId: "autofill",
        contexts: ["all"],
        title: this.sanitizeContextMenuTitle(title),
      });
    }

    if (cipher == null || (cipher.login.username && cipher.login.username !== "")) {
      await this.contextMenusCreate({
        type: "normal",
        id: "copy-username_" + idSuffix,
        parentId: "copy-username",
        contexts: ["all"],
        title: this.sanitizeContextMenuTitle(title),
      });
    }

    if (
      cipher == null ||
      (cipher.login.password && cipher.login.password !== "" && cipher.viewPassword)
    ) {
      await this.contextMenusCreate({
        type: "normal",
        id: "copy-password_" + idSuffix,
        parentId: "copy-password",
        contexts: ["all"],
        title: this.sanitizeContextMenuTitle(title),
      });
    }

    const canAccessPremium = await this.stateService.getCanAccessPremium();
    if (canAccessPremium && (cipher == null || (cipher.login.totp && cipher.login.totp !== ""))) {
      await this.contextMenusCreate({
        type: "normal",
        id: "copy-totp_" + idSuffix,
        parentId: "copy-totp",
        contexts: ["all"],
        title: this.sanitizeContextMenuTitle(title),
      });
    }
  }

  private sanitizeContextMenuTitle(title: string): string {
    return title.replace(/&/g, "&&");
  }

  private async fullSync(override: boolean = false) {
    const syncInternal = 6 * 60 * 60 * 1000; // 6 hours
    const lastSync = await this.syncService.getLastSync();

    let lastSyncAgo = syncInternal + 1;
    if (lastSync != null) {
      lastSyncAgo = new Date().getTime() - lastSync.getTime();
    }

    if (override || lastSyncAgo >= syncInternal) {
      await this.syncService.fullSync(override);
      this.scheduleNextSync();
    } else {
      this.scheduleNextSync();
    }
  }

  private scheduleNextSync() {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = setTimeout(async () => await this.fullSync(), 5 * 60 * 1000); // check every 5 minutes
  }

  // Browser API Helpers

  private contextMenusRemoveAll() {
    return new Promise<void>((resolve) => {
      chrome.contextMenus.removeAll(() => {
        resolve();
        if (chrome.runtime.lastError) {
          return;
        }
      });
    });
  }

  private contextMenusCreate(options: any) {
    return new Promise<void>((resolve) => {
      chrome.contextMenus.create(options, () => {
        resolve();
        if (chrome.runtime.lastError) {
          return;
        }
      });
    });
  }

  private async actionSetIcon(theAction: any, suffix: string): Promise<any> {
    if (!theAction || !theAction.setIcon) {
      return;
    }

    const options = {
      path: {
        19: "images/icon19" + suffix + ".png",
        38: "images/icon38" + suffix + ".png",
      },
    };

    if (this.platformUtilsService.isFirefox()) {
      await theAction.setIcon(options);
    } else if (this.platformUtilsService.isSafari()) {
      // Workaround since Safari 14.0.3 returns a pending promise
      // which doesn't resolve within a reasonable time.
      theAction.setIcon(options);
    } else {
      return new Promise<void>((resolve) => {
        theAction.setIcon(options, () => resolve());
      });
    }
  }

  private actionSetBadgeBackgroundColor(action: any) {
    if (action && action.setBadgeBackgroundColor) {
      action.setBadgeBackgroundColor({ color: "#294e5f" });
    }
  }

  private browserActionSetBadgeText(text: string, tabId: number) {
    if (chrome.browserAction && chrome.browserAction.setBadgeText) {
      chrome.browserAction.setBadgeText({
        text: text,
        tabId: tabId,
      });
    }
  }

  private sidebarActionSetBadgeText(text: string, tabId: number) {
    if (!this.sidebarAction) {
      return;
    }

    if (this.sidebarAction.setBadgeText) {
      this.sidebarAction.setBadgeText({
        text: text,
        tabId: tabId,
      });
    } else if (this.sidebarAction.setTitle) {
      let title = "Cozy";
      if (text && text !== "") {
        title += " [" + text + "]";
      }

      this.sidebarAction.setTitle({
        title: title,
        tabId: tabId,
      });
    }
  }

  private async reloadProcess(): Promise<void> {
    const accounts = this.stateService.accounts.getValue();
    if (accounts != null) {
      for (const userId of Object.keys(accounts)) {
        if (!(await this.vaultTimeoutService.isLocked(userId))) {
          return;
        }
      }
    }
    await this.systemService.startProcessReload();
  }

  private buildUserAgent(): string {
    const browserUA = navigator.userAgent;
    const appName = "io.cozy.pass.browser";
    const appVersion = BrowserApi.getApplicationVersion() || "unknown";
    return `${browserUA} ${appName}-${appVersion}`;
  }
}
