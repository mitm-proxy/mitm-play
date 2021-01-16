const c = require('ansi-colors')
const typs = require('./_typs')

const { typC, typA, typO } = typs
const rmethod = /^(GET|PUT|POST|DELETE|)#?\d*!?:([\w.#~-]+:|)(.+)/ // feat: tags in url
const tgInUrl = /:[\w.#~-]+:/ // feat: tags in url

function toRegex (str, flags = '') {
  return new RegExp(str
    .replace(/\//g, '\\/')
    .replace(/\.([^*+]|$)/g, (m, p1) => `\\.${p1}`)
    .replace(/\?/g, '\\?'), flags)
}

function routerSet (router, typ, method, str) {
  let regex // feat: url start with method: ie: GET:/api/login
  if (method) {
    router[typ][`${str}~method`] = method[1]
    regex = toRegex(method.pop())
  } else {
    regex = toRegex(str)
  }
  router[typ][str] = regex
}

const fkeys = x => x !== 'tags' && x !== 'contentType'

function _routeSet (_r, namespace, print = false) {
  const { routes, __mock } = global.mitm
  const r = {}
  for (let key in _r) {
    const id = key.replace(/ +/, ' ').trim()
    if (id===key) {
      r[key] = _r[key]
    } else {
      r[id] = _r[key]
    }
  }
  routes[namespace] = r
  if (namespace === '_global_') {
    routes._global_.mock = {
      ...routes._global_.mock,
      ...__mock
    }
  }
  const tags = {}
  const urls = {}
  const router = {}
  router._namespace_ = toRegex(namespace.replace(/~/, '[^.]*'))

  const _typlist = function (typs) {
    const typlist = Object.keys(r).filter(x => {
      const [sec, _tags] = x.split(':') // ie: 'css:1.no-ads active': {...}
      if (sec===typs) {
        if (_tags) {
          const arr = _tags.split(/ +/)
          const tag = `${sec}:${arr.shift()}`
          if (arr.length) {
            tags[tag] = {state: true, tags: arr} // feat: update __tag2  
          } else {
            tags[x] = {state: true} // feat: update __tag2
          }
        }
        return true
      }
    })
    r[typs] && typlist.unshift(typs)
    return typlist
  }

  for (const typs of typC) {
    _typlist(typs)
  }

  for (const typs of typA) {
    const typlist = _typlist(typs)
    for (const typ of typlist) {
      router[typ] = {}
      for (const str of r[typ]) {
        const method = str.match(rmethod)
        routerSet(router, typ, method, str)
      }
    }
  }

  function _nsstag(typ, str){
    // feat: remove tag from url/rule for __tag3
    const arrTag = str.match(rmethod)
    if (arrTag) {
      const [, method,, path] = arrTag
      str = method ? `${method}:${path}` : path // remove from url
    }
    typ = typ.split(':')[0] // remove from rule
    if (urls[str] === undefined) {
      urls[str] = {}
    }
    const nss = urls[str]
    if (nss[typ] === undefined) {
      nss[typ] = {}
    }
    return {nss, nsstag: nss[typ]}
  }
  function addType (typ) {
    router[typ] = {}
    for (const str in r[typ]) {
      const method = str.match(rmethod)
      routerSet(router, typ, method, str)
      const site = r[typ][str]
      if (site!==undefined) { // fix:empty-string{'GET:/google': ''}
        if (site.tags) {
          if (Array.isArray(site.tags)) {
            site.tags = site.tags.join(' ')
          }
          const {nss, nsstag} = _nsstag(typ, str)
          const ctype = site.contentType ? `[${site.contentType.join(',')}]` : ''
          const keys = Object.keys(site).filter(fkeys).join(',')
          nss[`:${typ}`] = `${ctype}<${keys}>`.replace('<>', '')

          if (site.tags.match(':')) {
            throw new Error('char ":" cannot be included in tags!')
          }
          const arr = site.tags.split(/ +/)
          for (const tag of arr) {
            nsstag[tag] = true
            tags[tag] = {state: true} // feat: update __tag2
          }
        }
        // feat: tags in url
        if (str.match(tgInUrl) && method[2]!=='hidden:') {
          const {nss, nsstag} = _nsstag(typ, str)
          const tag = `url:${method[2].split(':')[0]}`
          nss[`:${typ}`] = ''
          nsstag[tag] = true
          tags[tag] = {state: true} // feat: update __tag2
        }

        if (site.contentType) {
          const contentType = {}
          for (const typ2 of site.contentType) {
            if (contentType[typ2]) {
              const ct = site.contentType.join("', '")
              throw new Error([
                'contentType should be unique:',
                `${namespace}.${typ}['${str}'].contentType => ['${ct}']`])
            }
            contentType[typ2] = toRegex(typ2)
          }
          router[typ][`${str}~contentType`] = contentType
        }
      }
    }
  }

  // feat: _global_.flag
  if (namespace === '_global_') {
    typO.unshift('args', 'flag')
  }
  for (const typs of typO) {
    const typlist = _typlist(typs)
    for (const typ of typlist) {
      addType(typ)
    }
  }

  if (namespace === '_global_') {
    router.config = global.mitm.router._global_.config
  }
  global.mitm.router[namespace] = router
  if (Object.keys(tags).length) {
    global.mitm.__tag2[namespace] = tags
    global.mitm.__tag3[namespace] = urls
  } else {
    if (global.mitm.__tag2[namespace]) {
      delete global.mitm.__tag2[namespace]
    }
    if (global.mitm.__tag3[namespace]) {
      delete global.mitm.__tag3[namespace]
    }
  }
  return r
}

module.exports = {
  _routeSet,
  toRegex
}
