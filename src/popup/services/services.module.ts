import {
    APP_INITIALIZER,
    LOCALE_ID,
    NgModule,
} from '@angular/core';

import { DebounceNavigationService } from './debounceNavigationService';
import { LaunchGuardService } from './launch-guard.service';
import { LockGuardService } from './lock-guard.service';
import { PasswordRepromptService } from './password-reprompt.service';
import { UnauthGuardService } from './unauth-guard.service';

import { JslibServicesModule } from 'jslib-angular/services/jslib-services.module';
import { LockGuardService as BaseLockGuardService } from 'jslib-angular/services/lock-guard.service';
import { UnauthGuardService as BaseUnauthGuardService } from 'jslib-angular/services/unauth-guard.service';

import { BrowserApi } from '../../browser/browserApi';

import { CozyClientService } from './cozyClient.service';
import { CozySanitizeUrlService } from './cozySanitizeUrl.service';
import { KonnectorsService } from './konnectors.service';

import { ApiService } from 'jslib-common/abstractions/api.service';
import { AppIdService } from 'jslib-common/abstractions/appId.service';
import { AuditService } from 'jslib-common/abstractions/audit.service';
import { AuthService as AuthServiceAbstraction } from 'jslib-common/abstractions/auth.service';
import { CipherService } from 'jslib-common/abstractions/cipher.service';
import { CollectionService } from 'jslib-common/abstractions/collection.service';
import { CryptoService } from 'jslib-common/abstractions/crypto.service';
import { CryptoFunctionService } from 'jslib-common/abstractions/cryptoFunction.service';
import { EnvironmentService } from 'jslib-common/abstractions/environment.service';
import { EventService } from 'jslib-common/abstractions/event.service';
import { ExportService } from 'jslib-common/abstractions/export.service';
import { FileUploadService } from 'jslib-common/abstractions/fileUpload.service';
import { FolderService } from 'jslib-common/abstractions/folder.service';
import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { KeyConnectorService } from 'jslib-common/abstractions/keyConnector.service';
import { LogService as LogServiceAbstraction } from 'jslib-common/abstractions/log.service';
import { MessagingService } from 'jslib-common/abstractions/messaging.service';
import { NotificationsService } from 'jslib-common/abstractions/notifications.service';
import { PasswordGenerationService } from 'jslib-common/abstractions/passwordGeneration.service';
import { PasswordRepromptService as PasswordRepromptServiceAbstraction } from 'jslib-common/abstractions/passwordReprompt.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';
import { PolicyService } from 'jslib-common/abstractions/policy.service';
import { SearchService as SearchServiceAbstraction } from 'jslib-common/abstractions/search.service';
import { SendService } from 'jslib-common/abstractions/send.service';
import { SettingsService } from 'jslib-common/abstractions/settings.service';
import { StateService as StateServiceAbstraction } from 'jslib-common/abstractions/state.service';
import { StorageService } from 'jslib-common/abstractions/storage.service';
import { SyncService } from 'jslib-common/abstractions/sync.service';
import { TokenService } from 'jslib-common/abstractions/token.service';
import { TotpService } from 'jslib-common/abstractions/totp.service';
import { UserService } from 'jslib-common/abstractions/user.service';
import { UserVerificationService } from 'jslib-common/abstractions/userVerification.service';
import { VaultTimeoutService } from 'jslib-common/abstractions/vaultTimeout.service';

import { AutofillService } from '../../services/abstractions/autofill.service';
import BrowserMessagingService from '../../services/browserMessaging.service';

import { ConsoleLogService } from 'jslib-common/services/consoleLog.service';
import { ConstantsService } from 'jslib-common/services/constants.service';
import { SearchService } from 'jslib-common/services/search.service';
import { StateService } from 'jslib-common/services/state.service';

import { PopupSearchService } from './popup-search.service';
import { PopupUtilsService } from './popup-utils.service';

import { ThemeType } from 'jslib-common/enums/themeType';

import { AuthService } from '../../services/auth.service';
import { ModalService } from 'jslib-angular/services/modal.service';


function getBgService<T>(service: string) {
    return (): T => {
        const page = BrowserApi.getBackgroundPage();
        return page ? page.bitwardenMain[service] as T : null;
    };
}

