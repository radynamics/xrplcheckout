# XRPL Checkout
This simple WebApp allows you to create payment request URLs for your customers. Include an expected amount, [XRPL](https://xrpl.org/) receiver wallet and optionally references and free text. The resulting URL link can directly be added to your PDF or paper invoice beside traditional payment information. Enabling a one-click payment experience for your customers.

## Features
- Specify amount, receiver wallet, references and free text
- Accept payments in XRP or any XRPL issued token like USD.GateHub or EUR.Bitstamp
- Let payer choose a preferred XRPL wallet
- Self-hostable on your own website (simple FTP upload)
- Edit values in settings.json and use your own icon/company branding
- Use additional services like tinyurl.com to shorten an URL for your customers convenience.

## Demo
- Received URL as payer: https://dallipay.com/pymtreq/?1=1&to=rwietsevLFg8XSmG3bEZzFein1g8RBqWDZ&amount=19.99&currency=EUR&msg=Adopt+an+XRP+Ledger+node+%E2%9D%A4%EF%B8%8F
- Edit URL as invoice creator: https://dallipay.com/pymtreq/?1=1&to=rwietsevLFg8XSmG3bEZzFein1g8RBqWDZ&amount=19.99&currency=EUR&msg=Adopt+an+XRP+Ledger+node+%E2%9D%A4%EF%B8%8F&edit=1

## Host on your own website (highly recommended!)
Simply create a new subfolder on your website and upload all files by FTP. No further server configuration is needed. Rename settings.example.json to settings.json and edit its values for your own purposes.

### Configuring XUMM as payment method
1. Create a new application in your [XUMM Developer Console](https://apps.xumm.dev/).
2. In "Settings" make sure you define your XRPL Checkout path under "Origin/Redirect URIs". E.g. define https://www.google.com/xrplcheckout/?auth=true if your installation is accessible from https://www.google.com/xrplcheckout/.
3. Copy "API Key" from the XUMM Developer Console ("Settings") and paste it into "settings.json" as the value for "xumm" "apiKey".

### Configuring charges for TransferFee
Depending on used IOU a [TransferFee](https://xrpl.org/transfer-fees.html) must be payed. In "settings.json" the fee behavior can be defined by:
- [OUR] Payer payes the fee. Amount gets increases accordingly.
- [BEN] (default) Beneficiary (receiver) pays the fee. Amount for payer remains the same.
- [SHA] Fee is splitted 50/50 between payer and beneficiary. Amount gets increases accordingly.