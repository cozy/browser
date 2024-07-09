import { firstValueFrom, BehaviorSubject } from "rxjs";
import { Jsonify } from "type-fest";

import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { KdfConfigService } from "@bitwarden/common/auth/abstractions/kdf-config.service";
import { KeyConnectorService } from "@bitwarden/common/auth/abstractions/key-connector.service";
import { InternalMasterPasswordServiceAbstraction } from "@bitwarden/common/auth/abstractions/master-password.service.abstraction";
import { TokenService } from "@bitwarden/common/auth/abstractions/token.service";
import { TwoFactorService } from "@bitwarden/common/auth/abstractions/two-factor.service";
import { UserApiTokenRequest } from "@bitwarden/common/auth/models/request/identity-token/user-api-token.request";
import { IdentityTokenResponse } from "@bitwarden/common/auth/models/response/identity-token.response";
import { BillingAccountProfileStateService } from "@bitwarden/common/billing/abstractions/account/billing-account-profile-state.service";
import { VaultTimeoutAction } from "@bitwarden/common/enums/vault-timeout-action.enum";
import { AppIdService } from "@bitwarden/common/platform/abstractions/app-id.service";
import { CryptoService } from "@bitwarden/common/platform/abstractions/crypto.service";
import { EnvironmentService } from "@bitwarden/common/platform/abstractions/environment.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { MessagingService } from "@bitwarden/common/platform/abstractions/messaging.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { StateService } from "@bitwarden/common/platform/abstractions/state.service";
import { UserId } from "@bitwarden/common/types/guid";

import { InternalUserDecryptionOptionsServiceAbstraction } from "../abstractions/user-decryption-options.service.abstraction";
import { UserApiLoginCredentials } from "../models/domain/login-credentials";
import { CacheData } from "../services/login-strategies/login-strategy.state";

import { LoginStrategy, LoginStrategyData } from "./login.strategy";

export class UserApiLoginStrategyData implements LoginStrategyData {
  tokenRequest: UserApiTokenRequest;
  captchaBypassToken: string;

  static fromJSON(obj: Jsonify<UserApiLoginStrategyData>): UserApiLoginStrategyData {
    return Object.assign(new UserApiLoginStrategyData(), obj, {
      tokenRequest: UserApiTokenRequest.fromJSON(obj.tokenRequest),
    });
  }
}

export class UserApiLoginStrategy extends LoginStrategy {
  protected cache: BehaviorSubject<UserApiLoginStrategyData>;

  constructor(
    data: UserApiLoginStrategyData,
    accountService: AccountService,
    masterPasswordService: InternalMasterPasswordServiceAbstraction,
    cryptoService: CryptoService,
    apiService: ApiService,
    tokenService: TokenService,
    appIdService: AppIdService,
    platformUtilsService: PlatformUtilsService,
    messagingService: MessagingService,
    logService: LogService,
    stateService: StateService,
    twoFactorService: TwoFactorService,
    userDecryptionOptionsService: InternalUserDecryptionOptionsServiceAbstraction,
    private environmentService: EnvironmentService,
    private keyConnectorService: KeyConnectorService,
    billingAccountProfileStateService: BillingAccountProfileStateService,
    protected kdfConfigService: KdfConfigService,
  ) {
    super(
      accountService,
      masterPasswordService,
      cryptoService,
      apiService,
      tokenService,
      appIdService,
      platformUtilsService,
      messagingService,
      logService,
      stateService,
      twoFactorService,
      userDecryptionOptionsService,
      billingAccountProfileStateService,
      kdfConfigService,
    );
    this.cache = new BehaviorSubject(data);
  }

  override async logIn(credentials: UserApiLoginCredentials) {
    const data = new UserApiLoginStrategyData();
    data.tokenRequest = new UserApiTokenRequest(
      credentials.clientId,
      credentials.clientSecret,
      await this.buildTwoFactor(),
      await this.buildDeviceRequest(),
    );
    this.cache.next(data);

    const [authResult] = await this.startLogIn();
    return authResult;
  }

  protected override async setMasterKey(response: IdentityTokenResponse, userId: UserId) {
    if (response.apiUseKeyConnector) {
      const env = await firstValueFrom(this.environmentService.environment$);
      const keyConnectorUrl = env.getKeyConnectorUrl();
      await this.keyConnectorService.setMasterKeyFromUrl(keyConnectorUrl, userId);
    }
  }

  protected override async setUserKey(
    response: IdentityTokenResponse,
    userId: UserId,
  ): Promise<void> {
    await this.cryptoService.setMasterKeyEncryptedUserKey(response.key);

    if (response.apiUseKeyConnector) {
      const masterKey = await firstValueFrom(this.masterPasswordService.masterKey$(userId));
      if (masterKey) {
        const userKey = await this.cryptoService.decryptUserKeyWithMasterKey(masterKey);
        await this.cryptoService.setUserKey(userKey, userId);
      }
    }
  }

  protected override async setPrivateKey(
    response: IdentityTokenResponse,
    userId: UserId,
  ): Promise<void> {
    await this.cryptoService.setPrivateKey(
      response.privateKey ?? (await this.createKeyPairForOldAccount(userId)),
      userId,
    );
  }

  // Overridden to save client ID and secret to token service
  protected async saveAccountInformation(tokenResponse: IdentityTokenResponse): Promise<UserId> {
    const userId = await super.saveAccountInformation(tokenResponse);

    const vaultTimeout = await this.stateService.getVaultTimeout();
    const vaultTimeoutAction = await this.stateService.getVaultTimeoutAction();

    const tokenRequest = this.cache.value.tokenRequest;

    await this.tokenService.setClientId(
      tokenRequest.clientId,
      vaultTimeoutAction as VaultTimeoutAction,
      vaultTimeout,
    );
    await this.tokenService.setClientSecret(
      tokenRequest.clientSecret,
      vaultTimeoutAction as VaultTimeoutAction,
      vaultTimeout,
    );
    return userId;
  }

  exportCache(): CacheData {
    return {
      userApiKey: this.cache.value,
    };
  }
}
