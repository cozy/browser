import { CozySanitizeUrlService } from "../services/cozySanitizeUrl.service";

import { LoginComponent } from "../../auth/popup/login.component";

describe("url input", () => {
  const loginComponent = new LoginComponent(
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    new CozySanitizeUrlService()
  );
  it("should return undefined if the input is empty", () => {
    const inputUrl = "";
    expect(() => {
      loginComponent.sanitizeUrlInput(inputUrl);
    }).toThrow(new Error("cozyUrlRequired"));
  });
  it("should return undefined if the input is an email", () => {
    const inputUrl = "claude@cozycloud.cc";
    expect(() => {
      loginComponent.sanitizeUrlInput(inputUrl);
    }).toThrow(new Error("noEmailAsCozyUrl"));
  });
  it("should return the url without the app slug if present", () => {
    const inputUrl = "claude-drive.mycozy.cloud";
    const url = loginComponent.sanitizeUrlInput(inputUrl);
    expect(url).toEqual("https://claude.mycozy.cloud");
  });
  it("should return the url with the default domain if missing", () => {
    const inputUrl = "claude-drive";
    const url = loginComponent.sanitizeUrlInput(inputUrl);
    expect(url).toEqual("https://claude.mycozy.cloud");
  });
  it("should return the url with the default scheme if missing", () => {
    const inputUrl = "claude.mycozy.cloud";
    const url = loginComponent.sanitizeUrlInput(inputUrl);
    expect(url).toEqual("https://claude.mycozy.cloud");
  });
  it("should return the url if the input is correct", () => {
    const inputUrl = "https://claude.mycozy.cloud";
    const url = loginComponent.sanitizeUrlInput(inputUrl);
    expect(url).toEqual("https://claude.mycozy.cloud");
  });
  it("should accept local url", () => {
    const inputUrl = "http://claude.cozy.tools:8080";
    const url = loginComponent.sanitizeUrlInput(inputUrl);
    expect(url).toEqual("http://claude.cozy.tools:8080");
  });
  it("should not try to remove slug if present and url has a custom domain", () => {
    const inputUrl = "claude-drive.on-premise.cloud";
    const url = loginComponent.sanitizeUrlInput(inputUrl);
    expect(url).toEqual("https://claude-drive.on-premise.cloud");
  });
  it("should return the correct url if domains contains a dash", () => {
    const inputUrl = "claude.on-premise.cloud";
    const url = loginComponent.sanitizeUrlInput(inputUrl);
    expect(url).toEqual("https://claude.on-premise.cloud");
  });
  it("should return the correct url if domains contains a dash and cozy is installed on domain root", () => {
    const inputUrl = "https://on-premise.cloud";
    const url = loginComponent.sanitizeUrlInput(inputUrl);
    expect(url).toEqual("https://on-premise.cloud");
  });
  it(`should throw if user write 'mycosy' instead of 'mycozy'`, () => {
    const inputUrl = "https://claude.mycosy.cloud";
    expect(() => {
      loginComponent.sanitizeUrlInput(inputUrl);
    }).toThrow(new Error("hasMispelledCozy"));
  });
  it(`should accept real '*cosy*' url`, () => {
    const inputUrl = "https://claude.realdomaincosy.cloud";
    const url = loginComponent.sanitizeUrlInput(inputUrl);
    expect(url).toEqual("https://claude.realdomaincosy.cloud");
  });
  it(`should remove trailing / in url`, () => {
    const inputUrl = "https://claude.realdomaincosy.cloud/";
    const url = loginComponent.sanitizeUrlInput(inputUrl);
    expect(url).toEqual("https://claude.realdomaincosy.cloud");
  });
});
