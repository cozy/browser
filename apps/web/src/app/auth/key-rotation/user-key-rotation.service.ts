import { Injectable } from "@angular/core";
import { firstValueFrom, map } from "rxjs";

import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { DeviceTrustServiceAbstraction } from "@bitwarden/common/auth/abstractions/device-trust.service.abstraction";
import { KdfConfigService } from "@bitwarden/common/auth/abstractions/kdf-config.service";
import { InternalMasterPasswordServiceAbstraction } from "@bitwarden/common/auth/abstractions/master-password.service.abstraction";
import { CryptoService } from "@bitwarden/common/platform/abstractions/crypto.service";
import { EncryptService } from "@bitwarden/common/platform/abstractions/encrypt.service";
import { StateService } from "@bitwarden/common/platform/abstractions/state.service";
import { EncryptedString } from "@bitwarden/common/platform/models/domain/enc-string";
import { SendService } from "@bitwarden/common/tools/send/services/send.service.abstraction";
import { UserKey } from "@bitwarden/common/types/key";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { FolderService } from "@bitwarden/common/vault/abstractions/folder/folder.service.abstraction";
import { SyncService } from "@bitwarden/common/vault/abstractions/sync/sync.service.abstraction";
import { CipherWithIdRequest } from "@bitwarden/common/vault/models/request/cipher-with-id.request";
import { FolderWithIdRequest } from "@bitwarden/common/vault/models/request/folder-with-id.request";

import { OrganizationUserResetPasswordService } from "../../admin-console/organizations/members/services/organization-user-reset-password/organization-user-reset-password.service";
import { EmergencyAccessService } from "../emergency-access";

import { UpdateKeyRequest } from "./request/update-key.request";
import { UserKeyRotationApiService } from "./user-key-rotation-api.service";

@Injectable()
export class UserKeyRotationService {
  constructor(
    private masterPasswordService: InternalMasterPasswordServiceAbstraction,
    private apiService: UserKeyRotationApiService,
    private cipherService: CipherService,
    private folderService: FolderService,
    private sendService: SendService,
    private emergencyAccessService: EmergencyAccessService,
    private resetPasswordService: OrganizationUserResetPasswordService,
    private deviceTrustService: DeviceTrustServiceAbstraction,
    private cryptoService: CryptoService,
    private encryptService: EncryptService,
    private stateService: StateService,
    private accountService: AccountService,
    private kdfConfigService: KdfConfigService,
    private syncService: SyncService,
  ) {}

  /**
   * Creates a new user key and re-encrypts all required data with the it.
   * @param masterPassword current master password (used for validation)
   */
  async rotateUserKeyAndEncryptedData(masterPassword: string): Promise<void> {
    if (!masterPassword) {
      throw new Error("Invalid master password");
    }

    if ((await this.syncService.getLastSync()) === null) {
      throw new Error(
        "The local vault is de-synced and the keys cannot be rotated. Please log out and log back in to resolve this issue.",
      );
    }

    // Create master key to validate the master password
    const masterKey = await this.cryptoService.makeMasterKey(
      masterPassword,
      await firstValueFrom(this.accountService.activeAccount$.pipe(map((a) => a?.email))),
      await this.kdfConfigService.getKdfConfig(),
    );

    if (!masterKey) {
      throw new Error("Master key could not be created");
    }

    // Set master key again in case it was lost (could be lost on refresh)
    const userId = (await firstValueFrom(this.accountService.activeAccount$))?.id;
    await this.masterPasswordService.setMasterKey(masterKey, userId);
    const [newUserKey, newEncUserKey] = await this.cryptoService.makeUserKey(masterKey);

    if (!newUserKey || !newEncUserKey) {
      throw new Error("User key could not be created");
    }

    // Create new request
    const request = new UpdateKeyRequest();

    // Add new user key
    request.key = newEncUserKey.encryptedString;

    // Add master key hash
    const masterPasswordHash = await this.cryptoService.hashMasterKey(masterPassword, masterKey);
    request.masterPasswordHash = masterPasswordHash;

    // Add re-encrypted data
    request.privateKey = await this.encryptPrivateKey(newUserKey);
    request.ciphers = await this.encryptCiphers(newUserKey);
    request.folders = await this.encryptFolders(newUserKey);
    request.sends = await this.sendService.getRotatedKeys(newUserKey);
    request.emergencyAccessKeys = await this.emergencyAccessService.getRotatedKeys(newUserKey);
    request.resetPasswordKeys = await this.resetPasswordService.getRotatedKeys(newUserKey);

    await this.apiService.postUserKeyUpdate(request);

    const activeAccount = await firstValueFrom(this.accountService.activeAccount$);
    await this.deviceTrustService.rotateDevicesTrust(
      activeAccount.id,
      newUserKey,
      masterPasswordHash,
    );
  }

  private async encryptPrivateKey(newUserKey: UserKey): Promise<EncryptedString | null> {
    const privateKey = await this.cryptoService.getPrivateKey();
    if (!privateKey) {
      return;
    }
    return (await this.encryptService.encrypt(privateKey, newUserKey)).encryptedString;
  }

  private async encryptCiphers(newUserKey: UserKey): Promise<CipherWithIdRequest[]> {
    const ciphers = await this.cipherService.getAllDecrypted();
    if (!ciphers) {
      // Must return an empty array for backwards compatibility
      return [];
    }
    return await Promise.all(
      ciphers.map(async (cipher) => {
        const encryptedCipher = await this.cipherService.encrypt(cipher, newUserKey);
        return new CipherWithIdRequest(encryptedCipher);
      }),
    );
  }

  private async encryptFolders(newUserKey: UserKey): Promise<FolderWithIdRequest[]> {
    const folders = await firstValueFrom(this.folderService.folderViews$);
    if (!folders) {
      // Must return an empty array for backwards compatibility
      return [];
    }
    return await Promise.all(
      folders.map(async (folder) => {
        const encryptedFolder = await this.folderService.encrypt(folder, newUserKey);
        return new FolderWithIdRequest(encryptedFolder);
      }),
    );
  }
}
