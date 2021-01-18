const c = require('ansi-colors')
const _match = require('./match')
const changeStatus = require('./change-status')
const addReplaceBody = require('./add-replace-body')
const { matched, searchFN } = _match

const cssResponse = async function (reqs, responseHandler, _3d) {
  const search = searchFN('css', reqs)
  const match = _3d ? search('_global_') : matched(search, reqs)
  const { __args, __flag, fn: { _skipByTag } } = global.mitm
  let resp, msg

  if (match && !_skipByTag(match, 'css')) {
    const { response, hidden } = match.route
    responseHandler.push(resp => {
      changeStatus(match, resp)
      const contentType = `${resp.headers['content-type']}`
      if (contentType && contentType.match('text/css')) {
        if (typeof (match.route) === 'string') {
          resp.body = addReplaceBody(resp.body, match)
        } else {
          if (response) {
            const resp2 = response(resp, reqs, match)
            resp2 && (resp = { ...resp, ...resp2 })
          }
        }
        if (!__flag.css || match.hidden || hidden) {
          msg = ''
        } else {
          msg = c.greenBright(match.log)
          __args.fullog && console.log(msg) // feat: fullog
        }
      }
      resp.log = msg ? {msg, mtyp: 'css'} : undefined // feat: fullog
      return resp
    })
    resp = undefined
  }
  return { match, resp }
}

module.exports = cssResponse
