import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { RouterModule } from "@angular/router";

import { JslibModule } from "@bitwarden/angular/jslib.module";

@Component({
  standalone: true,
  selector: "auth-registration-start-secondary",
  templateUrl: "./registration-start-secondary.component.html",
  imports: [CommonModule, JslibModule, RouterModule],
})
export class RegistrationStartSecondaryComponent {
  constructor() {}
}
