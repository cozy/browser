import { CryptoFunctionService } from 'jslib-common/abstractions/cryptoFunction.service';
import { KeySuffixOptions } from 'jslib-common/abstractions/storage.service';
import { LogService } from 'jslib-common/abstractions/log.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';
import { StorageService } from 'jslib-common/abstractions/storage.service';

import { CryptoService } from 'jslib-common/services/crypto.service';

import { ProfileOrganizationResponse } from 'jslib-common/models/response/profileOrganizationResponse';

const Keys = {
    encOrgKeys: 'encOrgKeys',
};

export class BrowserCryptoService extends CryptoService {
    constructor(
        private localStorageService: StorageService,
        secureStorageService: StorageService,
        cryptoFunctionService: CryptoFunctionService,
        platformUtilService: PlatformUtilsService,
        logService: LogService
    ) {
        super(
            localStorageService,
            secureStorageService,
            cryptoFunctionService,
            platformUtilService,
            logService
        );
    }

    async upsertOrganizationKey(organization: ProfileOrganizationResponse) {
        if (organization.key === '') {
            return;
        }
        const encOrgKeys = await this.localStorageService.get<any>(Keys.encOrgKeys);

        encOrgKeys[organization.id] = organization.key;

        await this.clearOrgKeys();
        await this.localStorageService.save(Keys.encOrgKeys, encOrgKeys);
    }

    setOrgKeys(orgs: ProfileOrganizationResponse[]): Promise<{}> {
        const validOrgs = orgs.filter(org => org.key !== '');

        return super.setOrgKeys(validOrgs);
    }

    protected async retrieveKeyFromStorage(keySuffix: KeySuffixOptions) {
        if (keySuffix === 'biometric') {
            await this.platformUtilService.authenticateBiometric();
            return (await this.getKey())?.keyB64;
        }

        return await super.retrieveKeyFromStorage(keySuffix);
    }

}
