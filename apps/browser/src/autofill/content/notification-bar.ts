import AddLoginRuntimeMessage from "../../background/models/addLoginRuntimeMessage";
import ChangePasswordRuntimeMessage from "../../background/models/changePasswordRuntimeMessage";

// Cozy Imports
import {
  cancelButtonNames,
  changePasswordButtonContainsNames,
  changePasswordButtonNames,
  logInButtonNames,
} from "./consts";
// END Cozy Imports

/* Cozy custo  */
// See original file:
// https://github.com/bitwarden/browser/blob/3e1e05ab4ffabbf180972650818a3ae3468dbdfb/src/content/notificationBar.ts

// Returns a cozy app url based on the cozyUrl and the app name
function getAppURLCozy(cozyUrl: string, appName: string, hash: string) {
  if (!appName) {
    return new URL(cozyUrl).toString();
  }
  const url = new URL(cozyUrl);
  const hostParts = url.host.split(".");
  url.host = [`${hostParts[0]}-${appName}`, ...hostParts.slice(1)].join(".");
  if (hash) {
    url.hash = hash;
  }
  return url.toString();
}

// The aim is to not activate the inPageMenu in somme Cozy applications so that there is no menu in
// their forms (contacts, pass...)
let cozyPasswordsHostname: string;
let cozyContactsHostname: string;
function shouldTrigerMenu() {
  return !(
    (cozyPasswordsHostname === window.location.hostname && window.location.hash !== "#/login") ||
    cozyContactsHostname === window.location.hostname
  );
}
chrome.storage.local.get("global", (resp: any) => {
  cozyPasswordsHostname = new URL(getAppURLCozy(resp.global.environmentUrls.base, "passwords", ""))
    .hostname;
  cozyContactsHostname = new URL(getAppURLCozy(resp.global.environmentUrls.base, "contacts", ""))
    .hostname;
});
/* END Cozy custo  */

