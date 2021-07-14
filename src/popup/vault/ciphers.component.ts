import { ToasterService } from 'angular2-toaster';

import { Location } from '@angular/common';
import {
    ChangeDetectorRef,
    Component,
    HostListener,
    NgZone,
    OnDestroy,
    OnInit,
} from '@angular/core';
import {
    ActivatedRoute,
    Router,
} from '@angular/router';

import { BrowserApi } from '../../browser/browserApi';

import { CipherService } from 'jslib-common/abstractions/cipher.service';
import { CollectionService } from 'jslib-common/abstractions/collection.service';
import { FolderService } from 'jslib-common/abstractions/folder.service';
import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';
import { SearchService } from 'jslib-common/abstractions/search.service';
import { StateService } from 'jslib-common/abstractions/state.service';
import { StorageService } from 'jslib-common/abstractions/storage.service';

import { CipherType } from 'jslib-common/enums/cipherType';
import { UriMatchType } from 'jslib-common/enums/uriMatchType';

import { CipherView } from 'jslib-common/models/view/cipherView';
import { CollectionView } from 'jslib-common/models/view/collectionView';
import { FolderView } from 'jslib-common/models/view/folderView';

import { TreeNode } from 'jslib-common/models/domain/treeNode';

import { BroadcasterService } from 'jslib-angular/services/broadcaster.service';

import { CiphersComponent as BaseCiphersComponent } from 'jslib-angular/components/ciphers.component';

import { AutofillService } from '../../services/abstractions/autofill.service';
import { LocalConstantsService as ConstantsService } from '../services/constants.service';
import { KonnectorsService } from '../services/konnectors.service';
import { PopupUtilsService } from '../services/popup-utils.service';

const ComponentId = 'CiphersComponent';

@Component({
    selector: 'app-vault-ciphers',
    templateUrl: 'ciphers.component.html',
})
export class CiphersComponent extends BaseCiphersComponent implements OnInit, OnDestroy {
    groupingTitle: string;
    state: any;
    folderId: string = null;
    collectionId: string = null;
    type: CipherType = null;
    nestedFolders: TreeNode<FolderView>[];
    nestedCollections: TreeNode<CollectionView>[];
    searchTypeSearch = false;

    private selectedTimeout: number;
    private preventSelected = false;
    private applySavedState = true;
    private pageDetails: any[] = [];

