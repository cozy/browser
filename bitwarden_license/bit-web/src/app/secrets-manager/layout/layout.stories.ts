import { Component } from "@angular/core";
import { RouterModule } from "@angular/router";
import { Meta, Story, moduleMetadata } from "@storybook/angular";
import { BehaviorSubject } from "rxjs";

import { OrganizationService } from "@bitwarden/common/abstractions/organization/organization.service.abstraction";
import { Organization } from "@bitwarden/common/models/domain/organization";
import { IconModule } from "@bitwarden/components";
import { PreloadedEnglishI18nModule } from "@bitwarden/web-vault/app/tests/preloaded-english-i18n.module";

import { LayoutComponent } from "./layout.component";
import { LayoutModule } from "./layout.module";
import { NavigationComponent } from "./navigation.component";

class MockOrganizationService implements Partial<OrganizationService> {
  private static _orgs = new BehaviorSubject<Organization[]>([]);
  organizations$ = MockOrganizationService._orgs; // eslint-disable-line rxjs/no-exposed-subjects
}

@Component({
  selector: "story-content",
  template: ` <p class="tw-text-main">Content</p> `,
})
class StoryContentComponent {}

export default {
  title: "Web/Layout",
  component: LayoutComponent,
  decorators: [
    moduleMetadata({
      imports: [
        RouterModule.forRoot(
          [
            {
              path: "",
              component: LayoutComponent,
              children: [
                {
                  path: "",
                  redirectTo: "secrets",
                  pathMatch: "full",
                },
                {
                  path: "secrets",
                  component: StoryContentComponent,
                  data: {
                    title: "secrets",
                    searchTitle: "searchSecrets",
                  },
                },
                {
                  outlet: "sidebar",
                  path: "",
                  component: NavigationComponent,
                },
              ],
            },
          ],
          { useHash: true }
        ),
        LayoutModule,
        IconModule,
        PreloadedEnglishI18nModule,
      ],
      declarations: [StoryContentComponent],
      providers: [{ provide: OrganizationService, useClass: MockOrganizationService }],
    }),
  ],
} as Meta;

const Template: Story = (args) => ({
  props: args,
  template: `
    <router-outlet></router-outlet>
  `,
});

export const Default = Template.bind({});
