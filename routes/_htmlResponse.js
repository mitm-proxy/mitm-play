/* eslint-disable camelcase */
const c = require('ansi-colors')
const _match = require('./match')
const _inject = require('./inject')

const { matched, searchFN, searchKey } = _match
const { script_src, e_head, injectWS } = _inject

const htmlResponse = async function (reqs, responseHandler, _3d) {
  const search = searchFN('html', reqs)
  const match = _3d ? search('_global_') : matched(search, reqs)
  const { __args, __flag, fn: { _skipByTag } } = global.mitm

  if (match && !_skipByTag(match, 'html')) {
    responseHandler.push(resp => {
      const contentType = `${resp.headers['content-type']}`
      if (contentType && contentType.match('text/html')) {
        let msg = c.yellowBright(match.log)
        const len = match.log.length
        // feat: activity
        if (__args.activity) {
          const [actyp, actag] = __args.activity.split(':')
          if (actag && match.route.tags.match(`(^| )${actag}( |$)`)) {
            global.mitm.activity = {} // init rec/play sequences
            const msg2 = `[${actyp}:${actag}]`
            msg += actyp==='rec' ? c.red(msg2) : c.blueBright(msg2)
          }
        }
        if (__flag.html && !match.hidden && !match.route.hidden) {
          console.log(`${'-'.repeat(len)}\n${msg}`)
        }
        if (typeof (match.route) === 'string') {
          resp.body = match.route
        } else {
          const { el, js, src, response, ws } = match.route
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
