/* global WebSocket */
/* eslint-disable camelcase */
const _ws_msgParser = require('./_ws_msg-parser')
const _ws_inIframe = require('./_ws_in-iframe')

module.exports = () => {
  window._ws_queue = {}
  window._ws_connected = false
  const { __flag } = window.mitm

  if (window._ws_connect===undefined) {
    window._ws_connect = {}
  }

  const onopen = data => {
    function ws_send() {
      for (const key in window._ws_connect) {
        window._ws_connected_send = true
        console.warn(window._ws_connect[key] + '')
        window._ws_connect[key](data)
      }
    }

    if (__flag['ws-connect']) {
      console.log('ws: open connection')
    }

    console.timeEnd('ws')
    window._ws_connected = true

    setTimeout(() => {
      ws_send()
    }, 1) // minimize intermitten

    setTimeout(() => {
      if (!window._ws_connected_send) {
        console.error('RETRY..........')
        ws_send()
      }
    }, 10) // minimize intermitten     
  }

  const onclose = function () {
    if (__flag['ws-connect']) {
      console.log('ws: close connection')
    }
  }

  const onmessage = function (e) {
    // if (__flag['ws-connect']) {
    //   console.log('on-message:', e.data)
    // }
    _ws_msgParser(event, event.data)
  }

  const url = `wss://localhost:3001/ws?page=${_ws_inIframe()}&url=${document.URL.split('?')[0]}`
  const ws = new WebSocket(url)
  console.time('ws')
  window._ws = ws

  ws.onopen = onopen
  ws.onclose = onclose
  ws.onmessage = onmessage
  if (__flag['ws-connect']) {
    console.log('ws: init connection')
  }
}
