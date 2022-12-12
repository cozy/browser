import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from "@angular/core";
import { Router } from "@angular/router";

import { BrowserApi } from "../../browser/browserApi";

import { CipherRepromptType } from "jslib-common/enums/cipherRepromptType";
import { CipherType } from "jslib-common/enums/cipherType";

import { CipherView } from "jslib-common/models/view/cipherView";

import { BroadcasterService } from "jslib-common/abstractions/broadcaster.service";
import { CipherService } from "jslib-common/abstractions/cipher.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { PasswordRepromptService } from "jslib-common/abstractions/passwordReprompt.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { SearchService } from "jslib-common/abstractions/search.service";
import { StorageService } from "jslib-common/abstractions/storage.service";
import { SyncService } from "jslib-common/abstractions/sync.service";

import { ConstantsService } from "jslib-common/services/constants.service";

import { AutofillService } from "../../services/abstractions/autofill.service";

import { PopupUtilsService } from "../services/popup-utils.service";

import { Utils } from "jslib-common/misc/utils";

/** Start Cozy imports */
import { HostListener } from "@angular/core";
import { Location } from "@angular/common";
import { CozyClientService } from "../services/cozyClient.service";
/** End Cozy imports */

const BroadcasterSubscriptionId = "CurrentTabComponent";

@Component({
  selector: "app-current-tab",
  templateUrl: "current-tab.component.html",
})
export class CurrentTabComponent implements OnInit, OnDestroy {
  pageDetails: any[] = [];
  cardCiphers: CipherView[];
  identityCiphers: CipherView[];
  loginCiphers: CipherView[];
  url: string;
  hostname: string;
  searchText: string;
  inSidebar = false;
  searchTypeSearch = false;
  loaded = false;

  private totpCode: string;
  private totpTimeout: number;
  private loadedTimeout: number;
  private searchTimeout: number;

  constructor(
    private platformUtilsService: PlatformUtilsService,
    private cipherService: CipherService,
    private popupUtilsService: PopupUtilsService,
    private autofillService: AutofillService,
    private i18nService: I18nService,
    private router: Router,
    private ngZone: NgZone,
    private broadcasterService: BroadcasterService,
    private changeDetectorRef: ChangeDetectorRef,
    private syncService: SyncService,
    private searchService: SearchService,
    private storageService: StorageService,
    private passwordRepromptService: PasswordRepromptService,
    private cozyClientService: CozyClientService,
    private location: Location
  ) {}

