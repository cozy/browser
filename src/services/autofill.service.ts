import {
    CipherType,
    FieldType,
} from 'jslib/enums';

import { CipherView } from 'jslib/models/view';

import AutofillField from '../models/autofillField';
import AutofillPageDetails from '../models/autofillPageDetails';
import AutofillScript from '../models/autofillScript';

import { BrowserApi } from '../browser/browserApi';

import { AutofillService as AutofillServiceInterface } from './abstractions/autofill.service';

import {
    CipherService,
    TotpService,
    UserService,
} from 'jslib/abstractions';

import { EventService } from 'jslib/abstractions/event.service';
import { CipherRepromptType } from 'jslib/enums/cipherRepromptType';
import { EventType } from 'jslib/enums/eventType';

const CardAttributes: string[] = ['autoCompleteType', 'data-stripe', 'htmlName', 'htmlID', 'label-tag',
    'placeholder', 'label-left', 'label-top', 'data-recurly'];

const CardAttributesExtended: string[] = [...CardAttributes, 'label-right'];

const IdentityAttributes: string[] = ['autoCompleteType', 'data-stripe', 'htmlName', 'htmlID', 'label-tag',
    'placeholder', 'label-left', 'label-top', 'data-recurly'];

const UsernameFieldNames: string[] = [
    // English
    'username', 'user name', 'email', 'email address', 'e-mail', 'e-mail address', 'userid', 'user id',
    'customer id', 'login id',
    // German
    'benutzername', 'benutzer name', 'email adresse', 'e-mail adresse', 'benutzerid', 'benutzer id'];

const FirstnameFieldNames: string[] = [
    // English
    'f-name', 'first-name', 'given-name', 'first-n',
    // German
    'vorname',
    // French
    'prenom',
];

const LastnameFieldNames: string[] = [
    // English
    'l-name', 'last-name', 's-name', 'surname', 'family-name', 'family-n', 'last-n',
    // German
    'nachname', 'familienname',
    // French
    'nom-de-famille', 'nom',
];

const ExcludedAutofillTypes: string[] = ['radio', 'checkbox', 'hidden', 'file', 'button', 'image', 'reset', 'search'];

// Each index represents a language. These three arrays should all be the same length.
// 0: English, 1: Danish, 2: German/Dutch, 3: French/Spanish/Italian, 4: Russian, 5: Portuguese
const MonthAbbr = ['mm', 'mm', 'mm', 'mm', 'mm', 'mm'];
const YearAbbrShort = ['yy', 'åå', 'jj', 'aa', 'гг', 'rr'];
const YearAbbrLong = ['yyyy', 'åååå', 'jjjj', 'aa', 'гггг', 'rrrr'];

const OperationDelays = new Map<string, number>([
    ['buzzsprout.com', 100],
]);

/* tslint:disable */
const IsoCountries: { [id: string]: string; } = {
    afghanistan: "AF", "aland islands": "AX", albania: "AL", algeria: "DZ", "american samoa": "AS", andorra: "AD",
    angola: "AO", anguilla: "AI", antarctica: "AQ", "antigua and barbuda": "AG", argentina: "AR", armenia: "AM",
    aruba: "AW", australia: "AU", austria: "AT", azerbaijan: "AZ", bahamas: "BS", bahrain: "BH", bangladesh: "BD",
    barbados: "BB", belarus: "BY", belgium: "BE", belize: "BZ", benin: "BJ", bermuda: "BM", bhutan: "BT",
    bolivia: "BO", "bosnia and herzegovina": "BA", botswana: "BW", "bouvet island": "BV", brazil: "BR",
    "british indian ocean territory": "IO", "brunei darussalam": "BN", bulgaria: "BG", "burkina faso": "BF",
    burundi: "BI", cambodia: "KH", cameroon: "CM", canada: "CA", "cape verde": "CV", "cayman islands": "KY",
    "central african republic": "CF", chad: "TD", chile: "CL", china: "CN", "christmas island": "CX",
    "cocos (keeling) islands": "CC", colombia: "CO", comoros: "KM", congo: "CG", "congo, democratic republic": "CD",
    "cook islands": "CK", "costa rica": "CR", "cote d'ivoire": "CI", croatia: "HR", cuba: "CU", cyprus: "CY",
    "czech republic": "CZ", denmark: "DK", djibouti: "DJ", dominica: "DM", "dominican republic": "DO", ecuador: "EC",
    egypt: "EG", "el salvador": "SV", "equatorial guinea": "GQ", eritrea: "ER", estonia: "EE", ethiopia: "ET",
    "falkland islands": "FK", "faroe islands": "FO", fiji: "FJ", finland: "FI", france: "FR", "french guiana": "GF",
    "french polynesia": "PF", "french southern territories": "TF", gabon: "GA", gambia: "GM", georgia: "GE",
    germany: "DE", ghana: "GH", gibraltar: "GI", greece: "GR", greenland: "GL", grenada: "GD", guadeloupe: "GP",
    guam: "GU", guatemala: "GT", guernsey: "GG", guinea: "GN", "guinea-bissau": "GW", guyana: "GY", haiti: "HT",
    "heard island & mcdonald islands": "HM", "holy see (vatican city state)": "VA", honduras: "HN", "hong kong": "HK",
    hungary: "HU", iceland: "IS", india: "IN", indonesia: "ID", "iran, islamic republic of": "IR", iraq: "IQ",
    ireland: "IE", "isle of man": "IM", israel: "IL", italy: "IT", jamaica: "JM", japan: "JP", jersey: "JE",
    jordan: "JO", kazakhstan: "KZ", kenya: "KE", kiribati: "KI", "republic of korea": "KR", "south korea": "KR",
    "democratic people's republic of korea": "KP", "north korea": "KP", kuwait: "KW", kyrgyzstan: "KG",
    "lao people's democratic republic": "LA", latvia: "LV", lebanon: "LB", lesotho: "LS", liberia: "LR",
    "libyan arab jamahiriya": "LY", liechtenstein: "LI", lithuania: "LT", luxembourg: "LU", macao: "MO",
    macedonia: "MK", madagascar: "MG", malawi: "MW", malaysia: "MY", maldives: "MV", mali: "ML", malta: "MT",
    "marshall islands": "MH", martinique: "MQ", mauritania: "MR", mauritius: "MU", mayotte: "YT", mexico: "MX",
    "micronesia, federated states of": "FM", moldova: "MD", monaco: "MC", mongolia: "MN", montenegro: "ME",
    montserrat: "MS", morocco: "MA", mozambique: "MZ", myanmar: "MM", namibia: "NA", nauru: "NR", nepal: "NP",
    netherlands: "NL", "netherlands antilles": "AN", "new caledonia": "NC", "new zealand": "NZ", nicaragua: "NI",
    niger: "NE", nigeria: "NG", niue: "NU", "norfolk island": "NF", "northern mariana islands": "MP", norway: "NO",
    oman: "OM", pakistan: "PK", palau: "PW", "palestinian territory, occupied": "PS", panama: "PA",
    "papua new guinea": "PG", paraguay: "PY", peru: "PE", philippines: "PH", pitcairn: "PN", poland: "PL",
    portugal: "PT", "puerto rico": "PR", qatar: "QA", reunion: "RE", romania: "RO", "russian federation": "RU",
    rwanda: "RW", "saint barthelemy": "BL", "saint helena": "SH", "saint kitts and nevis": "KN", "saint lucia": "LC",
    "saint martin": "MF", "saint pierre and miquelon": "PM", "saint vincent and grenadines": "VC", samoa: "WS",
    "san marino": "SM", "sao tome and principe": "ST", "saudi arabia": "SA", senegal: "SN", serbia: "RS",
    seychelles: "SC", "sierra leone": "SL", singapore: "SG", slovakia: "SK", slovenia: "SI", "solomon islands": "SB",
    somalia: "SO", "south africa": "ZA", "south georgia and sandwich isl.": "GS", spain: "ES", "sri lanka": "LK",
    sudan: "SD", suriname: "SR", "svalbard and jan mayen": "SJ", swaziland: "SZ", sweden: "SE", switzerland: "CH",
    "syrian arab republic": "SY", taiwan: "TW", tajikistan: "TJ", tanzania: "TZ", thailand: "TH", "timor-leste": "TL",
    togo: "TG", tokelau: "TK", tonga: "TO", "trinidad and tobago": "TT", tunisia: "TN", turkey: "TR",
    turkmenistan: "TM", "turks and caicos islands": "TC", tuvalu: "TV", uganda: "UG", ukraine: "UA",
    "united arab emirates": "AE", "united kingdom": "GB", "united states": "US",
    "united states outlying islands": "UM", uruguay: "UY", uzbekistan: "UZ", vanuatu: "VU", venezuela: "VE",
    vietnam: "VN", "virgin islands, british": "VG", "virgin islands, u.s.": "VI", "wallis and futuna": "WF",
    "western sahara": "EH", yemen: "YE", zambia: "ZM", zimbabwe: "ZW",
};

