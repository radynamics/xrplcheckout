/* Copyright (C) radynamics, All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Reto Steimen <rsteimen@radynamics.com>, 2023
 */
async function localizeAll(language, fallback, localesBasePath, onDone) {
    let preferredLocale = language.length < 2 ? fallback : language.substring(0, 2)
    var lang = await getLocale(localesBasePath, preferredLocale, fallback)
    i18next.init({
        lng: lang.code,
        /*debug: true,*/
        resources: lang
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

async function getLocale(localesBasePath, locale, fallback) {
    let code = locale
    let translation = await fetch(`${localesBasePath}/${locale}.json`).then (function (response) {
        return response.json()
    }).then (function (data) {
        return data
    }).catch (async function (error) {
        // Language not available
        let loadedFallback = await getLocale(localesBasePath, fallback)
        let trans = Object.values(loadedFallback)[1]
        return trans.translation
    })
    return { code: code, [code]: { translation: translation } }
}