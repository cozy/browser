import { Component, EventEmitter, Input, Output } from "@angular/core";

import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";

/** Start Cozy imports */
/* eslint-disable */
import { CipherType } from "@bitwarden/common/vault/enums/cipher-type";
import { zeroPadLeftUntilTwoChars } from "../../../tools/strings";
/* eslint-enable */
/** End Cozy imports */

@Component({
  selector: "app-cipher-row",
  templateUrl: "cipher-row.component.html",
})
export class CipherRowComponent {
  @Output() onSelected = new EventEmitter<CipherView>();
  @Output() launchEvent = new EventEmitter<CipherView>();
  @Output() onView = new EventEmitter<CipherView>();
  @Input() cipher: CipherView;
  @Input() last: boolean;
  @Input() showView = false;
  @Input() title: string;
  /* Cozy custo */
  @Output() onAutofill = new EventEmitter<CipherView>();
  cipherType = CipherType;
  /* end custo */

  selectCipher(c: CipherView) {
    this.onSelected.emit(c);
  }

  launchCipher(c: CipherView) {
    this.launchEvent.emit(c);
  }

  viewCipher(c: CipherView) {
    this.onView.emit(c);
  }

  /* Cozy custo */
  autofill(c: CipherView) {
    this.onAutofill.emit(c);
  }

  getSubtitle(c: CipherView) {
    if (c.type === CipherType.Card) {
      const subTitleParts = [];

      if (c.subTitle) {
        subTitleParts.push(c.subTitle);
      }

      const isMonthFormatOk = !!c.card.expMonth;
      const isYearFormatOk = c.card.expYear?.match(/^(?:\d{2}){1,2}$/g);

      if (isMonthFormatOk || isYearFormatOk) {
        const month = isMonthFormatOk ? zeroPadLeftUntilTwoChars(c.card.expMonth) : "__";
        const year = isYearFormatOk ? zeroPadLeftUntilTwoChars(c.card.expYear) : "__";

        subTitleParts.push(`${month}/${year}`);
      }

      return subTitleParts.join(", ");
    }

    return c.subTitle;
  }
  /* end custo */
}
