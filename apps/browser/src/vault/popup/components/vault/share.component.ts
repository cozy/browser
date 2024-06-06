/* Cozy custo
import { Component } from "@angular/core";
*/
import { Component, HostListener } from "@angular/core";
/* end custo */
import { ActivatedRoute, Router } from "@angular/router";
import { first } from "rxjs/operators";

import { ShareComponent as BaseShareComponent } from "@bitwarden/angular/components/share.component";
import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CollectionService } from "@bitwarden/common/vault/abstractions/collection.service";

/* start Cozy imports */
/* eslint-disable */
import { HistoryService } from "../../../../popup/services/history.service";
import { CozyClientService } from "../../../../popup/services/cozyClient.service";
import { BrowserApi } from "../../../../browser/browserApi";
/* eslint-enable */
/* end Cozy imports */

@Component({
  selector: "app-vault-share",
  templateUrl: "share.component.html",
})
// eslint-disable-next-line rxjs-angular/prefer-takeuntil
export class ShareComponent extends BaseShareComponent {
  constructor(
    collectionService: CollectionService,
    platformUtilsService: PlatformUtilsService,
    i18nService: I18nService,
    logService: LogService,
    cipherService: CipherService,
    private route: ActivatedRoute,
    private router: Router,
    organizationService: OrganizationService,
    private historyService: HistoryService,
    private cozyClientService: CozyClientService
  ) {
    super(
      collectionService,
      platformUtilsService,
      i18nService,
      cipherService,
      logService,
      organizationService,
    );
  }

  async ngOnInit() {
    // eslint-disable-next-line rxjs-angular/prefer-takeuntil
    this.onSharedCipher.subscribe(() => {
      /* Cozy custo
      // FIXME: Verify that this floating promise is intentional. If it is, add an explanatory comment and ensure there is proper error handling.
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.router.navigate(["view-cipher", { cipherId: this.cipherId }]);
      */
      this.historyService.gotoPreviousUrl();
      /** end custo */
    });
    // eslint-disable-next-line rxjs-angular/prefer-takeuntil, rxjs/no-async-subscribe
    this.route.queryParams.pipe(first()).subscribe(async (params) => {
      this.cipherId = params.cipherId;
      await this.load();
    });
  }

  async submit(): Promise<boolean> {
    const success = await super.submit();
    if (success) {
      this.cancel();
    }
    return success;
  }

  cancel() {
    /* Cozy custo
    // FIXME: Verify that this floating promise is intentional. If it is, add an explanatory comment and ensure there is proper error handling.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.router.navigate(["/view-cipher"], {
      replaceUrl: true,
      queryParams: { cipherId: this.cipher.id },
    });
    */
    this.historyService.gotoPreviousUrl();
    /* end custo */
  }

  /* Cozy customization */
  @HostListener("window:keydown", ["$event"])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      this.cancel();
      event.preventDefault();
    }
  }

  async openPremiumPage() {
    const link = await this.cozyClientService.getPremiumLink();
    if (link) {
      BrowserApi.createNewTab(link);
    } else {
      BrowserApi.createNewTab("https://cozy.io/fr/pricing/");
    }
  }

  moveToFolderDesc2() {
    return this.i18nService.t("moveToFolderDesc2");
  }

  openWebApp(e: any) {
    e.preventDefault();
    window.open(this.cozyClientService.getAppURL("passwords", ""));
  }
  /* end custo */
}
