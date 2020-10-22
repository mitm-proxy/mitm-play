const c = require('ansi-colors')
const _global = require('./global')
const _client = require('./client')
const $getLog = require('./_getLog')
const $autofill = require('./_autofill')
const $getCache = require('./_getCache')
const $getRoute = require('./_getRoute')
const $openHome = require('./_openHome')
const $codeHome = require('./_codeHome')
const $saveTags = require('./_saveTags')
const $saveRoute = require('./_saveRoute')
const $openRoute = require('./_openRoute')
const $screencap = require('./_screencap')
const $clearLogs = require('./_clearLogs')
const $setClient = require('./_setClient')
const $getContent = require('./_getContent')

// accessible from client
const wscmd = {
  ..._global(),
  ..._client(),
  $getContent,
  $setClient,
  $clearLogs,
  $screencap,
  $saveRoute,
  $openRoute,
  $saveTags,
  $openHome,
  $codeHome,
  $getRoute,
  $getCache,
  $autofill,
  $getLog
}
global.mitm.wscmd = wscmd

module.exports = (client, msg) => {
  const { logs } = global.mitm.router._global_.config
  if (logs['ws-receive']) {
    if (msg.length > 97) {
      console.log(c.blue('>>> ws-message: `%s...`'), msg.slice(0, 97))
    } else {
      console.log(c.blue('>>> ws-message: `%s`'), msg)
    }
  }
  const arr = msg.replace(/\s+$/, '').match(/^ *([\w:]+) *(\{.*)/)
  if (arr) {
    let [, cmd, json] = arr
    try {
      if (typeof (json) === 'string') {
        json = JSON.parse(json)
      }
    } catch (error) {
      console.error(json, error)
    }
    if (wscmd[cmd]) {
      wscmd[cmd].call(client, json)
    } else {
      const cmd2 = `$${cmd.split(':')[0]}`
      if (wscmd[cmd2]) {
        const data = wscmd[cmd2].call(client, json)
        client.send(`${cmd}${JSON.stringify({ data })}`)
      }
    }
  }
}
