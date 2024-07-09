import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { switchMap, Observable, Subject, filter, startWith } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { ProviderService } from "@bitwarden/common/admin-console/abstractions/provider.service";
import { Provider } from "@bitwarden/common/admin-console/models/domain/provider";
import { canAccessBilling } from "@bitwarden/common/billing/abstractions/provider-billing.service.abstraction";
import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { IconModule, LayoutComponent, NavigationModule } from "@bitwarden/components";
import { ProviderPortalLogo } from "@bitwarden/web-vault/app/admin-console/icons/provider-portal-logo";
import { PaymentMethodWarningsModule } from "@bitwarden/web-vault/app/billing/shared";
import { ProductSwitcherModule } from "@bitwarden/web-vault/app/layouts/product-switcher/product-switcher.module";
import { ToggleWidthComponent } from "@bitwarden/web-vault/app/layouts/toggle-width.component";

@Component({
  selector: "providers-layout",
  templateUrl: "providers-layout.component.html",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    JslibModule,
    LayoutComponent,
    IconModule,
    NavigationModule,
    PaymentMethodWarningsModule,
    ToggleWidthComponent,
    ProductSwitcherModule,
  ],
})
export class ProvidersLayoutComponent implements OnInit, OnDestroy {
  protected readonly logo = ProviderPortalLogo;

  private destroy$ = new Subject<void>();
  protected provider$: Observable<Provider>;
  protected canAccessBilling$: Observable<boolean>;

  protected showPaymentMethodWarningBanners$ = this.configService.getFeatureFlag$(
    FeatureFlag.ShowPaymentMethodWarningBanners,
  );

  constructor(
    private route: ActivatedRoute,
    private providerService: ProviderService,
    private configService: ConfigService,
  ) {}

  ngOnInit() {
    document.body.classList.remove("layout_frontend");

    this.provider$ = this.route.params.pipe(
      switchMap((params) => this.providerService.get$(params.providerId)),
      takeUntil(this.destroy$),
    );

    this.canAccessBilling$ = this.provider$.pipe(
      filter((provider) => !!provider),
      canAccessBilling(this.configService),
      startWith(false),
      takeUntil(this.destroy$),
    );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  showManageTab(provider: Provider) {
    return provider.canManageUsers || provider.canAccessEventLogs;
  }

  showSettingsTab(provider: Provider) {
    return provider.isProviderAdmin;
  }
}
