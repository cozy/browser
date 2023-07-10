import { Component, OnInit, OnDestroy, NgZone } from "@angular/core";
/* Cozy custo
import { takeUntil } from "rxjs";
*/
import { takeUntil, Subject } from "rxjs";
/* end custo */

import { PopupUtilsService } from "./services/popup-utils.service"; // eslint-disable-line
/* COZY IMPORTS */
/* eslint-disable */
import { CozyClientService } from "./services/cozyClient.service";
import { Router, NavigationEnd, Event as NavigationEvent, RouterOutlet } from "@angular/router";
import { routerTransition } from "./app-routing.animations";
import { BrowserStateService as StateService } from "../services/abstractions/browser-state.service";
import { BrowserApi } from "../browser/browserApi";
import { BroadcasterService } from "@bitwarden/common/abstractions/broadcaster.service";
const BroadcasterSubscriptionId = "PremiumBanner";
// @ts-ignore
import flag from "cozy-flags";
/* eslint-enable */
/* END */

@Component({
  selector: "app-tabs",
  templateUrl: "tabs.component.html",
  animations: [routerTransition],
})
export class TabsComponent implements OnInit, OnDestroy {
  showCurrentTab = true;
  cozyUrl: string;
  event$;
  isVaultTabActive = true;

  protected destroy$ = new Subject<void>();

  /* cozy custo */
  static showBanner = false;
  static closedByUser = false;
  /* end custo */

  constructor(
    private popupUtilsService: PopupUtilsService,
    private cozyClientService: CozyClientService,
    private router: Router,
    private stateService: StateService,
    private broadcasterService: BroadcasterService,
    private ngZone: NgZone,
  ) {
    this.event$ = this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: NavigationEvent) => {
        if (event instanceof NavigationEnd) {
          if (event.url === "/tabs/current") {
            this.isVaultTabActive = true;
          } else {
            this.isVaultTabActive = false;
          }
        }
      });
  }

  async ngOnInit() {
    this.showCurrentTab = !this.popupUtilsService.inPopout(window);
    this.cozyUrl = this.cozyClientService.getCozyURL();
    this.broadcasterService.subscribe(BroadcasterSubscriptionId, (message: any) => {
      this.ngZone.run(async () => {
        switch (message.command) {
          case "syncCompleted": {
            this.refreshBanner();
            break;
          }
          default:
            break;
        }
      });
    });
    TabsComponent.closedByUser = await this.stateService.getBannerClosedByUser();
    this.refreshBanner();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getState(outlet: RouterOutlet) {
    if (outlet.activatedRouteData.state === "ciphers") {
      const routeDirection =
        (window as any).routeDirection != null ? (window as any).routeDirection : "";
      return (
        "ciphers_direction=" +
        routeDirection +
        "_" +
        (outlet.activatedRoute.queryParams as any).value.folderId +
        "_" +
        (outlet.activatedRoute.queryParams as any).value.collectionId
      );
    } else {
      return outlet.activatedRouteData.state;
    }
  }

  /* Cozy custo - premium banner code */

  async refreshBanner() {
    const vaultCreationDate = await this.cozyClientService.getVaultCreationDate();
    const limitDate = new Date(Date.now() - 21 * (3600 * 1000 * 24));
    TabsComponent.showBanner =
      !flag("passwords.can-share-organizations") &&
      vaultCreationDate < limitDate &&
      !TabsComponent.closedByUser;
  }

  shouldDisplayPremiumNote() {
    return TabsComponent.showBanner;
  }

  close() {
    TabsComponent.closedByUser = true;
    TabsComponent.showBanner = false;
    this.stateService.setBannerClosedByUser(true);
  }

  async openPremiumPage() {
    const link = await this.cozyClientService.getPremiumLink();
    if (link) {
      BrowserApi.createNewTab(link);
    } else {
      BrowserApi.createNewTab("https://cozy.io/fr/pricing/");
    }
  }
  /* end custo */
}