const IsoStates: { [id: string]: string; } = {
    alabama: 'AL', alaska: 'AK', 'american samoa': 'AS', arizona: 'AZ', arkansas: 'AR', california: 'CA',
    colorado: 'CO', connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC',
    'federated states of micronesia': 'FM', florida: 'FL', georgia: 'GA', guam: 'GU', hawaii: 'HI', idaho: 'ID',
    illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME',
    'marshall islands': 'MH', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
    missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
    'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
    'northern mariana islands': 'MP', ohio: 'OH', oklahoma: 'OK', oregon: 'OR', palau: 'PW', pennsylvania: 'PA',
    'puerto rico': 'PR', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN',
    texas: 'TX', utah: 'UT', vermont: 'VT', 'virgin islands': 'VI', virginia: 'VA', washington: 'WA',
    'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
};

var IsoProvinces: { [id: string]: string; } = {
    alberta: 'AB', 'british columbia': 'BC', manitoba: 'MB', 'new brunswick': 'NB', 'newfoundland and labrador': 'NL',
    'nova scotia': 'NS', ontario: 'ON', 'prince edward island': 'PE', quebec: 'QC', saskatchewan: 'SK',
};
/* tslint:enable */

const attributesAmbiguity: any = {
    identity : {
        title          : 1,
        firstName      : 1,
        middleName     : 1,
        lastName       : 1,
        address1       : 1,
        address2       : 1,
        address3       : 1,
        city           : 1,
        state          : 1,
        postalCode     : 1,
        country        : 1,
        company        : 1,
        email          : 0,
        phone          : 0,
        ssn            : 0,
        username       : 1,
        passportNumber : 1,
        licenseNumber  : 1,
    },
    card : {
        cardholderName : 1,
        brand          : 1,
        number         : 1,
        expMonth       : 1,
        expYear        : 1,
        code           : 1,
    },
    login : {
        uris                 : 1,
        username             : 1,
        password             : 1,
        passwordRevisionDate : 1,
        totp                 : 1,
    },
};

export default class AutofillService implements AutofillServiceInterface {

    constructor(private cipherService: CipherService, private userService: UserService,
        private totpService: TotpService, private eventService: EventService) { }

    getFormsWithPasswordFields(pageDetails: AutofillPageDetails): any[] {
        const formData: any[] = [];

        const passwordFields = this.loadPasswordFields(pageDetails, true, true, false, false);
        if (passwordFields.length === 0) {
            return formData;
        }

        for (const formKey in pageDetails.forms) {
            if (!pageDetails.forms.hasOwnProperty(formKey)) {
                continue;
            }

            const formPasswordFields = passwordFields.filter(pf => formKey === pf.form);
            if (formPasswordFields.length > 0) {
                let uf = this.findUsernameField(pageDetails, formPasswordFields[0], false, false, false);
                if (uf == null) {
                    // not able to find any viewable username fields. maybe there are some "hidden" ones?
                    uf = this.findUsernameField(pageDetails, formPasswordFields[0], true, true, false);
                }
                formData.push({
                    form: pageDetails.forms[formKey],
                    password: formPasswordFields[0],
                    username: uf,
                    passwords: formPasswordFields,
                });
            }
        }

        return formData;
    }

    async doAutoFill(options: any) {
        let totpPromise: Promise<string> = null;
        let tab: any;
        let fillScripts: any[];
        /*
        @override by Cozy : when the user logins into the addon, all tabs requests a pageDetail in order to
        activate the in-page-menu : then the tab to take into account is not the active tab, but the tab sent with
        the pageDetails.
        If the request doesn't come from notificationBar, then it is the current tab to use as a target.
        */
        if (options.tab) {
            tab = options.tab;
        } else if (options.pageDetails[0].sender === 'notifBarForInPageMenu') {
            tab = options.pageDetails[0].tab;
        } else {
            tab = await this.getActiveTab();
        }
        /* END @override by Cozy */

        if (!tab || !options.pageDetails || !options.pageDetails.length) {
            throw new Error('Nothing to auto-fill.');
        }

        // This is changed from the original component
        const canAccessPremium = false;

        let didAutofill = false;
        options.pageDetails.forEach((pd: any) => {
            // make sure we're still on correct tab
            if (pd.tab.id !== tab.id || pd.tab.url !== tab.url) {
                return;
            }

            const fillScript = this.generateFillScript(pd.details, {
                skipUsernameOnlyFill: options.skipUsernameOnlyFill || false,
                onlyEmptyFields     : options.onlyEmptyFields      || false,
                onlyVisibleFields   : options.onlyVisibleFields    || false,
                fillNewPassword     : options.fillNewPassword      || false,
                cipher              : options.cipher,
                sender              : pd.sender,
            });

            if (!options.fieldsForInPageMenuScripts &&
                (!fillScript || !fillScript.script || !fillScript.script.length)) {
                return;
            }

            // Add a small delay between operations
            if (fillScript) {
                fillScript.properties.delay_between_operations = 20;
                didAutofill = true;
            }

            if (!options.skipLastUsed && options.cipher && !options.fieldsForInPageMenuScripts) {
                this.cipherService.updateLastUsedDate(options.cipher.id);
            }

            if (options.fieldsForInPageMenuScripts) {
                // means we are preparing a script to activate menu into page fields
                if (fillScript) {
                    fillScript.script = fillScript.script.filter( action => {
                        if (action[0] !== 'fill_by_opid') { return false; }
                        action[0] = 'add_menu_btn_by_opid';
                        action[3].hasExistingCipher = true;
                        action[3].connected = true;
                        return true;
                    });
                    fillScripts = [fillScript, ...options.fieldsForInPageMenuScripts];
                } else {
                    fillScripts = options.fieldsForInPageMenuScripts;
                }
                this.postFilterFieldsForInPageMenu(
                    fillScripts, pd.details.forms, pd.details.fields,
                );
            } else {
                fillScripts = fillScript ? [fillScript] : [];
            }

            BrowserApi.tabSendMessage(tab, {
                command: 'fillForm',
                fillScripts: fillScripts,
                url: tab.url,
                frameId: pd.frameId,
            }, { frameId: pd.frameId });

            if (!fillScript) { return; }

            if (options.cipher.type !== CipherType.Login || totpPromise || !options.cipher.login.totp ||
                (!canAccessPremium && !options.cipher.organizationUseTotp)) {
                return;
            }

            totpPromise = this.totpService.isAutoCopyEnabled().then(enabled => {
                if (enabled) {
                    return this.totpService.getCode(options.cipher.login.totp);
                }
                return null;
            });
        });

        if (didAutofill) {
            this.eventService.collect(EventType.Cipher_ClientAutofilled, options.cipher.id);
            if (totpPromise != null) {
                return await totpPromise;
            } else {
                return null;
            }
        } else {
            throw new Error('Did not auto-fill.');
        }
    }

    async doAutoFillActiveTab(pageDetails: any, fromCommand: boolean) {
        let tab = await this.getActiveTab();
        let cipher: CipherView;
        /*
        @override by Cozy : when the user logins into the addon, all tabs request a pageDetail in order to
        activate the in-page-menu :
            * then the tab to take into account is not the active tab, but the tab sent with the pageDetails
            * and if there is no cipher for the tab, then request to close in page menu
        */
        let hasFieldsForInPageMenu = false;
        if (pageDetails[0].sender === 'notifBarForInPageMenu') {
            cipher = await this.cipherService.getLastUsedForUrl(tab.url, false);
            let r = 0;
            pageDetails[0].fieldsForInPageMenuScripts.forEach( (s: any) => r += s.script.length);
            hasFieldsForInPageMenu = r > 0;
            tab = pageDetails[0].tab;
            if (!cipher && !hasFieldsForInPageMenu) {
                // there is no cipher for this URL : deactivate in page menu
                BrowserApi.tabSendMessage(
                    tab,
                    {
                        command   : 'autofillAnswerRequest',
                        subcommand: 'inPageMenuDeactivate' ,
                        frameId   : pageDetails[0].frameId ,
                    },
                    {
                        frameId: pageDetails[0].frameId,
                    },
                );
                return;
            }
        } else {
            if (!tab || !tab.url) {
                return;
            }
            if (fromCommand) {
                cipher = await this.cipherService.getNextCipherForUrl(tab.url);
            } else {
                const lastLaunchedCipher = await this.cipherService.getLastLaunchedForUrl(tab.url, true);
                if (lastLaunchedCipher && Date.now().valueOf() - lastLaunchedCipher.localData?.lastLaunched?.valueOf() < 30000) {
                    cipher = lastLaunchedCipher;
                }
                else {
                    cipher = await this.cipherService.getLastUsedForUrl(tab.url, true);
                }
            }
        }
        if (cipher == null && !hasFieldsForInPageMenu) {
            return null;
        }
        /* END @override by Cozy */
        const totpCode = await this.doAutoFill({
            cipher: cipher,
            tab : tab,
            pageDetails: pageDetails,
            skipLastUsed: !fromCommand,
            skipUsernameOnlyFill: !fromCommand,
            onlyEmptyFields: !fromCommand,
            onlyVisibleFields: !fromCommand,
            fillNewPassword: fromCommand,
            fieldsForInPageMenuScripts: pageDetails[0].fieldsForInPageMenuScripts,
        });

        // Update last used index as autofill has succeed
        if (fromCommand) {
            this.cipherService.updateLastUsedIndexForUrl(tab.url);
        }

        return totpCode;
    }

