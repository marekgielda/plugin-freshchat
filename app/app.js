var baseUrl = 'https://a5fbd2d0.ngrok.io'
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
      $('#campaign-select').attr('disabled', true)
      $('#code-container').css('display', 'none')
      $('#copy-icon').html('<i class="fas fa-paste fa-2x"></i>')

      client.request.get(campaignsUrl, options).then(
        function (data) {
          campaigns = JSON.parse(data.response).campaigns
          $.each(campaigns, function (key, value) {
            $('#campaign-select').append(
              $('<option></option>')
                .attr('value', key)
                .text(value.name)
            )
            $('#campaign-select').attr('disabled', false)
          })
        },
        function (error) {
          console.error(error)
          $('#error-message').text(JSON.parse(error.response).message)
        }
      )

      $('#campaign-select').on('click', function () {
        selectedCampaignName = campaigns[this.value]
        $('#get-voucher-button').attr(
          'disabled',
          this.value === 'Select a campaign' || !this.value
        )
      })

      $('#get-voucher-button').on('click', function () {
        $('#error-message').text('')
        $('#code-container').css('display', 'none')
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
              $('#voucher-code').val(voucherCode)
              $('#get-voucher-button').attr('disabled', true)
              $('#code-container').css('display', 'block')
            },
            function (error) {
              console.error(error)
              $('#error-message').text(JSON.parse(error.response).message)
            }
            )
          })
          
          $('#voucher-code').on('click', function () {
            $('#voucher-code').select()
            document.execCommand('copy')
            $('#voucher-code').val('Copied')
            setTimeout(function () {
              $('#voucher-code').val(voucherCode)
            }, 1000)
          })
          
          $('#copy-icon').on('click', function () {
            client.interface.trigger('setValue', {id: 'editor', value: voucherCode})
              .then(function(data) {
                setTimeout(function () {
                  $('#copy-icon').html('<i class="fas fa-paste fa-2x"></i>')
                }, 3000)
              }).catch(function(error) {
                console.error(error)
              })
          })
    })
  })
})
