import { default as sdk } from "https://unpkg.com/@crossmarkio/sdk@0.3.0-beta"
import * as XrplUtils from '../utils/xrpl.js'

export class Crossmark {
    static id = "crossmark"
    id() { return Crossmark.id }
    name() { return "Crossmark" }
    getPayAdviseText() { return null }

    isReady() {
        if(typeof window.xrpl === "undefined" || !window.xrpl.isCrossmark) {
            return { ready: false, reason: { text: `Browser Extension not available.`} }
        }
        return { ready: true }
    }

    async pay(xrplClient, params) {
        var tx = await XrplUtils.createPayment(xrplClient, params.to, params.currency, params.amount, params.referenceNo, params.message, params.charges)

        let signIn = await sdk.signInAndWait()
        // User may rejected
        if (signIn.response.data.address === undefined) {
            throw new Error('User rejected')
        }
        tx.Account = signIn.response.data.address

        // Hack: Without a small wait Crossmark won't show at signAndSubmitAndWait
        await new Promise((resolve) => {
            setTimeout(() => {
                resolve()
            }, 1000)
        })

        return await sdk.signAndSubmitAndWait(tx).then((resp) => {
            if(resp.response.data.meta.isError) {
                throw new Error(resp.response.data.errorMessage)
            }
            if(resp.response.data.meta.isSuccess) {
                return
            }
            if(resp.response.data.meta.isRejected) {
                throw new Error('User rejected')
            }
        })
    }
}