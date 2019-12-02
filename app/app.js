$(document).ready(function () {
  app.initialized().then(function (_client) {
    var client = _client

    client.iparams.get().then(
      function (iparams) {
        var campaigns = []
        var selectedCampaignIndex = null
        var sourceId = null
        var voucherCode = null
        var conversationId = null
        var isPublicationExpired = false

        client.events.on('app.activated', function () {
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
                            console.error(error)
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

                getCampaigns()
              },
              function (error) {
                console.error(error)
              }
            )
          }
        })

        function getCampaigns () {
          client.request
            .invoke('getCampaigns', {})
            .then(function (result) {
              campaigns = result.response.campaigns
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
            })
            .catch(function (error) {
              console.error(error)
              $('#error-message').text(error.message)
            })
        }

        $('#campaign-select').on('click', function () {
          if (selectedCampaignIndex !== null) {
            $('#get-voucher-button').attr('disabled', false)
          }
        })

        $('#campaign-select').on('change', function () {
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


          client.request
            .invoke('publishVoucher', {
              data: {
                campaign: campaigns[selectedCampaignIndex].name,
                customer: {
                  source_id: sourceId
                }
              }
            })
            .then(function (result) {
              if (!iparams.enableMultiplePublishes) {
                $('#campaign-select').attr('disabled', true)
                client.db
                  .update('expiredConvs', 'append', {
                    ids: [conversationId]
                  })
                  .then(null, function (error) {
                    console.error(error)
                  })
              }
              voucherCode = result.response
              $('#voucher-code').val(voucherCode)
              $('#code-container').css('display', 'inline-grid')
            })
            .catch(function (error) {
              console.error(error)
              $('#error-message').text(error.message)
            })
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
              console.error(error) // Method throws undefined error (probably this is a bug)
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

        client.events.on('app.deactivated', function () {
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
