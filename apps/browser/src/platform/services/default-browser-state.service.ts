import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { TokenService } from "@bitwarden/common/auth/abstractions/token.service";
import { EnvironmentService } from "@bitwarden/common/platform/abstractions/environment.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { AbstractStorageService } from "@bitwarden/common/platform/abstractions/storage.service";
import { StateFactory } from "@bitwarden/common/platform/factories/state-factory";
import { GlobalState } from "@bitwarden/common/platform/models/domain/global-state";
import { StorageOptions } from "@bitwarden/common/platform/models/domain/storage-options";
import { MigrationRunner } from "@bitwarden/common/platform/services/migration-runner";
import { StateService as BaseStateService } from "@bitwarden/common/platform/services/state.service";

import { Account } from "../../models/account";

import { BrowserStateService } from "./abstractions/browser-state.service";

export class DefaultBrowserStateService
  extends BaseStateService<GlobalState, Account>
  implements BrowserStateService
{
  protected accountDeserializer = Account.fromJSON;

  constructor(
    storageService: AbstractStorageService,
    secureStorageService: AbstractStorageService,
    memoryStorageService: AbstractStorageService,
    logService: LogService,
    stateFactory: StateFactory<GlobalState, Account>,
    accountService: AccountService,
    environmentService: EnvironmentService,
    tokenService: TokenService,
    migrationRunner: MigrationRunner,
  ) {
    super(
      storageService,
      secureStorageService,
      memoryStorageService,
      logService,
      stateFactory,
      accountService,
      environmentService,
      tokenService,
      migrationRunner,
    );
  }

  async addAccount(account: Account) {
    // Apply browser overrides to default account values
    account = new Account(account);
    await super.addAccount(account);
  }

  // Overriding the base class to prevent deleting the cache on save. We register a storage listener
  // to delete the cache in the constructor above.
  protected override async saveAccountToDisk(
    account: Account,
    options: StorageOptions,
  ): Promise<void> {
    const storageLocation = options.useSecureStorage
      ? this.secureStorageService
      : this.storageService;

    await storageLocation.save(`${options.userId}`, account, options);
  }
}