    /* ----------------------------------------------------------------------------- */
    // Select in pageDetails the inputs where the inPageMenu (login or autofill)
    // should be displayed.
    // The selection creteria here a the one common to both login and autofill menu.
    // Add prefilters and postFilters depending on the type of menu.
    async generateFieldsForInPageMenuScripts(pageDetails: any, connected: boolean) {

        if (!pageDetails ) {
            return null;
        }

        const scriptForFieldsMenu: any[] = [];

        /*
        Info : for the data structure of ciphers, logins, cards, identities... go there :
            * cipher   : jslib\src\models\data\cipherData.ts
            * login    : jslib\src\models\data\loginData.ts
            * card     : jslib\src\models\data\cardData.ts
            * identity : jslib\src\models\data\identityData.ts
            * ...
        */

        // A] Prepare the model of cipher (wiht a card, identity and login)
        const cipherModel = JSON.parse(`{
            "id": "b9a67ec355b1e5bbe672d6632955bd31",
            "organizationId": null,
            "folderId": null,
            "name": "bbox - Verdon - box",
            "notes": "dd",
            "type": 1,
            "favorite": false,
            "organizationUseTotp": false,
            "edit": true,
            "viewPassword": true,
            "login": {
              "username": "login_username_admin",
              "password": "login_pwd_1234",
              "passwordRevisionDate": null,
              "totp": null,
              "uris": [
                 {
                    "match": null,
                    "uri": "http://gestionbbox.lan/",
                    "domain": "gestionbbox.lan",
                    "hostname": "gestionbbox.lan",
                    "host": null,
                    "canLaunch": null
                 }
              ]
            },
            "identity": {
                "title": "M.",
                "middleName": "Thim",
                "address1": "13, rue de Verdon, 93100 Lyon",
                "address2": "adress ligne 2",
                "address3": "adress ligne 3",
                "city": "Lyon",
                "state": null,
                "postalCode": "93100",
                "country": "France",
                "company": "Cozy Cloud",
                "email": "mail@dude.com",
                "phone": "+33606205636",
                "ssn": "1 78 12 77 010 065   -   13",
                "username": "identity_username_jojo",
                "passportNumber": "21343245",
                "licenseNumber": "678678678",
                "firstName": "identity_firstName",
                "lastName": "identity_lastName",
                "subTitle": "Josh SMITH"
            },
            "card": {
                "cardholderName": "SMITH",
                "expMonth": "6",
                "expYear": "2028",
                "code": "346",
                "brand": "Mastercard",
                "number": "5581692893367425",
                "subTitle": "Mastercard, *7425"
            },
            "secureNote": {
              "type": null
            },
            "attachments": null,
            "fields": [
              {
                 "name": "Clé Wifi SSID : benbox",
                 "value": "4567",
                 "type": 0,
                 "newField": false
              }
            ],
            "passwordHistory": null,
            "collectionIds": null,
            "revisionDate": "2020-09-07T13:32:53.543Z",
            "deletedDate": null,
            "localData": null
        }`);

        const options = {
           skipUsernameOnlyFill: false,
           onlyEmptyFields     : false,
           onlyVisibleFields   : false,
           cipher              : cipherModel,
        };

        // B1] pre filter the fields into which a login menu should be inserted
        // (field of search forms, field outside any form, include even not viewable fields )
        this.prepareFieldsForInPageMenu(pageDetails);

        // B2] if connected, check if there are ciphers
        let hasIdentities: boolean = false;
        let hasLogins: boolean     = false;
        let hasCards: boolean      = false;
        if (connected) {
            const allCiphers = await this.cipherService.getAllDecrypted();
            for (const cipher of allCiphers) {
                if (cipher.isDeleted) { continue; }
                hasCards      = hasCards      || (cipher.type === CipherType.Card    );
                hasLogins     = hasLogins     || (cipher.type === CipherType.Login   );
                hasIdentities = hasIdentities || (cipher.type === CipherType.Identity);
                if (hasCards && hasLogins && hasIdentities) { break; }
            }
        } else {
            hasIdentities = true;
            hasLogins     = true;
            hasCards      = true;
        }

        // C] generate a standard login fillscript for the generic cipher
        if (hasLogins) {
            let loginLoginMenuFillScript: any = [];
            const loginFS = new AutofillScript(pageDetails.documentUUID);
            const loginFilledFields: { [id: string]: AutofillField; } = {};
            loginLoginMenuFillScript    =
            this.generateLoginFillScript(loginFS, pageDetails, loginFilledFields, options);
            loginLoginMenuFillScript.type   = 'loginFieldsForInPageMenuScript';
            loginLoginMenuFillScript.script = loginLoginMenuFillScript.script.filter((action: any) => {
                // only 'fill_by_opid' are relevant for the fields wher to add a menu
                if (action[0] !== 'fill_by_opid') { return false; }
                action[0] = 'add_menu_btn_by_opid';
                action[3].hasLoginCipher = true;
                action[3].connected = connected;
                return true;
            });
            scriptForFieldsMenu.push(loginLoginMenuFillScript);
        }

        // D] generate a standard card fillscript for the generic cipher
        if (hasCards) {
            let cardLoginMenuFillScript: any = [];
            const cardFS = new AutofillScript(pageDetails.documentUUID);
            const cardFilledFields: { [id: string]: AutofillField; } = {};
            cardLoginMenuFillScript     =
            this.generateCardFillScript(cardFS, pageDetails, cardFilledFields, options);
            cardLoginMenuFillScript.type   = 'cardFieldsForInPageMenuScript';
            cardLoginMenuFillScript.script = cardLoginMenuFillScript.script.filter((action: any) => {
                // only 'fill_by_opid' are relevant for the fields wher to add a menu
                if (action[0] !== 'fill_by_opid') { return false; }
                action[0] = 'add_menu_btn_by_opid';
                action[3].hasCardCipher = true;
                action[3].connected = connected;
                return true;
            });
            scriptForFieldsMenu.push(cardLoginMenuFillScript);
        }

        // E] generate a standard identity fillscript for the generic cipher
        if (hasIdentities) {
            let identityLoginMenuFillScript: any = [];
            const idFS = new AutofillScript(pageDetails.documentUUID);
            const idFilledFields: { [id: string]: AutofillField; } = {};
            identityLoginMenuFillScript =
            this.generateIdentityFillScript(idFS, pageDetails, idFilledFields, options);
            identityLoginMenuFillScript.type   = 'identityFieldsForInPageMenuScript';
            identityLoginMenuFillScript.script = identityLoginMenuFillScript.script.filter((action: any) => {
                // only 'fill_by_opid' are relevant for the fields wher to add a menu
                if (action[0] !== 'fill_by_opid') { return false; }
                action[0] = 'add_menu_btn_by_opid';
                action[3].hasIdentityCipher = true;
                action[3].connected = connected;
                return true;
            });
            scriptForFieldsMenu.push(identityLoginMenuFillScript);
        }

        return scriptForFieldsMenu;
    }

    /* ----------------------------------------------------------------------------- */
    // Enrich fields of a page detail so that proper filters can be applied  for
    // the login menu.
    // Information added :
    //     * isInForm
    //     * isInSearchForm :
    //           fields into a form which look like a search form.
    //           a form is a "search form" if any of its attibutes includes some keywords such as 'search'
    //     * isInLoginForm :
    //           fields into a form which look like a login form.
    //           a form is a "login form" if any of its attibutes includes some keywords such as 'login'
    //
    prepareFieldsForInPageMenu(pageDetails: any) {
        // enrich each fields
        pageDetails.fields.forEach((field: any) => {
            // 1- test if the forms into the page might be a search, a login or a signup form
            field.isInSearchForm = field.form ?
                this.isSpecificElementHelper(
                    pageDetails.forms[field.form],
                    ['search', 'recherche'],
                    ['htmlClass', 'htmlAction', 'htmlMethod', 'htmlID'],
                )
                : false;
            field.isInloginForm  = field.form ?
                this.isSpecificElementHelper(
                    pageDetails.forms[field.form],
                    ['login', 'signin'],
                    ['htmlAction', 'htmlID'],
                )
                : false;
            field.isInSignupForm  = field.form ?
                this.isSpecificElementHelper(
                    pageDetails.forms[field.form],
                    ['signup', 'register'],
                    ['htmlAction', 'htmlID'],
                )
                : false;
            field.isInForm = !! field.form;
            field.formObj = pageDetails.forms[field.form];
            // force to true the viewable property so that the BW process doesn't take this parameter into
            // account for the menu scripts. Original value must be restored afterwhat.
            field.viewableOri = field.viewable;
            field.viewable = true;
        });

    }

