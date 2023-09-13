import { Location } from "@angular/common";
/* Cozy custo
import { Component } from "@angular/core";
*/
import { Component, ElementRef, ViewChild } from "@angular/core";
/* end custo */
import { ActivatedRoute } from "@angular/router";

import { GeneratorComponent as BaseGeneratorComponent } from "@bitwarden/angular/tools/generator/components/generator.component";
import { I18nService } from "@bitwarden/common/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/abstractions/log.service";
import { PlatformUtilsService } from "@bitwarden/common/abstractions/platformUtils.service";
import { StateService } from "@bitwarden/common/abstractions/state.service";
import { PasswordGenerationServiceAbstraction } from "@bitwarden/common/tools/generator/password";
import { UsernameGenerationServiceAbstraction } from "@bitwarden/common/tools/generator/username";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { AddEditCipherInfo } from "@bitwarden/common/vault/types/add-edit-cipher-info";

/* Cozy imports */
/* eslint-disable */
import { HistoryService } from "../../../popup/services/history.service";
import { CozyClientService } from "../../../popup/services/cozyClient.service";
/* eslint-enable */
/* END */

@Component({
  selector: "app-generator",
  templateUrl: "generator.component.html",
})
export class GeneratorComponent extends BaseGeneratorComponent {
  private addEditCipherInfo: AddEditCipherInfo;
  private cipherState: CipherView;

  @ViewChild("emailInput") emailInputElement: ElementRef;

  constructor(
    passwordGenerationService: PasswordGenerationServiceAbstraction,
    usernameGenerationService: UsernameGenerationServiceAbstraction,
    platformUtilsService: PlatformUtilsService,
    i18nService: I18nService,
    stateService: StateService,
    route: ActivatedRoute,
    logService: LogService,
    private location: Location,
    private historyService: HistoryService,
    protected cozyClientService: CozyClientService
  ) {
    super(
      passwordGenerationService,
      usernameGenerationService,
      platformUtilsService,
      stateService,
      i18nService,
      logService,
      route,
      window,
      cozyClientService
    );
  }

  async ngOnInit() {
    this.addEditCipherInfo = await this.stateService.getAddEditCipherInfo();
    if (this.addEditCipherInfo != null) {
      this.cipherState = this.addEditCipherInfo.cipher;
    }
    this.comingFromAddEdit = this.cipherState != null;
    if (this.cipherState?.login?.hasUris) {
      this.usernameWebsite = this.cipherState.login.uris[0].hostname;
    }
    await super.ngOnInit();
  }

  select() {
    super.select();
    if (this.type === "password") {
      this.cipherState.login.password = this.password;
    } else if (this.type === "username") {
      this.cipherState.login.username = this.username;
    }
    this.addEditCipherInfo.cipher = this.cipherState;
    this.stateService.setAddEditCipherInfo(this.addEditCipherInfo);
    this.close();
  }

  close() {
    /* Cozy custo
    this.location.back();
    */
    this.historyService.gotoPreviousUrl();
    /* end custo */
  }

  emailHasFocus = false;

  focusEmail() {
    if (this.emailHasFocus) {
      this.emailHasFocus = false;
    } else {
      this.emailInputElement.nativeElement.focus();
    }
  }
  unFocusEmail() {
    setTimeout(() => {
      this.emailHasFocus = false;
    }, 300);
  }
}