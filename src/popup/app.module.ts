import { DragDropModule } from '@angular/cdk/drag-drop';
import { ToasterModule } from 'angular2-toaster';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';

import { AppRoutingModule } from './app-routing.module';
import { ServicesModule } from './services/services.module';

import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { HintComponent } from './accounts/hint.component';
import { HomeComponent } from './accounts/home.component';
import { LockComponent } from './accounts/lock.component';
import { LoginComponent } from './accounts/login.component';
import { SetPasswordComponent } from './accounts/set-password.component';
import { SsoComponent } from './accounts/sso.component';
import { TwoFactorOptionsComponent } from './accounts/two-factor-options.component';
import { TwoFactorComponent } from './accounts/two-factor.component';

import { PasswordGeneratorHistoryComponent } from './generator/password-generator-history.component';
import { PasswordGeneratorComponent } from './generator/password-generator.component';

import { AppComponent } from './app.component';
import { PrivateModeComponent } from './private-mode.component';
import { TabsComponent } from './tabs.component';

import { ExcludedDomainsComponent } from './settings/excluded-domains.component';
import { ExportComponent } from './settings/export.component';
import { FolderAddEditComponent } from './settings/folder-add-edit.component';
import { FoldersComponent } from './settings/folders.component';
import { OptionsComponent } from './settings/options.component';
import { SettingsComponent } from './settings/settings.component';
import { SyncComponent } from './settings/sync.component';

import { AddEditComponent } from './vault/add-edit.component';
import { AttachmentsComponent } from './vault/attachments.component';
import { CiphersComponent } from './vault/ciphers.component';
import { CollectionsComponent } from './vault/collections.component';
import { GroupingsComponent } from './vault/groupings.component';
import { PasswordHistoryComponent } from './vault/password-history.component';
import { ShareComponent } from './vault/share.component';
import { ViewComponent } from './vault/view.component';

import { SendAddEditComponent } from './send/send-add-edit.component';
import { SendGroupingsComponent } from './send/send-groupings.component';
import { SendTypeComponent } from './send/send-type.component';

import { A11yTitleDirective } from 'jslib-angular/directives/a11y-title.directive';
import { ApiActionDirective } from 'jslib-angular/directives/api-action.directive';
import { AutofocusDirective } from 'jslib-angular/directives/autofocus.directive';
import { BlurClickDirective } from 'jslib-angular/directives/blur-click.directive';
import { BoxRowDirective } from 'jslib-angular/directives/box-row.directive';
import { FallbackSrcDirective } from 'jslib-angular/directives/fallback-src.directive';
import { InputVerbatimDirective } from 'jslib-angular/directives/input-verbatim.directive';
import { SelectCopyDirective } from 'jslib-angular/directives/select-copy.directive';
import { StopClickDirective } from 'jslib-angular/directives/stop-click.directive';
import { StopPropDirective } from 'jslib-angular/directives/stop-prop.directive';
import { TrueFalseValueDirective } from 'jslib-angular/directives/true-false-value.directive';

import { ColorPasswordPipe } from 'jslib-angular/pipes/color-password.pipe';
import { I18nPipe } from 'jslib-angular/pipes/i18n.pipe';
import { SearchCiphersPipe } from 'jslib-angular/pipes/search-ciphers.pipe';

import { ActionButtonsComponent } from './components/action-buttons.component';
import { CiphersListComponent } from './components/ciphers-list.component';
import { SendListComponent } from './components/send-list.component';

import { CalloutComponent } from 'jslib-angular/components/callout.component';
// import { IconComponent } from 'jslib-angular/components/icon.component';
import { IconComponent } from './components/icon.component';

import {
    CurrencyPipe,
    DatePipe,
    registerLocaleData,
} from '@angular/common';

import localeEnGb from '@angular/common/locales/en-GB';
import localeFr from '@angular/common/locales/fr';

registerLocaleData(localeEnGb, 'en-GB');
registerLocaleData(localeFr, 'fr');

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        AppRoutingModule,
        ServicesModule,
        ToasterModule.forRoot(),
        InfiniteScrollModule,
        DragDropModule,
    ],
    declarations: [
        A11yTitleDirective,
        ActionButtonsComponent,
        AddEditComponent,
        ApiActionDirective,
        AppComponent,
        AttachmentsComponent,
        AutofocusDirective,
        BlurClickDirective,
        BoxRowDirective,
        CalloutComponent,
        CiphersComponent,
        CiphersListComponent,
        CollectionsComponent,
        ColorPasswordPipe,
        ExcludedDomainsComponent,
        ExportComponent,
        FallbackSrcDirective,
        FolderAddEditComponent,
        FoldersComponent,
        GroupingsComponent,
        HomeComponent,
        HintComponent,
        I18nPipe,
        IconComponent,
        InputVerbatimDirective,
        LockComponent,
        LoginComponent,
        OptionsComponent,
        PasswordGeneratorComponent,
        PasswordGeneratorHistoryComponent,
        PasswordHistoryComponent,
        PrivateModeComponent,
        SearchCiphersPipe,
        SelectCopyDirective,
        SendAddEditComponent,
        SendGroupingsComponent,
        SendListComponent,
        SendTypeComponent,
        SettingsComponent,
        ShareComponent,
        StopClickDirective,
        StopPropDirective,
        SyncComponent,
        TabsComponent,
        TrueFalseValueDirective,
        TwoFactorOptionsComponent,
        TwoFactorComponent,
        SsoComponent,
        ViewComponent,
        SetPasswordComponent,
    ],
    entryComponents: [],
    providers: [
        CurrencyPipe,
        DatePipe,
    ],
    bootstrap: [AppComponent],
})
export class AppModule { }