const isPrivateMode = BrowserApi.getBackgroundPage() == null;

const stateService = new StateService();
const messagingService = new BrowserMessagingService();
const searchService = isPrivateMode ? null : new PopupSearchService(getBgService<SearchService>('searchService')(),
    getBgService<CipherService>('cipherService')(), getBgService<ConsoleLogService>('consoleLogService')(),
    getBgService<I18nService>('i18nService')());
const passwordRepromptService = isPrivateMode ? null : new PasswordRepromptService(getBgService<ModalService>('modalService')(), getBgService<KeyConnectorService>('keyConnectorService')());
    
const cozyClientService = new CozyClientService(getBgService<EnvironmentService>('environmentService')(),
    getBgService<ApiService>('apiService')(), messagingService);
export const cozySanitizeUrlService = new CozySanitizeUrlService();
export const konnectorsService = new KonnectorsService(getBgService<CipherService>('cipherService')(),
    getBgService<StorageService>('storageService')(), getBgService<SettingsService>('settingsService')(),
    cozyClientService);
const authService = getBgService<AuthService>('authService')();

export function initFactory(platformUtilsService: PlatformUtilsService, i18nService: I18nService,
    storageService: StorageService, popupUtilsService: PopupUtilsService, stateService: StateServiceAbstraction,
    logService: LogServiceAbstraction): Function {
    return async () => {
        if (!popupUtilsService.inPopup(window)) {
            window.document.body.classList.add('body-full');
        } else if (window.screen.availHeight < 600) {
            window.document.body.classList.add('body-xs');
        } else if (window.screen.availHeight <= 800) {
            window.document.body.classList.add('body-sm');
        }

        if (!isPrivateMode) {
            await stateService.save(ConstantsService.disableFaviconKey,
                await storageService.get<boolean>(ConstantsService.disableFaviconKey));

            await stateService.save(ConstantsService.disableBadgeCounterKey,
                await storageService.get<boolean>(ConstantsService.disableBadgeCounterKey));

            const htmlEl = window.document.documentElement;
            const theme = await platformUtilsService.getEffectiveTheme();
            htmlEl.classList.add('theme_' + theme);
            platformUtilsService.onDefaultSystemThemeChange(async sysTheme => {
                const bwTheme = await storageService.get<ThemeType>(ConstantsService.themeKey);
                if (bwTheme == null || bwTheme === ThemeType.System) {
                    htmlEl.classList.remove('theme_' + ThemeType.Light, 'theme_' + ThemeType.Dark);
                    htmlEl.classList.add('theme_' + sysTheme);
                }
            });
            htmlEl.classList.add('locale_' + i18nService.translationLocale);

            // Workaround for slow performance on external monitors on Chrome + MacOS
            // See: https://bugs.chromium.org/p/chromium/issues/detail?id=971701#c64
            if (platformUtilsService.isChrome() &&
                navigator.platform.indexOf('Mac') > -1 &&
                popupUtilsService.inPopup(window) &&
                (window.screenLeft < 0 ||
                window.screenTop < 0 ||
                window.screenLeft > window.screen.width ||
                window.screenTop > window.screen.height)) {
                htmlEl.classList.add('force_redraw');
                logService.info('Force redraw is on');
            }

            // conservé brut du merge upstream, à adapter TODO BJA
            authService.init();
        }
    };
}

