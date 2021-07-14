import {
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';

import { CipherType } from 'jslib-common/enums/cipherType';

import { CipherView } from 'jslib-common/models/view/cipherView';

@Component({
    selector: 'app-ciphers-list',
    templateUrl: 'ciphers-list.component.html',
})
export class CiphersListComponent {
    @Output() onSelected = new EventEmitter<CipherView>();
    @Output() launchEvent = new EventEmitter<CipherView>();
    @Output() onView = new EventEmitter<CipherView>();
    @Output() onAutofill = new EventEmitter<CipherView>();
    @Input() ciphers: CipherView[];
    @Input() showGlobe = false;
    @Input() title: string;

    cipherType = CipherType;

    selectCipher(c: CipherView) {
        this.onSelected.emit(c);
    }

    launchCipher(c: CipherView) {
        this.launchEvent.emit(c);
    }

    viewCipher(c: CipherView) {
        this.onView.emit(c);
    }

    autofill(c: CipherView) {
        this.onAutofill.emit(c);
    }

    getSubtitle(c: CipherView) {
        if (c.type === CipherType.Card) {
            return c.subTitle + ',  ' + ('0' + c.card.expMonth).slice(-2) + '/' + c.card.expYear.slice(-2) ;
        }
        return c.subTitle;
    }
}
