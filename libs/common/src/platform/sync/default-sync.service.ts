import { firstValueFrom } from "rxjs";

import { UserDecryptionOptionsServiceAbstraction } from "../../../../auth/src/common/abstractions";
import { LogoutReason } from "../../../../auth/src/common/types";
import { ApiService } from "../../abstractions/api.service";
import { InternalOrganizationServiceAbstraction } from "../../admin-console/abstractions/organization/organization.service.abstraction";
import { InternalPolicyService } from "../../admin-console/abstractions/policy/policy.service.abstraction";
import { ProviderService } from "../../admin-console/abstractions/provider.service";
import { OrganizationUserType } from "../../admin-console/enums";
import { OrganizationData } from "../../admin-console/models/data/organization.data";
import { PolicyData } from "../../admin-console/models/data/policy.data";
import { ProviderData } from "../../admin-console/models/data/provider.data";
import { PolicyResponse } from "../../admin-console/models/response/policy.response";
import { AccountService } from "../../auth/abstractions/account.service";
import { AuthService } from "../../auth/abstractions/auth.service";
import { AvatarService } from "../../auth/abstractions/avatar.service";
import { KeyConnectorService } from "../../auth/abstractions/key-connector.service";
import { InternalMasterPasswordServiceAbstraction } from "../../auth/abstractions/master-password.service.abstraction";
import { TokenService } from "../../auth/abstractions/token.service";
import { ForceSetPasswordReason } from "../../auth/models/domain/force-set-password-reason";
import { DomainSettingsService } from "../../autofill/services/domain-settings.service";
import { BillingAccountProfileStateService } from "../../billing/abstractions";
import { DomainsResponse } from "../../models/response/domains.response";
import { ProfileResponse } from "../../models/response/profile.response";
import { SendData } from "../../tools/send/models/data/send.data";
import { SendResponse } from "../../tools/send/models/response/send.response";
import { SendApiService } from "../../tools/send/services/send-api.service.abstraction";
import { InternalSendService } from "../../tools/send/services/send.service.abstraction";
import { UserId, OrganizationId } from "../../types/guid";
import { CipherService } from "../../vault/abstractions/cipher.service";
import { CollectionService } from "../../vault/abstractions/collection.service";
import { FolderApiServiceAbstraction } from "../../vault/abstractions/folder/folder-api.service.abstraction";
import { InternalFolderService } from "../../vault/abstractions/folder/folder.service.abstraction";
import { CipherData } from "../../vault/models/data/cipher.data";
import { CollectionData } from "../../vault/models/data/collection.data";
import { FolderData } from "../../vault/models/data/folder.data";
import { CipherResponse } from "../../vault/models/response/cipher.response";
import { CollectionDetailsResponse } from "../../vault/models/response/collection.response";
import { FolderResponse } from "../../vault/models/response/folder.response";
import { CryptoService } from "../abstractions/crypto.service";
import { LogService } from "../abstractions/log.service";
import { StateService } from "../abstractions/state.service";
import { MessageSender } from "../messaging";
import { sequentialize } from "../misc/sequentialize";

import { CoreSyncService } from "./core-sync.service";

/* start Cozy imports */
/* eslint-disable */
import { CozyClientService } from "../../../../../apps/browser/src/popup/services/cozyClient.service";
import { fetchContactsAndConvertAsCiphers } from "../../../../cozy/contactCipher";
import { fetchPapersAndConvertAsCiphers } from "../../../../cozy/paperCipher";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { SyncCipherNotification } from "@bitwarden/common/models/response/notification.response";
import { ProfileProviderOrganizationResponse } from "@bitwarden/common/admin-console/models/response/profile-provider-organization.response";
/* eslint-enable */
/* end Cozy imports */

interface Member {
  user_id: string;
  key?: string;
}

type Members = { [id: string]: Member };

interface CozyOrganizationDocument {
  members?: Members;
}

export class DefaultSyncService extends CoreSyncService {
  syncInProgress = false;