@NgModule({
    imports: [
        JslibServicesModule,
    ],
    declarations: [],
    providers: [
        {
            provide: LOCALE_ID,
            useFactory: () => isPrivateMode ? null : getBgService<I18nService>('i18nService')().translationLocale,
            deps: [],
        },
        {
            provide: APP_INITIALIZER,
            useFactory: initFactory,
            deps: [
                PlatformUtilsService,
                I18nService,
                StorageService,
                PopupUtilsService,
                StateServiceAbstraction,
                LogServiceAbstraction,
            ],
            multi: true,
        },
        LaunchGuardService,
        { provide: BaseLockGuardService, useClass: LockGuardService },
        { provide: BaseUnauthGuardService, useClass: UnauthGuardService },
        DebounceNavigationService,
        PopupUtilsService,

        { provide: CozyClientService, useValue: cozyClientService },
        { provide: CozySanitizeUrlService, useValue: cozySanitizeUrlService },
        { provide: KonnectorsService, useValue: konnectorsService },

        { provide: MessagingService, useClass: BrowserMessagingService },
        { provide: AuthServiceAbstraction, useFactory: getBgService<AuthService>('authService'), deps: [] },
        { provide: StateServiceAbstraction, useClass: StateService },
        {
            provide: SearchServiceAbstraction,
            useFactory: (cipherService: CipherService, logService: ConsoleLogService, i18nService: I18nService) => {
                return isPrivateMode ? null : new PopupSearchService(getBgService<SearchService>('searchService')(),
                    cipherService, logService, i18nService);
            },
            deps: [
                CipherService,
                LogServiceAbstraction,
                I18nService,
            ],
        },
        { provide: AuditService, useFactory: getBgService<AuditService>('auditService'), deps: [] },
        { provide: FileUploadService, useFactory: getBgService<FileUploadService>('fileUploadService'), deps: [] },
        { provide: CipherService, useFactory: getBgService<CipherService>('cipherService'), deps: [] },
        {
            provide: CryptoFunctionService,
            useFactory: getBgService<CryptoFunctionService>('cryptoFunctionService'),
            deps: [],
        },
        { provide: FolderService, useFactory: getBgService<FolderService>('folderService'), deps: [] },
        { provide: CollectionService, useFactory: getBgService<CollectionService>('collectionService'), deps: [] },
        { provide: LogServiceAbstraction, useFactory: getBgService<ConsoleLogService>('logService'), deps: [] },
        { provide: EnvironmentService, useFactory: getBgService<EnvironmentService>('environmentService'), deps: [] },
        { provide: TotpService, useFactory: getBgService<TotpService>('totpService'), deps: [] },
        { provide: TokenService, useFactory: getBgService<TokenService>('tokenService'), deps: [] },
        { provide: I18nService, useFactory: getBgService<I18nService>('i18nService'), deps: [] },
        { provide: CryptoService, useFactory: getBgService<CryptoService>('cryptoService'), deps: [] },
        { provide: EventService, useFactory: getBgService<EventService>('eventService'), deps: [] },
        { provide: PolicyService, useFactory: getBgService<PolicyService>('policyService'), deps: [] },
        {
            provide: PlatformUtilsService,
            useFactory: getBgService<PlatformUtilsService>('platformUtilsService'),
            deps: [],
        },
        {
            provide: PasswordGenerationService,
            useFactory: getBgService<PasswordGenerationService>('passwordGenerationService'),
            deps: [],
        },
        { provide: ApiService, useFactory: getBgService<ApiService>('apiService'), deps: [] },
        { provide: SyncService, useFactory: getBgService<SyncService>('syncService'), deps: [] },
        { provide: UserService, useFactory: getBgService<UserService>('userService'), deps: [] },
        { provide: SettingsService, useFactory: getBgService<SettingsService>('settingsService'), deps: [] },
        { provide: StorageService, useFactory: getBgService<StorageService>('storageService'), deps: [] },
        { provide: AppIdService, useFactory: getBgService<AppIdService>('appIdService'), deps: [] },
        { provide: AutofillService, useFactory: getBgService<AutofillService>('autofillService'), deps: [] },
        { provide: ExportService, useFactory: getBgService<ExportService>('exportService'), deps: [] },
        { provide: SendService, useFactory: getBgService<SendService>('sendService'), deps: [] },
        { provide: KeyConnectorService, useFactory: getBgService<KeyConnectorService>('keyConnectorService'), deps: [] },
        {
            provide: UserVerificationService,
            useFactory: getBgService<UserVerificationService>('userVerificationService'),
            deps: [],
        },
        {
            provide: VaultTimeoutService,
            useFactory: getBgService<VaultTimeoutService>('vaultTimeoutService'),
            deps: [],
        },
        {
            provide: NotificationsService,
            useFactory: getBgService<NotificationsService>('notificationsService'),
            deps: [],
        },
        { provide: LogServiceAbstraction, useFactory: getBgService<ConsoleLogService>('logService'), deps: [] },
        { provide: PasswordRepromptServiceAbstraction, useClass: PasswordRepromptService },
    ],
})
export class ServicesModule {
}
