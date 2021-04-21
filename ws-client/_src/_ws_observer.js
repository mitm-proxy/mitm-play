/* global location, MutationObserver */
/* eslint-disable camelcase */
const _ws_namespace = require('./_ws_namespace')
const _ws_debounce = require('./_ws_debounce')
const _ws_vendor = require('./_ws_vendor')
const _ws_route = require('./_ws_route')

module.exports = () => {
  const { hostname: host } = location
  const namespace = _ws_namespace()
  const browser = _ws_vendor()
  const sshot = {}; const nodes = {}

  const route = _ws_route()
  if (route && route.screenshot) {
    const { observer: ob } = route.screenshot
    for (const id in ob) {
      let el = {}
      if (ob[id] === true) {
        el = {
          title: 'notitle',
          insert: true,
          remove: true
        }
      } else {
        const arr = ob[id].split(':')
        arr[1].split(',').map(e => {
          el[e] = true
        })
        el.title = arr[0]
      }
      sshot[id] = el
      nodes[id] = {
        insert: false,
        remove: true
      }
    }
  }

  let fname
  const callback = _ws_debounce(function () {
    const { observer: ob } = route.screenshot
    const _page = window['xplay-page']
    for (const id in nodes) {
      const el = document.body.querySelectorAll(id)
      if (el.length) {
        if (!nodes[id].insert) {
          nodes[id].insert = true
          if (nodes[id].remove !== undefined) {
            nodes[id].remove = false
          }
          if (typeof ob[id]==='function') {
            ob[id](el[0] || el)
          } 
          if (sshot[id].insert) {
            fname = location.pathname.replace(/^\//, '').replace(/\//g, '-')
            fname = `${fname}-${sshot[id].title}-insert`
            window.ws__send('screenshot', { namespace, _page, host, fname, browser })
          }
        }
      } else {
        if (!nodes[id].remove) {
          nodes[id].remove = true
          nodes[id].insert = false
          if (sshot[id].remove) {
            fname = location.pathname.replace(/^\//, '').replace(/\//g, '-')
            fname = `${fname}-${sshot[id].title}-remove`
            window.ws__send('screenshot', { namespace, _page, host, fname, browser })
          }
        }
      }
    }
  }, 100)

  document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(callback)
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true
    })
  })
}
