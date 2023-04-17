import { APP_INITIALIZER, LOCALE_ID, NgModule } from "@angular/core";

import { JslibServicesModule, SECURE_STORAGE } from "jslib-angular/services/jslib-services.module";
import { LockGuardService as BaseLockGuardService } from "jslib-angular/services/lock-guard.service";
import { UnauthGuardService as BaseUnauthGuardService } from "jslib-angular/services/unauth-guard.service";
import { ApiService } from "jslib-common/abstractions/api.service";
import { AppIdService } from "jslib-common/abstractions/appId.service";
import { AuditService } from "jslib-common/abstractions/audit.service";
import { AuthService as AuthServiceAbstraction } from "jslib-common/abstractions/auth.service";
import { CipherService } from "jslib-common/abstractions/cipher.service";
import { CollectionService } from "jslib-common/abstractions/collection.service";
import { CryptoService } from "jslib-common/abstractions/crypto.service";
import { CryptoFunctionService } from "jslib-common/abstractions/cryptoFunction.service";
import { EnvironmentService } from "jslib-common/abstractions/environment.service";
import { EventService } from "jslib-common/abstractions/event.service";
import { ExportService } from "jslib-common/abstractions/export.service";
import { FileUploadService } from "jslib-common/abstractions/fileUpload.service";
import { FolderService } from "jslib-common/abstractions/folder.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { KeyConnectorService } from "jslib-common/abstractions/keyConnector.service";
import { LogService as LogServiceAbstraction } from "jslib-common/abstractions/log.service";
import { MessagingService } from "jslib-common/abstractions/messaging.service";
import { NotificationsService } from "jslib-common/abstractions/notifications.service";
import { OrganizationService } from "jslib-common/abstractions/organization.service";
import { PasswordGenerationService } from "jslib-common/abstractions/passwordGeneration.service";
import { PasswordRepromptService as PasswordRepromptServiceAbstraction } from "jslib-common/abstractions/passwordReprompt.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { PolicyService } from "jslib-common/abstractions/policy.service";
import { ProviderService } from "jslib-common/abstractions/provider.service";
import { SearchService as SearchServiceAbstraction } from "jslib-common/abstractions/search.service";
import { SendService } from "jslib-common/abstractions/send.service";
import { SettingsService } from "jslib-common/abstractions/settings.service";
import { StateService as BaseStateServiceAbstraction } from "jslib-common/abstractions/state.service";
import {
  StorageService,
  StorageService as StorageServiceAbstraction,
} from "jslib-common/abstractions/storage.service";
import { SyncService } from "jslib-common/abstractions/sync.service";
import { TokenService } from "jslib-common/abstractions/token.service";
import { TotpService } from "jslib-common/abstractions/totp.service";
import { TwoFactorService } from "jslib-common/abstractions/twoFactor.service";
import { UserVerificationService } from "jslib-common/abstractions/userVerification.service";
import { UsernameGenerationService } from "jslib-common/abstractions/usernameGeneration.service";
import { VaultTimeoutService } from "jslib-common/abstractions/vaultTimeout.service";
// import { AuthService } from "jslib-common/services/auth.service";
import { ConsoleLogService } from "jslib-common/services/consoleLog.service";
import { SearchService } from "jslib-common/services/search.service";

import MainBackground from "../../background/main.background";
import { BrowserApi } from "../../browser/browserApi";
import { AutofillService } from "../../services/abstractions/autofill.service";
import { StateService as StateServiceAbstraction } from "../../services/abstractions/state.service";
import BrowserMessagingService from "../../services/browserMessaging.service";
import BrowserMessagingPrivateModePopupService from "../../services/browserMessagingPrivateModePopup.service";

import { DebounceNavigationService } from "./debounceNavigationService";
import { InitService } from "./init.service";
import { LockGuardService } from "./lock-guard.service";
import { PasswordRepromptService } from "./password-reprompt.service";
import { PopupSearchService } from "./popup-search.service";
import { PopupUtilsService } from "./popup-utils.service";
import { UnauthGuardService } from "./unauth-guard.service";
/** COZY IMPORTS */
/* eslint-disable */
import { CozyClientService } from "./cozyClient.service";
import { CozySanitizeUrlService } from "./cozySanitizeUrl.service";
import { KonnectorsService } from "./konnectors.service";
import { AuthService } from "../../services/auth.service";
import { ModalService } from "jslib-angular/services/modal.service";
/* eslint-enable */
/* END */

