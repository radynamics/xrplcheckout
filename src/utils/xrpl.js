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

async function getTransferRateOrZero(xrplClient, wallet) {
    const response = await xrplClient.request({
        "command": "account_info",
        "account": wallet
    })

    const zeroFee = 1000000000
    let rate = response.result.account_data.TransferRate === undefined ? zeroFee : response.result.account_data.TransferRate
    // Return rate as value between 0.0 (0%) and 1.0 (100%)
    return (new Number(rate) - zeroFee) / zeroFee
}

export async function createPayment(xrplClient, to, ccy, amt, referenceNo, message, charges) {
    var tx = {
        TransactionType: 'Payment',
        Destination: to
    }

    if(isNativeCcy(ccy)) {
        tx.Amount = toAmount(amt, ccy, issuer)
    } else {
        // Requirement: Receiver must have a trustline to the expected currency
        let trustlines = await listTrustlines(xrplClient, to, ccy)
        var issuer = trustlines[0].account
        var transferRate = await getTransferRateOrZero(xrplClient, issuer)
        var transferFee = amt * transferRate

        let feeAmount = 0, feeSendMax = 0
        switch(charges) {
            case 'OUR':
                feeAmount += transferFee
                feeSendMax += transferFee
                break;
            case 'BEN':
            default:
                // automatically deducted
                break;
            case 'SHA':
                // the other half gets automatically deducted
                feeAmount += transferFee * 0.5
                feeSendMax += transferFee * 0.5
                break;
        }
        tx.Amount = toAmount(amt + feeAmount, ccy, issuer)
        if(feeSendMax > 0) {
            tx.SendMax = toAmount(amt + feeSendMax, ccy, issuer)
        }
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

function toAmount(amount, ccy, issuer) {
    if (isNativeCcy(ccy)) {
        return String(xrpToDrops(amount))
    } else {
        // 15 decimal digits of precision (Token Precision, https://xrpl.org/currency-formats.html)
        let rounded = round(amount, 15)
        return {
            "currency" : fromCurrencyCode(ccy),
            "value" : String(rounded),
            "issuer" : issuer
        }
    }
}
export function isNativeCcy(ccy) {
    return ccy === 'XRP'
}

function round(num, decimalPlaces) {
    var p = Math.pow(10, decimalPlaces || 0)
    return Math.round( num * p + Number.EPSILON ) / p
}