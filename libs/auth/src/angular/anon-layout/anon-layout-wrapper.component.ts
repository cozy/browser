import { Component } from "@angular/core";
import { ActivatedRoute, RouterModule } from "@angular/router";

import { AnonLayoutComponent } from "@bitwarden/auth/angular";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { Icon } from "@bitwarden/components";

export interface AnonLayoutWrapperData {
  pageTitle?: string;
  pageSubtitle?: string;
  pageIcon?: Icon;
  showReadonlyHostname?: boolean;
}

@Component({
  standalone: true,
  templateUrl: "anon-layout-wrapper.component.html",
  imports: [AnonLayoutComponent, RouterModule],
})
export class AnonLayoutWrapperComponent {
  protected pageTitle: string;
  protected pageSubtitle: string;
  protected pageIcon: Icon;
  protected showReadonlyHostname: boolean;

  constructor(
    private route: ActivatedRoute,
    private i18nService: I18nService,
  ) {
    this.pageTitle = this.i18nService.t(this.route.snapshot.firstChild.data["pageTitle"]);
    this.pageSubtitle = this.i18nService.t(this.route.snapshot.firstChild.data["pageSubtitle"]);
    this.pageIcon = this.route.snapshot.firstChild.data["pageIcon"];
    this.showReadonlyHostname = this.route.snapshot.firstChild.data["showReadonlyHostname"];
  }
}
