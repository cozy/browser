import { AutofillOverlayPort } from "../../../enums/autofill-overlay.enum";

import { AutofillInlineMenuIframeElement } from "./autofill-inline-menu-iframe-element";

export class AutofillInlineMenuListIframe extends AutofillInlineMenuIframeElement {
  constructor(element: HTMLElement) {
    super(
      element,
      AutofillOverlayPort.List,
      {
        height: "0px",
        minWidth: "320px",
        maxHeight: "460px",
        boxShadow: "rgba(0, 0, 0, 0.1) 2px 4px 6px 0px",
        borderRadius: "4px",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "rgb(206, 212, 220)",
      },
      chrome.i18n.getMessage("bitwardenVault"),
    );
  }
}
