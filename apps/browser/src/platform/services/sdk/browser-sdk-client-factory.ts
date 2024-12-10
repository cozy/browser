import { SdkClientFactory } from "@bitwarden/common/platform/abstractions/sdk/sdk-client-factory";
import type { BitwardenClient } from "@bitwarden/sdk-internal";

import { BrowserApi } from "../../browser/browser-api";

// https://stackoverflow.com/a/47880734
const supported = (() => {
  try {
    if (typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function") {
      const module = new WebAssembly.Module(
        Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00),
      );
      if (module instanceof WebAssembly.Module) {
        return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
      }
    }
  } catch (e) {
    // ignore
  }
  return false;
})();

// Due to using webpack as bundler, sync imports will return an async module. Since we do support
// top level awaits, we define a promise we can await in the `load` function.
let loadingPromise: Promise<any> | undefined;

// Manifest v3 does not support dynamic imports in the service worker.
if (BrowserApi.isManifestVersion(3)) {
  if (supported) {
    // eslint-disable-next-line no-console
    console.debug("WebAssembly is supported in this environment");
    loadingPromise = import("./wasm");
  } else {
    // eslint-disable-next-line no-console
    console.debug("WebAssembly is not supported in this environment");
    loadingPromise = import("./fallback");
  }
}

// Manifest v2 expects dynamic imports to prevent timing issues.
async function load() {
  if (BrowserApi.isManifestVersion(3)) {
    // Ensure we have loaded the module
    await loadingPromise;
    return;
  }

  if (supported) {
    // eslint-disable-next-line no-console
    console.debug("WebAssembly is supported in this environment");
    await import("./wasm");
  } else {
    // eslint-disable-next-line no-console
    console.debug("WebAssembly is not supported in this environment");
    await import("./fallback");
  }
}

/**
 * SDK client factory with a js fallback for when WASM is not supported.
 *
 * Works both in popup and service worker.
 */
export class BrowserSdkClientFactory implements SdkClientFactory {
  async createSdkClient(
    ...args: ConstructorParameters<typeof BitwardenClient>
  ): Promise<BitwardenClient> {
    try {
      await loadWithTimeout();
    } catch (error) {
      throw new Error(`Failed to load: ${error.message}`);
    }

    return Promise.resolve((globalThis as any).init_sdk(...args));
  }
}

const loadWithTimeout = async () => {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Operation timed out after 1 second"));
    }, 1000);

    load()
      .then(() => {
        clearTimeout(timer);
        resolve();
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};