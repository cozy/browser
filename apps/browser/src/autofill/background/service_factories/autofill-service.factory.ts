import {
  accountServiceFactory,
  AccountServiceInitOptions,
} from "../../../auth/background/service-factories/account-service.factory";
import {
  authServiceFactory,
  AuthServiceInitOptions,
} from "../../../auth/background/service-factories/auth-service.factory";
import {
  UserVerificationServiceInitOptions,
  userVerificationServiceFactory,
} from "../../../auth/background/service-factories/user-verification-service.factory";
import {
  EventCollectionServiceInitOptions,
  eventCollectionServiceFactory,
} from "../../../background/service-factories/event-collection-service.factory";
import { billingAccountProfileStateServiceFactory } from "../../../platform/background/service-factories/billing-account-profile-state-service.factory";
import {
  browserScriptInjectorServiceFactory,
  BrowserScriptInjectorServiceInitOptions,
} from "../../../platform/background/service-factories/browser-script-injector-service.factory";
import {
  CachedServices,
  factory,
  FactoryOptions,
} from "../../../platform/background/service-factories/factory-options";
import {
  logServiceFactory,
  LogServiceInitOptions,
} from "../../../platform/background/service-factories/log-service.factory";
import {
  cipherServiceFactory,
  CipherServiceInitOptions,
} from "../../../vault/background/service_factories/cipher-service.factory";
import {
  TotpServiceInitOptions,
  totpServiceFactory,
} from "../../../vault/background/service_factories/totp-service.factory";
import { AutofillService as AbstractAutoFillService } from "../../services/abstractions/autofill.service";
import AutofillService from "../../services/autofill.service";

import {
  AutofillSettingsServiceInitOptions,
  autofillSettingsServiceFactory,
} from "./autofill-settings-service.factory";
import {
  DomainSettingsServiceInitOptions,
  domainSettingsServiceFactory,
} from "./domain-settings-service.factory";

type AutoFillServiceOptions = FactoryOptions;

export type AutoFillServiceInitOptions = AutoFillServiceOptions &
  CipherServiceInitOptions &
  AutofillSettingsServiceInitOptions &
  TotpServiceInitOptions &
  EventCollectionServiceInitOptions &
  LogServiceInitOptions &
  UserVerificationServiceInitOptions &
  DomainSettingsServiceInitOptions &
  BrowserScriptInjectorServiceInitOptions &
  AccountServiceInitOptions &
  AuthServiceInitOptions;

export function autofillServiceFactory(
  cache: { autofillService?: AbstractAutoFillService } & CachedServices,
  opts: AutoFillServiceInitOptions,
): Promise<AbstractAutoFillService> {
  return factory(
    cache,
    "autofillService",
    opts,
    async () =>
      new AutofillService(
        await cipherServiceFactory(cache, opts),
        await autofillSettingsServiceFactory(cache, opts),
        await totpServiceFactory(cache, opts),
        await eventCollectionServiceFactory(cache, opts),
        await logServiceFactory(cache, opts),
        await domainSettingsServiceFactory(cache, opts),
        await userVerificationServiceFactory(cache, opts),
        await billingAccountProfileStateServiceFactory(cache, opts),
        await browserScriptInjectorServiceFactory(cache, opts),
        await accountServiceFactory(cache, opts),
        await authServiceFactory(cache, opts),
      ),
  );
}
