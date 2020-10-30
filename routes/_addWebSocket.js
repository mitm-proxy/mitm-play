/* eslint-disable camelcase */
const c = require('ansi-colors')
const _match = require('./match')
const { injectWS } = require('./inject')
const { matched, searchKey, searchArr } = _match
const { fn: { _nameSpace }, router } = global.mitm

function replaceCSP (csp) {
  csp = csp.replace(/default-src[^;]+;/g, '')
  csp = csp.replace(/connect-src[^;]+;/g, '')
  csp = csp.replace(/script-src[^;]+;/g, '')
  csp = csp.replace(/style-src[^;]+;/g, '')
  return csp
}

const headerchg = headers => {
  let csp
  if (headers['content-security-policy']) {
    csp = replaceCSP(headers['content-security-policy'])
    headers['content-security-policy'] = csp
  } else if (headers['content-security-policy-report-only']) {
    csp = replaceCSP(headers['content-security-policy-report-only'])
    headers['content-security-policy-report-only'] = csp
  }
}

const addWebSocket = async function (reqs, responseHandler, _3d) {
  const { url, headers, browserName } = reqs
  const accpt = headers.accept + ''
  const { origin, referer } = headers
  if (origin || referer) {
    return
  }
  if (accpt === '*/*' || accpt.indexOf('text/html') > -1) {
    const search = searchArr({ typ: 'nosocket', url, browserName })
    const match = _3d ? search('_global_') : matched(search, reqs)
    if (match) {
      const { logs } = router._global_.config
      if (logs.nosocket && !match.hidden) {
        const { origin, pathname } = new URL(url)
        console.log(c.redBright(`>>> nosocket (${origin}${pathname})`))
      }
    } else {
      responseHandler.push(resp => {
        if (!_nameSpace(url)) {
          return
        }
        const { headers: h, status } = resp
        const contentType = h['content-type']
        const redirect = (status + '').match(/^30\d/)
        if (!redirect && contentType && contentType.match('text/html')) {
          const jsLib = matched(searchKey('jsLib'), reqs)
          resp.body = injectWS(resp, url, jsLib)
          if (global.mitm.argv.relaxcsp) {
            headerchg(h)
          }
        }
        return resp
      })
    }
  }
}

module.exports = addWebSocket