  constructor(
    private masterPasswordService: InternalMasterPasswordServiceAbstraction,
    accountService: AccountService,
    apiService: ApiService,
    private domainSettingsService: DomainSettingsService,
    folderService: InternalFolderService,
    cipherService: CipherService,
    private cryptoService: CryptoService,
    collectionService: CollectionService,
    messageSender: MessageSender,
    private policyService: InternalPolicyService,
    sendService: InternalSendService,
    logService: LogService,
    private keyConnectorService: KeyConnectorService,
    stateService: StateService,
    private providerService: ProviderService,
    folderApiService: FolderApiServiceAbstraction,
    private organizationService: InternalOrganizationServiceAbstraction,
    sendApiService: SendApiService,
    private userDecryptionOptionsService: UserDecryptionOptionsServiceAbstraction,
    private avatarService: AvatarService,
    private logoutCallback: (logoutReason: LogoutReason, userId?: UserId) => Promise<void>,
    private billingAccountProfileStateService: BillingAccountProfileStateService,
    private tokenService: TokenService,
    authService: AuthService,
    protected cozyClientService: CozyClientService,
    private i18nService: I18nService,
  ) {
    super(
      stateService,
      folderService,
      folderApiService,
      messageSender,
      logService,
      cipherService,
      collectionService,
      apiService,
      accountService,
      authService,
      sendService,
      sendApiService,
    );
  }

  @sequentialize(() => "fullSync")
  override async fullSync(forceSync: boolean, allowThrowOnError = false): Promise<boolean> {
    this.syncStarted();
    const isAuthenticated = await this.stateService.getIsAuthenticated();
    if (!isAuthenticated) {
      return this.syncCompleted(false);
    }

    const now = new Date();
    let needsSync = false;
    try {
      needsSync = await this.needsSyncing(forceSync);
    } catch (e) {
      if (allowThrowOnError) {
        this.syncCompleted(false);
        throw e;
      }
    }

    if (!needsSync) {
      await this.setLastSync(now);
      return this.syncCompleted(false);
    }

    try {
      await this.apiService.refreshIdentityToken();
      const response = await this.apiService.getSync();

      await this.syncProfile(response.profile);
      await this.syncFolders(response.folders);
      await this.syncCollections(response.collections);

      // Cozy customization
      await this.cozyClientService.getClientInstance();

      const fetchPromises = [
        fetchPapersAndConvertAsCiphers(
          this.cipherService,
          this.cryptoService,
          this.cozyClientService,
          this.i18nService,
        ),
        fetchContactsAndConvertAsCiphers(
          this.cipherService,
          this.cryptoService,
          this.cozyClientService,
          this.i18nService,
        ),
      ];

      const [papersPromise, contactsPromise] = await Promise.allSettled(fetchPromises);

      let cozyCiphers: CipherData[] = [];

      if (papersPromise.status === "fulfilled") {
        // eslint-disable-next-line no-console
        console.log(`${papersPromise.value.length} contacts ciphers will be added`);
        cozyCiphers = cozyCiphers.concat(papersPromise.value);
      }

      if (contactsPromise.status === "fulfilled") {
        // eslint-disable-next-line no-console
        console.log(`${contactsPromise.value.length} papers ciphers will be added`);
        cozyCiphers = cozyCiphers.concat(contactsPromise.value);
      }

      await this.syncCiphers(response.ciphers, cozyCiphers);
      // Cozy customization end

      await this.syncSends(response.sends);
      await this.syncSettings(response.domains);
      await this.syncPolicies(response.policies);

      await this.setLastSync(now);
      return this.syncCompleted(true);
    } catch (e) {
      if (allowThrowOnError) {
        this.syncCompleted(false);
        throw e;
      } else {
        return this.syncCompleted(false);
      }
    }
  }

  private async needsSyncing(forceSync: boolean) {
    if (forceSync) {
      return true;
    }

    const lastSync = await this.getLastSync();
    if (lastSync == null || lastSync.getTime() === 0) {
      return true;
    }

    const response = await this.apiService.getAccountRevisionDate();
    if (response < 0 && this.logoutCallback) {
      // Account was deleted, log out now
      await this.logoutCallback("accountDeleted");
    }

    if (new Date(response) <= lastSync) {
      return false;
    }
    return true;
  }