    /* -------------------------------------------------------------------------------- */
    // Test is an element (field or form) contains specific markers
    isSpecificElementHelper(element: string, markers: any, attributesToCheck: any) {
        for (const attr of attributesToCheck) {
            if (!element.hasOwnProperty(attr) || !element[attr] ) { continue; }
            if (this.isFieldMatch(element[attr], markers)) {
                return true;
            }
        }
        return false;
    }

    /* -------------------------------------------------------------------------------- */
    // Test if a field might correspond to a one time password
    isOtpField(field: any) {
        return this.isSpecificElementHelper(field, ['otp'], ['htmlName', 'htmlID']);
    }

    /* -------------------------------------------------------------------------------- */
    // Filter scripts on different rules to limit the inputs where to add the loginMenu
    postFilterFieldsForInPageMenu(scriptObjs: any, forms: any, fields: any) {
        let actions: any = [];
        scriptObjs.forEach( (scriptObj: any) => { actions = actions.concat(scriptObj.script); });
        // prepare decision array for each action
        for (const action of actions) {
            // count how many actions are linked to a field which are in the same form
            // and are identified to the same cipher.type
            const scriptContext: any = action[3];
            const fieldForm: string = scriptContext.field.form;
            const cipherType: string = scriptContext.cipher.type;
            let nFellows: number = 1;
            for (const a of actions) {
                if (   a[3].field.form  === fieldForm
                    && a[3].cipher.type === cipherType
                    && a[1] !== action[1]
                ) { nFellows += 1; }
            }
            switch (scriptContext.cipher.type) {
                case 'login':
                    scriptContext.loginFellows = nFellows;
                    break;
                case 'card':
                    scriptContext.cardFellows = nFellows;
                    break;
                case 'identity':
                    scriptContext.identityFellows = nFellows;
                    break;
                default:
                    break;
            }
            // check if the field is associated to an ambiguous attribute of a cipher
            const ambiguity = attributesAmbiguity[scriptContext.cipher.type][scriptContext.cipher.fieldType];
            scriptContext.ambiguity = ambiguity ? ambiguity : 0; // custom fields are not ambiguous
            // prepare decision array used to decide if the script should be run for this field
            const decisionArray = {
                connected            : scriptContext.connected            ,
                hasExistingCipher    : scriptContext.hasExistingCipher    ,
                hasLoginCipher       : scriptContext.hasLoginCipher       ,
                hasCardCipher        : scriptContext.hasCardCipher        ,
                hasIdentityCipher    : scriptContext.hasIdentityCipher    ,
                ambiguity            : scriptContext.ambiguity            ,
                loginFellows         : scriptContext.loginFellows         ,
                cardFellows          : scriptContext.cardFellows          ,
                identityFellows      : scriptContext.identityFellows      ,
                field_isInForm       : scriptContext.field.isInForm       ,
                field_isInSearchForm : scriptContext.field.isInSearchForm ,
                field_isInloginForm  : scriptContext.field.isInloginForm  ,
                field_isInSignupForm : scriptContext.field.isInSignupForm  ,
                hasMultipleScript    : scriptContext.hasMultipleScript    ,
                field_visible        : scriptContext.field.visible        ,
                field_viewable       : scriptContext.field.viewableOri    , // use the original value
            };
            scriptContext.decisionArray = decisionArray;
        }
        // filter according to decisionArray
        scriptObjs.forEach( (scriptObj: any) => {
            scriptObj.script = scriptObj.script.filter((action: any) => {
                if (!this.evaluateDecisionArray(action)) {
                    // @override by Cozy : this log is required for debug and analysis
                    // const fieldStr = `${action[1]}, ${action[3].cipher.type}:${action[3].cipher.fieldType}`
                    // console.log("!! ELIMINATE menu for field", {
                    //     action: fieldStr,
                    //     field: action[3].field,
                    //     cipher: action[3].cipher,
                    //     form: action[3].field.formObj,
                    // });
                    // console.log({a_field: fieldStr, ...action[3].decisionArray});

                    return false; // remove unwanted action
                }
                // @override by Cozy : this log is required for debug and analysis
                // const fieldStr = `${action[1]}, ${action[3].cipher.type}:${action[3].cipher.fieldType}`
                // console.log("ACTIVATE menu for field", {
                //     action: `${action[1]}, ${action[3].cipher.type}:${action[3].cipher.fieldType}`,
                //     field: action[3].field,
                //     cipher: action[3].cipher,
                //     form: action[3].field.formObj,
                // });
                // console.log({a_field: fieldStr, ...action[3].decisionArray});

                // finalise the action to send to autofill.js
                const scriptCipher = action[3].cipher;
                const fieldTypeToSend: any = {};
                fieldTypeToSend[scriptCipher.type] = scriptCipher.fieldType;
                if (scriptCipher.fieldFormat) {
                    fieldTypeToSend.fieldFormat = scriptCipher.fieldFormat;
                }
                action[3] =  fieldTypeToSend;
                return true;
            });
        });

        // in the end, restore the modified fields' attributes so that the BW process continues without modifications
        fields.forEach( (f: any) => {
            f.viewable = f.viewableOri;
        });
    }

    // Helpers

    // Evaluate if a decision array is valid to activate a menu for the field in the page.
    private evaluateDecisionArray(action: any) {
        const da = action[3].decisionArray;
        // selection conditions
        if (da.hasExistingCipher === true && da.field_isInForm === true && da.field_isInSearchForm === false) {
            return true; }
        if (da.field_isInSearchForm === true) {return false; }
        if (da.connected === true && da.hasExistingCipher === true && da.loginFellows  > 1
            && da.field_visible === true) {return true; }
        if (da.cardFellows  > 1 && da.field_isInForm === true) {return true; }
        if (da.connected === true && da.hasIdentityCipher === true && da.identityFellows  > 1
            && da.field_visible === true) {return true; }
        if (da.connected === false && da.loginFellows === 2) {return true; }
        if (da.connected === false && da.hasLoginCipher === true && da.field_isInloginForm === true) {return true; }
        if (da.connected === false && da.hasLoginCipher === true && da.field_isInSignupForm === true) {return true; }
        if (da.connected === false && da.cardFellows  > 1 && da.field_isInForm === true) {return true; }
        if (da.ambiguity === 0 && da.identityFellows  > 0 && da.field_isInForm === true) {return true; }
        if (da.ambiguity === 1 && da.identityFellows  > 1 && da.field_isInForm === true) {return true; }
        if (da.connected === true && da.hasExistingCipher === undefined && da.hasLoginCipher === true) {return false; }

        // end selection conditions
        return false;
    }

    private async getActiveTab(): Promise<any> {
        const tab = await BrowserApi.getTabFromCurrentWindow();
        if (!tab) {
            throw new Error('No tab found.');
        }

        return tab;
    }

    private generateFillScript(pageDetails: AutofillPageDetails, options: any): AutofillScript {
        if (!pageDetails || !options.cipher) {
            return null;
        }

        let fillScript = new AutofillScript(pageDetails.documentUUID);
        const filledFields: { [id: string]: AutofillField; } = {};
        const fields = options.cipher.fields;

        if (fields && fields.length) {
            const fieldNames: string[] = [];

            fields.forEach((f: any) => {
                if (this.hasValue(f.name)) {
                    fieldNames.push(f.name.toLowerCase());
                }
            });

            pageDetails.fields.forEach((field: any) => {
                if (filledFields.hasOwnProperty(field.opid) || !field.viewable) {
                    return;
                }

                const matchingIndex = this.findMatchingFieldIndex(field, fieldNames);
                if (matchingIndex > -1) {
                    let val = fields[matchingIndex].value;
                    if (val == null && fields[matchingIndex].type === FieldType.Boolean) {
                        val = 'false';
                    }

                    filledFields[field.opid] = field;
                    let cipher: any;
                    switch (options.cipher.type) {
                        case CipherType.Login:
                            cipher = {type: 'login', fieldType: 'customField'};
                            break;
                        case CipherType.Card:
                            cipher = {type: 'card', fieldType: 'customField'};
                            break;
                        case CipherType.Identity:
                            field.fieldType = 'customField';
                            cipher = {type: 'identity', fieldType: 'customField'};
                            break;
                    }
                    this.fillByOpid(fillScript, field, val, cipher);
                }
            });
        }

        switch (options.cipher.type) {
            case CipherType.Login:
                fillScript = this.generateLoginFillScript(fillScript, pageDetails, filledFields, options);
                break;
            case CipherType.Card:
                fillScript = this.generateCardFillScript(fillScript, pageDetails, filledFields, options);
                break;
            case CipherType.Identity:
                fillScript = this.generateIdentityFillScript(fillScript, pageDetails, filledFields, options);
                break;
            default:
                return null;
        }

        return fillScript;
    }

