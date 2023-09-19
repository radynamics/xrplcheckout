/* Copyright (C) radynamics, All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Reto Steimen <rsteimen@radynamics.com>, 2023
 */
function localizeAll(language, translations, onDone) {
    i18next.init({
        lng: getUiLocal(language),
        /*debug: true,*/
        resources: translations
    }).then(function(t) {
        var elements = document.querySelectorAll('*');
        for (i = 0; i < elements.length; i++) {
            localize(elements[i]);
        }
        onDone();
    });
}
function localize(elem) {
    var attr = elem.getAttributeNode("data-i18n"); 
    if(attr == null || attr.value == "") {
        return;
    }
    if(attr.value.startsWith('[placeholder]')) {
        var id = attr.value.replace('[placeholder]', '');
        if(i18next.exists(id)) {
            elem.placeholder = i18next.t(id);
        }
        return
    }
    if(i18next.exists(attr.value)) {
        elem.innerHTML = i18next.t(attr.value);
    }
}
function localizeSrc(elem) {
    var attr = elem.getAttributeNode("data-i18n"); 
    if(attr == null || attr.value == "") {
        return;
    }
    if(i18next.exists(attr.value)) {
        elem.src = i18next.t(attr.value);
    }
}
function getUiLocal(preferredLocale) {
    var FALLBACK = 'en';
    if (preferredLocale.length < 2) {
        return FALLBACK;
    }
    var preferred = preferredLocale.substring(0, 2);
    var AVAILABLE = ["de", "en"];
    return AVAILABLE.indexOf(preferred) < 0 ? FALLBACK : preferred;
}