  private async syncProfile(response: ProfileResponse) {
    const stamp = await this.tokenService.getSecurityStamp(response.id);
    if (stamp != null && stamp !== response.securityStamp) {
      if (this.logoutCallback != null) {
        await this.logoutCallback("invalidSecurityStamp");
      }

      throw new Error("Stamp has changed");
    }

    await this.cryptoService.setMasterKeyEncryptedUserKey(response.key);
    await this.cryptoService.setPrivateKey(response.privateKey, response.id);
    await this.cryptoService.setProviderKeys(response.providers, response.id);
    await this.cryptoService.setOrgKeys(
      response.organizations,
      response.providerOrganizations,
      response.id,
    );
    await this.avatarService.setSyncAvatarColor(response.id, response.avatarColor);
    await this.tokenService.setSecurityStamp(response.securityStamp, response.id);
    await this.accountService.setAccountEmailVerified(response.id, response.emailVerified);

    await this.billingAccountProfileStateService.setHasPremium(
      response.premiumPersonally,
      response.premiumFromOrganization,
    );
    await this.keyConnectorService.setUsesKeyConnector(response.usesKeyConnector);

    await this.setForceSetPasswordReasonIfNeeded(response);

    const providers: { [id: string]: ProviderData } = {};
    response.providers.forEach((p) => {
      providers[p.id] = new ProviderData(p);
    });

    await this.providerService.save(providers);

    await this.syncProfileOrganizations(response);

    if (await this.keyConnectorService.userNeedsMigration()) {
      await this.keyConnectorService.setConvertAccountRequired(true);
      this.messageSender.send("convertAccountToKeyConnector");
    } else {
      // FIXME: Verify that this floating promise is intentional. If it is, add an explanatory comment and ensure there is proper error handling.
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.keyConnectorService.removeConvertAccountRequired();
    }
  }

  private async setForceSetPasswordReasonIfNeeded(profileResponse: ProfileResponse) {
    // The `forcePasswordReset` flag indicates an admin has reset the user's password and must be updated
    if (profileResponse.forcePasswordReset) {
      await this.masterPasswordService.setForceSetPasswordReason(
        ForceSetPasswordReason.AdminForcePasswordReset,
        profileResponse.id,
      );
    }

    const userDecryptionOptions = await firstValueFrom(
      this.userDecryptionOptionsService.userDecryptionOptionsById$(profileResponse.id),
    );

    if (userDecryptionOptions === null || userDecryptionOptions === undefined) {
      this.logService.error("Sync: Account decryption options are null or undefined.");
    }

    // Even though TDE users should only be in a single org (per single org policy), check
    // through all orgs for the manageResetPassword permission. If they have it in any org,
    // they should be forced to set a password.
    let hasManageResetPasswordPermission = false;
    for (const org of profileResponse.organizations) {
      const isAdmin = org.type === OrganizationUserType.Admin;
      const isOwner = org.type === OrganizationUserType.Owner;

      // Note: apparently permissions only come down populated for custom roles.
      if (isAdmin || isOwner || (org.permissions && org.permissions.manageResetPassword)) {
        hasManageResetPasswordPermission = true;
        break;
      }
    }

    if (
      userDecryptionOptions.trustedDeviceOption !== undefined &&
      !userDecryptionOptions.hasMasterPassword &&
      hasManageResetPasswordPermission
    ) {
      // TDE user w/out MP went from having no password reset permission to having it.
      // Must set the force password reset reason so the auth guard will redirect to the set password page.
      const userId = (await firstValueFrom(this.accountService.activeAccount$))?.id;
      await this.masterPasswordService.setForceSetPasswordReason(
        ForceSetPasswordReason.TdeUserWithoutPasswordHasPasswordResetPermission,
        userId,
      );
    }
  }

  private async syncProfileOrganizations(response: ProfileResponse) {
    const organizations: { [id: string]: OrganizationData } = {};
    response.organizations.forEach((o) => {
      organizations[o.id] = new OrganizationData(o, {
        isMember: true,
        isProviderUser: false,
      });
    });

    response.providerOrganizations.forEach((o) => {
      if (organizations[o.id] == null) {
        organizations[o.id] = new OrganizationData(o, {
          isMember: false,
          isProviderUser: true,
        });
      } else {
        organizations[o.id].isProviderUser = true;
      }
    });

    await this.organizationService.replace(organizations);
  }

  private async syncFolders(response: FolderResponse[]) {
    const folders: { [id: string]: FolderData } = {};
    response.forEach((f) => {
      folders[f.id] = new FolderData(f);
    });
    return await this.folderService.replace(folders);
  }

  private async syncCollections(response: CollectionDetailsResponse[]) {
    const collections: { [id: string]: CollectionData } = {};
    response.forEach((c) => {
      collections[c.id] = new CollectionData(c);
    });
    return await this.collectionService.replace(collections);
  }