    private generateLoginFillScript(fillScript: AutofillScript, pageDetails: any,
        filledFields: { [id: string]: AutofillField; }, options: any): AutofillScript {

        if (!options.cipher.login) {
            return null;
        }

        let passwords: AutofillField[] = [];
        let   usernames: AutofillField[] = [];
        let pf: AutofillField = null;
        let username: AutofillField = null;
        const login = options.cipher.login;

        if (!login.password || login.password === '') {
            // No password for this login. Maybe they just wanted to auto-fill some custom fields?
            fillScript = this.setFillScriptForFocus(filledFields, fillScript);
            return fillScript;
        }

        let passwordFields = this.loadPasswordFields(pageDetails, false, false, options.onlyEmptyFields,
            options.fillNewPassword);
        if (!passwordFields.length && !options.onlyVisibleFields) {
            // not able to find any viewable password fields. maybe there are some "hidden" ones?
            passwordFields = this.loadPasswordFields(pageDetails, true, true, options.onlyEmptyFields,
                options.fillNewPassword);
        }

        for (const formKey in pageDetails.forms) { // tslint:disable-line
            if (!pageDetails.forms.hasOwnProperty(formKey)) {
                continue;
            }

            const passwordFieldsForForm: AutofillField[] = [];
            passwordFields.forEach(passField => {
                if (formKey === passField.form) {
                    passwordFieldsForForm.push(passField);
                }
            });

            passwordFields.forEach(passField => {
                pf = passField;
                passwords.push(pf);

                if (login.username) {
                    username = this.findUsernameField(pageDetails, pf, false, false, false);

                    if (!username && !options.onlyVisibleFields) {
                        // not able to find any viewable username fields. maybe there are some "hidden" ones?
                        username = this.findUsernameField(pageDetails, pf, true, true, false);
                    }

                    if (username) {
                        usernames.push(username);
                    }
                }
            });
        }

        if (passwordFields.length && !passwords.length) {
            // The page does not have any forms with password fields. Use the first password field on the page and the
            // input field just before it as the username.
            pf = passwordFields[0];
            passwords.push(pf);

            if (login.username && pf.elementNumber > 0) {
                username = this.findUsernameField(pageDetails, pf, false, false, true);

                if (!username && !options.onlyVisibleFields) {
                    // not able to find any viewable username fields. maybe there are some "hidden" ones?
                    username = this.findUsernameField(pageDetails, pf, true, true, true);
                }

                if (username) {
                    usernames.push(username);
                }
            }
        }

        if (!passwordFields.length && !options.skipUsernameOnlyFill) {
            // No password fields on this page. Let's try to just fuzzy fill the username.
            pageDetails.fields.forEach((f: any) => {
                if (f.viewable && (f.type === 'text' || f.type === 'email' || f.type === 'tel') &&
                    this.fieldIsFuzzyMatch(f, UsernameFieldNames)) {
                    usernames.push(f);
                }
            });
        }

        // @override by Cozy : remove otp fields
        usernames = usernames.filter(field => {
            return !this.isOtpField(field);
        });
        passwords = passwords.filter(field => {
            return !this.isOtpField(field);
        });
        // end @override by Cozy

        usernames.forEach(u => {
            if (filledFields.hasOwnProperty(u.opid)) {
                return;
            }
            filledFields[u.opid] = u;
            const cipher = {type: 'login', fieldType: 'username'};
            this.fillByOpid(fillScript, u, login.username, cipher);
        });

        passwords.forEach(p => {
            if (filledFields.hasOwnProperty(p.opid)) {
                return;
            }
            filledFields[p.opid] = p;
            const cipher = {type: 'login', fieldType: 'password'};
            this.fillByOpid(fillScript, p, login.password, cipher);
        });

        fillScript = this.setFillScriptForFocus(filledFields, fillScript);

        return fillScript;
    }

