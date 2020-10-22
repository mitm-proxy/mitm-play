const c = require('ansi-colors')
const _match = require('./match')
const { matched, searchFN } = _match

const jsonResponse = async function (reqs, responseHandler, _3d) {
  const search = searchFN('json', reqs)
  const match = _3d ? search('_global_') : matched(search, reqs)
  const { router, fn: { _skipByTag } } = global.mitm
  const { logs } = router._global_.config

  if (match && !_skipByTag(match, 'json')) {
    const { response } = match.route
    responseHandler.push(resp => {
      const contentType = `${resp.headers['content-type']}`
      if (contentType && contentType.match('application/json')) {
        if (logs.json) {
          console.log(c.yellowBright(match.log))
        }
        if (typeof (match.route) === 'string') {
          resp.body = match.route
        } else {
          if (response) {
            const resp2 = response(resp, reqs, match)
            resp2 && (resp = { ...resp, ...resp2 })
          }
        }
      }
      return resp
    })
  }
}

module.exports = jsonResponse
