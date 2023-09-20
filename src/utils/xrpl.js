export function xrpToDrops(xrp) {
    return xrp * 1000000;
}

export function toMemos(referenceNo, freeText) {
    referenceNo = referenceNo === undefined ? '' : referenceNo
    freeText = freeText === undefined ? [] : freeText
    freeText = Array.isArray(freeText) ? freeText : [ freeText ] // "abc" -> [ "abc" ]
    if (referenceNo.length === 0 && freeText.length === 0) {
        return null;
    }

    var data = { v: 1 }

    if (referenceNo.length > 0) {
        const UKNOWN = 'unk'
        data.CdOrPrtry = [ { t: UKNOWN, v: referenceNo } ]
    }

    if (freeText.length > 0) {
        data.ft = freeText
    }

    return [{
        Memo: {
            MemoData: stringToHex(JSON.stringify(data)),
            MemoFormat: stringToHex('json')
        }
    }]
}

export async function isActivated(xrplClient, wallet) {
    try {
        // Throws an exception 'Account not found.'
        await xrplClient.request({
            "command": "account_info",
            "account": wallet
        })
        return true
    } catch (err) {
        return false
    }
}
export async function hasTrustline(xrplClient, wallet, ccy) {
    let trustlines = await listTrustlines(xrplClient, wallet, ccy)
    return trustlines.length > 0
}
export async function listTrustlines(xrplClient, wallet, ccy) {
    const response = await xrplClient.request({
        "command": "account_lines",
        "account": wallet
    })

    var lines = []
    for (var i = 0; i < response.result.lines.length; i++) {
        var line = response.result.lines[i]
        var decodedCcy = toCurrencyCode(line.currency)
        if (decodedCcy === ccy) {
            lines.push(line)
        }
    }
    return lines
}

export async function createPayment(xrplClient, to, ccy, amount, referenceNo, message) {
    // Requirement: Receiver must have a trustline to the expected currency
    var amount = await toAmount(xrplClient, to, ccy, amount)

    var tx = {
        TransactionType: 'Payment',
        Destination: to,
        Amount: amount
    }

    var memos = toMemos(referenceNo, message)
    if(memos !== null) {
        tx.Memos = memos
    }
    return tx
}

export function stringToHex(value) {
    if (value == undefined) return ''
    return Array.from(value)
        .map(c => 
            c.charCodeAt(0) < 128
            ? c.charCodeAt(0).toString(16)
            : encodeURIComponent(c).replace(/\%/g,'').toLowerCase()
        ).join('');
}

export function hexToString(hex) {
    return decodeURIComponent('%' + hex.match(/.{1,2}/g).join('%'));
}

// The standard format for currency codes is a three-character string such as USD. (https://xrpl.org/currency-formats.html)
const ccyCodeStandardFormatLength = 3;
export function toCurrencyCode(currency) {
    // replace() needed, due value is always 20 bytes, filled with 0.
    return currency.length <= ccyCodeStandardFormatLength ? currency : hexToString(currency).replace(/\u0000/g,'');
}
export function fromCurrencyCode(code) {
    // value is always 20 bytes, filled with 0.
    return code.length <= ccyCodeStandardFormatLength ? code : stringToHex(code).padEnd(40, '0');
}

export async function toAmount(xrplClient, wallet, ccy, amount) {
    if (ccy === 'XRP') {
        return String(xrpToDrops(amount))
    } else {
        let trustlines = await listTrustlines(xrplClient, wallet, ccy)
        return {
            "currency" : fromCurrencyCode(ccy),
            "value" : String(amount),
            "issuer" : trustlines[0].account
        }
    }
}