    private generateCardFillScript(fillScript: AutofillScript, pageDetails: any,
        filledFields: { [id: string]: AutofillField; }, options: any): AutofillScript {
        if (!options.cipher.card) {
            return null;
        }

        const fillFields: { [id: string]: AutofillField; } = {};

        pageDetails.fields.forEach((f: any) => {
            if (this.isExcludedType(f.type, ExcludedAutofillTypes)) {
                return;
            }

            for (let i = 0; i < CardAttributes.length; i++) {
                const attr = CardAttributes[i];
                if (!f.hasOwnProperty(attr) || !f[attr] || !f.viewable) {
                    continue;
                }

                // ref https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill
                // ref https://developers.google.com/web/fundamentals/design-and-ux/input/forms/
                if (!fillFields.cardholderName && this.isFieldMatch(f[attr],
                    ['cc-name', 'card-name', 'cardholder-name', 'cardholder', 'card-owner', 'name', 'nom'],
                    ['cc-name', 'card-name', 'cardholder-name', 'cardholder', 'card-owner', 'tbName'])) {
                    fillFields.cardholderName = f;
                    break;
                } else if (!fillFields.number && this.isFieldMatch(f[attr],
                    ['cc-number', 'cc-num', 'card-number', 'card-num', 'number', 'cc', 'cc-no', 'card-no',
                        'credit-card', 'numero-carte', 'carte', 'carte-credit', 'num-carte', 'cb-num'],
                    ['cc-number', 'cc-num', 'card-number', 'card-num', 'cc-no', 'card-no', 'numero-carte',
                        'num-carte', 'cb-num'])) {
                    fillFields.number = f;
                    break;
                } else if (!fillFields.exp && this.isFieldMatch(f[attr],
                    ['cc-exp', 'card-exp', 'cc-expiration', 'card-expiration', 'cc-ex', 'card-ex',
                        'card-expire', 'card-expiry', 'validite', 'expiration', 'expiry', 'mm-yy',
                        'mm-yyyy', 'yy-mm', 'yyyy-mm', 'expiration-date', 'payment-card-expiration',
                        'payment-cc-date'],
                    ['mm-yy', 'mm-yyyy', 'yy-mm', 'yyyy-mm', 'expiration-date',
                        'payment-card-expiration'])) {
                    fillFields.exp = f;
                    break;
                } else if (!fillFields.expMonth && this.isFieldMatch(f[attr],
                    ['exp-month', 'cc-exp-month', 'cc-month', 'card-month', 'cc-mo', 'card-mo', 'exp-mo',
                        'card-exp-mo', 'cc-exp-mo', 'card-expiration-month', 'expiration-month',
                        'cc-mm', 'cc-m', 'card-mm', 'card-m', 'card-exp-mm', 'cc-exp-mm', 'exp-mm', 'exp-m',
                        'expire-month', 'expire-mo', 'expiry-month', 'expiry-mo', 'card-expire-month',
                        'card-expire-mo', 'card-expiry-month', 'card-expiry-mo', 'mois-validite',
                        'mois-expiration', 'm-validite', 'm-expiration', 'expiry-date-field-month',
                        'expiration-date-month', 'expiration-date-mm', 'exp-mon', 'validity-mo',
                        'exp-date-mo', 'cb-date-mois', 'date-m'])) {
                    fillFields.expMonth = f;
                    break;
                } else if (!fillFields.expYear && this.isFieldMatch(f[attr],
                    ['exp-year', 'cc-exp-year', 'cc-year', 'card-year', 'cc-yr', 'card-yr', 'exp-yr',
                        'card-exp-yr', 'cc-exp-yr', 'card-expiration-year', 'expiration-year',
                        'cc-yy', 'cc-y', 'card-yy', 'card-y', 'card-exp-yy', 'cc-exp-yy', 'exp-yy', 'exp-y',
                        'cc-yyyy', 'card-yyyy', 'card-exp-yyyy', 'cc-exp-yyyy', 'expire-year', 'expire-yr',
                        'expiry-year', 'expiry-yr', 'card-expire-year', 'card-expire-yr', 'card-expiry-year',
                        'card-expiry-yr', 'an-validite', 'an-expiration', 'annee-validite',
                        'annee-expiration', 'expiry-date-field-year', 'expiration-date-year', 'cb-date-ann',
                        'expiration-date-yy', 'expiration-date-yyyy', 'validity-year', 'exp-date-year', 'date-y'])) {
                    fillFields.expYear = f;
                    break;
                } else if (!fillFields.code && this.isFieldMatch(f[attr],
                    ['cvv', 'cvc', 'cvv2', 'cc-csc', 'cc-cvv', 'card-csc', 'card-cvv', 'cvd', 'cid', 'cvc2',
                        'cnv', 'cvn2', 'cc-code', 'card-code', 'code-securite', 'security-code', 'crypto',
                        'card-verif', 'verification-code', 'csc', 'ccv'])) {
                    fillFields.code = f;
                    break;
                } else if (!fillFields.brand && this.isFieldMatch(f[attr],
                    ['cc-type', 'card-type', 'card-brand', 'cc-brand', 'cb-type'])) {
                    fillFields.brand = f;
                    break;
                }
            }
        });

        const card = options.cipher.card;
        this.makeScriptAction(fillScript, card, fillFields, filledFields, 'cardholderName', 'card');
        this.makeScriptAction(fillScript, card, fillFields, filledFields, 'number'        , 'card');
        this.makeScriptAction(fillScript, card, fillFields, filledFields, 'code'          , 'card');
        this.makeScriptAction(fillScript, card, fillFields, filledFields, 'brand'         , 'card');

        if (fillFields.expMonth && this.hasValue(card.expMonth)) {
            let expMonth: string = card.expMonth;

            if (fillFields.expMonth.selectInfo && fillFields.expMonth.selectInfo.options) {
                let index: number = null;
                const siOptions = fillFields.expMonth.selectInfo.options;
                if (siOptions.length === 12) {
                    index = parseInt(card.expMonth, null) - 1;
                } else if (siOptions.length === 13) {
                    if (siOptions[0][0] != null && siOptions[0][0] !== '' &&
                        (siOptions[12][0] == null || siOptions[12][0] === '')) {
                        index = parseInt(card.expMonth, null) - 1;
                    } else {
                        index = parseInt(card.expMonth, null);
                    }
                }

                if (index != null) {
                    const option = siOptions[index];
                    if (option.length > 1) {
                        expMonth = option[1];
                    }
                }
            } else if ((this.fieldAttrsContain(fillFields.expMonth, 'mm') || fillFields.expMonth.maxLength === 2)
                && expMonth.length === 1) {
                expMonth = '0' + expMonth;
            }

            filledFields[fillFields.expMonth.opid] = fillFields.expMonth;
            const cipher = {type: 'card', fieldType: 'expMonth'};
            this.fillByOpid(fillScript, fillFields.expMonth, expMonth, cipher);
        }

        if (fillFields.expYear && this.hasValue(card.expYear)) {
            let expYear: string = card.expYear;
            if (fillFields.expYear.selectInfo && fillFields.expYear.selectInfo.options) {
                for (let i = 0; i < fillFields.expYear.selectInfo.options.length; i++) {
                    const o: [string, string] = fillFields.expYear.selectInfo.options[i];
                    if (o[0] === card.expYear || o[1] === card.expYear) {
                        expYear = o[1];
                        break;
                    }
                    if (o[1].length === 2 && card.expYear.length === 4 && o[1] === card.expYear.substring(2)) {
                        expYear = o[1];
                        break;
                    }
                    const colonIndex = o[1].indexOf(':');
                    if (colonIndex > -1 && o[1].length > colonIndex + 1) {
                        const val = o[1].substring(colonIndex + 2);
                        if (val != null && val.trim() !== '' && val === card.expYear) {
                            expYear = o[1];
                            break;
                        }
                    }
                }
            } else if (this.fieldAttrsContain(fillFields.expYear, 'yyyy') || fillFields.expYear.maxLength === 4) {
                if (expYear.length === 2) {
                    expYear = '20' + expYear;
                }
            } else if (this.fieldAttrsContain(fillFields.expYear, 'yy') || fillFields.expYear.maxLength === 2) {
                if (expYear.length === 4) {
                    expYear = expYear.substr(2);
                }
            }

            filledFields[fillFields.expYear.opid] = fillFields.expYear;
            const cipher = {type: 'card', fieldType: 'expYear'};
            this.fillByOpid(fillScript, fillFields.expYear, expYear, cipher);
        }

        if (fillFields.exp && this.hasValue(card.expMonth) && this.hasValue(card.expYear)) {
            const fullMonth = ('0' + card.expMonth).slice(-2);

            let fullYear: string = card.expYear;
            let partYear: string = null;
            if (fullYear.length === 2) {
                partYear = fullYear;
                fullYear = '20' + fullYear;
            } else if (fullYear.length === 4) {
                partYear = fullYear.substr(2, 2);
            }

            let exp: string = null;
            let format: any;
            for (let i = 0; i < MonthAbbr.length; i++) {
                if (this.fieldAttrsContain(fillFields.exp, MonthAbbr[i] + '/' + YearAbbrLong[i])) {
                    exp = fullMonth + '/' + fullYear;
                    format = {type: 'expDate', separator: '/', isFullYear: true, isMonthFirst: true};
                } else if (this.fieldAttrsContain(fillFields.exp, MonthAbbr[i] + '/' + YearAbbrShort[i]) &&
                    partYear != null) {
                    exp = fullMonth + '/' + partYear;
                    format = {type: 'expDate', separator: '/', isFullYear: false, isMonthFirst: true};
                } else if (this.fieldAttrsContain(fillFields.exp, YearAbbrLong[i]  + '/' + MonthAbbr[i])) {
                    exp = fullYear + '/' + fullMonth;
                    format = {type: 'expDate', separator: '/', isFullYear: true, isMonthFirst: false};
                } else if (this.fieldAttrsContain(fillFields.exp, YearAbbrShort[i] + '/' + MonthAbbr[i]) &&
                    partYear != null) {
                    exp = partYear + '/' + fullMonth;
                    format = {type: 'expDate', separator: '/', isFullYear: false, isMonthFirst: false};
                } else if (this.fieldAttrsContain(fillFields.exp, MonthAbbr[i] + '-' + YearAbbrLong[i])) {
                    exp = fullMonth + '-' + fullYear;
                    format = {type: 'expDate', separator: '-', isFullYear: true, isMonthFirst: true};
                } else if (this.fieldAttrsContain(fillFields.exp, MonthAbbr[i] + '-' + YearAbbrShort[i]) &&
                    partYear != null) {
                    exp = fullMonth + '-' + partYear;
                    format = {type: 'expDate', separator: '-', isFullYear: false, isMonthFirst: true};
                } else if (this.fieldAttrsContain(fillFields.exp, YearAbbrLong[i]  + '-' + MonthAbbr[i])) {
                    exp = fullYear + '-' + fullMonth;
                    format = {type: 'expDate', separator: '-', isFullYear: true, isMonthFirst: false};
                } else if (this.fieldAttrsContain(fillFields.exp, YearAbbrShort[i] + '-' + MonthAbbr[i]) &&
                    partYear != null) {
                    exp = partYear + '-' + fullMonth;
                    format = {type: 'expDate', separator: '-', isFullYear: false, isMonthFirst: false};
                } else if (this.fieldAttrsContain(fillFields.exp, YearAbbrLong[i] + MonthAbbr[i])) {
                    exp = fullYear + fullMonth;
                    format = {type: 'expDate', separator: '', isFullYear: true, isMonthFirst: false};
                } else if (this.fieldAttrsContain(fillFields.exp, YearAbbrShort[i] + MonthAbbr[i]) &&
                    partYear != null) {
                    exp = partYear + fullMonth;
                    format = {type: 'expDate', separator: '', isFullYear: false, isMonthFirst: false};
                } else if (this.fieldAttrsContain(fillFields.exp, MonthAbbr[i] + YearAbbrLong[i])) {
                    exp = fullMonth + fullYear;
                    format = {type: 'expDate', separator: '', isFullYear: true, isMonthFirst: true};
                } else if (this.fieldAttrsContain(fillFields.exp, MonthAbbr[i] + YearAbbrShort[i]) &&
                    partYear != null) {
                    exp = fullMonth + partYear;
                    format = {type: 'expDate', separator: '', isFullYear: false, isMonthFirst: true};
                }

                if (exp != null) {
                    break;
                }
            }

            if (exp == null) {
                exp = fullYear + '-' + fullMonth;
                format = {type: 'expDate', separator: '/', isFullYear: true, isMonthFirst: true};
            }

            this.makeScriptActionWithValue(
                fillScript,
                exp,
                fillFields.exp,
                filledFields,
                {
                    type: 'card',
                    fieldType: 'expiration',
                    fieldFormat: format,
                },
            );
        }
        fillScript.type = 'autofillScript';
        return fillScript;
    }

    private fieldAttrsContain(field: any, containsVal: string) {
        if (!field) {
            return false;
        }

        let doesContain = false;
        CardAttributesExtended.forEach(attr => {
            if (doesContain || !field.hasOwnProperty(attr) || !field[attr]) {
                return;
            }

            let val = field[attr];
            val = val.replace(/ /g, '').toLowerCase();
            doesContain = val.indexOf(containsVal) > -1;
        });

        return doesContain;
    }

