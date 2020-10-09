import { createPopper } from '@popperjs/core';
import LinkedList from '../scripts/doublyLinkedList';

/* =========================================================================

menuCtrler exposes an API to interact with the menus within the pages.

    menuCtrler = {
        hide()
        setHeight(integer in px)
        getCipher(id)
        setCiphers([array of ciphers])
                    isFrozen:false      ,
                    isHidden:true       ,
                    isAutoFillInited    ,
                    currentMenuType:null,
                    lastFocusedEl       ,
                    islocked            ,
                    isPinLocked         ,
        unFreeze()
        freeze()
        deactivate()
    }

========================================================================= */

var menuCtrler = {
    addMenuButton          : null,
    hide                   : null,
    setHeight              : null,
    getCipher              : null,
    setCiphers             : null,
    unFreeze               : function() {state.isFrozen = false}, // when frozen, you can't hide nor show the menu
    freeze                 : function() {state.isFrozen = true },
    deactivate             : null,
    activate               : null,
    // displayLoginIPMenu : null,  // to be removed ? BJA
}

/* --------------------------------------------------------------------- */
// GLOBALS
var menuEl,
    popperInstance,
    targetsEl = [],
    ciphers ,        // linked list of ciphers to suggest in the menu
    ciphersById,     // a dictionnari of cyphers to suggest in the menu by id : {idCipher:cipher, ...}
    state = {
        currentMenuType  :null,
        isMenuInited     :false,  // menu is not yet initiated, there is no iframe yet for the menu
        isFrozen         :false,  // when frozen, you can't hide nor show the menu
        isActivated      :true,   // false => in page butons have been removed and menu is hidden
        isHidden         :true,
        isAutoFillInited :false,  // true when iframe created and ciphers have been received in the menuCtrler
        isPinLocked      :false,
        lastFocusedEl    :null,
        selectedCipher   : null, // a cipher node of the linkedList `ciphers`
        lastHeight       : null,
    },
    menuBtnSvg = "url(\"data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2732%27%20height%3D%2732%27%20viewBox%3D%270%200%2032%2032%27%3E%0A%20%20%20%20%20%20%3Cg%20fill%3D%27none%27%20fill-rule%3D%27evenodd%27%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%2716%27%20cy%3D%2716%27%20r%3D%2716%27%20fill%3D%27%23297EF1%27%20fill-rule%3D%27nonzero%27%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cpath%20fill%3D%27%23FFF%27%20d%3D%27M19.314%2017.561a.555.555%200%200%201-.82.12%204.044%204.044%200%200%201-2.499.862%204.04%204.04%200%200%201-2.494-.86.557.557%200%200%201-.815-.12.547.547%200%200%201%20.156-.748c.214-.14.229-.421.229-.424a.555.555%200%200%201%20.176-.385.504.504%200%200%201%20.386-.145.544.544%200%200%201%20.528.553c0%20.004%200%20.153-.054.36a2.954%202.954%200%200%200%203.784-.008%201.765%201.765%200%200%201-.053-.344.546.546%200%200%201%20.536-.561h.01c.294%200%20.538.237.545.532%200%200%20.015.282.227.422a.544.544%200%200%201%20.158.746m2.322-6.369a5.94%205.94%200%200%200-1.69-3.506A5.651%205.651%200%200%200%2015.916%206a5.648%205.648%200%200%200-4.029%201.687%205.936%205.936%200%200%200-1.691%203.524%205.677%205.677%200%200%200-3.433%201.737%205.966%205.966%200%200%200-1.643%204.137C5.12%2020.347%207.704%2023%2010.882%2023h10.236c3.176%200%205.762-2.653%205.762-5.915%200-3.083-2.31-5.623-5.244-5.893%27%2F%3E%0A%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%3C%2Fsvg%3E\")";
    // the string after ";utf8,...')" is just the svg inlined. Done here : https://yoksel.github.io/url-encoder/
    // Might be optimized, see here :
    //    * https://codepen.io/tigt/post/optimizing-svgs-in-data-uris
    //    * https://www.npmjs.com/package/mini-svg-data-uri


