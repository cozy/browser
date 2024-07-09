import { Jsonify } from "type-fest";

import { UriMatchStrategySetting } from "../../../models/domain/domain-service";
import { GeneratorOptions } from "../../../tools/generator/generator-options";
import {
  GeneratedPasswordHistory,
  PasswordGeneratorOptions,
} from "../../../tools/generator/password";
import { UsernameGeneratorOptions } from "../../../tools/generator/username/username-generation-options";
import { DeepJsonify } from "../../../types/deep-jsonify";
import { KdfType } from "../../enums";
import { Utils } from "../../misc/utils";

import { EncryptedString, EncString } from "./enc-string";
import { SymmetricCryptoKey } from "./symmetric-crypto-key";

export class EncryptionPair<TEncrypted, TDecrypted> {
  encrypted?: TEncrypted;
  decrypted?: TDecrypted;

  toJSON() {
    return {
      encrypted: this.encrypted,
      decrypted:
        this.decrypted instanceof ArrayBuffer
          ? Utils.fromBufferToByteString(this.decrypted)
          : this.decrypted,
    };
  }

  static fromJSON<TEncrypted, TDecrypted>(
    obj: { encrypted?: Jsonify<TEncrypted>; decrypted?: string | Jsonify<TDecrypted> },
    decryptedFromJson?: (decObj: Jsonify<TDecrypted> | string) => TDecrypted,
    encryptedFromJson?: (encObj: Jsonify<TEncrypted>) => TEncrypted,
  ) {
    if (obj == null) {
      return null;
    }

    const pair = new EncryptionPair<TEncrypted, TDecrypted>();
    if (obj?.encrypted != null) {
      pair.encrypted = encryptedFromJson
        ? encryptedFromJson(obj.encrypted)
        : (obj.encrypted as TEncrypted);
    }
    if (obj?.decrypted != null) {
      pair.decrypted = decryptedFromJson
        ? decryptedFromJson(obj.decrypted)
        : (obj.decrypted as TDecrypted);
    }
    return pair;
  }
}

export class DataEncryptionPair<TEncrypted, TDecrypted> {
  encrypted?: Record<string, TEncrypted>;
  decrypted?: TDecrypted[];
}

export class AccountData {
  passwordGenerationHistory?: EncryptionPair<
    GeneratedPasswordHistory[],
    GeneratedPasswordHistory[]
  > = new EncryptionPair<GeneratedPasswordHistory[], GeneratedPasswordHistory[]>();

  static fromJSON(obj: DeepJsonify<AccountData>): AccountData {
    if (obj == null) {
      return null;
    }

    return Object.assign(new AccountData(), obj);
  }
}

export class AccountKeys {
  publicKey?: Uint8Array;

  /** @deprecated July 2023, left for migration purposes*/
  cryptoMasterKeyAuto?: string;
  /** @deprecated July 2023, left for migration purposes*/
  cryptoMasterKeyBiometric?: string;
  /** @deprecated July 2023, left for migration purposes*/
  cryptoSymmetricKey?: EncryptionPair<string, SymmetricCryptoKey> = new EncryptionPair<
    string,
    SymmetricCryptoKey
  >();

  toJSON() {
    // If you pass undefined into fromBufferToByteString, you will get an empty string back
    // which will cause all sorts of headaches down the line when you try to getPublicKey
    // and expect a Uint8Array and get an empty string instead.
    return Utils.merge(this, {
      publicKey: this.publicKey ? Utils.fromBufferToByteString(this.publicKey) : undefined,
    });
  }

  static fromJSON(obj: DeepJsonify<AccountKeys>): AccountKeys {
    if (obj == null) {
      return null;
    }
    return Object.assign(new AccountKeys(), obj, {
      cryptoSymmetricKey: EncryptionPair.fromJSON(
        obj?.cryptoSymmetricKey,
        SymmetricCryptoKey.fromJSON,
      ),
      publicKey: Utils.fromByteStringToArray(obj?.publicKey),
    });
  }

  static initRecordEncryptionPairsFromJSON(obj: any) {
    return EncryptionPair.fromJSON(obj, (decObj: any) => {
      if (obj == null) {
        return null;
      }

      const record: Record<string, SymmetricCryptoKey> = {};
      for (const id in decObj) {
        record[id] = SymmetricCryptoKey.fromJSON(decObj[id]);
      }
      return record;
    });
  }
}

export class AccountProfile {
  name?: string;
  email?: string;
  emailVerified?: boolean;
  lastSync?: string;
  userId?: string;
  kdfIterations?: number;
  kdfMemory?: number;
  kdfParallelism?: number;
  kdfType?: KdfType;
  // Cozy customization, clean profiles after X days
  //*
  profilesMigrationHidden?: boolean;
  //*/

  static fromJSON(obj: Jsonify<AccountProfile>): AccountProfile {
    if (obj == null) {
      return null;
    }

    return Object.assign(new AccountProfile(), obj);
  }
}

export class AccountSettings {
  defaultUriMatch?: UriMatchStrategySetting;
  minimizeOnCopyToClipboard?: boolean;
  passwordGenerationOptions?: PasswordGeneratorOptions;
  usernameGenerationOptions?: UsernameGeneratorOptions;
  generatorOptions?: GeneratorOptions;
  pinKeyEncryptedUserKey?: EncryptedString;
  pinKeyEncryptedUserKeyEphemeral?: EncryptedString;
  protectedPin?: string;
  vaultTimeout?: number;
  vaultTimeoutAction?: string = "lock";
  // Cozy customization, clean profiles after X days
  //*
  profilesCleanDeadline?: string;
  //*/

  /** @deprecated July 2023, left for migration purposes*/
  pinProtected?: EncryptionPair<string, EncString> = new EncryptionPair<string, EncString>();

  static fromJSON(obj: Jsonify<AccountSettings>): AccountSettings {
    if (obj == null) {
      return null;
    }

    return Object.assign(new AccountSettings(), obj, {
      pinProtected: EncryptionPair.fromJSON<string, EncString>(
        obj?.pinProtected,
        EncString.fromJSON,
      ),
    });
  }
}

export class Account {
  data?: AccountData = new AccountData();
  keys?: AccountKeys = new AccountKeys();
  profile?: AccountProfile = new AccountProfile();
  settings?: AccountSettings = new AccountSettings();
  history?: string;
  konnectorsOrganization?: string;
  bannerClosedByUser?: boolean;

  constructor(init: Partial<Account>) {
    Object.assign(this, {
      data: {
        ...new AccountData(),
        ...init?.data,
      },
      keys: {
        ...new AccountKeys(),
        ...init?.keys,
      },
      profile: {
        ...new AccountProfile(),
        ...init?.profile,
      },
      settings: {
        ...new AccountSettings(),
        ...init?.settings,
      },
    });
  }

  static fromJSON(json: Jsonify<Account>): Account {
    if (json == null) {
      return null;
    }

    return Object.assign(new Account({}), json, {
      keys: AccountKeys.fromJSON(json?.keys),
      data: AccountData.fromJSON(json?.data),
      profile: AccountProfile.fromJSON(json?.profile),
      settings: AccountSettings.fromJSON(json?.settings),
    });
  }
}
