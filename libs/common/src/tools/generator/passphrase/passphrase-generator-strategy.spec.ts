/**
 * include structuredClone in test environment.
 * @jest-environment ../../../../shared/test.environment.ts
 */
import { mock } from "jest-mock-extended";
import { of, firstValueFrom } from "rxjs";

import { PolicyType } from "../../../admin-console/enums";
// FIXME: use index.ts imports once policy abstractions and models
// implement ADR-0002
import { Policy } from "../../../admin-console/models/domain/policy";
import { StateProvider } from "../../../platform/state";
import { UserId } from "../../../types/guid";
import { PasswordGenerationServiceAbstraction } from "../abstractions/password-generation.service.abstraction";
import { PASSPHRASE_SETTINGS } from "../key-definitions";

import { DisabledPassphraseGeneratorPolicy } from "./passphrase-generator-policy";

import {
  DefaultPassphraseGenerationOptions,
  PassphraseGeneratorOptionsEvaluator,
  PassphraseGeneratorStrategy,
} from ".";

const SomeUser = "some user" as UserId;

describe("Password generation strategy", () => {
  describe("toEvaluator()", () => {
    it("should map to the policy evaluator", async () => {
      const strategy = new PassphraseGeneratorStrategy(null, null);
      const policy = mock<Policy>({
        type: PolicyType.PasswordGenerator,
        data: {
          minNumberWords: 10,
          capitalize: true,
          includeNumber: true,
        },
      });

      const evaluator$ = of([policy]).pipe(strategy.toEvaluator());
      const evaluator = await firstValueFrom(evaluator$);

      expect(evaluator).toBeInstanceOf(PassphraseGeneratorOptionsEvaluator);
      expect(evaluator.policy).toMatchObject({
        minNumberWords: 10,
        capitalize: true,
        includeNumber: true,
      });
    });

    it.each([[[]], [null], [undefined]])(
      "should map `%p` to a disabled password policy evaluator",
      async (policies) => {
        const strategy = new PassphraseGeneratorStrategy(null, null);

        const evaluator$ = of(policies).pipe(strategy.toEvaluator());
        const evaluator = await firstValueFrom(evaluator$);

        expect(evaluator).toBeInstanceOf(PassphraseGeneratorOptionsEvaluator);
        expect(evaluator.policy).toMatchObject(DisabledPassphraseGeneratorPolicy);
      },
    );
  });

  describe("durableState", () => {
    it("should use password settings key", () => {
      const provider = mock<StateProvider>();
      const legacy = mock<PasswordGenerationServiceAbstraction>();
      const strategy = new PassphraseGeneratorStrategy(legacy, provider);

      strategy.durableState(SomeUser);

      expect(provider.getUser).toHaveBeenCalledWith(SomeUser, PASSPHRASE_SETTINGS);
    });
  });

  describe("defaults$", () => {
    it("should return the default subaddress options", async () => {
      const strategy = new PassphraseGeneratorStrategy(null, null);

      const result = await firstValueFrom(strategy.defaults$(SomeUser));

      expect(result).toEqual(DefaultPassphraseGenerationOptions);
    });
  });

  describe("cache_ms", () => {
    it("should be a positive non-zero number", () => {
      const legacy = mock<PasswordGenerationServiceAbstraction>();
      const strategy = new PassphraseGeneratorStrategy(legacy, null);

      expect(strategy.cache_ms).toBeGreaterThan(0);
    });
  });

  describe("policy", () => {
    it("should use password generator policy", () => {
      const legacy = mock<PasswordGenerationServiceAbstraction>();
      const strategy = new PassphraseGeneratorStrategy(legacy, null);

      expect(strategy.policy).toBe(PolicyType.PasswordGenerator);
    });
  });

  describe("generate()", () => {
    it("should call the legacy service with the given options", async () => {
      const legacy = mock<PasswordGenerationServiceAbstraction>();
      const strategy = new PassphraseGeneratorStrategy(legacy, null);
      const options = {
        type: "passphrase",
        minNumberWords: 1,
        capitalize: true,
        includeNumber: true,
      };

      await strategy.generate(options);

      expect(legacy.generatePassphrase).toHaveBeenCalledWith(options);
    });

    it("should set the generation type to passphrase", async () => {
      const legacy = mock<PasswordGenerationServiceAbstraction>();
      const strategy = new PassphraseGeneratorStrategy(legacy, null);

      await strategy.generate({ type: "foo" } as any);

      expect(legacy.generatePassphrase).toHaveBeenCalledWith({ type: "passphrase" });
    });
  });
});