/* --------------------------------------------------------------------- */
// Add a menu button to an element and initialize the iframe for the menu
function addMenuButton(el, op, markTheFilling, fieldType) {
    // if (targetsEl.includes(el)) return; // can happen if several fillscripts are requested in autofiller.js // no longer relevant, a field can be added several time, once for each corresponding cipher (far instance, an email input can correspond to a login and an identity cipher)

    if (el && null !== op && void 0 !== op && !(el.disabled || el.a || el.readOnly)) {
        switch (markTheFilling && el.form && !el.form.opfilled && (el.form.opfilled = true),
        el.type ? el.type.toLowerCase() : null) {
            case 'checkbox':
                break;
            case 'radio':
                break;
            default:
                el.dataset.fieldTypes = el.dataset.fieldTypes === undefined ?  fieldType : el.dataset.fieldTypes + '*' + fieldType;
                if (targetsEl.includes(el)) break; // no need to add again the "button" into the field
                el.style.backgroundImage = menuBtnSvg
                el.style.backgroundRepeat = "no-repeat"
                el.style.backgroundAttachment = "scroll"
                el.style.backgroundSize = "16px 18px"
                el.style.backgroundPosition = "calc(100% - 16px) 50%"
                el.style.cursor = "pointer"
                _initInPageMenuForEl(el)
                break;
        }
    }
}
menuCtrler.addMenuButton = addMenuButton


/* --------------------------------------------------------------------- */
// Init a target element to be able to trigger the menu
function _initInPageMenuForEl(targetEl) {
    targetsEl.push(targetEl) // register this element as one of the targets for the menu

    // prevent browser autocomplet with history for this field
    targetEl.autocomplete='off'

	if(!state.isMenuInited) { // menu is not yet initiated, there is no iframe elemeent for the menu
        // initIframe()
        menuEl = document.createElement('iframe')
        _setIframeURL(state.currentMenuType, state.isPinLocked )
        menuEl.id  = 'cozy-menu-in-page'
        menuEl.style.cssText = 'z-index: 2147483647 !important; border:0; transition: transform 30ms linear 0s; display:block;'
        // Append <style> element to add popperjs styles
        // relevant doc for css stylesheet manipulation : https://www.w3.org/wiki/Dynamic_style_-_manipulating_CSS_with_JavaScript
        const styleEl = document.createElement('style')
        styleEl.innerHTML = `
            #cozy-menu-in-page {visibility: hidden; }
            #cozy-menu-in-page[data-show] {visibility: visible;}
        `;
        document.head.appendChild(styleEl)
        // append element and configure popperjs
        document.body.append(menuEl)
        const sameWidth = {
            name     : "sameWidth",
            enabled  : true,
            phase    : "beforeWrite",
            requires : ["computeStyles"],
            fn       : ({ state }) => { state.styles.popper.width = `${state.rects.reference.width+20}px` },
            effect   : ({ state }) => {
                state.elements.popper.style.width = `${state.elements.reference.offsetWidth+20}px`;
            }
        };
        popperInstance = createPopper(targetEl, menuEl, {
            placement: 'bottom',
            modifiers: [
                {
                    name: 'offset',
                    options: {offset: [0, -5]},
                },
                {
                    name: 'computeStyles',
                    options: {
                        adaptive: false,
                    },
                },
                {
                    name: 'flip',
                    options: {
                        fallbackPlacements: ['bottom'], // force the menu ot go only under the field
                    },
                },
                sameWidth,
            ],
        });
        // a serie of updates due to some late html modifications
        // useful for instance for :  https://accounts.google.com/
        setTimeout(popperInstance.update, 600 )
        setTimeout(popperInstance.update, 1200)
        setTimeout(popperInstance.update, 1800)

        state.isMenuInited = true
    }

    // hide menu if focus leaves the input
    targetEl.addEventListener('blur' , _onBlur)
    // show menu when input receives focus or is clicked (it can be click while it already has focus)
    targetEl.addEventListener('focus', _onFocus)
    targetEl.addEventListener('click', _onClick)
    // listen keystrokes on the input form
    targetEl.addEventListener('keydown', _onKeyDown);

}

