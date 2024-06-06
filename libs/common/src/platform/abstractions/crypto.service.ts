import { Observable } from "rxjs";

import { ProfileOrganizationResponse } from "../../admin-console/models/response/profile-organization.response";
import { ProfileProviderOrganizationResponse } from "../../admin-console/models/response/profile-provider-organization.response";
import { ProfileProviderResponse } from "../../admin-console/models/response/profile-provider.response";
import { KdfConfig } from "../../auth/models/domain/kdf-config";
import { OrganizationId, ProviderId, UserId } from "../../types/guid";
import { UserKey, MasterKey, OrgKey, ProviderKey, PinKey, CipherKey } from "../../types/key";
import { KeySuffixOptions, HashPurpose } from "../enums";
import { EncArrayBuffer } from "../models/domain/enc-array-buffer";
import { EncString } from "../models/domain/enc-string";
import { SymmetricCryptoKey } from "../models/domain/symmetric-crypto-key";

export abstract class CryptoService {
  abstract activeUserKey$: Observable<UserKey>;

  /**
   * Returns the an observable key for the given user id.
   *
   * @note this observable represents only user keys stored in memory. A null value does not indicate that we cannot load a user key from storage.
   * @param userId The desired user
   */
  abstract getInMemoryUserKeyFor$(userId: UserId): Observable<UserKey>;
  /**
   * Sets the provided user key and stores
   * any other necessary versions (such as auto, biometrics,
   * or pin)
   *
   * @throws when key is null. Lock the account to clear a key
   * @param key The user key to set
   * @param userId The desired user
   */
  abstract setUserKey(key: UserKey, userId?: string): Promise<void>;
  /**
   * Gets the user key from memory and sets it again,
   * kicking off a refresh of any additional keys
   * (such as auto, biometrics, or pin)
   */
  abstract refreshAdditionalKeys(): Promise<void>;
  /**
   * Observable value that returns whether or not the currently active user has ever had auser key,
   * i.e. has ever been unlocked/decrypted. This is key for differentiating between TDE locked and standard locked states.
   */
  abstract everHadUserKey$: Observable<boolean>;
  /**
   * Retrieves the user key
   * @param userId The desired user
   * @returns The user key
   */
  abstract getUserKey(userId?: string): Promise<UserKey>;

  /**
   * Checks if the user is using an old encryption scheme that used the master key
   * for encryption of data instead of the user key.
   */
  abstract isLegacyUser(masterKey?: MasterKey, userId?: string): Promise<boolean>;

  /**
   * Use for encryption/decryption of data in order to support legacy
   * encryption models. It will return the user key if available,
   * if not it will return the master key.
   *
   * @deprecated Please provide the userId of the user you want the user key for.
   */
  abstract getUserKeyWithLegacySupport(): Promise<UserKey>;

  /**
   * Use for encryption/decryption of data in order to support legacy
   * encryption models. It will return the user key if available,
   * if not it will return the master key.
   * @param userId The desired user
   */
  abstract getUserKeyWithLegacySupport(userId: UserId): Promise<UserKey>;
  /**
   * Retrieves the user key from storage
   * @param keySuffix The desired version of the user's key to retrieve
   * @param userId The desired user
   * @returns The user key
   */
  abstract getUserKeyFromStorage(keySuffix: KeySuffixOptions, userId?: string): Promise<UserKey>;

