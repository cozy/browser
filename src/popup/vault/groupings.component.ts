import { Angulartics2 } from 'angulartics2';

import { Location } from '@angular/common';
import {
    ChangeDetectorRef,
    Component,
    NgZone,
    OnDestroy,
    OnInit,
} from '@angular/core';
import {
    ActivatedRoute,
    Router,
} from '@angular/router';

import { BrowserApi } from '../../browser/browserApi';

import { CipherType } from 'jslib/enums/cipherType';

import { CipherView } from 'jslib/models/view/cipherView';

import { CipherService } from 'jslib/abstractions/cipher.service';
import { CollectionService } from 'jslib/abstractions/collection.service';
import { FolderService } from 'jslib/abstractions/folder.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';
import { SearchService } from 'jslib/abstractions/search.service';
import { StateService } from 'jslib/abstractions/state.service';
import { StorageService } from 'jslib/abstractions/storage.service';
import { SyncService } from 'jslib/abstractions/sync.service';
import { UserService } from 'jslib/abstractions/user.service';

import { BroadcasterService } from 'jslib/angular/services/broadcaster.service';

import { GroupingsComponent as BaseGroupingsComponent } from 'jslib/angular/components/groupings.component';

import { PopupUtilsService } from '../services/popup-utils.service';

const ComponentId = 'GroupingsComponent';
const ScopeStateId = ComponentId + 'Scope';

@Component({
    selector: 'app-vault-groupings',
    templateUrl: 'groupings.component.html',
})

/**
 *  See the original component:
 *
 *  https://github.com/bitwarden/browser/blob/
 *  0bbe17f6e2becdf5146677d51cbc71cc099aaec9/src/popup/vault/groupings.component.ts
 */
export class GroupingsComponent extends BaseGroupingsComponent implements OnInit, OnDestroy {
    ciphers: CipherView[];
    typeCounts = new Map<CipherType, number>();
    searchText: string;
    state: any;
    scopeState: any;
    showLeftHeader = true;
    searchPending = false;
    searchTypeSearch = false;
    deletedCount = 0;

    private loadedTimeout: number;
    private selectedTimeout: number;
    private preventSelected = false;
    private searchTimeout: any = null;
    private hasSearched = false;
    private hasLoadedAllCiphers = false;
    private allCiphers: CipherView[] = null;
    private ciphersByType: any;

    constructor(collectionService: CollectionService, folderService: FolderService,
        storageService: StorageService, userService: UserService,
        private cipherService: CipherService, private router: Router,
        private ngZone: NgZone, private broadcasterService: BroadcasterService,
        private changeDetectorRef: ChangeDetectorRef, private route: ActivatedRoute,
        private stateService: StateService, private popupUtils: PopupUtilsService,
        private syncService: SyncService, private analytics: Angulartics2,
        private platformUtilsService: PlatformUtilsService, private searchService: SearchService,
        private location: Location) {
        super(collectionService, folderService, storageService, userService);
    }

    async ngOnInit() {
        this.ciphersByType = {};
        this.ciphersByType[CipherType.Card] = [];
        this.ciphersByType[CipherType.Identity] = [];
        this.ciphersByType[CipherType.Login] = [];

        this.searchTypeSearch = !this.platformUtilsService.isSafari();
        this.showLeftHeader = !this.platformUtilsService.isSafari() &&
            !(this.popupUtils.inSidebar(window) && this.platformUtilsService.isFirefox());
        this.stateService.remove('CiphersComponent');

        this.broadcasterService.subscribe(ComponentId, (message: any) => {
            this.ngZone.run(async () => {
                switch (message.command) {
                    case 'syncCompleted':
                        window.setTimeout(() => {
                            this.load();
                        }, 500);
                        break;
                    default:
                        break;
                }

                this.changeDetectorRef.detectChanges();
            });
        });

        const restoredScopeState = await this.restoreState();
        const queryParamsSub = this.route.queryParams.subscribe(async (params) => {
            this.state = (await this.stateService.get<any>(ComponentId)) || {};
            if (this.state.searchText) {
                this.searchText = this.state.searchText;
            } else if (params.searchText) {
                this.searchText = params.searchText;
                this.location.replaceState('vault');
            }

            if (!this.syncService.syncInProgress) {
                this.load();
            } else {
                this.loadedTimeout = window.setTimeout(() => {
                    if (!this.loaded) {
                        this.load();
                    }
                }, 5000);
            }

            if (!this.syncService.syncInProgress || restoredScopeState) {
                window.setTimeout(() => this.popupUtils.setContentScrollY(window, this.state.scrollY), 0);
            }
            if (queryParamsSub != null) {
                queryParamsSub.unsubscribe();
            }
        });
    }