function _onBlur(event) {
    if (!event.isTrusted) return;
    // console.log('Blur event in an input', event.target.id)
    menuCtrler.hide()
    return true
}

function _onFocus(event) {
    console.log('focus event in an input', event.target.id);
    if (!event.isTrusted) return;
    show(this)
}

function _onClick(event) {
    // console.log('click event in an input', event.target.id);
    if (!event.isTrusted) return;
    show(this)
}

function _onKeyDown(event) {
    // console.log('keydown event', event.key, state.isHidden);
    if (!event.isTrusted) return;
    const keyName = event.key;
    if (keyName === 'Escape') {
        // console.log('escape ==> hide');
        menuCtrler.hide(true)
        return;
    } else if (keyName === 'Tab') {
        return;
    } else if (keyName === 'ArrowUp') {
        event.stopPropagation()
        event.preventDefault()
        if (state.isHidden) {
            show(event.target)
        } else {
            menuCtrler.moveSelection(-1)
        }
        return;
    } else if (keyName === 'ArrowDown') {
        event.stopPropagation()
        event.preventDefault()
        if (state.isHidden) {
            show(event.target)
        } else {
            menuCtrler.moveSelection(1)
        }
        return;
    } else if (keyName === 'Enter') {
        if (state.isHidden) return
        event.stopPropagation()
        event.preventDefault()
        menuCtrler.submit()      // else request menu selection validation
        return;
    } else if  (_isCharacterKeyPress(event)){
        // console.log('_isCharacterKeyPress ==> hide');
        menuCtrler.hide(true)
        return;
    }
}


/* --------------------------------------------------------------------- */
//
function show(targetEl) {
    console.log('menuCtrler.show() ');
    if (state.isFrozen) return
    state.lastFocusedEl = targetEl
    popperInstance.state.elements.reference = targetEl
    popperInstance.update()
    menuEl.setAttribute('data-show', '')
    state.isHidden = false
    // find the first cipher to display
    selectFirstCipherToSuggestFor(targetEl)
    // in the end show the menu
    _setApplyFadeInUrl(true, targetEl.dataset.fieldTypes)
}


/* --------------------------------------------------------------------- */
// Init a target element to be able to trigger the menu
// force = false : a shrot time out will wait to check where the focus
//       goes so that to not hide if target is an input or the iframe of
//       the menu.
// force = true : hide the menu without waiting to check the target of the focus.
function hide(force) {
    if (state.isFrozen) return
    if (force && typeof force == 'boolean') {
        _setApplyFadeInUrl(false)
        // hide menu element after a delay so that the inner pannel has been scaled to 0 and therefore enables
        // a proper start for the next display of the menu.
        // There is an explanation in MDN but their solution didnot work as well as this one :
        // https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations/Tips#Run_an_animation_again
        // but don't delay this execution, other wise the menu will still be displayed when the page details will be run
        // and there fore will consider fields under the iframe as being hidden. These fields would then not be filled...
        menuEl.removeAttribute('data-show')
        state.isHidden = true
        return
    }
    setTimeout(() => {
        const target = document.activeElement;
        if (!force && (targetsEl.indexOf(target) != -1 || target.tagName == 'IFRAME' && target.id == 'cozy-menu-in-page')) {
            console.log('log after timeout concludes DONT HIDE');
            // Focus is know in iframe or in one of the input => do NOT hide
            // console.log('After hide, focus is now in iframe or in one of the input => do NOT hide', internN);
            return
        }
        console.log('log after timeout concludes DO HIDE');
        // otherwise, hide
        _setApplyFadeInUrl(false)
        // hide menu element after a delay so that the inner pannel has been scaled to 0 and therefore enables
        // a proper start for the next display of the menu.
        // There is an explanation in MDN but their solution didnot work as well as this one :
        // https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations/Tips#Run_an_animation_again
        setTimeout(()=>{menuEl.removeAttribute('data-show')}, 600)
        state.isHidden = true
    }, 1);
}
menuCtrler.hide = hide


