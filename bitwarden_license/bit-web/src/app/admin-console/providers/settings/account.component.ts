import { Component } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";

import { UserVerificationDialogComponent } from "@bitwarden/auth/angular";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { ProviderApiServiceAbstraction } from "@bitwarden/common/admin-console/abstractions/provider/provider-api.service.abstraction";
import { ProviderUpdateRequest } from "@bitwarden/common/admin-console/models/request/provider/provider-update.request";
import { ProviderResponse } from "@bitwarden/common/admin-console/models/response/provider/provider.response";
import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { SyncService } from "@bitwarden/common/vault/abstractions/sync/sync.service.abstraction";
import { DialogService } from "@bitwarden/components";

@Component({
  selector: "provider-account",
  templateUrl: "account.component.html",
})
// eslint-disable-next-line rxjs-angular/prefer-takeuntil
export class AccountComponent {
  selfHosted = false;
  loading = true;
  provider: ProviderResponse;
  formPromise: Promise<any>;
  taxFormPromise: Promise<any>;

  private providerId: string;

  protected enableDeleteProvider$ = this.configService.getFeatureFlag$(
    FeatureFlag.EnableDeleteProvider,
  );

  constructor(
    private apiService: ApiService,
    private i18nService: I18nService,
    private route: ActivatedRoute,
    private syncService: SyncService,
    private platformUtilsService: PlatformUtilsService,
    private logService: LogService,
    private dialogService: DialogService,
    private configService: ConfigService,
    private providerApiService: ProviderApiServiceAbstraction,
    private router: Router,
  ) {}

  async ngOnInit() {
    this.selfHosted = this.platformUtilsService.isSelfHost();
    // eslint-disable-next-line rxjs-angular/prefer-takeuntil, rxjs/no-async-subscribe
    this.route.parent.parent.params.subscribe(async (params) => {
      this.providerId = params.providerId;
      try {
        this.provider = await this.providerApiService.getProvider(this.providerId);
      } catch (e) {
        this.logService.error(`Handled exception: ${e}`);
      }
    });
    this.loading = false;
  }

  async submit() {
    try {
      const request = new ProviderUpdateRequest();
      request.name = this.provider.name;
      request.businessName = this.provider.businessName;
      request.billingEmail = this.provider.billingEmail;

      this.formPromise = this.providerApiService.putProvider(this.providerId, request).then(() => {
        return this.syncService.fullSync(true);
      });
      await this.formPromise;
      this.platformUtilsService.showToast("success", null, this.i18nService.t("providerUpdated"));
    } catch (e) {
      this.logService.error(`Handled exception: ${e}`);
    }
  }

  async deleteProvider() {
    const providerClients = await this.apiService.getProviderClients(this.providerId);
    if (providerClients.data != null && providerClients.data.length > 0) {
      await this.dialogService.openSimpleDialog({
        title: { key: "deleteProviderName", placeholders: [this.provider.name] },
        content: { key: "deleteProviderWarningDescription", placeholders: [this.provider.name] },
        acceptButtonText: { key: "ok" },
        cancelButtonText: { key: "close" },
        type: "danger",
      });

      return false;
    }

    const userVerified = await this.verifyUser();
    if (!userVerified) {
      return;
    }

    try {
      await this.providerApiService.deleteProvider(this.providerId);
      this.platformUtilsService.showToast(
        "success",
        this.i18nService.t("providerDeleted"),
        this.i18nService.t("providerDeletedDesc"),
      );
    } catch (e) {
      this.logService.error(e);
    }

    await this.router.navigate(["/"]);
  }

  private async verifyUser(): Promise<boolean> {
    const confirmDescription = "deleteProviderConfirmation";
    const result = await UserVerificationDialogComponent.open(this.dialogService, {
      title: "deleteProvider",
      bodyText: confirmDescription,
      confirmButtonOptions: {
        text: "deleteProvider",
        type: "danger",
      },
    });

    // Handle the result of the dialog based on user action and verification success
    if (result.userAction === "cancel") {
      // User cancelled the dialog
      return false;
    }

    // User confirmed the dialog so check verification success
    if (!result.verificationSuccess) {
      return false;
    }
    return true;
  }
}
