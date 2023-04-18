import { Location } from "@angular/common";
import { Component, HostListener } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { first } from "rxjs/operators";

import { AddEditComponent as BaseAddEditComponent } from "jslib-angular/components/add-edit.component";
import { AuditService } from "jslib-common/abstractions/audit.service";
import { CipherService } from "jslib-common/abstractions/cipher.service";
import { CollectionService } from "jslib-common/abstractions/collection.service";
import { EventService } from "jslib-common/abstractions/event.service";
import { FolderService } from "jslib-common/abstractions/folder.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { LogService } from "jslib-common/abstractions/log.service";
import { MessagingService } from "jslib-common/abstractions/messaging.service";
import { OrganizationService } from "jslib-common/abstractions/organization.service";
import { PasswordRepromptService } from "jslib-common/abstractions/passwordReprompt.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { PolicyService } from "jslib-common/abstractions/policy.service";
import { StateService } from "jslib-common/abstractions/state.service";
import { CipherType } from "jslib-common/enums/cipherType";
import { LoginUriView } from "jslib-common/models/view/loginUriView";

import { BrowserApi } from "../../browser/browserApi";
import { PopupUtilsService } from "../services/popup-utils.service";

/* Cozy imports */
/* eslint-disable */
import { deleteCipher } from "./utils";
import { KonnectorsService } from "../services/konnectors.service";
/* eslint-enable */
/* END */

@Component({
  selector: "app-vault-add-edit",
  templateUrl: "add-edit.component.html",
})

/**
 * See the original component:
 * https://github.com/bitwarden/browser/blob/
 * 7bfb8d91e3fcec00424d28410ef33401d582c3cc/src/popup/vault/add-edit.component.ts
 */
export class AddEditComponent extends BaseAddEditComponent {
  typeOptions: any[];
  currentUris: string[];
  openAttachmentsInPopup: boolean;
  showAutoFillOnPageLoadOptions: boolean;

  constructor(
    cipherService: CipherService,
    folderService: FolderService,
    i18nService: I18nService,
    platformUtilsService: PlatformUtilsService,
    auditService: AuditService,
    stateService: StateService,
    collectionService: CollectionService,
    messagingService: MessagingService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    eventService: EventService,
    policyService: PolicyService,
    private popupUtilsService: PopupUtilsService,
    organizationService: OrganizationService,
    passwordRepromptService: PasswordRepromptService,
    logService: LogService,
    private konnectorsService: KonnectorsService
  ) {
    super(
      cipherService,
      folderService,
      i18nService,
      platformUtilsService,
      auditService,
      stateService,
      collectionService,
      messagingService,
      eventService,
      policyService,
      logService,
      passwordRepromptService,
      organizationService
    );
    this.typeOptions = [
      { name: i18nService.t("typeLogin"), value: CipherType.Login },
      { name: i18nService.t("typeCard"), value: CipherType.Card },
      { name: i18nService.t("typeIdentity"), value: CipherType.Identity },
    ];
  }

  @HostListener("window:keydown", ["$event"])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      this.cancel();
      event.preventDefault();
    }
  }

  async ngOnInit() {
    await super.ngOnInit();

    this.route.queryParams.pipe(first()).subscribe(async (params) => {
      if (params.cipherId) {
        this.cipherId = params.cipherId;
      }
      if (params.folderId) {
        this.folderId = params.folderId;
      }
      if (params.collectionId) {
        const collection = this.writeableCollections.find((c) => c.id === params.collectionId);
        if (collection != null) {
          this.collectionIds = [collection.id];
          this.organizationId = collection.organizationId;
        }
      }
      if (params.type) {
        const type = parseInt(params.type, null);
        this.type = type;
      }
      this.editMode = !params.cipherId;

      if (params.cloneMode != null) {
        this.cloneMode = params.cloneMode === "true";
      }
      await this.load();

      if (!this.editMode || this.cloneMode) {
        if (
          !this.popupUtilsService.inPopout(window) &&
          params.name &&
          (this.cipher.name == null || this.cipher.name === "")
        ) {
          this.cipher.name = params.name;
        }
        if (
          !this.popupUtilsService.inPopout(window) &&
          params.uri &&
          (this.cipher.login.uris[0].uri == null || this.cipher.login.uris[0].uri === "")
        ) {
          this.cipher.login.uris[0].uri = params.uri;
        }
      }

      this.openAttachmentsInPopup = this.popupUtilsService.inPopup(window);
    });

    if (!this.editMode) {
      const tabs = await BrowserApi.tabsQuery({ windowType: "normal" });
      this.currentUris =
        tabs == null
          ? null
          : tabs.filter((tab) => tab.url != null && tab.url !== "").map((tab) => tab.url);
    }

    window.setTimeout(() => {
      if (!this.editMode) {
        if (this.cipher.name != null && this.cipher.name !== "") {
          document.getElementById("loginUsername").focus();
        } else {
          document.getElementById("name").focus();
        }
      }
    }, 200);
  }

  async load() {
    await super.load();
    this.showAutoFillOnPageLoadOptions =
      this.cipher.type === CipherType.Login &&
      (await this.stateService.getEnableAutoFillOnPageLoad());
  }

  async submit(): Promise<boolean> {
    if (await super.submit()) {
      if (this.cloneMode) {
        this.router.navigate(["/tabs/vault"]);
      } else {
        this.konnectorsService.createSuggestions();
        this.location.back();
      }
      return true;
    }

    return false;
  }

  cancel() {
    super.cancel();
    this.location.back();
  }

  async generateUsername(): Promise<boolean> {
    const confirmed = await super.generateUsername();
    if (confirmed) {
      await this.saveCipherState();
      this.router.navigate(["generator"], { queryParams: { type: "username" } });
    }
    return confirmed;
  }

  async generatePassword(): Promise<boolean> {
    const confirmed = await super.generatePassword();
    if (confirmed) {
      await this.saveCipherState();
      this.router.navigate(["generator"], { queryParams: { type: "password" } });
    }
    return confirmed;
  }

  /**
   * @override by Cozy
   * Calls the overrided deleteCipher
   */
  async delete(): Promise<boolean> {
    const deleted = await deleteCipher(
      this.cipherService,
      this.i18nService,
      this.platformUtilsService,
      this.cipher,
      this.stateService
    );
    if (deleted) {
      // add a timeout in order to prevent to display the vault home
      this.location.back();
      return true;
    }
    return false;
  }

  toggleUriInput(uri: LoginUriView) {
    const u = uri as any;
    u.showCurrentUris = !u.showCurrentUris;
  }

  allowOwnershipOptions(): boolean {
    return (
      (!this.editMode || this.cloneMode) &&
      this.ownershipOptions &&
      (this.ownershipOptions.length > 1 || !this.allowPersonal)
    );
  }

  private saveCipherState() {
    return this.stateService.setAddEditCipherInfo({
      cipher: this.cipher,
      collectionIds:
        this.collections == null
          ? []
          : this.collections.filter((c) => (c as any).checked).map((c) => c.id),
    });
  }
}
