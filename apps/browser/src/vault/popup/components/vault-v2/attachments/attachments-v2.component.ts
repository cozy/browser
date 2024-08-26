import { CommonModule, Location } from "@angular/common";
import { Component } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router } from "@angular/router";
import { first } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { CipherId } from "@bitwarden/common/types/guid";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { ButtonModule } from "@bitwarden/components";
import { CipherAttachmentsComponent } from "@bitwarden/vault";

import { PopOutComponent } from "../../../../../platform/popup/components/pop-out.component";
import { PopupFooterComponent } from "../../../../../platform/popup/layout/popup-footer.component";
import { PopupHeaderComponent } from "../../../../../platform/popup/layout/popup-header.component";
import { PopupPageComponent } from "../../../../../platform/popup/layout/popup-page.component";

@Component({
  standalone: true,
  selector: "app-attachments-v2",
  templateUrl: "./attachments-v2.component.html",
  imports: [
    CommonModule,
    ButtonModule,
    JslibModule,
    CipherAttachmentsComponent,
    PopupPageComponent,
    PopupHeaderComponent,
    PopupFooterComponent,
    PopOutComponent,
  ],
})
export class AttachmentsV2Component {
  /** The `id` tied to the underlying HTMLFormElement */
  attachmentFormId = CipherAttachmentsComponent.attachmentFormID;

  /** Id of the cipher */
  cipherId: CipherId;

  constructor(
    private router: Router,
    private cipherService: CipherService,
    private location: Location,
    route: ActivatedRoute,
  ) {
    route.queryParams.pipe(takeUntilDestroyed(), first()).subscribe(({ cipherId }) => {
      this.cipherId = cipherId;
    });
  }

  /**
   * Navigates to previous view or edit-cipher path
   * depending on the history length.
   *
   * This can happen when history is lost due to the extension being
   * forced into a popout window.
   */
  async handleBackButton() {
    if (history.length === 1) {
      await this.navigateToEditScreen();
    } else {
      this.location.back();
    }
  }

  /** Navigate the user back to the edit screen after uploading an attachment */
  async navigateToEditScreen() {
    const cipherDomain = await this.cipherService.get(this.cipherId);

    void this.router.navigate(["/edit-cipher"], {
      queryParams: { cipherId: this.cipherId, type: cipherDomain.type },
      // "replaceUrl" so the /attachments route is not in the history, thus when a back button
      // is clicked, the user is taken to the view screen instead of the attachments screen
      replaceUrl: true,
    });
  }
}