document.addEventListener("DOMContentLoaded", (event) => {
  if (window.location.hostname.endsWith("vault.bitwarden.com")) {
    return;
  }

  const pageDetails: any[] = [];
  const formData: any[] = [];
  let barType: string = null;
  let pageHref: string = null;
  let observer: MutationObserver = null;
  const observeIgnoredElements = new Set([
    "a",
    "i",
    "b",
    "strong",
    "span",
    "code",
    "br",
    "img",
    "small",
    "em",
    "hr",
  ]);
  const submitButtonSelector =
    'input[type="submit"], input[type="image"], ' + 'button[type="submit"]';
  let domObservationCollectTimeout: number = null;
  let collectIfNeededTimeout: number = null;
  // let observeDomTimeout: number = null;
  const inIframe = isInIframe();
  /* commented by Cozy
  const cancelButtonNames = new Set(["cancel", "close", "back"]);
  const logInButtonNames = new Set([
    "log in",
    "sign in",
    "login",
    "go",
    "submit",
    "continue",
    "next",
  ]);
  const changePasswordButtonNames = new Set([
    "save password",
    "update password",
    "change password",
    "change",
  ]);
  const changePasswordButtonContainsNames = new Set(["pass", "change", "contras", "senha"]);
  END commented by Cozy */
  let disabledAddLoginNotification = false;
  let disabledChangedPasswordNotification = false;
  const formEls = new Set();

  const activeUserIdKey = "activeUserId";
  let activeUserId: string;
  chrome.storage.local.get(activeUserIdKey, (obj: any) => {
    if (obj == null || obj[activeUserIdKey] == null) {
      return;
    }
    activeUserId = obj[activeUserIdKey];
  });
  /* Cozy custo */
  if (activeUserId) {
    /* end custo */
    /** TODO BJA : there might be a bug bellow : activeUserId will always be empty since the chrome.storage.local.get is asynchronous... */
    chrome.storage.local.get(activeUserId, (obj: any) => {
      if (obj?.[activeUserId] == null) {
        return;
      }

      const domains = obj[activeUserId].settings.neverDomains;
      // eslint-disable-next-line
      if (domains != null && domains.hasOwnProperty(window.location.hostname)) {
        return;
      }

      disabledAddLoginNotification = obj[activeUserId].settings.disableAddLoginNotification;
      disabledChangedPasswordNotification =
        obj[activeUserId].settings.disableChangedPasswordNotification;

      if (!disabledAddLoginNotification || !disabledChangedPasswordNotification) {
        collectIfNeededWithTimeout();
      }
    });
    /* Cozy custo */
  } else {
    collectIfNeededWithTimeout();
  }
  /* end custo */

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    processMessages(msg, sendResponse);
  });

  function processMessages(msg: any, sendResponse: (response?: any) => void) {
    /*
        @override by Cozy :
        This log is very useful for reverse engineer the code, keep it for tests
        console.log('notificationBar.js HEARD MESSAGE : ', {'msg.command': msg.command,'msg': msg});
        */
    if (msg.command === "openNotificationBar") {
      if (inIframe) {
        return;
      }
      closeExistingAndOpenBar(msg.data.type, msg.data.typeData);
      sendResponse();
      return true;
    } else if (msg.command === "closeNotificationBar") {
      if (inIframe) {
        return;
      }
      closeBar(true);
      sendResponse();
      return true;
    } else if (msg.command === "adjustNotificationBar") {
      if (inIframe) {
        return;
      }
      adjustBar(msg.data);
      sendResponse();
      return true;
    } else if (msg.command === "notificationBarPageDetails") {
      pageDetails.push(msg.data.details);
      watchForms(msg.data.forms);
      sendResponse();
      return true;
    } else if (msg.command === "notificationBarCollect") {
      collect();
      sendResponse();
      return true;
    }
  }

  function isInIframe() {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }

  /**
   * observeDom watches changes in the DOM and starts a new details page collect
   * if a new form is found.
   */
  function observeDom() {
    const bodies = document.querySelectorAll("body");
    if (bodies && bodies.length > 0) {
      observer = new MutationObserver((mutations) => {
        /* we remove the pageHref !== window.location.href condition since in some cases it prevents to react
        // to the page changes (for instance second step of this page :
        // https://secure.fnac.com/identity/server/gateway/signin-signup )
        if (mutations == null || mutations.length === 0 || pageHref !== window.location.href) {
        */
        if (mutations == null || mutations.length === 0 || !shouldTrigerMenu()) {
          /* end custo */
          return;
        }

        let doCollect = false;
        for (let i = 0; i < mutations.length; i++) {
          const mutation = mutations[i];
          if (mutation.addedNodes == null || mutation.addedNodes.length === 0) {
            continue;
          }

          for (let j = 0; j < mutation.addedNodes.length; j++) {
            const addedNode: any = mutation.addedNodes[j];
            if (addedNode == null) {
              continue;
            }

            const tagName = addedNode.tagName != null ? addedNode.tagName.toLowerCase() : null;
            if (
              tagName != null &&
              tagName === "form" &&
              (addedNode.dataset == null || !addedNode.dataset.bitwardenWatching)
            ) {
              doCollect = true;
              break;
            }

            if (
              (tagName != null && observeIgnoredElements.has(tagName)) ||
              addedNode.querySelectorAll == null
            ) {
              continue;
            }

            const forms = addedNode.querySelectorAll("form:not([data-bitwarden-watching]),input"); // Cozy custo
            if (forms != null && forms.length > 0) {
              doCollect = true;
              break;
            }
            // Cozy custo : take into account when modification occurs into a form.
            const parentform = addedNode.closest("form:not([data-bitwarden-watching])");
            if (parentform != null && parentform.length > 0) {
              doCollect = true;
              break;
            }
            /* end custo */
          }

          if (doCollect) {
            break;
          }
        }

        if (doCollect) {
          if (domObservationCollectTimeout != null) {
            window.clearTimeout(domObservationCollectTimeout);
          }

          /* Cozy custo : the timeout is tightened compared to BW because when mutations are trigered,
          // the browser has already differed the event : there is no need to wait more.
          domObservationCollectTimeout = window.setTimeout(collect, 1000);
          */
          domObservationCollectTimeout = window.setTimeout(collect, 100);
          /* end custo */
        }
      });

      observer.observe(bodies[0], { childList: true, subtree: true });
    }
  }

  function collectIfNeededWithTimeout() {
    collectIfNeeded(); // Cozy custo
    if (collectIfNeededTimeout != null) {
      window.clearTimeout(collectIfNeededTimeout);
    }
    collectIfNeededTimeout = window.setTimeout(collectIfNeeded, 1000);
  }

  function collectIfNeeded() {
    if (pageHref !== window.location.href) {
      pageHref = window.location.href;
      if (observer) {
        observer.disconnect();
        observer = null;
      }

      /* Cozy custo
      collect();

      if (observeDomTimeout != null) {
        window.clearTimeout(observeDomTimeout);
      }
      observeDomTimeout = window.setTimeout(observeDom, 1000);
      */
      if (shouldTrigerMenu()) {
        collect();
      }
      // The DOM might change during the collect: watch the DOM body for changes.
      // Note: a setTimeout was present here, apparently related to the autofill:
      // https://github.com/bitwarden/browser/commit/d19fcd6e4ccf062b595c2823267ffd32fd8e5a3d

      observeDom();
      /* end custo */
    }

    if (collectIfNeededTimeout != null) {
      window.clearTimeout(collectIfNeededTimeout);
    }

    /* Cozy custo :
    // this loop waiting for (pageHref !== window.location.href) to become true seems useless :
    // we only need to react to dom modifications, already taken into account by observeDom()
    // so we comment the loop waiting for "production tests"
    collectIfNeededTimeout = window.setTimeout(collectIfNeeded, 1000);
    */
  }

  function collect() {
    // notificationBar about to request to bgCollectPageDetails, result will also be used for the inPageMenu
    sendPlatformMessage({
      command: "bgCollectPageDetails",
      sender: "notificationBar",
    });
  }

  function watchForms(forms: any[]) {
    if (forms == null || forms.length === 0) {
      return;
    }

    forms.forEach((f: any) => {
      const formId: string = f.form != null ? f.form.htmlID : null;
      let formEl: HTMLFormElement = null;
      if (formId != null && formId !== "") {
        // Get form by id
        formEl = document.getElementById(formId) as HTMLFormElement;
      } else if (f.form.htmlClass) {
        // Get form by class
        const formsByClass = document.getElementsByClassName(
          f.form.htmlClass
        ) as HTMLCollectionOf<HTMLFormElement>;
        if (formsByClass.length > 0) {
          formEl = formsByClass[0];
        }
      }

      if (formEl == null) {
        const index = parseInt(f.form.opid.split("__")[2], null);
        formEl = document.getElementsByTagName("form")[index];
      }
      if (!formEl) {
        return;
      }
      if (formEls.has(formEl)) {
        // The form has already been processed: nothing to do here
        return;
      } else {
        // This is a new form
        formEls.add(formEl);
      }

      if (formEl != null && formEl.dataset.bitwardenWatching !== "1") {
        const formDataObj: any = {
          data: f,
          formEl: formEl,
          usernameEl: null,
          passwordEl: null,
          passwordEls: null,
        };
        locateFields(formDataObj);
        formData.push(formDataObj);
        listen(formEl);
        formEl.dataset.bitwardenWatching = "1";
      }
    });
  }

  function listen(form: HTMLFormElement) {
    form.removeEventListener("submit", formSubmitted, false);
    form.addEventListener("submit", formSubmitted, false);
    const submitButton = getSubmitButton(form, logInButtonNames);
    if (submitButton != null) {
      submitButton.removeEventListener("click", formSubmitted, false);
      submitButton.addEventListener("click", formSubmitted, false);
      /* Cozy custo */
    } else {
      // No submit button found in the form: it might be elsewhere in the document
      const potentialSubmitButtons = getButtonsInDocument();
      for (const button of potentialSubmitButtons) {
        button.removeEventListener("click", formSubmitted, false);
        button.addEventListener("click", formSubmitted, false);
      }
      /* end custo */
    }
  }

  function locateFields(formDataObj: any) {
    const inputs = Array.from(document.getElementsByTagName("input"));
    formDataObj.usernameEl = locateField(formDataObj.formEl, formDataObj.data.username, inputs);
    if (formDataObj.usernameEl != null && formDataObj.data.password != null) {
      formDataObj.passwordEl = locatePassword(
        formDataObj.formEl,
        formDataObj.data.password,
        inputs,
        true
      );
    } else if (formDataObj.data.passwords != null) {
      formDataObj.passwordEls = [];
      formDataObj.data.passwords.forEach((pData: any) => {
        const el = locatePassword(formDataObj.formEl, pData, inputs, false);
        if (el != null) {
          formDataObj.passwordEls.push(el);
        }
      });
      if (formDataObj.passwordEls.length === 0) {
        formDataObj.passwordEls = null;
      }
    }
  }

  function locatePassword(
    form: HTMLFormElement,
    passwordData: any,
    inputs: HTMLInputElement[],
    doLastFallback: boolean
  ) {
    let el = locateField(form, passwordData, inputs);
    if (el != null && el.type !== "password") {
      el = null;
    }
    if (doLastFallback && el == null) {
      el = form.querySelector('input[type="password"]');
    }
    return el;
  }

  function locateField(form: HTMLFormElement, fieldData: any, inputs: HTMLInputElement[]) {
    if (fieldData == null) {
      return;
    }
    let el: HTMLInputElement = null;
    if (fieldData.htmlID != null && fieldData.htmlID !== "") {
      try {
        el = form.querySelector("#" + fieldData.htmlID);
      } catch {
        // Ignore error, we perform fallbacks below.
      }
    }
    if (el == null && fieldData.htmlName != null && fieldData.htmlName !== "") {
      el = form.querySelector('input[name="' + fieldData.htmlName + '"]');
    }
    /* Cozy custo */
    if (el == null && fieldData.opid != null) {
      // @ts-expect-error opid is not an html property
      el = inputs.find((e) => e.opid === fieldData.opid);
    }
    /* end custo */
    if (el == null && fieldData.elementNumber != null) {
      el = inputs[fieldData.elementNumber];
    }
    return el;
  }

  function formSubmitted(e: Event) {
    let form: HTMLFormElement = null;
    if (e.type === "click") {
      form = (e.target as HTMLElement).closest("form");
      if (form == null) {
        const parentModal = (e.target as HTMLElement).closest("div.modal");
        if (parentModal != null) {
          const modalForms = parentModal.querySelectorAll("form");
          if (modalForms.length === 1) {
            form = modalForms[0];
          }
        }
      }
    } else {
      form = e.target as HTMLFormElement;
    }

    if (form == null || form.dataset.bitwardenProcessed === "1") {
      return;
    }

    for (let i = 0; i < formData.length; i++) {
      if (formData[i].formEl !== form) {
        continue;
      }
      const disabledBoth = disabledChangedPasswordNotification && disabledAddLoginNotification;
      if (!disabledBoth && formData[i].usernameEl != null && formData[i].passwordEl != null) {
        const login: AddLoginRuntimeMessage = {
          username: formData[i].usernameEl.value,
          password: formData[i].passwordEl.value,
          url: document.URL,
        };

        if (
          login.username != null &&
          login.username !== "" &&
          login.password != null &&
          login.password !== ""
        ) {
          /* Cozy custo */
          if (!form) {
            // This happens when the submit button was found outside of the form
            form = formData[i].formEl;
          }
          /* end custo */
          processedForm(form);
          sendPlatformMessage({
            command: "bgAddLogin",
            login: login,
          });
          break;
        }
      }
      if (!disabledChangedPasswordNotification && formData[i].passwordEls != null) {
        const passwords: string[] = formData[i].passwordEls
          .filter((el: HTMLInputElement) => el.value != null && el.value !== "")
          .map((el: HTMLInputElement) => el.value);

        let curPass: string = null;
        let newPass: string = null;
        let newPassOnly = false;
        if (formData[i].passwordEls.length === 3 && passwords.length === 3) {
          newPass = passwords[1];
          if (passwords[0] !== newPass && newPass === passwords[2]) {
            curPass = passwords[0];
          } else if (newPass !== passwords[2] && passwords[0] === newPass) {
            curPass = passwords[2];
          }
        } else if (formData[i].passwordEls.length === 2 && passwords.length === 2) {
          if (passwords[0] === passwords[1]) {
            newPassOnly = true;
            newPass = passwords[0];
            curPass = null;
          } else {
            const buttonText = getButtonText(getSubmitButton(form, changePasswordButtonNames));
            const matches = Array.from(changePasswordButtonContainsNames).filter(
              (n) => buttonText.indexOf(n) > -1
            );
            if (matches.length > 0) {
              curPass = passwords[0];
              newPass = passwords[1];
            }
          }
        }

        if ((newPass != null && curPass != null) || (newPassOnly && newPass != null)) {
          /* Cozy custo */
          if (!form) {
            // This happens when the submit button was found outside of the form
            form = formData[i].formEl;
          }
          /* end custo */
          processedForm(form);

          const changePasswordRuntimeMessage: ChangePasswordRuntimeMessage = {
            newPassword: newPass,
            currentPassword: curPass,
            url: document.URL,
          };
          sendPlatformMessage({
            command: "bgChangedPassword",
            data: changePasswordRuntimeMessage,
          });
          break;
        }
      }
    }
  }

  /* Cozy custo */
  function getButtonsInDocument() {
    const submitButtons = document.querySelectorAll(
      submitButtonSelector + ', div[role="button"]'
    ) as NodeList;
    return submitButtons;
  }
  /* end custo */

  function getSubmitButton(wrappingEl: HTMLElement, buttonNames: Set<string>) {
    if (wrappingEl == null) {
      return null;
    }

    const wrappingElIsForm = wrappingEl.tagName.toLowerCase() === "form";

    let submitButton = wrappingEl.querySelector(submitButtonSelector) as HTMLElement;
    if (submitButton == null && wrappingElIsForm) {
      submitButton = wrappingEl.querySelector("button:not([type])");
      if (submitButton != null) {
        const buttonText = getButtonText(submitButton);
        if (buttonText != null && cancelButtonNames.has(buttonText.trim().toLowerCase())) {
          submitButton = null;
        }
      }
    }
    if (submitButton == null) {
      const possibleSubmitButtons = Array.from(
        wrappingEl.querySelectorAll(
          'a, span, button[type="button"], ' + 'input[type="button"], button:not([type])'
        )
      ) as HTMLElement[];
      let typelessButton: HTMLElement = null;
      possibleSubmitButtons.forEach((button) => {
        if (submitButton != null || button == null || button.tagName == null) {
          return;
        }
        /* Cozy custo */
        const inputButton = button as HTMLInputElement;
        if (inputButton.type === "submit") {
          submitButton = button;
        }
        /* end custo */
        const buttonText = getButtonText(button);
        if (buttonText != null) {
          if (
            typelessButton != null &&
            button.tagName.toLowerCase() === "button" &&
            button.getAttribute("type") == null &&
            !cancelButtonNames.has(buttonText.trim().toLowerCase())
          ) {
            typelessButton = button;
          } else if (buttonNames.has(buttonText.trim().toLowerCase())) {
            submitButton = button;
          }
        }
      });
      if (submitButton == null && typelessButton != null) {
        submitButton = typelessButton;
      }
    }
    if (submitButton == null && wrappingElIsForm) {
      // Maybe it's in a modal?
      const parentModal = wrappingEl.closest("div.modal") as HTMLElement;
      if (parentModal != null) {
        const modalForms = parentModal.querySelectorAll("form");
        if (modalForms.length === 1) {
          submitButton = getSubmitButton(parentModal, buttonNames);
        }
      }
    }
    return submitButton;
  }

  function getButtonText(button: HTMLElement) {
    let buttonText: string = null;
    if (button.tagName.toLowerCase() === "input") {
      buttonText = (button as HTMLInputElement).value;
    } else {
      buttonText = button.innerText;
    }
    return buttonText;
  }

  function processedForm(form: HTMLFormElement) {
    form.dataset.bitwardenProcessed = "1";
    window.setTimeout(() => {
      form.dataset.bitwardenProcessed = "0";
    }, 500);
  }

  function closeExistingAndOpenBar(type: string, typeData: any) {
    /* Cozy custo
    const barQueryParams = {
      type,
      isVaultLocked: typeData.isVaultLocked,
      theme: typeData.theme,
      removeIndividualVault: typeData.removeIndividualVault,
    };
    const barQueryString = new URLSearchParams(barQueryParams).toString();
    const barPage = "notification/bar.html?" + barQueryString;
    */
    let barPage = "notification/bar.html";
    switch (type) {
      case "add":
        barPage = barPage + "?add=1&isVaultLocked=" + typeData.isVaultLocked;
        break;
      case "change":
        barPage = barPage + "?change=1&isVaultLocked=" + typeData.isVaultLocked;
        break;
      case "TOTPCopied":
        barPage = barPage + "?totp=1";
        break;
      default:
        break;
    }
    /* end custo */

    const frame = document.getElementById("bit-notification-bar-iframe") as HTMLIFrameElement;
    if (frame != null && frame.src.indexOf(barPage) >= 0) {
      return;
    }

    closeBar(false);
    openBar(type, barPage);
  }

  function openBar(type: string, barPage: string) {
    barType = type;

    if (document.body == null) {
      return;
    }

    const barPageUrl: string = chrome.extension.getURL(barPage);

    const iframe = document.createElement("iframe");
    /* commented by Cozy
    iframe.style.cssText = "height: 42px; width: 100%; border: 0; min-height: initial;";
    */
    iframe.id = "bit-notification-bar-iframe";
    iframe.src = barPageUrl;

    const frameDiv = document.createElement("div");
    frameDiv.setAttribute("aria-live", "polite");
    frameDiv.id = "bit-notification-bar";
    /* Cozy custo
    frameDiv.style.cssText =
      "height: 42px; width: 100%; top: 0; left: 0; padding: 0; position: fixed; " +
      "z-index: 2147483647; visibility: visible;";
    */
    frameDiv.style.cssText = "visibility: hidden;";
    /* end custo */
    frameDiv.appendChild(iframe);
    document.body.appendChild(frameDiv);

    (iframe.contentWindow.location as any) = barPageUrl;

    /** commented by Cozy
    const spacer = document.createElement("div");
    spacer.id = "bit-notification-bar-spacer";
    spacer.style.cssText = "height: 42px;";
    document.body.insertBefore(spacer, document.body.firstChild);
    END commented by Cozy*/
  }

  function closeBar(explicitClose: boolean) {
    const barEl = document.getElementById("bit-notification-bar");
    if (barEl != null) {
      barEl.parentElement.removeChild(barEl);
    }

    /** commented by Cozy
    const spacerEl = document.getElementById("bit-notification-bar-spacer");
    if (spacerEl) {
      spacerEl.parentElement.removeChild(spacerEl);
    }
    END commented by Cozy */

    if (!explicitClose) {
      return;
    }

    switch (barType) {
      case "add":
        sendPlatformMessage({
          command: "bgAddClose",
        });
        break;
      case "change":
        sendPlatformMessage({
          command: "bgChangeClose",
        });
        break;
      default:
        break;
    }
  }

  function adjustBar(data: any) {
    /* Cozy custo
    if (data != null && data.height !== 42) {
    */
    if (data != null) {
      /* end custo */
      const newHeight = data.height + "px";
      doHeightAdjustment("bit-notification-bar-iframe", newHeight);
      doHeightAdjustment("bit-notification-bar", newHeight);
      doHeightAdjustment("bit-notification-bar-spacer", newHeight);
    }
  }

  function doHeightAdjustment(elId: string, heightStyle: string) {
    const el = document.getElementById(elId);
    if (el != null) {
      el.style.height = heightStyle;
      el.style.removeProperty("visibility"); // Cozy custo
    }
  }

  function sendPlatformMessage(msg: any) {
    chrome.runtime.sendMessage(msg);
  }
});
