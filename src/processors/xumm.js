import * as XummSdk from 'https://xumm.app/assets/cdn/xumm.min.js';
import * as XrplUtils from '../utils/xrpl.js'

export class XummProcessor {
    static id = "xumm"
    id() { return XummProcessor.id }
    name() { return "Xumm" }
    getPayAdviseText() { return null }

    constructor(settings) {
        this.settings = settings
        if (this.getApiKeyOrNull() !== null) {
            this.xummSdk = new Xumm(this.getApiKeyOrNull())
        }
    }

    isReady() {
        let ready = this.getApiKeyOrNull()
        return ready !== null
            ? { ready: true }
            : { ready: false, reason: { text: `Missing value xumm.apiKey in settings.json`} }
    }

    async pay(xrplClient, params) {
        var tx = await XrplUtils.createPayment(xrplClient, params.to, params.currency, params.amount, params.referenceNo, params.message)

        this.xummSdk.authorize()
        return this.xummSdk.payload.create(tx)
    }

    getApiKeyOrNull() {
        if (this.settings == null) return null
        if (this.settings.xumm == null) return null
        // don't return undefined
        if (this.settings.xumm.apiKey == null) return null
        return this.settings.xumm.apiKey
    }
}