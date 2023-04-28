import { DIALOG_DATA } from "@angular/cdk/dialog";
import { Component, Inject } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";

import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { CryptoService } from "@bitwarden/common/abstractions/crypto.service";
import { I18nService } from "@bitwarden/common/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/abstractions/log.service";
import { MessagingService } from "@bitwarden/common/abstractions/messaging.service";
import { PlatformUtilsService } from "@bitwarden/common/abstractions/platformUtils.service";
import { StateService } from "@bitwarden/common/abstractions/state.service";
import { KdfConfig } from "@bitwarden/common/auth/models/domain/kdf-config";
import { KdfType } from "@bitwarden/common/enums/kdfType";
import { KdfRequest } from "@bitwarden/common/models/request/kdf.request";

@Component({
  selector: "app-change-kdf-confirmation",
  templateUrl: "change-kdf-confirmation.component.html",
})
export class ChangeKdfConfirmationComponent {
  kdf: KdfType;
  kdfConfig: KdfConfig;

  form = new FormGroup({
    masterPassword: new FormControl(null, Validators.required),
  });
  showPassword = false;
  masterPassword: string;
  formPromise: Promise<any>;
  loading = false;

  constructor(
    private apiService: ApiService,
    private i18nService: I18nService,
    private platformUtilsService: PlatformUtilsService,
    private cryptoService: CryptoService,
    private messagingService: MessagingService,
    private stateService: StateService,
    private logService: LogService,
    @Inject(DIALOG_DATA) params: { kdf: KdfType; kdfConfig: KdfConfig }
  ) {
    this.kdf = params.kdf;
    this.kdfConfig = params.kdfConfig;
    this.masterPassword = null;
  }

  async submit() {
    this.loading = true;
    const hasEncKey = await this.cryptoService.hasEncKey();
    if (!hasEncKey) {
      this.platformUtilsService.showToast("error", null, this.i18nService.t("updateKey"));
      return;
    }

    try {
      this.formPromise = this.makeKeyAndSaveAsync();
      await this.formPromise;
      this.platformUtilsService.showToast(
        "success",
        this.i18nService.t("encKeySettingsChanged"),
        this.i18nService.t("logBackIn")
      );
      this.messagingService.send("logout");
    } catch (e) {
      this.logService.error(e);
    } finally {
      this.loading = false;
    }
  }

  private async makeKeyAndSaveAsync() {
    const masterPassword = this.form.value.masterPassword;
    const request = new KdfRequest();
    request.kdf = this.kdf;
    request.kdfIterations = this.kdfConfig.iterations;
    request.kdfMemory = this.kdfConfig.memory;
    request.kdfParallelism = this.kdfConfig.parallelism;
    request.masterPasswordHash = await this.cryptoService.hashPassword(masterPassword, null);
    const email = await this.stateService.getEmail();
    const newKey = await this.cryptoService.makeKey(
      masterPassword,
      email,
      this.kdf,
      this.kdfConfig
    );
    request.newMasterPasswordHash = await this.cryptoService.hashPassword(masterPassword, newKey);
    const newEncKey = await this.cryptoService.remakeEncKey(newKey);
    request.key = newEncKey[1].encryptedString;

    await this.apiService.postAccountKdf(request);
  }
}