  /**
   * Determines whether the user key is available for the given user.
   * @param userId The desired user. If not provided, the active user will be used. If no active user exists, the method will return false.
   * @returns True if the user key is available
   */
  abstract hasUserKey(userId?: UserId): Promise<boolean>;
  /**
   * Determines whether the user key is available for the given user in memory.
   * @param userId The desired user. If not provided, the active user will be used. If no active user exists, the method will return false.
   * @returns True if the user key is available
   */
  abstract hasUserKeyInMemory(userId?: string): Promise<boolean>;
  /**
   * @param keySuffix The desired version of the user's key to check
   * @param userId The desired user
   * @returns True if the provided version of the user key is stored
   */
  abstract hasUserKeyStored(keySuffix: KeySuffixOptions, userId?: string): Promise<boolean>;
  /**
   * Generates a new user key
   * @param masterKey The user's master key
   * @returns A new user key and the master key protected version of it
   */
  abstract makeUserKey(key: MasterKey): Promise<[UserKey, EncString]>;
  /**
   * Clears the user's stored version of the user key
   * @param keySuffix The desired version of the key to clear
   * @param userId The desired user
   */
  abstract clearStoredUserKey(keySuffix: KeySuffixOptions, userId?: string): Promise<void>;
  /**
   * Stores the master key encrypted user key
   * @param userKeyMasterKey The master key encrypted user key to set
   * @param userId The desired user
   */
  abstract setMasterKeyEncryptedUserKey(UserKeyMasterKey: string, userId?: string): Promise<void>;
  /**
   * @param password The user's master password that will be used to derive a master key if one isn't found
   * @param userId The desired user
   */
  abstract getOrDeriveMasterKey(password: string, userId?: string): Promise<MasterKey>;
  /**
   * Generates a master key from the provided password
   * @param password The user's master password
   * @param email The user's email
   * @param KdfConfig The user's key derivation function configuration
   * @returns A master key derived from the provided password
   */
  abstract makeMasterKey(password: string, email: string, KdfConfig: KdfConfig): Promise<MasterKey>;
  /**
   * Encrypts the existing (or provided) user key with the
   * provided master key
   * @param masterKey The user's master key
   * @param userKey The user key
   * @returns The user key and the master key protected version of it
   */
  abstract encryptUserKeyWithMasterKey(
    masterKey: MasterKey,
    userKey?: UserKey,
  ): Promise<[UserKey, EncString]>;
  /**
   * Decrypts the user key with the provided master key
   * @param masterKey The user's master key
   * @param userKey The user's encrypted symmetric key
   * @param userId The desired user
   * @returns The user key
   */
  abstract decryptUserKeyWithMasterKey(
    masterKey: MasterKey,
    userKey?: EncString,
    userId?: string,
  ): Promise<UserKey>;
  /**
   * Creates a master password hash from the user's master password. Can
   * be used for local authentication or for server authentication depending
   * on the hashPurpose provided.
   * @param password The user's master password
   * @param key The user's master key
   * @param hashPurpose The iterations to use for the hash
   * @returns The user's master password hash
   */
  abstract hashMasterKey(
    password: string,
    key: MasterKey,
    hashPurpose?: HashPurpose,
  ): Promise<string>;
  /**
   * Compares the provided master password to the stored password hash and server password hash.
   * Updates the stored hash if outdated.
   * @param masterPassword The user's master password
   * @param key The user's master key
   * @returns True if the provided master password matches either the stored
   * key hash or the server key hash
   */
  abstract compareAndUpdateKeyHash(masterPassword: string, masterKey: MasterKey): Promise<boolean>;
  /**
   * Stores the encrypted organization keys and clears any decrypted
   * organization keys currently in memory
   * @param orgs The organizations to set keys for
   * @param providerOrgs The provider organizations to set keys for
   * @param userId The user id of the user to set the org keys for
   */
  abstract setOrgKeys(
    orgs: ProfileOrganizationResponse[],
    providerOrgs: ProfileProviderOrganizationResponse[],
    userId: UserId,
  ): Promise<void>;
  abstract activeUserOrgKeys$: Observable<Record<OrganizationId, OrgKey>>;
  /**
   * Returns the organization's symmetric key
   * @deprecated Use the observable activeUserOrgKeys$ and `map` to the desired orgKey instead
   * @param orgId The desired organization
   * @returns The organization's symmetric key
   */
  abstract getOrgKey(orgId: string): Promise<OrgKey>;
  /**
   * @deprecated Use the observable activeUserOrgKeys$ instead
   * @returns A record of the organization Ids to their symmetric keys
   */
  abstract getOrgKeys(): Promise<Record<string, SymmetricCryptoKey>>;
  /**
   * Uses the org key to derive a new symmetric key for encrypting data
   * @param orgKey The organization's symmetric key
   */
  abstract makeDataEncKey<T extends UserKey | OrgKey>(
    key: T,
  ): Promise<[SymmetricCryptoKey, EncString]>;
  /**
   * Stores the encrypted provider keys and clears any decrypted
   * provider keys currently in memory
   * @param providers The providers to set keys for
   */
  abstract activeUserProviderKeys$: Observable<Record<ProviderId, ProviderKey>>;