/* --------------------------------------------------------------------- */
// Hide menu and remove the "buttons" in form inputs
function deactivate() {
    if (!menuEl) return; // can happen
    hide(true)
    removeInPageButtons()
    state.isActivated = false;
}
menuCtrler.deactivate = deactivate


/* --------------------------------------------------------------------- */
// Remove the "buttons" in form inputs and their listerners
function removeInPageButtons() {
    for (var el of targetsEl) {
        el.style.backgroundImage = ''
        el.removeEventListener('blur' , _onBlur)
        el.removeEventListener('focus', _onFocus)
        el.removeEventListener('click', _onClick)
        el.removeEventListener('keydown', _onKeyDown);
        el.dataset.fieldTypes = ''
    }
    targetsEl = []
}


/* --------------------------------------------------------------------- */
// Moves selection of +1 or -1  (n=1 || n=-1)
function moveSelection(n) {
    const cipherTypesToSuggest = getPossibleTypesForField(state.lastFocusedEl).cipherTypes
    let newCipherNode
    const selectedCipher = state.selectedCipher
    if (n>0) {
        newCipherNode = selectedCipher.prev;
    } else {
        newCipherNode = selectedCipher.next;
    }
    while (newCipherNode!== selectedCipher) { // we could not find a cipher other than the current selected one
        if(newCipherNode=== null) {      // reach end of the list
            if (n>0) {
                newCipherNode = ciphers.head()
            } else {
                newCipherNode = ciphers.tail()
            }
        }
        if (cipherTypesToSuggest.includes(newCipherNode.data.type)) {
            break
        }
        if (n>0) {
            newCipherNode = newCipherNode.prev;
        } else {
            newCipherNode = newCipherNode.next;
        }
    }
    state.selectedCipher = newCipherNode

    chrome.runtime.sendMessage({
        command      : 'bgAnswerMenuRequest',
        subcommand   : 'menuMoveSelection',
        targetCipher : newCipherNode.data.id,
        sender       : 'menuCtrler',
    });
}
menuCtrler.moveSelection = moveSelection


/* --------------------------------------------------------------------- */
//
function getPossibleTypesForField(fieldEl) {
    const fieldTypesStr = fieldEl.dataset.fieldTypes
    const fieldTypes = fieldTypesStr.split('*')
    const cipherTypes = []
    // cipher.type : 1:login 2:notes  3:Card 4: identities
    if (fieldTypesStr.includes('login_'   )) cipherTypes.push(1)
    if (fieldTypesStr.includes('card_'    )) cipherTypes.push(3)
    if (fieldTypesStr.includes('identity_')) cipherTypes.push(4)
    return {cipherTypes, fieldTypes }
}


/* --------------------------------------------------------------------- */
// Submit the currently selected cypher for autofill
function submit() {
    chrome.runtime.sendMessage({
        command    : 'bgAnswerMenuRequest',
        subcommand : 'fillFormWithCipher',
        sender     : 'menuCtrler',
        cipherId   : state.selectedCipher.data.id,
    });
}
menuCtrler.submit = submit


/* --------------------------------------------------------------------- */
// Set the height of menuEl (iframe) taking into account the inner margin
function setHeight(h) {
    console.log('setHeight', h);
    if (!state.isMenuInited) return // happens if in an iframe without relevant inputs for the menu
    if (state.lastHeight === h )  return
    menuEl.style.height = h + 28 + 'px'
    state.lastHeight = h
}
menuCtrler.setHeight = setHeight


/* --------------------------------------------------------------------- */
// Get a cipher given its id
function getCipher(id) {
    return ciphersById[id]
}
menuCtrler.getCipher = getCipher


/* --------------------------------------------------------------------- */
// Set the ciphers
function setCiphers(newCiphers) {
    ciphers = new LinkedList()
    ciphersById = {}
    for (var cipherList in newCiphers) {
        if (newCiphers.hasOwnProperty(cipherList)) {
            for (var cipher of newCiphers[cipherList]) {
                ciphers.append(cipher)
                ciphersById[cipher.id] = cipher
            }
        }
    }
    state.isAutoFillInited = true
    // state.selectedCipher = ciphers.head() // TODO BJA : check this is the first visible cipher.
    selectFirstCipherToSuggestFor(state.lastFocusedEl)
}
menuCtrler.setCiphers = setCiphers