  async ngOnInit() {
    this.searchTypeSearch = !this.platformUtilsService.isSafari();
    this.inSidebar = this.popupUtilsService.inSidebar(window);

    this.broadcasterService.subscribe(BroadcasterSubscriptionId, (message: any) => {
      this.ngZone.run(async () => {
        switch (message.command) {
          case "syncCompleted":
            if (this.loaded) {
              window.setTimeout(() => {
                this.load();
              }, 500);
            }
            break;
          case "collectPageDetailsResponse":
            if (message.sender === BroadcasterSubscriptionId) {
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

    if (!this.syncService.syncInProgress) {
      await this.load();
    } else {
      this.loadedTimeout = window.setTimeout(async () => {
        if (!this.loaded) {
          await this.load();
        }
      }, 5000);
    }

    window.setTimeout(() => {
      document.getElementById("search").focus();
    }, 100);
  }

  ngOnDestroy() {
    window.clearTimeout(this.loadedTimeout);
    this.broadcasterService.unsubscribe(BroadcasterSubscriptionId);
  }

  async refresh() {
    await this.load();
  }

  addLoginCipher() {
    this.router.navigate(["/add-cipher"], { queryParams: { name: this.hostname, uri: this.url } });
  }

  addCardCipher() {
    this.router.navigate(["/add-cipher"], { queryParams: { type: 3 } });
  }

  addIdentityCipher() {
    this.router.navigate(["/add-cipher"], { queryParams: { type: 4 } });
  }

  viewCipher(cipher: CipherView) {
    this.router.navigate(["/view-cipher"], { queryParams: { cipherId: cipher.id } });
  }

  async fillCipher(cipher: CipherView) {
    if (
      cipher.reprompt !== CipherRepromptType.None &&
      !(await this.passwordRepromptService.showPasswordPrompt())
    ) {
      return;
    }

    this.totpCode = null;
    if (this.totpTimeout != null) {
      window.clearTimeout(this.totpTimeout);
    }

    if (this.pageDetails == null || this.pageDetails.length === 0) {
      this.platformUtilsService.showToast("error", null, this.i18nService.t("autofillError"));
      return;
    }

    try {
      this.totpCode = await this.autofillService.doAutoFill({
        cipher: cipher,
        pageDetails: this.pageDetails,
        doc: window.document,
        fillNewPassword: true,
      });
      if (this.totpCode != null) {
        this.platformUtilsService.copyToClipboard(this.totpCode, { window: window });
      }
      if (this.popupUtilsService.inPopup(window)) {
        if (this.platformUtilsService.isFirefox() || this.platformUtilsService.isSafari()) {
          BrowserApi.closePopup(window);
        } else {
          // Slight delay to fix bug in Chromium browsers where popup closes without copying totp to clipboard
          setTimeout(() => BrowserApi.closePopup(window), 50);
        }
      }
    } catch {
      this.ngZone.run(() => {
        this.platformUtilsService.showToast("error", null, this.i18nService.t("autofillError"));
        this.changeDetectorRef.detectChanges();
      });
    }
  }

  searchVault() {
    if (this.searchTimeout != null) {
      clearTimeout(this.searchTimeout);
    }
    if (!this.searchService.isSearchable(this.searchText)) {
      return;
    }
    this.searchTimeout = window.setTimeout(async () => {
      this.router.navigate(["/tabs/vault"], { queryParams: { searchText: this.searchText } });
    }, 200);
  }

  @HostListener("window:keydown", ["$event"])
  closeOnEsc(e: KeyboardEvent) {
    /**
    // If input not empty, use browser default behavior of clearing input instead
    if (e.key === "Escape" && (this.searchText == null || this.searchText === "")) {
      BrowserApi.closePopup(window);
    }
    */
      if (e.key === "Escape") {
      this.back();
      e.preventDefault();
    }
  }

  private async load() {
    const tab = await BrowserApi.getTabFromCurrentWindow();
    if (tab != null) {
      this.url = tab.url;
    } else {
      this.loginCiphers = [];
      this.loaded = true;
      return;
    }

    this.hostname = Utils.getHostname(this.url);
    this.pageDetails = [];
    BrowserApi.tabSendMessage(tab, {
      command: "collectPageDetails",
      tab: tab,
      sender: BroadcasterSubscriptionId,
    });

    const otherTypes: CipherType[] = [];
    const dontShowCards = await this.storageService.get<boolean>(
      ConstantsService.dontShowCardsCurrentTab
    );
    const dontShowIdentities = await this.storageService.get<boolean>(
      ConstantsService.dontShowIdentitiesCurrentTab
    );
    if (!dontShowCards) {
      otherTypes.push(CipherType.Card);
    }
    if (!dontShowIdentities) {
      otherTypes.push(CipherType.Identity);
    }

    const ciphers = await this.cipherService.getAllDecryptedForUrl(
      this.url,
      otherTypes.length > 0 ? otherTypes : null
    );

    this.loginCiphers = [];
    this.cardCiphers = [];
    this.identityCiphers = [];

    ciphers.forEach((c) => {
      switch (c.type) {
        case CipherType.Login:
          this.loginCiphers.push(c);
          break;
        case CipherType.Card:
          this.cardCiphers.push(c);
          break;
        case CipherType.Identity:
          this.identityCiphers.push(c);
          break;
        default:
          break;
      }
    });

    this.loginCiphers = this.loginCiphers.sort((a, b) =>
      this.cipherService.sortCiphersByLastUsedThenName(a, b)
    );
    this.loaded = true;
  }

  back() {
    this.router.navigate(["/tabs/vault"]);
  }

  openWebApp() {
    window.open(this.cozyClientService.getAppURL("passwords", ""));
  }
}
