import { BehaviorSubject, map, pipe } from "rxjs";

import { PolicyType } from "../../../admin-console/enums";
import { StateProvider } from "../../../platform/state";
import { UserId } from "../../../types/guid";
import { GeneratorStrategy } from "../abstractions";
import { UsernameGenerationServiceAbstraction } from "../abstractions/username-generation.service.abstraction";
import { DefaultPolicyEvaluator } from "../default-policy-evaluator";
import { EFF_USERNAME_SETTINGS } from "../key-definitions";
import { NoPolicy } from "../no-policy";

import {
  DefaultEffUsernameOptions,
  EffUsernameGenerationOptions,
} from "./eff-username-generator-options";

const ONE_MINUTE = 60 * 1000;

/** Strategy for creating usernames from the EFF wordlist */
export class EffUsernameGeneratorStrategy
  implements GeneratorStrategy<EffUsernameGenerationOptions, NoPolicy>
{
  /** Instantiates the generation strategy
   *  @param usernameService generates a username from EFF word list
   */
  constructor(
    private usernameService: UsernameGenerationServiceAbstraction,
    private stateProvider: StateProvider,
  ) {}

  /** {@link GeneratorStrategy.durableState} */
  durableState(id: UserId) {
    return this.stateProvider.getUser(id, EFF_USERNAME_SETTINGS);
  }

  /** {@link GeneratorStrategy.defaults$} */
  defaults$(userId: UserId) {
    return new BehaviorSubject({ ...DefaultEffUsernameOptions }).asObservable();
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
    return pipe(map((_) => new DefaultPolicyEvaluator<EffUsernameGenerationOptions>()));
  }

  /** {@link GeneratorStrategy.generate} */
  generate(options: EffUsernameGenerationOptions) {
    return this.usernameService.generateWord(options);
  }
}
