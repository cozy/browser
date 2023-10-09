import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { map, Observable, switchMap } from "rxjs";

import { OrganizationService } from "@bitwarden/common/abstractions/organization/organization.service.abstraction";
import { PlatformUtilsService } from "@bitwarden/common/abstractions/platformUtils.service";

@Component({
  selector: "app-org-billing-tab",
  templateUrl: "organization-billing-tab.component.html",
})
export class OrganizationBillingTabComponent implements OnInit {
  showPaymentAndHistory$: Observable<boolean>;

  constructor(
    private route: ActivatedRoute,
    private organizationService: OrganizationService,
    private platformUtilsService: PlatformUtilsService
  ) {}

  ngOnInit() {
    this.showPaymentAndHistory$ = this.route.params.pipe(
      switchMap((params) => this.organizationService.get$(params.organizationId)),
      map((org) => !this.platformUtilsService.isSelfHost() && org.canManageBilling)
    );
  }
}
