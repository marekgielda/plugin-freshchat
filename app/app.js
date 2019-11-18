var baseUrl = 'https://8e34ffca.ngrok.io'
var headers = {
  'X-App-Id': '<%=iparam.applicationId%>',
  'X-App-Token': '<%=iparam.secretKey%>',
  'Content-Type': 'application/json',
  Accept: '*/*'
}
// var campaignsUrl = 'https://api.voucherify.io/v1/vouchers?limit=15'
var options = { headers: headers }
var campaignsUrl = `${baseUrl}/v1/campaigns`
var publicationsUrl = `${baseUrl}/v1/publications`

$(document).ready(function () {
  app.initialized().then(function (_client) {
    var client = _client
    client.events.on('app.activated', function () {
      var campaigns = []
      var selectedCampaignName = null
      var voucherCode = null

      $('#get-voucher-button').attr('disabled', true)

      client.request.get(campaignsUrl, options).then(
        function (data) {
          campaigns = JSON.parse(data.response).campaigns
          $.each(campaigns, function (key, value) {
            $('#campaign-select').append(
              $('<option></option>')
                .attr('value', key)
                .text(value.name)
            )
          })
        },
        function (error) {
          console.log(error)
        }
      )

      $('#campaign-select').on('change', function () {
        $('#get-voucher-button').attr(
          'disabled',
          this.value === 'Select a campaign' || !this.value
        )
        console.log(this.value === 'Select a campaign')
      })

      $('#get-voucher-button').on('click', function () {
        var publicationsOptions = {
          headers: headers,
          body: JSON.stringify({
            campaign: selectedCampaignName,
            customer: {
              source_id: 'm.gielda10@gmail.com'
            }
          })
        }
        client.request
          .post(publicationsUrl, publicationsOptions)
          .then(
            function (data) {
              voucherCode = JSON.parse(data.response).voucher.code
              $('#voucher-code').text(voucherCode)
            },
            function (error) {
              console.log(error)
            }
          )
      })
    })
  })
})