  // Cozy customization, sync in the same time bitwarden ciphers (response) and cozy ciphers (data)
  //*
  private async syncCiphers(response: CipherResponse[], data: CipherData[]) {
    const ciphers: { [id: string]: CipherData } = {};
    response.forEach((c) => {
      ciphers[c.id] = new CipherData(c);
    });
    data.forEach((c) => {
      ciphers[c.id] = c;
    });
    return await this.cipherService.replace(ciphers);
  }
  /*/
  private async syncCiphers(response: CipherResponse[]) {
    const ciphers: { [id: string]: CipherData } = {};
    response.forEach((c) => {
      ciphers[c.id] = new CipherData(c);
    });
    return await this.cipherService.replace(ciphers);
  }
  //*/

  private async syncSends(response: SendResponse[]) {
    const sends: { [id: string]: SendData } = {};
    response.forEach((s) => {
      sends[s.id] = new SendData(s);
    });
    return await this.sendService.replace(sends);
  }

  private async syncSettings(response: DomainsResponse) {
    let eqDomains: string[][] = [];
    if (response != null && response.equivalentDomains != null) {
      eqDomains = eqDomains.concat(response.equivalentDomains);
    }

    if (response != null && response.globalEquivalentDomains != null) {
      response.globalEquivalentDomains.forEach((global) => {
        if (global.domains.length > 0) {
          eqDomains.push(global.domains);
        }
      });
    }

    return this.domainSettingsService.setEquivalentDomains(eqDomains);
  }

  private async syncPolicies(response: PolicyResponse[]) {
    const policies: { [id: string]: PolicyData } = {};
    if (response != null) {
      response.forEach((p) => {
        policies[p.id] = new PolicyData(p);
      });
    }
    return await this.policyService.replace(policies);
  }

  // Cozy customization
  // Update remote sync date only for non-zero date, which is used for logout
  override async setLastSync(date: Date, userId?: string): Promise<any> {
    super.setLastSync(date, userId);

    if (date.getTime() !== 0) {
      await this.cozyClientService.updateSynchronizedAt();
    }
  }

  override async syncUpsertCipher(
    notification: SyncCipherNotification,
    isEdit: boolean,
  ): Promise<boolean> {
    const isAuthenticated = await this.stateService.getIsAuthenticated();
    if (!isAuthenticated) {
      return false;
    }

    this.syncStarted();

    try {
      await this.syncUpsertOrganization(notification.organizationId, isEdit);

      return super.syncUpsertCipher(notification, isEdit);
    } catch (e) {
      return this.syncCompleted(false);
    }
  }

  protected async getOrganizationKey(organizationId: string): Promise<string> {
    const client = await this.cozyClientService.getClientInstance();
    const remoteOrganizationData: CozyOrganizationDocument = await client.stackClient.fetchJSON(
      "GET",
      `/data/com.bitwarden.organizations/${organizationId}`,
      [],
    );

    const userId = await this.stateService.getUserId();

    const remoteOrganizationUser = Object.values(remoteOrganizationData.members).find(
      (member) => member.user_id === userId,
    );

    return remoteOrganizationUser?.key || "";
  }

  protected async syncUpsertOrganizationKey(organizationId: string) {
    const userId = await this.stateService.getUserId();

    const remoteOrganizationKey = await this.getOrganizationKey(organizationId);

    await this.cryptoService.upsertOrganizationKey(
      userId as UserId,
      organizationId as OrganizationId,
      remoteOrganizationKey,
    );
  }

  protected async syncUpsertOrganization(organizationId: string, isEdit: boolean) {
    if (!organizationId) {
      return;
    }

    const storedOrganization = await this.organizationService.get(organizationId);
    const storedOrganizationkey = await this.cryptoService.getOrgKey(organizationId);

    if (storedOrganization !== null && storedOrganizationkey != null) {
      return;
    }

    const remoteOrganization = await this.organizationService.get(organizationId);
    const remoteOrganizationResponse = (remoteOrganization as any).response;
    const remoteProfileProviderOrganizationResponse = new ProfileProviderOrganizationResponse(
      remoteOrganizationResponse,
    );

    if (remoteOrganization !== null) {
      await this.organizationService.upsertOrganization(remoteProfileProviderOrganizationResponse);

      await this.syncUpsertOrganizationKey(organizationId);

      await this.syncUpsertCollections(organizationId, isEdit);
    }
  }

  protected async syncUpsertCollections(organizationId: string, isEdit: boolean) {
    const syncCollections = await this.apiService.getCollections(organizationId);

    await this.collectionService.upsert(
      syncCollections.data.map((col) => {
        return {
          externalId: col.externalId,
          id: col.id,
          name: col.name,
          organizationId: col.organizationId,
          readOnly: false,
          manage: false,
          hidePasswords: false,
        };
      }),
    );
  }
}