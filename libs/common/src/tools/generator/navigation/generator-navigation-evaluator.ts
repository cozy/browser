import { PolicyEvaluator } from "../abstractions";

import { DefaultGeneratorNavigation, GeneratorNavigation } from "./generator-navigation";
import { GeneratorNavigationPolicy } from "./generator-navigation-policy";

/** Enforces policy for generator navigation options.
 */
export class GeneratorNavigationEvaluator
  implements PolicyEvaluator<GeneratorNavigationPolicy, GeneratorNavigation>
{
  /** Instantiates the evaluator.
   * @param policy The policy applied by the evaluator. When this conflicts with
   *               the defaults, the policy takes precedence.
   */
  constructor(readonly policy: GeneratorNavigationPolicy) {}

  /** {@link PolicyEvaluator.policyInEffect} */
  get policyInEffect(): boolean {
    return this.policy?.defaultType ? true : false;
  }

  /** Apply policy to the input options.
   *  @param options The options to build from. These options are not altered.
   *  @returns A new password generation request with policy applied.
   */
  applyPolicy(options: GeneratorNavigation): GeneratorNavigation {
    return options;
  }

  /** Ensures internal options consistency.
   *  @param options The options to cascade. These options are not altered.
   *  @returns A passphrase generation request with cascade applied.
   */
  sanitize(options: GeneratorNavigation): GeneratorNavigation {
    const defaultType = this.policyInEffect
      ? this.policy.defaultType
      : DefaultGeneratorNavigation.type;
    return {
      ...options,
      type: options.type ?? defaultType,
    };
  }
}