    constructor(searchService: SearchService, private route: ActivatedRoute,
        private router: Router, private location: Location,
        private ngZone: NgZone, private broadcasterService: BroadcasterService,
        private changeDetectorRef: ChangeDetectorRef, private stateService: StateService,
        private popupUtils: PopupUtilsService, private i18nService: I18nService,
        private folderService: FolderService, private collectionService: CollectionService,
        private platformUtilsService: PlatformUtilsService,
        private cipherService: CipherService, private storageService: StorageService,
        private konnectorsService: KonnectorsService, private toasterService: ToasterService,
        private autofillService: AutofillService) {
        super(searchService);
        this.pageSize = 100;
        this.applySavedState = (window as any).previousPopupUrl != null &&
            !(window as any).previousPopupUrl.startsWith('/ciphers');
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            this.back();
            event.preventDefault();
        }
    }

    async ngOnInit() {
        this.searchTypeSearch = !this.platformUtilsService.isSafari();
        const queryParamsSub = this.route.queryParams.subscribe(async params => {
            if (this.applySavedState) {
                this.state = (await this.stateService.get<any>(ComponentId)) || {};
                if (this.state.searchText) {
                    this.searchText = this.state.searchText;
                }
            }

            if (params.deleted) {
                this.groupingTitle = this.i18nService.t('trash');
                this.searchPlaceholder = this.i18nService.t('searchTrash');
                await this.load(null, true);
            } else if (params.type) {
                this.searchPlaceholder = this.i18nService.t('searchType');
                this.type = parseInt(params.type, null);
                switch (this.type) {
                    case CipherType.Login:
                        this.groupingTitle = this.i18nService.t('logins');
                        break;
                    case CipherType.Card:
                        this.groupingTitle = this.i18nService.t('cards');
                        break;
                    case CipherType.Identity:
                        this.groupingTitle = this.i18nService.t('identities');
                        break;
                    case CipherType.SecureNote:
                        this.groupingTitle = this.i18nService.t('secureNotes');
                        break;
                    default:
                        break;
                }
                await this.load(c => c.type === this.type);
            } else if (params.folderId) {
                this.folderId = params.folderId === 'none' ? null : params.folderId;
                this.searchPlaceholder = this.i18nService.t('searchFolder');
                if (this.folderId != null) {
                    const folderNode = await this.folderService.getNested(this.folderId);
                    if (folderNode != null && folderNode.node != null) {
                        this.groupingTitle = folderNode.node.name;
                        this.nestedFolders = folderNode.children != null && folderNode.children.length > 0 ?
                            folderNode.children : null;
                    }
                } else {
                    this.groupingTitle = this.i18nService.t('noneFolder');
                }
                await this.load(c => c.folderId === this.folderId);
            } else if (params.collectionId) {
                this.collectionId = params.collectionId;
                this.searchPlaceholder = this.i18nService.t('searchCollection');
                const collectionNode = await this.collectionService.getNested(this.collectionId);
                if (collectionNode != null && collectionNode.node != null) {
                    this.groupingTitle = collectionNode.node.name;
                    this.nestedCollections = collectionNode.children != null && collectionNode.children.length > 0 ?
                        collectionNode.children : null;
                }
                await this.load(c => c.collectionIds != null && c.collectionIds.indexOf(this.collectionId) > -1);
            } else {
                this.groupingTitle = this.i18nService.t('allItems');
                await this.load();
            }

            if (this.applySavedState && this.state != null) {
                window.setTimeout(() => this.popupUtils.setContentScrollY(window, this.state.scrollY), 0);
            }
            this.stateService.remove(ComponentId);
            if (queryParamsSub != null) {
                queryParamsSub.unsubscribe();
            }
        });

        this.broadcasterService.subscribe(ComponentId, (message: any) => {
            this.ngZone.run(async () => {
                switch (message.command) {
                    case 'syncCompleted':
                        if (message.successfully) {
                            window.setTimeout(() => {
                                this.refresh();
                            }, 500);
                        }
                        break;
                    case 'collectPageDetailsResponse':
                        if (message.sender === ComponentId) {
                            this.pageDetails.push({
                                frameId: message.webExtSender.frameId,
                                tab: message.tab,
                                details: message.details,
                            });
                        }
                        break;
                    default:
                        break;
                }

                this.changeDetectorRef.detectChanges();
            });
        });

        // request page detail from current tab
        const tab = await BrowserApi.getTabFromCurrentWindow();
        this.pageDetails = [];
        BrowserApi.tabSendMessage(tab, {
            command: 'collectPageDetails',
            tab: tab,
            sender: ComponentId,
        });
    }

    ngOnDestroy() {
        this.saveState();
        this.broadcasterService.unsubscribe(ComponentId);
    }

    selectCipher(cipher: CipherView) {
        this.selectedTimeout = window.setTimeout(() => {
            if (!this.preventSelected) {
                super.selectCipher(cipher);
                this.router.navigate(['/view-cipher'], { queryParams: { cipherId: cipher.id } });
            }
            this.preventSelected = false;
        }, 200);
    }

    selectFolder(folder: FolderView) {
        if (folder.id != null) {
            this.router.navigate(['/ciphers'], { queryParams: { folderId: folder.id } });
        }
    }

    selectCollection(collection: CollectionView) {
        this.router.navigate(['/ciphers'], { queryParams: { collectionId: collection.id } });
    }

    async launchCipher(cipher: CipherView) {
        if (cipher.type !== CipherType.Login || !cipher.login.canLaunch) {
            return;
        }

        if (this.selectedTimeout != null) {
            window.clearTimeout(this.selectedTimeout);
        }
        this.preventSelected = true;
        await this.cipherService.updateLastLaunchedDate(cipher.id);
        BrowserApi.createNewTab(cipher.login.launchUri);
        if (this.popupUtils.inPopup(window)) {
            BrowserApi.closePopup(window);
        }
    }

    async fillOrLaunchCipher(cipher: CipherView) {
        // console.log('fillOrLaunchCipher()');

        // Get default matching setting for urls
        let defaultMatch = await this.storageService.get<UriMatchType>(ConstantsService.defaultUriMatch);
        if (defaultMatch == null) {
            defaultMatch = UriMatchType.Domain;
        }
        // Get the current url
        const tab = await BrowserApi.getTabFromCurrentWindow();
        const isCipherMatcinghUrl = await this.konnectorsService.hasURLMatchingCiphers(tab.url, [cipher], defaultMatch);
        if (isCipherMatcinghUrl) {
            this.fillCipher(cipher);
        } else {
            this.launchCipher(cipher);
        }
    }

    async fillCipher(cipher: CipherView) {
        let totpCode = null;

        if (this.pageDetails == null || this.pageDetails.length === 0) {
            this.toasterService.popAsync('error', null, this.i18nService.t('autofillError'));
            return;
        }

        try {
            totpCode = await this.autofillService.doAutoFill({
                cipher: cipher,
                pageDetails: this.pageDetails,
                doc: window.document,
                fillNewPassword: true,
            });
            if (totpCode != null) {
                this.platformUtilsService.copyToClipboard(totpCode, { window: window });
            }
            if (this.popupUtils.inPopup(window)) {
                BrowserApi.closePopup(window);
            }
        } catch (e) {
            this.ngZone.run(() => {
                this.toasterService.popAsync('error', null, this.i18nService.t('autofillError'));
                this.changeDetectorRef.detectChanges();
            });
        }
    }

    addCipher() {
        if (this.deleted) {
            return false;
        }
        super.addCipher();
        this.router.navigate(['/add-cipher'], {
            queryParams: {
                folderId: this.folderId,
                type: this.type,
                collectionId: this.collectionId,
            },
        });
    }

    back() {
        (window as any).routeDirection = 'b';
        this.router.navigate(['tabs/vault'], { queryParams: { activatedPanel: 'none' } });
    }

    showGroupings() {
        return !this.isSearching() &&
            ((this.nestedFolders && this.nestedFolders.length) ||
                (this.nestedCollections && this.nestedCollections.length));
    }

    emptySearch() {
        this.searchText = '';
    }

    viewCipher(cipher: CipherView) {
        this.router.navigate(['/view-cipher'], { queryParams: { cipherId: cipher.id } });
    }

    private async saveState() {
        this.state = {
            scrollY: this.popupUtils.getContentScrollY(window),
            searchText: this.searchText,
        };
        await this.stateService.save(ComponentId, this.state);
    }

}