    private generateIdentityFillScript(fillScript: AutofillScript, pageDetails: any,
        filledFields: { [id: string]: AutofillField; }, options: any): AutofillScript {
        if (!options.cipher.identity) {
            return null;
        }

        const fillFields: { [id: string]: AutofillField; } = {};

        pageDetails.fields.forEach((f: any) => {
            if (this.isExcludedType(f.type, ExcludedAutofillTypes)) {
                return;
            }

            for (let i = 0; i < IdentityAttributes.length; i++) {
                const attr = IdentityAttributes[i];
                if (!f.hasOwnProperty(attr) || !f[attr] || !f.viewable) {
                    continue;
                }

                // ref https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill
                // ref https://developers.google.com/web/fundamentals/design-and-ux/input/forms/
                if (!fillFields.name && this.isFieldMatch(f[attr],
                    ['name', 'full-name', 'your-name'],
                    ['full-name', 'your-name'])
                ) {
                    fillFields.name = f;
                    break;
                } else if (!fillFields.firstName && this.isFieldMatch(f[attr],
                    FirstnameFieldNames)) {
                    fillFields.firstName = f;
                    break;
                } else if (!fillFields.middleName && this.isFieldMatch(f[attr],
                    ['m-name', 'middle-name', 'additional-name', 'middle-initial', 'middle-n', 'middle-i'])) {
                    fillFields.middleName = f;
                    break;
                } else if (!fillFields.lastName && this.isFieldMatch(f[attr],
                    LastnameFieldNames)) {
                    fillFields.lastName = f;
                    break;
                } else if (!fillFields.title && this.isFieldMatch(f[attr],
                    ['honorific-prefix', 'prefix', 'title', 'titre'])) {
                    fillFields.title = f;
                    break;
                } else if (!fillFields.email && this.isFieldMatch(f[attr],
                    ['e-mail', 'email-address', 'courriel'])) {
                    fillFields.email = f;
                    break;
                } else if (!fillFields.address && this.isFieldMatch(f[attr],
                    ['address', 'adresse', 'street-address', 'addr', 'street', 'mailing-addr', 'billing-addr',
                        'mail-addr', 'bill-addr', 'adresse-personnelle'], ['mailing-addr', 'billing-addr', 'mail-addr',
                        'bill-addr'])) {
                    fillFields.address = f;
                    break;
                } else if (!fillFields.address1 && this.isFieldMatch(f[attr],
                    ['address-1', 'address-line-1', 'addr-1', 'street-1'])) {
                    fillFields.address1 = f;
                    break;
                } else if (!fillFields.address2 && this.isFieldMatch(f[attr],
                    ['address-2', 'address-line-2', 'addr-2', 'street-2'])) {
                    fillFields.address2 = f;
                    break;
                } else if (!fillFields.address3 && this.isFieldMatch(f[attr],
                    ['address-3', 'address-line-3', 'addr-3', 'street-3'])) {
                    fillFields.address3 = f;
                    break;
                } else if (!fillFields.postalCode && this.isFieldMatch(f[attr],
                    ['postal', 'zip', 'zip2', 'zip-code', 'postal-code', 'code-postal', 'post-code', 'address-zip',
                        'address-postal', 'address-code', 'address-postal-code', 'address-zip-code'])) {
                    fillFields.postalCode = f;
                    break;
                } else if (!fillFields.city && this.isFieldMatch(f[attr],
                    ['city', 'town', 'address-level-2', 'address-city', 'address-town', 'ville'])) {
                    fillFields.city = f;
                    break;
                } else if (!fillFields.state && this.isFieldMatch(f[attr],
                    ['state', 'province', 'provence', 'address-level-1', 'address-state',
                        'address-province'])) {
                    fillFields.state = f;
                    break;
                } else if (!fillFields.country && this.isFieldMatch(f[attr],
                    ['country', 'country-code', 'country-name', 'address-country', 'address-country-name',
                        'address-country-code', 'pays'])) {
                    fillFields.country = f;
                    break;
                } else if (!fillFields.phone && this.isFieldMatch(f[attr],
                    ['phone', 'mobile', 'mobile-phone', 'tel', 'telephone', 'phone-number', 'téléphone'])) {
                    fillFields.phone = f;
                    break;
                } else if (!fillFields.username && this.isFieldMatch(f[attr],
                    ['user-name', 'user-id', 'screen-name', 'utilisateur', 'pseudo', 'login'])) {
                    fillFields.username = f;
                    break;
                } else if (!fillFields.company && this.isFieldMatch(f[attr],
                    ['company', 'company-name', 'organization', 'organization-name', 'entreprise'])) {
                    fillFields.company = f;
                    break;
                }
            }
        });

        const identity = options.cipher.identity;
        this.makeScriptAction(fillScript, identity, fillFields, filledFields, 'title'     , 'identity');
        this.makeScriptAction(fillScript, identity, fillFields, filledFields, 'firstName' , 'identity');
        this.makeScriptAction(fillScript, identity, fillFields, filledFields, 'middleName', 'identity');
        this.makeScriptAction(fillScript, identity, fillFields, filledFields, 'lastName'  , 'identity');
        this.makeScriptAction(fillScript, identity, fillFields, filledFields, 'address1'  , 'identity');
        this.makeScriptAction(fillScript, identity, fillFields, filledFields, 'address2'  , 'identity');
        this.makeScriptAction(fillScript, identity, fillFields, filledFields, 'address3'  , 'identity');
        this.makeScriptAction(fillScript, identity, fillFields, filledFields, 'city'      , 'identity');
        this.makeScriptAction(fillScript, identity, fillFields, filledFields, 'postalCode', 'identity');
        this.makeScriptAction(fillScript, identity, fillFields, filledFields, 'company'   , 'identity');
        this.makeScriptAction(fillScript, identity, fillFields, filledFields, 'email'     , 'identity');
        this.makeScriptAction(fillScript, identity, fillFields, filledFields, 'phone'     , 'identity');
        this.makeScriptAction(fillScript, identity, fillFields, filledFields, 'username'  , 'identity');

        let filledState = false;
        if (fillFields.state && identity.state && identity.state.length > 2) {
            const stateLower = identity.state.toLowerCase();
            const isoState = IsoStates[stateLower] || IsoProvinces[stateLower];
            if (isoState) {
                filledState = true;
                const cipher = {type: 'identity', fieldType: 'state'};
                this.makeScriptActionWithValue(fillScript, isoState, fillFields.state, filledFields, cipher);
            }
        }

        if (!filledState) {
            this.makeScriptAction(fillScript, identity, fillFields, filledFields, 'state', 'identity');
        }

        let filledCountry = false;
        if (fillFields.country && identity.country && identity.country.length > 2) {
            const countryLower = identity.country.toLowerCase();
            const isoCountry = IsoCountries[countryLower];
            const cipher = {type: 'identity', fieldType: 'country'};
            if (isoCountry) {
                filledCountry = true;
                this.makeScriptActionWithValue(
                    fillScript,
                    isoCountry,
                    fillFields.country,
                    filledFields,
                    cipher,
                );
            }
        }

        if (!filledCountry) {
            this.makeScriptAction(fillScript, identity, fillFields, filledFields, 'country', 'identity');
        }

        if (fillFields.name && (identity.firstName || identity.lastName)) {
            let fullName = '';
            if (this.hasValue(identity.firstName)) {
                fullName = identity.firstName;
            }
            if (this.hasValue(identity.middleName)) {
                if (fullName !== '') {
                    fullName += ' ';
                }
                fullName += identity.middleName;
            }
            if (this.hasValue(identity.lastName)) {
                if (fullName !== '') {
                    fullName += ' ';
                }
                fullName += identity.lastName;
            }

            const cipher = {type: 'identity', fieldType: 'fullName'};
            this.makeScriptActionWithValue(fillScript, fullName, fillFields.name, filledFields, cipher);
        }

        if (fillFields.address && this.hasValue(identity.address1)) {
            let address = '';
            if (this.hasValue(identity.address1)) {
                address = identity.address1;
            }
            if (this.hasValue(identity.address2)) {
                if (address !== '') {
                    address += ', ';
                }
                address += identity.address2;
            }
            if (this.hasValue(identity.address3)) {
                if (address !== '') {
                    address += ', ';
                }
                address += identity.address3;
            }

            const cipher = {type: 'identity', fieldType: 'fullAddress'};
            this.makeScriptActionWithValue(fillScript,
                address,
                fillFields.address,
                filledFields,
                cipher,
            );
        }

        fillScript.type = 'autofillScript';
        return fillScript;
    }

    private isExcludedType(type: string, excludedTypes: string[]) {
        return excludedTypes.indexOf(type) > -1;
    }

    /*
    Test if a value matches some criteria
        * value : String : the value to test
        * options : [String] : array of strings to compare with the value.
        * containsOptions : [String] : subset of options strings : those repeated strings
            will be searched into the value
        * notes :
            * containsOptions is a subset of options ... not intuitive nor classic...
            * in the value string, all non letter and non digits caracters are removed
            * in the strings (options & containsOptions) use a `-` for spaces and all non [a-zA-Z0-9] caracters.
     */
    private isFieldMatch(value: string, options: string[], containsOptions?: string[]): boolean {
        value = value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        value = value.replace(/[^a-zA-Z0-9]+/g, '');

        /*
            @override by Cozy : don't take into account too long values :
            A long string is not coherent with the description of a form to fill. It is likely a search form where
            the element before the input ("label-left") is a select for the user to choose the category where to run
            the search.
        */
        if (value.length > 100) { return false; }
        /* end override by Cozy */

        for (let i = 0; i < options.length; i++) {
            let option = options[i];
            const checkValueContains = containsOptions == null || containsOptions.indexOf(option) > -1;
            option = option.toLowerCase().replace(/-/g, '');
            if (value === option || (checkValueContains && value.indexOf(option) > -1)) {
                return true;
            }
        }

        return false;
    }

    private makeScriptAction(
        fillScript: AutofillScript,
        cipherData: any,
        fillFields: { [id: string]: AutofillField; },
        filledFields: { [id: string]: AutofillField; },
        dataProp: string,
        cipherType: string,
    ) {
        let fieldProp: any;
        fieldProp = fieldProp || dataProp;
        const cipher = {type: cipherType, fieldType: dataProp };
        this.makeScriptActionWithValue(
            fillScript,
            cipherData[dataProp],
            fillFields[fieldProp],
            filledFields,
            cipher,
        );
    }

