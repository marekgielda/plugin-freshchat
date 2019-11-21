var baseUrl = 'https://fbbbb291.ngrok.io'
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
var sourceIdType = null
var pasteIcon = '<img src="paste-solid.svg" />'

$(document).ready(function () {
  app.initialized().then(function (_client) {
    var client = _client

    client.iparams.get().then(
      function (data) {
        enableMultiplePublishes = data.enableMultiplePublishes === 'true'
        switch (data.sourceId) {
          case 'Freashchat User ID':
            sourceIdType = 'id'
            break
          case 'Email':
            sourceIdType = 'email'
            break
          case 'Telephone number':
            sourceIdType = 'phone'
            break
          default:
            sourceIdType = 'id'
        }

        client.events.on('app.activated', function () {
          client.data.get('conversation').then(
            function (data) {
              var sourceId
              if (data.conversation.users[0][sourceIdType] !== null) {
                sourceId = data.conversation.users[0][sourceIdType]
              } else {
                sourceId = data.conversation.users[0].id
              }
              console.log('SOURCE ID')
              console.log(sourceId)
              var campaigns = []
              var selectedCampaignName = null
              var voucherCode = null
    
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
                      source_id: sourceId
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
                      $('#campaign-choice').css({ display: 'none' })
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
                    console.error(error) // Method throws undefined error (probably a bug)
                  })
                  .finally(function () {
                    $('#paste-icon').html('<span>Pasted</span>')
                    setTimeout(function () {
                      $('#paste-icon').html(pasteIcon)
                    }, 3000)
                  })
              })
            },
            function (error) {
              console.error(error)
            }
          )
        })
      },
      function (error) {
        console.error(error)
      }
    )
  })
})