const isPrivateMode = BrowserApi.getBackgroundPage() == null;
const mainBackground: MainBackground = isPrivateMode
  ? createLocalBgService()
  : BrowserApi.getBackgroundPage().bitwardenMain;

function createLocalBgService() {
  const localBgService = new MainBackground(true);
  localBgService.bootstrap();
  return localBgService;
}

function getBgService<T>(service: keyof MainBackground) {
  return (): T => {
    return mainBackground ? (mainBackground[service] as any as T) : null;
  };
}

/* COZY START */
const cozyMessagingService = isPrivateMode
  ? new BrowserMessagingPrivateModePopupService()
  : new BrowserMessagingService();

// TODO REFACTO : à supprimer ?
// const searchService = isPrivateMode
//   ? null
//   : new PopupSearchService(
//       getBgService<SearchService>("searchService")(),
//       getBgService<CipherService>("cipherService")(),
//       getBgService<ConsoleLogService>("logService")(),
//       getBgService<I18nService>("i18nService")()
//     );
// const passwordRepromptService = isPrivateMode
//   ? null
//   : new PasswordRepromptService(
//       getBgService<ModalService>("modalService")(),
//       getBgService<KeyConnectorService>("keyConnectorService")()
//     );

const cozyClientService = new CozyClientService(
  getBgService<EnvironmentService>("environmentService")(),
  getBgService<ApiService>("apiService")(),
  cozyMessagingService
);
export const cozySanitizeUrlService = new CozySanitizeUrlService();
export const konnectorsService = new KonnectorsService(
  getBgService<CipherService>("cipherService")(),
  getBgService<StorageService>("storageService")(),
  getBgService<SettingsService>("settingsService")(),
  cozyClientService,
  getBgService<StateServiceAbstraction>("stateService")()
);
// const authService = getBgService<AuthService>("authService")();

/* COZY END */

