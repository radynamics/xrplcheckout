export class DalliPay {
    static id = "dallipay"
    id() { return DalliPay.id }
    name() { return "DalliPay" }
    getPayAdviseText() { return 'Please open DalliPay on your computer first.' }

    isReady() {
        return { ready: true }
    }

    async supportsIOU(xrplClient, params) {
        return { supported: true }
    }

    pay(xrplClient, params) {
        const localhostBaseUrl = 'http://127.0.0.1:58909/request';
        var parameters = this.#toQueryString(params)
        return fetch(`${localhostBaseUrl}/${parameters}`, {
            mode: "no-cors",
        })
    }

    #toQueryString(params) {
        var result = `?`
        if(params.to !== undefined) result += `to=${params.to}`
        if(params.amount !== undefined) result += `&amount=${params.amount}`
        if(params.currency !== undefined) result += `&currency=${params.currency}`
        if(params.destinationTag !== undefined) result += `&dt=${params.destinationTag}`
        if(params.referenceNo !== undefined) result += `&refno=${params.referenceNo}`
        if(params.message !== undefined) result += `&msg=${params.message}`
        return result
    }
}