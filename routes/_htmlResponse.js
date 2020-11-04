/* eslint-disable camelcase */
const c = require('ansi-colors')
const _match = require('./match')
const _inject = require('./inject')
const setSession = require('./set-session')

const { matched, searchFN, searchKey } = _match
const { script_src, e_head, injectWS } = _inject

const htmlResponse = async function (reqs, responseHandler, _3d) {
  const search = searchFN('html', reqs)
  const match = _3d ? search('_global_') : matched(search, reqs)
  const { router, fn: { _skipByTag } } = global.mitm
  const { logs } = router._global_.config

  if (match && !_skipByTag(match, 'html')) {
    responseHandler.push(resp => {
      const contentType = `${resp.headers['content-type']}`
      if (contentType && contentType.match('text/html')) {
        const len = match.log.length
        if (logs.html && !match.hidden && !match.route.hidden) {
          console.log(`${'-'.repeat(len)}\n${c.yellowBright(match.log)}`)
        }
        if (typeof (match.route) === 'string') {
          resp.body = match.route
        } else {
          const { el, js, src, session, response, ws } = match.route
          setSession(reqs, session)
          if (js) {
            const inject = _inject[el] || e_head
            resp.body = inject(resp.body, js)
          }
          if (src) {
            resp.body = script_src(resp.body, src)
          }
          if (response) {
            const resp2 = response(resp, reqs, match)
            resp2 && (resp = { ...resp, ...resp2 })
          }
          if (ws) {
            const jsLib = matched(searchKey('jsLib'), reqs)
            injectWS(resp, reqs.url, jsLib)
          }
        }
      }
      return resp
    })
    return match
  }
}

module.exports = htmlResponse