    private makeScriptActionWithValue(
        fillScript: AutofillScript,
        dataValue: any,
        field: AutofillField,
        filledFields: { [id: string]: AutofillField; },
        cipher: any,
    ) {

        let doFill = false;
        if (this.hasValue(dataValue) && field) {
            if (field.type === 'select-one' && field.selectInfo && field.selectInfo.options) {
                for (let i = 0; i < field.selectInfo.options.length; i++) {
                    const option = field.selectInfo.options[i];
                    for (let j = 0; j < option.length; j++) {
                        if (this.hasValue(option[j]) && option[j].toLowerCase() === dataValue.toLowerCase()) {
                            doFill = true;
                            if (option.length > 1) {
                                dataValue = option[1];
                            }
                            break;
                        }
                    }

                    if (doFill) {
                        break;
                    }
                }
            } else {
                doFill = true;
            }
        }

        if (doFill) {
            filledFields[field.opid] = field;
            this.fillByOpid(fillScript, field, dataValue, cipher);
        }
    }

    private loadPasswordFields(pageDetails: AutofillPageDetails, canBeHidden: boolean, canBeReadOnly: boolean,
        mustBeEmpty: boolean, fillNewPassword: boolean) {
        const arr: AutofillField[] = [];
        pageDetails.fields.forEach(f => {
            const isPassword = f.type === 'password';
            const valueIsLikePassword = (value: string) => {
                if (value == null) {
                    return false;
                }
                // Removes all whitespace, _ and - characters
                const cleanedValue = value.toLowerCase().replace(/[\s_\-]/g, '');

                if (cleanedValue.indexOf('password') < 0) {
                    return false;
                }

                const ignoreList = ['onetimepassword', 'captcha', 'findanything'];
                if (ignoreList.some(i => cleanedValue.indexOf(i) > -1)) {
                    return false;
                }

                return true;
            };
            const isLikePassword = () => {
                if (f.type !== 'text') {
                    return false;
                }
                if (valueIsLikePassword(f.htmlID)) {
                    return true;
                }
                if (valueIsLikePassword(f.htmlName)) {
                    return true;
                }
                if (valueIsLikePassword(f.placeholder)) {
                    return true;
                }
                return false;
            };
            if (!f.disabled && (canBeReadOnly || !f.readonly) && (isPassword || isLikePassword())
                && (canBeHidden || f.viewable) && (!mustBeEmpty || f.value == null || f.value.trim() === '')
                && (fillNewPassword || f.autoCompleteType !== 'new-password')) {
                arr.push(f);
            }
        });
        return arr;
    }

    private findUsernameField(pageDetails: AutofillPageDetails, passwordField: AutofillField, canBeHidden: boolean,
        canBeReadOnly: boolean, withoutForm: boolean) {
        let usernameField: AutofillField = null;
        for (let i = 0; i < pageDetails.fields.length; i++) {
            const f = pageDetails.fields[i];
            if (f.elementNumber >= passwordField.elementNumber) {
                break;
            }

            if (!f.disabled && (canBeReadOnly || !f.readonly) &&
                (withoutForm || f.form === passwordField.form) && (canBeHidden || f.viewable) &&
                (f.type === 'text' || f.type === 'email' || f.type === 'tel')) {
                usernameField = f;

                if (this.findMatchingFieldIndex(f, UsernameFieldNames) > -1) {
                    // We found an exact match. No need to keep looking.
                    break;
                }
            }
        }

        return usernameField;
    }

    private findMatchingFieldIndex(field: AutofillField, names: string[]): number {
        for (let i = 0; i < names.length; i++) {
            if (names[i].indexOf('=') > -1) {
                if (this.fieldPropertyIsPrefixMatch(field, 'htmlID', names[i], 'id')) {
                    return i;
                }
                if (this.fieldPropertyIsPrefixMatch(field, 'htmlName', names[i], 'name')) {
                    return i;
                }
                if (this.fieldPropertyIsPrefixMatch(field, 'label-tag', names[i], 'label')) {
                    return i;
                }
                if (this.fieldPropertyIsPrefixMatch(field, 'label-aria', names[i], 'label')) {
                    return i;
                }
                if (this.fieldPropertyIsPrefixMatch(field, 'placeholder', names[i], 'placeholder')) {
                    return i;
                }
            }

            if (this.fieldPropertyIsMatch(field, 'htmlID', names[i])) {
                return i;
            }
            if (this.fieldPropertyIsMatch(field, 'htmlName', names[i])) {
                return i;
            }
            if (this.fieldPropertyIsMatch(field, 'label-tag', names[i])) {
                return i;
            }
            if (this.fieldPropertyIsMatch(field, 'label-aria', names[i])) {
                return i;
            }
            if (this.fieldPropertyIsMatch(field, 'placeholder', names[i])) {
                return i;
            }
            if (this.fieldPropertyIsMatch(field, 'label-left', names[i])) {
                return i;
            }
        }

        return -1;
    }

    private fieldPropertyIsPrefixMatch(field: any, property: string, name: string, prefix: string,
        separator = '='): boolean {
        if (name.indexOf(prefix + separator) === 0) {
            const sepIndex = name.indexOf(separator);
            const val = name.substring(sepIndex + 1);
            return val != null && this.fieldPropertyIsMatch(field, property, val);
        }
        return false;
    }

    private fieldPropertyIsMatch(field: any, property: string, name: string): boolean {
        let fieldVal = field[property] as string;
        if (!this.hasValue(fieldVal)) {
            return false;
        }

        fieldVal = fieldVal.trim().replace(/(?:\r\n|\r|\n)/g, '');
        if (name.startsWith('regex=')) {
            try {
                const regexParts = name.split('=', 2);
                if (regexParts.length === 2) {
                    const regex = new RegExp(regexParts[1], 'i');
                    return regex.test(fieldVal);
                }
            } catch (e) { }
        } else if (name.startsWith('csv=')) {
            const csvParts = name.split('=', 2);
            if (csvParts.length === 2) {
                const csvVals = csvParts[1].split(',');
                for (let i = 0; i < csvVals.length; i++) {
                    const val = csvVals[i];
                    if (val != null && val.trim().toLowerCase() === fieldVal.toLowerCase()) {
                        return true;
                    }
                }
                return false;
            }
        }

        return fieldVal.toLowerCase() === name.toLowerCase();
    }

    private fieldIsFuzzyMatch(field: AutofillField, names: string[]): boolean {
        if (this.hasValue(field.htmlID) && this.fuzzyMatch(names, field.htmlID)) {
            return true;
        }
        if (this.hasValue(field.htmlName) && this.fuzzyMatch(names, field.htmlName)) {
            return true;
        }
        if (this.hasValue(field['label-tag']) && this.fuzzyMatch(names, field['label-tag'])) {
            return true;
        }
        if (this.hasValue(field.placeholder) && this.fuzzyMatch(names, field.placeholder)) {
            return true;
        }
        if (this.hasValue(field['label-left']) && this.fuzzyMatch(names, field['label-left'])) {
            return true;
        }
        if (this.hasValue(field['label-top']) && this.fuzzyMatch(names, field['label-top'])) {
            return true;
        }
        if (this.hasValue(field['label-aria']) && this.fuzzyMatch(names, field['label-aria'])) {
            return true;
        }

        return false;
    }

    private fuzzyMatch(options: string[], value: string): boolean {
        if (options == null || options.length === 0 || value == null || value === '') {
            return false;
        }

        value = value.replace(/(?:\r\n|\r|\n)/g, '').trim().toLowerCase();

        for (let i = 0; i < options.length; i++) {
            if (value.indexOf(options[i]) > -1) {
                return true;
            }
        }

        return false;
    }

    private hasValue(str: string): boolean {
        return str && str !== '';
    }

    private setFillScriptForFocus(filledFields: { [id: string]: AutofillField; },
        fillScript: AutofillScript): AutofillScript {
        let lastField: AutofillField = null;
        let lastPasswordField: AutofillField = null;

        for (const opid in filledFields) {
            if (filledFields.hasOwnProperty(opid) && filledFields[opid].viewable) {
                lastField = filledFields[opid];

                if (filledFields[opid].type === 'password') {
                    lastPasswordField = filledFields[opid];
                }
            }
        }

        // Prioritize password field over others.
        if (lastPasswordField) {
            fillScript.script.push(['focus_by_opid', lastPasswordField.opid]);
        } else if (lastField) {
            fillScript.script.push(['focus_by_opid', lastField.opid]);
        }

        return fillScript;
    }

    private fillByOpid(fillScript: AutofillScript, field: AutofillField, value: string, cipher: any): void {
        if (field.maxLength && value && value.length > field.maxLength) {
            value = value.substr(0, value.length);
        }
        fillScript.script.push(['click_on_opid', field.opid]);
        fillScript.script.push(['focus_by_opid', field.opid]);
        const script = ['fill_by_opid', field.opid, value, {field: field, cipher: cipher}];
        fillScript.script.push(script);
    }
}