/* --------------------------------------------------------------------- */
// Run this function so that menuCtrler.state.selectedCipher corresponds
// to the initial selection within the menu
function selectFirstCipherToSuggestFor(fieldEl) {
    if (state.isHidden) return
    if (!ciphers || ciphers._length == 0) return
    if (!fieldEl) return
    let newCipherNode = ciphers.head()
    const cipherTypesToSuggest = getPossibleTypesForField(fieldEl).cipherTypes
    do {
        if (cipherTypesToSuggest.includes(newCipherNode.data.type)) {
            state.selectedCipher = newCipherNode;
            return // found
        }
        newCipherNode = newCipherNode.prev;
    } while (newCipherNode!== null) // we could not find a cipher other than the current selected one
}


/* --------------------------------------------------------------------- */
//
function setMenuType(menuType, isPinLocked) {
    // console.log('setMenuType()', {menuType, isPinLocked});
    if (menuType === state.currentMenuType) {
        _setIframeURL(menuType, isPinLocked)
        _forceIframeRefresh()
        return
    }
    if (menuEl) {
        _setIframeURL(menuType, isPinLocked)
        removeInPageButtons() // remove all "buttons"
        if (menuType === 'autofillMenu' && state.currentMenuType === 'loginMenu' ) {
            if (state.lastFocusedEl) {
                window.setTimeout(()=>{
                    // timeout is required in order to move focus only when iframe url has been setup
                    console.log('focus last focusedEl', state.lastFocusedEl);
                    state.lastFocusedEl.focus()
                },100)
            }
        }
    }
    state.currentMenuType = menuType
    state.isPinLocked = isPinLocked
}
menuCtrler.setMenuType = setMenuType


/* --------------------------------------------------------------------- */
//
function _setIframeURL(menuType, isPinLocked, hash) {
    const rand = '?' + Math.floor((Math.random()*1000000)+1)
    if (menuEl.src) {
        const location = new URL(menuEl.src)
        hash = (hash ? hash : location.hash)
    } else {
        hash = (hash ? hash : '')
    }
    if (menuType === 'autofillMenu') {
        menuEl.src = chrome.runtime.getURL('inPageMenu/menu.html' + rand)  + hash
    } else if (menuType === 'loginMenu') {
        let urlParams = ''
        if (isPinLocked) urlParams = '?isPinLocked=true'
        menuEl.src = chrome.runtime.getURL('inPageMenu/loginMenu.html' + urlParams + rand) + hash
    }
}


/* --------------------------------------------------------------------- */
// just modify the random part of the iframe url in order to force refresh
function _forceIframeRefresh() {
    if (!menuEl.src) return
    const url = new URL(menuEl.src)
    const rand = '?' + Math.floor((Math.random()*1000000)+1)
    menuEl.src = url.origin + url.pathname + url.search + rand + url.hash
}


/* --------------------------------------------------------------------- */
//
function _setApplyFadeInUrl(doApply, fieldTypes) {
    if (!menuEl.src) return
    const url = new URL(menuEl.src)
    if (doApply) {
        // console.log('menuCtrler.applyFadeIn()');
        menuEl.src = url.origin + url.pathname + url.search + '#applyFadeIn*' + fieldTypes
    } else {
        // console.log('menuCtrler.removeFadeIn()');
        const currentFieldTypes = menuEl.src.slice(menuEl.src.search(/\*.*/gi))
        menuEl.src = url.origin + url.pathname + url.search + '#dontApplyFadeIn' + currentFieldTypes
    }
}


/* --------------------------------------------------------------------- */
//
function _isCharacterKeyPress(evt) {
    return evt.key.length === 1;
}


/* --------------------------------------------------------------------- */
//
function _hideMenuEl(isHide){
    if (isHide) {
        menuEl.removeAttribute('data-show')
    } else {
        menuEl.setAttribute('data-show','')
    }
}




/* --------------------------------------------------------------------- */
// EXPORT
export default menuCtrler;
