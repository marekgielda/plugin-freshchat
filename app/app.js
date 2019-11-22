var baseUrl = 'https://3d8af96a.ngrok.io'
var headers = {
  'X-App-Id': '<%=iparam.applicationId%>',
  'X-App-Token': '<%=iparam.secretKey%>',
  'Content-Type': 'application/json',
  Accept: '*/*'
}
var campaignsUrl = `${baseUrl}/v1/campaigns`
var publicationsUrl = `${baseUrl}/v1/publications`

$(document).ready(function () {
  app.initialized().then(function (_client) {
    console.debug('APP INITIALIZED')
    var client = _client

    client.iparams.get().then(
      function (iparams) {
        console.debug('iparams', iparams)
        var campaigns = []
        var selectedCampaignIndex = null
        var sourceId = null
        var voucherCode = null

        client.events.on('app.activated', function () {
          console.debug('APP ACTIVATED')
          client.data.get('conversation').then(
            function (data) {
              var user = data.conversation.users[0]
              console.debug('user', user)
              if (
                iparams.useExternalId === true &&
                user.reference_id !== undefined
              ) {
                sourceId = user.reference_id
              } else {
                sourceId = user.id
              }
              console.debug('sourceId: ', sourceId)
              client.request.get(campaignsUrl, { headers: headers }).then(
                function (data) {
                  campaigns = JSON.parse(data.response).campaigns
                  console.debug('campaigns', campaigns)
                  $('#campaign-select').append(
                    $('<option></option>')
                      .attr('data-default', true)
                      .val('null')
                      .text('Select a campaign')
                  )
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
            },
            function (error) {
              console.error(error)
            }
          )
        })

        $('#campaign-select').on('change', function () {
          console.debug('Change', this.value)
          if (this.value !== null) {
            $('#get-voucher-button').attr('disabled', false)
            selectedCampaignIndex = this.value
          }
        })

        $('#get-voucher-button').on('click', function () {
          $('#code-container').css('display', 'none')
          $('#error-message').text('')
          $('#get-voucher-button').attr('disabled', true)
          var selectedCampaignName = campaigns[selectedCampaignIndex].name
          console.debug('selectedCampaignName', selectedCampaignName)
          client.request
            .post(publicationsUrl, {
              headers: headers,
              body: JSON.stringify({
                campaign: selectedCampaignName,
                customer: {
                  source_id: sourceId
                }
              })
            })
            .then(
              function (data) {
                voucherCode = JSON.parse(data.response).voucher.code
                console.debug('voucherCode: ', voucherCode)
                $('#voucher-code').val(voucherCode)
                $('#code-container').css('display', 'inline-grid')
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
              console.error(error) // Method throws undefined error (probably a bug)
            })
            .finally(function () {
              $('#paste-icon img').css('display', 'none')
              $('#paste-icon span').css('display', 'inline')
              setTimeout(function () {
                $('#paste-icon span').css('display', 'none')
                $('#paste-icon img').css('display', 'inline')

              }, 3000)
            })
        })

        client.events.on('app.activated', function () {
          console.debug('APP DEACTIVATED')
          $('#campaign-select').empty()
          $('#campaign-select').attr('disabled', true)
          $('#get-voucher-button').attr('disabled', true)
          $('#code-container').css('display', 'none')
          $('#voucher-code').val(null)
          $('#error-message').text('')

          campaigns = []
          selectedCampaignIndex = null
          sourceId = null
          voucherCode = null
        })
      },
      function (error) {
        console.error(error)
      }
    )
  })
})
