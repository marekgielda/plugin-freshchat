var baseUrl = 'https://698ecfdb.ngrok.io'
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
var enableMultiplePublishes = false
var pasteIcon = '<img src="paste-solid.svg" />'

$(document).ready(function () {
  app.initialized().then(function (_client) {  
    var client = _client
    client.iparams.get('enableMultiplePublishes').then(
      function (data) {
        enableMultiplePublishes = data.enableMultiplePublishes === 'true'
      },
      function (error) {
        console.error(error)
      }
    )
    client.events.on('app.activated', function () {
      var campaigns = []
      var selectedCampaignName = null
      var voucherCode = null

      $('#get-voucher-button').attr('disabled', true)
      $('#campaign-select').attr('disabled', true)
      $('#code-container').css('display', 'none')
      $('#paste-icon').html(pasteIcon)

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

        $('#get-voucher-button').attr('disabled', true)
        client.request.post(publicationsUrl, publicationsOptions).then(
          function (data) {
            voucherCode = JSON.parse(data.response).voucher.code
            $('#voucher-code').val(voucherCode)
            $('#code-container').css('display', 'inline-grid')
            if (!enableMultiplePublishes) {
              console.log('TURNING OFF')
              $('#campaign-choice').css({'display': 'none'})
            }
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

      $('#paste-icon').on('click', function () {
        client.interface
          .trigger('setValue', {
            id: 'editor',
            value: voucherCode
          })
          .catch(function (error) {
            console.log(error) // Method throws undefined error (probably a bug)
          })
          .finally(function () {
            $('#paste-icon').html('<span>Pasted</span>')
            setTimeout(function () {
              $('#paste-icon').html(pasteIcon)
            }, 3000)
          })
      })
    })
  })
})
