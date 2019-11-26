var voucherifyClient = require('voucherify')
var client = null


exports = {
  getCampaigns: function (payload) {
    var voucherify = voucherifyClient({
      applicationId: payload.iparams.applicationId,
      clientSecretKey: payload.iparams.secretKey
    })
    voucherify.campaigns
      .get()
      .then(function (result) {
        renderData(null, result)
      })
      .catch(function (error) {
        console.error(error)
      })
  },
  publicateVoucher: function (payload) {
    var voucherify = voucherifyClient({
      applicationId: payload.iparams.applicationId,
      clientSecretKey: payload.iparams.secretKey
    })

    voucherify.distributions
      .publish(JSON.parse(JSON.stringify(payload.data)))
      .then(function (result) {
        console.log(result.voucher.code)
        renderData(null, result.voucher.code)
      })
      .catch(function (error) {
        console.error(error)
        renderData(error)
      })
  }
}