  /**
   * Stores the provider keys for a given user.
   * @param orgs The provider orgs for which to save the keys from.
   * @param userId The user id of the user for which to store the keys for.
   */
  abstract setProviderKeys(orgs: ProfileProviderResponse[], userId: UserId): Promise<void>;
  /**
   * @param providerId The desired provider
   * @returns The provider's symmetric key
   */
  abstract getProviderKey(providerId: string): Promise<ProviderKey>;
  /**
   * @returns A record of the provider Ids to their symmetric keys
   */
  abstract getProviderKeys(): Promise<Record<ProviderId, ProviderKey>>;
  /**
   * Returns the public key from memory. If not available, extracts it
   * from the private key and stores it in memory
   * @returns The user's public key
   */
  abstract getPublicKey(): Promise<Uint8Array>;
  /**
   * Creates a new organization key and encrypts it with the user's public key.
   * This method can also return Provider keys for creating new Provider users.
   * @returns The new encrypted org key and the decrypted key itself
   */
  abstract makeOrgKey<T extends OrgKey | ProviderKey>(): Promise<[EncString, T]>;
  /**
   * Sets the user's encrypted private key in storage and
   * clears the decrypted private key from memory
   * Note: does not clear the private key if null is provided
   * @param encPrivateKey An encrypted private key
   */
  abstract setPrivateKey(encPrivateKey: string, userId: UserId): Promise<void>;
  /**
   * Returns the private key from memory. If not available, decrypts it
   * from storage and stores it in memory
   * @returns The user's private key
   */
  abstract getPrivateKey(): Promise<Uint8Array>;
  /**
   * Generates a fingerprint phrase for the user based on their public key
   * @param fingerprintMaterial Fingerprint material
   * @param publicKey The user's public key
   * @returns The user's fingerprint phrase
   */
  abstract getFingerprint(fingerprintMaterial: string, publicKey?: Uint8Array): Promise<string[]>;
  /**
   * Generates a new keypair
   * @param key A key to encrypt the private key with. If not provided,
   * defaults to the user key
   * @returns A new keypair: [publicKey in Base64, encrypted privateKey]
   * @throws If the provided key is a null-ish value.
   */
  abstract makeKeyPair(key: SymmetricCryptoKey): Promise<[string, EncString]>;
  /**
   * @param pin The user's pin
   * @param salt The user's salt
   * @param kdfConfig The user's kdf config
   * @returns A key derived from the user's pin
   */
  abstract makePinKey(pin: string, salt: string, kdfConfig: KdfConfig): Promise<PinKey>;
  /**
   * Clears the user's pin keys from storage
   * Note: This will remove the stored pin and as a result,
   * disable pin protection for the user
   * @param userId The desired user
   */
  abstract clearPinKeys(userId?: string): Promise<void>;
  /**
   * Decrypts the user key with their pin
   * @param pin The user's PIN
   * @param salt The user's salt
   * @param kdfConfig The user's KDF config
   * @param pinProtectedUserKey The user's PIN protected symmetric key, if not provided
   * it will be retrieved from storage
   * @returns The decrypted user key
   */
  abstract decryptUserKeyWithPin(
    pin: string,
    salt: string,
    kdfConfig: KdfConfig,
    protectedKeyCs?: EncString,
  ): Promise<UserKey>;
  /**
   * Creates a new Pin key that encrypts the user key instead of the
   * master key. Clears the old Pin key from state.
   * @param masterPasswordOnRestart True if Master Password on Restart is enabled
   * @param pin User's PIN
   * @param email User's email
   * @param kdfConfig User's KdfConfig
   * @param oldPinKey The old Pin key from state (retrieved from different
   * places depending on if Master Password on Restart was enabled)
   * @returns The user key
   */
  abstract decryptAndMigrateOldPinKey(
    masterPasswordOnRestart: boolean,
    pin: string,
    email: string,
    kdfConfig: KdfConfig,
    oldPinKey: EncString,
  ): Promise<UserKey>;
  /**
   * @param keyMaterial The key material to derive the send key from
   * @returns A new send key
   */
  abstract makeSendKey(keyMaterial: Uint8Array): Promise<SymmetricCryptoKey>;
  /**
   * Clears all of the user's keys from storage
   * @param userId The user's Id
   */
  abstract clearKeys(userId?: string): Promise<any>;
  /**
   * RSA encrypts a value.
   * @param data The data to encrypt
   * @param publicKey The public key to use for encryption, if not provided, the user's public key will be used
   * @returns The encrypted data
   * @throws If the given publicKey is a null-ish value.
   */
  abstract rsaEncrypt(data: Uint8Array, publicKey: Uint8Array): Promise<EncString>;
  /**
   * Decrypts a value using RSA.
   * @param encValue The encrypted value to decrypt
   * @param privateKey The private key to use for decryption
   * @returns The decrypted value
   * @throws If the given privateKey is a null-ish value.
   */
  abstract rsaDecrypt(encValue: string, privateKey: Uint8Array): Promise<Uint8Array>;
  abstract randomNumber(min: number, max: number): Promise<number>;
  /**
   * Generates a new cipher key
   * @returns A new cipher key
   */
  abstract makeCipherKey(): Promise<CipherKey>;