    ngOnDestroy() {
        if (this.loadedTimeout != null) {
            window.clearTimeout(this.loadedTimeout);
        }
        if (this.selectedTimeout != null) {
            window.clearTimeout(this.selectedTimeout);
        }
        this.saveState();
        this.broadcasterService.unsubscribe(ComponentId);
    }

    async load() {
        await super.load(false);
        await this.loadCiphers();
        super.loaded = true;
    }

    async loadCiphers() {
        this.allCiphers = await this.cipherService.getAllDecrypted();
        this.deletedCount = this.allCiphers.filter((c) => c.isDeleted).length;
        await this.search(null);
        const typeCounts = new Map<CipherType, number>();
        this.ciphers.forEach((c) => {
            if (typeCounts.has(c.type)) {
                typeCounts.set(c.type, typeCounts.get(c.type) + 1);
            } else {
                typeCounts.set(c.type, 1);
            }
        });
        this.ciphersByType = {};
        this.ciphersByType[CipherType.Card] = this._ciphersByType(CipherType.Card);
        this.ciphersByType[CipherType.Identity] = this._ciphersByType(CipherType.Identity);
        this.ciphersByType[CipherType.Login] = this._ciphersByType(CipherType.Login);

        this.typeCounts = typeCounts;
    }

    async search(timeout: number = null) {
        this.searchPending = false;
        if (this.searchTimeout != null) {
            clearTimeout(this.searchTimeout);
        }
        const filterDeleted = (c: CipherView) => !c.isDeleted;
        if (timeout == null) {
            this.hasSearched = this.searchService.isSearchable(this.searchText);
            this.ciphers = await this.searchService.searchCiphers(this.searchText, filterDeleted, this.allCiphers);
            return;
        }
        this.searchPending = true;
        this.searchTimeout = setTimeout(async () => {
            this.hasSearched = this.searchService.isSearchable(this.searchText);
            if (!this.hasLoadedAllCiphers && !this.hasSearched) {
                await this.loadCiphers();
            } else {
                this.ciphers = await this.searchService.searchCiphers(this.searchText, filterDeleted, this.allCiphers);
            }
            this.searchPending = false;
        }, timeout);
    }

    _ciphersByType(type: CipherType) {
        return this.ciphers.filter((c) => c.type === type);
    }

    countByType(type: CipherType) {
        return this.typeCounts.get(type);
    }

    async selectTrash() {
        super.selectTrash();
        this.router.navigate(['/ciphers'], { queryParams: { deleted: true } });
    }

    async selectCipher(cipher: CipherView) {
        this.selectedTimeout = window.setTimeout(() => {
            if (!this.preventSelected) {
                this.router.navigate(['/view-cipher'], { queryParams: { cipherId: cipher.id } });
            }
            this.preventSelected = false;
        }, 200);
    }

    async launchCipher(cipher: CipherView) {
        if (cipher.type !== CipherType.Login || !cipher.login.canLaunch) {
            return;
        }

        if (this.selectedTimeout != null) {
            window.clearTimeout(this.selectedTimeout);
        }
        this.preventSelected = true;
        this.analytics.eventTrack.next({ action: 'Launched URI From Listing' });
        BrowserApi.createNewTab(cipher.login.launchUri);
        if (this.popupUtils.inPopup(window)) {
            BrowserApi.closePopup(window);
        }
    }

    async addCipher() {
        this.router.navigate(['/add-cipher']);
    }

    showSearching() {
        return this.hasSearched || (!this.searchPending && this.searchService.isSearchable(this.searchText));
    }

    private async saveState() {
        this.state = {
            scrollY: this.popupUtils.getContentScrollY(window),
            searchText: this.searchText,
        };
        await this.stateService.save(ComponentId, this.state);

        this.scopeState = {
            ciphers: this.ciphers,
            typeCounts: this.typeCounts,
            deletedCount: this.deletedCount,
        };
        await this.stateService.save(ScopeStateId, this.scopeState);
    }

    private async restoreState(): Promise<boolean> {
        this.scopeState = await this.stateService.get<any>(ScopeStateId);
        if (this.scopeState == null) {
            return false;
        }

        if (this.scopeState.ciphers != null) {
            this.ciphers = this.scopeState.ciphers;
        }
        if (this.scopeState.typeCounts != null) {
            this.typeCounts = this.scopeState.typeCounts;
        }
        if (this.scopeState.deletedCiphers != null) {
            this.deletedCount = this.scopeState.deletedCount;
        }

        if (this.scopeState.deletedCiphers != null) {
            this.deletedCount = this.scopeState.deletedCount;
        }

        return true;
    }
}
