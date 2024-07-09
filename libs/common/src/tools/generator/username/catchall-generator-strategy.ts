import { BehaviorSubject, map, pipe } from "rxjs";

import { PolicyType } from "../../../admin-console/enums";
import { StateProvider } from "../../../platform/state";
import { UserId } from "../../../types/guid";
import { GeneratorStrategy } from "../abstractions";
import { UsernameGenerationServiceAbstraction } from "../abstractions/username-generation.service.abstraction";
import { DefaultPolicyEvaluator } from "../default-policy-evaluator";
import { CATCHALL_SETTINGS } from "../key-definitions";
import { NoPolicy } from "../no-policy";

import { CatchallGenerationOptions, DefaultCatchallOptions } from "./catchall-generator-options";

const ONE_MINUTE = 60 * 1000;

/** Strategy for creating usernames using a catchall email address */
export class CatchallGeneratorStrategy
  implements GeneratorStrategy<CatchallGenerationOptions, NoPolicy>
{
  /** Instantiates the generation strategy
   *  @param usernameService generates a catchall address for a domain
   */
  constructor(
    private usernameService: UsernameGenerationServiceAbstraction,
    private stateProvider: StateProvider,
  ) {}

  /** {@link GeneratorStrategy.durableState} */
  durableState(id: UserId) {
    return this.stateProvider.getUser(id, CATCHALL_SETTINGS);
  }

  /** {@link GeneratorStrategy.defaults$} */
  defaults$(userId: UserId) {
    return new BehaviorSubject({ ...DefaultCatchallOptions }).asObservable();
  }

  /** {@link GeneratorStrategy.policy} */
  get policy() {
    // Uses password generator since there aren't policies
    // specific to usernames.
    return PolicyType.PasswordGenerator;
  }

  /** {@link GeneratorStrategy.cache_ms} */
  get cache_ms() {
    return ONE_MINUTE;
  }

  /** {@link GeneratorStrategy.toEvaluator} */
  toEvaluator() {
    return pipe(map((_) => new DefaultPolicyEvaluator<CatchallGenerationOptions>()));
  }

  /** {@link GeneratorStrategy.generate} */
  generate(options: CatchallGenerationOptions) {
    return this.usernameService.generateCatchall(options);
  }
}