@NgModule({
  imports: [JslibServicesModule],
  declarations: [],
  providers: [
    { provide: CozyClientService, useValue: cozyClientService },
    { provide: CozySanitizeUrlService, useValue: cozySanitizeUrlService },
    { provide: KonnectorsService, useValue: konnectorsService },
    InitService,
    DebounceNavigationService,
    {
      provide: LOCALE_ID,
      useFactory: () => getBgService<I18nService>("i18nService")().translationLocale,
      deps: [],
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (initService: InitService) => initService.init(),
      deps: [InitService],
      multi: true,
    },
    { provide: BaseLockGuardService, useClass: LockGuardService },
    { provide: BaseUnauthGuardService, useClass: UnauthGuardService },
    { provide: PopupUtilsService, useFactory: () => new PopupUtilsService(isPrivateMode) },
    {
      provide: MessagingService,
      useFactory: () => {
        return isPrivateMode
          ? new BrowserMessagingPrivateModePopupService()
          : new BrowserMessagingService();
      },
    },
    {
      provide: TwoFactorService,
      useFactory: getBgService<TwoFactorService>("twoFactorService"),
      deps: [],
    },
    {
      provide: AuthServiceAbstraction,
      useFactory: getBgService<AuthService>("authService"),
      deps: [],
    },
    {
      provide: SearchServiceAbstraction,
      useFactory: (
        cipherService: CipherService,
        logService: ConsoleLogService,
        i18nService: I18nService
      ) => {
        return new PopupSearchService(
          getBgService<SearchService>("searchService")(),
          cipherService,
          logService,
          i18nService
        );
      },
      deps: [CipherService, LogServiceAbstraction, I18nService],
    },
    { provide: AuditService, useFactory: getBgService<AuditService>("auditService"), deps: [] },
    {
      provide: FileUploadService,
      useFactory: getBgService<FileUploadService>("fileUploadService"),
      deps: [],
    },
    { provide: CipherService, useFactory: getBgService<CipherService>("cipherService"), deps: [] },
    {
      provide: CryptoFunctionService,
      useFactory: getBgService<CryptoFunctionService>("cryptoFunctionService"),
      deps: [],
    },
    { provide: FolderService, useFactory: getBgService<FolderService>("folderService"), deps: [] },
    {
      provide: CollectionService,
      useFactory: getBgService<CollectionService>("collectionService"),
      deps: [],
    },
    {
      provide: LogServiceAbstraction,
      useFactory: getBgService<ConsoleLogService>("logService"),
      deps: [],
    },
    {
      provide: EnvironmentService,
      useFactory: getBgService<EnvironmentService>("environmentService"),
      deps: [],
    },
    { provide: TotpService, useFactory: getBgService<TotpService>("totpService"), deps: [] },
    { provide: TokenService, useFactory: getBgService<TokenService>("tokenService"), deps: [] },
    { provide: I18nService, useFactory: getBgService<I18nService>("i18nService"), deps: [] },
    { provide: CryptoService, useFactory: getBgService<CryptoService>("cryptoService"), deps: [] },
    { provide: EventService, useFactory: getBgService<EventService>("eventService"), deps: [] },
    { provide: PolicyService, useFactory: getBgService<PolicyService>("policyService"), deps: [] },
    {
      provide: PlatformUtilsService,
      useFactory: getBgService<PlatformUtilsService>("platformUtilsService"),
      deps: [],
    },
    {
      provide: PasswordGenerationService,
      useFactory: getBgService<PasswordGenerationService>("passwordGenerationService"),
      deps: [],
    },
    { provide: ApiService, useFactory: getBgService<ApiService>("apiService"), deps: [] },
    { provide: SyncService, useFactory: getBgService<SyncService>("syncService"), deps: [] },
    {
      provide: SettingsService,
      useFactory: getBgService<SettingsService>("settingsService"),
      deps: [],
    },
    {
      provide: StorageServiceAbstraction,
      useFactory: getBgService<StorageServiceAbstraction>("storageService"),
      deps: [],
    },
    { provide: AppIdService, useFactory: getBgService<AppIdService>("appIdService"), deps: [] },
    {
      provide: AutofillService,
      useFactory: getBgService<AutofillService>("autofillService"),
      deps: [],
    },
    { provide: ExportService, useFactory: getBgService<ExportService>("exportService"), deps: [] },
    { provide: SendService, useFactory: getBgService<SendService>("sendService"), deps: [] },
    {
      provide: KeyConnectorService,
      useFactory: getBgService<KeyConnectorService>("keyConnectorService"),
      deps: [],
    },
    {
      provide: UserVerificationService,
      useFactory: getBgService<UserVerificationService>("userVerificationService"),
      deps: [],
    },
    {
      provide: VaultTimeoutService,
      useFactory: getBgService<VaultTimeoutService>("vaultTimeoutService"),
      deps: [],
    },
    {
      provide: NotificationsService,
      useFactory: getBgService<NotificationsService>("notificationsService"),
      deps: [],
    },
    {
      provide: LogServiceAbstraction,
      useFactory: getBgService<ConsoleLogService>("logService"),
      deps: [],
    },
    { provide: PasswordRepromptServiceAbstraction, useClass: PasswordRepromptService },
    {
      provide: OrganizationService,
      useFactory: getBgService<OrganizationService>("organizationService"),
      deps: [],
    },
    {
      provide: ProviderService,
      useFactory: getBgService<ProviderService>("providerService"),
      deps: [],
    },
    {
      provide: SECURE_STORAGE,
      useFactory: getBgService<StorageServiceAbstraction>("secureStorageService"),
      deps: [],
    },
    {
      provide: StateServiceAbstraction,
      useFactory: getBgService<StateServiceAbstraction>("stateService"),
      deps: [],
    },
    {
      provide: UsernameGenerationService,
      useFactory: getBgService<UsernameGenerationService>("usernameGenerationService"),
      deps: [],
    },
    {
      provide: BaseStateServiceAbstraction,
      useExisting: StateServiceAbstraction,
      deps: [],
    },
  ],
})
export class ServicesModule {}
