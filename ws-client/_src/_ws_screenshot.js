/* global location, mitm */
/* eslint-disable camelcase */
const _screenshot = require('./_screenshot')
const _ws_namespace = require('./_ws_namespace')
const _ws_vendor = require('./_ws_vendor')

let act
function screenshot (e) {
  if (mitm.argv.lazyclick) {
    if (mitm.screenshot) {
      window.mitm.screenshot = undefined
      console.log('>>> delay action')
      return
    }
    if (act) {
      act = undefined
      return
    }
  }
  const namespace = _ws_namespace()
  const browser = _ws_vendor()
  const host = location.origin.replace('://' ,'~~')
  const route = window.mitm.routes[namespace]
  const { selector } = route.screenshot

  const arr = document.body.querySelectorAll(selector)
  const fname = location.pathname.replace(/^\//g, '~')
  const delay = mitm.argv.lazyclick === true ? 700 : mitm.argv.lazyclick
  for (const el of arr) {
    let node = e.target
    while (el !== node && node !== document.body) {
      node = node.parentNode
    }
    if (node !== document.body) {
      const _page = window['xplay-page']
      const params = { namespace, _page, host, browser }
      params.fname = fname==='~' ? '~_' : fname
      _screenshot(params)
      if (mitm.argv.lazyclick) {
        // delay action to finish screenshot
        window.mitm.screenshot = e.target
        e.stopImmediatePropagation()
        e.stopPropagation()
        e.preventDefault()
        setTimeout(() => {
          act = window.mitm.screenshot
          if (act) {
            act.click()
            act = undefined  
          } else {
            console.log('delay action undefined');
          }
        }, delay)
      }
      return
    }
  }
}

module.exports = () => {
  const route = window.mitm.routes[_ws_namespace()]
  if (route && route.screenshot) {
    window.addEventListener('DOMContentLoaded', () => {
      document.querySelector('body').addEventListener('click', screenshot)
    })
  }
}
