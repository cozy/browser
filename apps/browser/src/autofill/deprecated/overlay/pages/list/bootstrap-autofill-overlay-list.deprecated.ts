import { AutofillOverlayElement } from "../../../../enums/autofill-overlay.enum";

import AutofillOverlayList from "./autofill-overlay-list.deprecated";

require("./list.scss");

(function () {
  globalThis.customElements.define(AutofillOverlayElement.List, AutofillOverlayList);
})();
