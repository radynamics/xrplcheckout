let networks = {}
networks['xrpl_mainnet'] = { networkId: 0, nativeCcy: 'XRP', displayText: 'XRP Ledger', wss: 'wss://xrplcluster.com' }
networks['xrpl_testnet'] = { networkId: 1, nativeCcy: 'XRP', displayText: 'XRPL Testnet', wss: 'wss://s.altnet.rippletest.net:51233' }
networks['xahau_mainnet'] = { networkId: 21337, nativeCcy: 'XAH', displayText: 'Xahau', wss: 'wss://xahau.network' }
networks['xahau_testnet'] = { networkId: 21338, nativeCcy: 'XAH', displayText: 'Xahau Testnet', wss: 'wss://xahau-test.net' }

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

export async function getTranferFees(xrplClient, to, amt, ccy, charges, networkKey) {
    if(isNativeCcy(ccy, networkKey)) {
        return { sender: 0, receiver: 0, issuer: null }
    }

    // Requirement: Receiver must have a trustline to the expected currency
    let trustlines = await listTrustlines(xrplClient, to, ccy)
    if(trustlines.length == 0) {
        return { sender: 0, receiver: 0, issuer: null }
    }
    var issuer = trustlines[0].account
    var transferRate = await getTransferRateOrZero(xrplClient, issuer)    

    var transferFee = amt * transferRate
    switch(charges) {
        case 'OUR':
            return { sender: transferFee, receiver: 0, issuer: issuer }
        case 'BEN':
        default:
            return { sender: 0, receiver: transferFee, issuer: issuer }
        case 'SHA':
            // the other half gets automatically deducted
            return { sender: transferFee * 0.5, receiver: transferFee * 0.5, issuer: issuer }
    }
}

export async function createPayment(xrplClient, to, ccy, amt, referenceNo, message, charges, networkKey) {
    var tx = {
        TransactionType: 'Payment',
        Destination: to
    }

    if(isNativeCcy(ccy, networkKey)) {
        tx.Amount = toAmount(amt, ccy, null, networkKey)
    } else {
        let transferFees = await getTranferFees(xrplClient, to, amt, ccy, charges, networkKey)
        let feeAmount = 0, feeSendMax = 0
        switch(charges) {
            case 'OUR':
                feeAmount += transferFees.sender
                feeSendMax += transferFees.sender
                break;
            case 'BEN':
            default:
                // automatically deducted
                break;
            case 'SHA':
                // the other half gets automatically deducted
                feeAmount += transferFees.sender
                feeSendMax += transferFees.sender
                break;
        }
        tx.Amount = toAmount(amt + feeAmount, ccy, transferFees.issuer, networkKey)
        if(feeSendMax > 0) {
            tx.SendMax = toAmount(amt + feeSendMax, ccy, transferFees.issuer, networkKey)
        }
    }

    var memos = toMemos(referenceNo, message)
    if(memos !== null) {
        tx.Memos = memos
    }

    // For compatibility with existing chains, the NetworkID field must be omitted on any network with a Network ID of 1024 or less,
    // but must be included on any network with a Network ID of 1025 or greater. (https://xrpl.org/transaction-common-fields.html#networkid-field)
    let network = networks[networkKey]
    if(network !== undefined && network.networkId >= 1025) {
        tx.NetworkID = network.networkId
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
    if (currency.length <= ccyCodeStandardFormatLength) {
        return currency
    }

    // "LP Token Currency Codes" (https://xrpl.org/docs/concepts/tokens/decentralized-exchange/automated-market-makers/#lp-token-currency-codes)
    if (currency.startsWith('03')) {
        // Eg. "0348E1573E830D01581CD80DFE1E02A9FF55A34B" -> "LP 48E1573E830D01581CD80DFE1E02A9FF55A34B"
        return `LP ${currency.substr(2)}`
    }

    // replace() needed, due value is always 20 bytes, filled with 0.
    // Eg. "7853504543544152000000000000000000000000" -> "xSPECTAR"
    return hexToString(currency).replace(/\u0000/g,'')
}
export function fromCurrencyCode(code) {
    // value is always 20 bytes, filled with 0.
    return code.length <= ccyCodeStandardFormatLength ? code : stringToHex(code).padEnd(40, '0');
}

export function toAmount(amount, ccy, issuer, networkKey) {
    if (isNativeCcy(ccy, networkKey)) {
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
export function isNativeCcy(ccy, networkKey) {
    return ccy === getNetwork(networkKey).nativeCcy
}
export function getNetwork(key) {
    let network = networks[key]
    if(network === undefined) {
        throw new Error(`Unknown network ${key}`)
    }
    return network
}

function round(num, decimalPlaces) {
    var p = Math.pow(10, decimalPlaces || 0)
    return Math.round( num * p + Number.EPSILON ) / p
}