var baseUrl = 'https://06dd9d0c.ngrok.io'
var headers = {
  'X-App-Id': '<%=iparam.applicationId%>',
  'X-App-Token': '<%=iparam.secretKey%>',
  'Content-Type': 'application/json',
  Accept: '*/*'
}
var campaignsUrl = `${baseUrl}/v1/campaigns`
var publicationsUrl = `${baseUrl}/v1/publications`
var isAppActivated = false

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
        var conversationId = null
        var isPublicationExpired = false
        var numOfAppActivatonAttempts = 0

        client.events.on('app.activated', onAppActivated)

        function onAppActivated () {
          if (isAppActivated) {
            if (numOfAppActivatonAttempts > 10) {
              return 0
            } else {
              console.debug('ACTIVATION ATTEMPT NR ', numOfAppActivatonAttempts)
              setTimeout(function () {
                numOfAppActivatonAttempts++
                onAppActivated()
              }, 1000)
            }
          } else {
            console.debug('APP ACTIVATED')
            isAppActivated = true

            console.debug(
              'iparams.enableMultiplePublishes',
              iparams.enableMultiplePublishes
            )
            if (iparams.enableMultiplePublishes) {
              getUser()
            } else {
              getConversation()
            }

            var numOfConvFetchAttempts = 0
            function getConversation () {
              client.data.get('conversation').then(
                function (data) {
                  conversationId = data.conversation.conversation_id
                  client.db.get('expiredConvs').then(
                    function (conversations) {
                      isPublicationExpired = conversations.ids
                        .map(function (id) {
                          return id === conversationId
                        })
                        .some(function (result) {
                          return result === true
                        })
                      console.debug(
                        'isPublicationExpired',
                        isPublicationExpired
                      )
                      if (!isPublicationExpired) {
                        getUser()
                      }
                    },
                    function (error) {
                      if (error.message === 'Record not found') {
                        if (numOfConvFetchAttempts === 0) {
                          client.db.set('expiredConvs', { ids: [] }).then(
                            function (data) {
                              getConversation()
                            },
                            function (error) {
                              console.log(error)
                            }
                          )
                        } else {
                          console.error(error)
                        }
                      }
                      console.error(error.message === 'Record not found')
                    }
                  )
                },
                function (error) {
                  console.error(error)
                }
              )
            }

            function getUser () {
              client.data.get('user').then(
                function (data) {
                  var user = data.user
                  console.debug('user', user)

                  switch (iparams.sourceIdType) {
                    case 'Phone':
                      sourceId = user.phone || user.id
                      break
                    case 'Email':
                      sourceId = user.email || user.id
                      break
                    case 'External ID':
                      sourceId = user.reference_id || user.id
                      break
                    default:
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
                      })
                      if (!isPublicationExpired) {
                        $('#campaign-select').attr('disabled', false)
                      }
                    },
                    function (error) {
                      console.error(error)
                      $('#error-message').text(
                        JSON.parse(error.response).message
                      )
                    }
                  )
                },
                function (error) {
                  console.error(error)
                }
              )
            }
          }
        }

        $('#campaign-select').on('click', function () {
          if (selectedCampaignIndex !== null) {
            $('#get-voucher-button').attr('disabled', false)
          }
        })

        $('#campaign-select').on('change', function () {
          console.debug('Change', this.value)
          if (this.value !== null) {
            $('#get-voucher-button').attr('disabled', false)
            selectedCampaignIndex = this.value
          } else {
            selectedCampaignIndex = null
          }
        })

        $('#get-voucher-button').on('click', function () {
          $('#code-container').css('display', 'none')
          $('#error-message').text('')
          $('#get-voucher-button').attr('disabled', true)
          if (!iparams.enableMultiplePublishes) {
            $('#campaign-select').attr('disabled', true)
            client.db
              .update('expiredConvs', 'append', {
                ids: [conversationId]
              })
              .then(
                function (data) {
                  console.debug('Db entry creted', data)
                },
                function (error) {
                  console.error(error)
                }
              )
          }
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
          if ($('#voucher-code').val() !== 'Copied') {
            $('#voucher-code').select()
            document.execCommand('copy')
            $('#voucher-code').val('Copied')
            setTimeout(function () {
              $('#voucher-code').val(voucherCode)
            }, 1000)
          }
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

          isAppActivated = false
        })
      },
      function (error) {
        console.error(error)
      }
    )
  })
})