  /**
   * Initialize all necessary crypto keys needed for a new account.
   * Warning! This completely replaces any existing keys!
   * @returns The user's newly created  public key, private key, and encrypted private key
   */
  abstract initAccount(): Promise<{
    userKey: UserKey;
    publicKey: string;
    privateKey: EncString;
  }>;

  /**
   * @deprecated Left for migration purposes. Use decryptUserKeyWithPin instead.
   */
  abstract decryptMasterKeyWithPin(
    pin: string,
    salt: string,
    kdfConfig: KdfConfig,
    protectedKeyCs?: EncString,
  ): Promise<MasterKey>;
  /**
   * Previously, the master key was used for any additional key like the biometrics or pin key.
   * We have switched to using the user key for these purposes. This method is for clearing the state
   * of the older keys on logout or post migration.
   * @param keySuffix The desired type of key to clear
   * @param userId The desired user
   */
  abstract clearDeprecatedKeys(keySuffix: KeySuffixOptions, userId?: string): Promise<void>;
  /**
   * @deprecated July 25 2022: Get the key you need from CryptoService (getKeyForUserEncryption or getOrgKey)
   * and then call encryptService.encrypt
   */
  abstract encrypt(plainValue: string | Uint8Array, key?: SymmetricCryptoKey): Promise<EncString>;
  /**
   * @deprecated July 25 2022: Get the key you need from CryptoService (getKeyForUserEncryption or getOrgKey)
   * and then call encryptService.encryptToBytes
   */
  abstract encryptToBytes(
    plainValue: Uint8Array,
    key?: SymmetricCryptoKey,
  ): Promise<EncArrayBuffer>;
  /**
   * @deprecated July 25 2022: Get the key you need from CryptoService (getKeyForUserEncryption or getOrgKey)
   * and then call encryptService.decryptToBytes
   */
  abstract decryptToBytes(encString: EncString, key?: SymmetricCryptoKey): Promise<Uint8Array>;
  /**
   * @deprecated July 25 2022: Get the key you need from CryptoService (getKeyForUserEncryption or getOrgKey)
   * and then call encryptService.decryptToUtf8
   */
  abstract decryptToUtf8(encString: EncString, key?: SymmetricCryptoKey): Promise<string>;
  /**
   * @deprecated July 25 2022: Get the key you need from CryptoService (getKeyForUserEncryption or getOrgKey)
   * and then call encryptService.decryptToBytes
   */
  abstract decryptFromBytes(
    encBuffer: EncArrayBuffer,
    key: SymmetricCryptoKey,
  ): Promise<Uint8Array>;
}
