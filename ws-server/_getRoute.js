const {typC, typA, typO} = require('../init/fn/_typs')

function noTagInRule(rule) {
  const { rmethod } = global.mitm.fn
  const arr = rule.match(rmethod) // feat: tags in url
  return arr ? `${arr[1]}:${arr[3]}` : rule
}

function uniq(value, index, self) {
  return self.indexOf(value) === index;
}

module.exports = () => {
  const {routes: r, fn } = global.mitm
  const { rmethod } = fn
  const __urls = {}
  const files = {}
  const {
    source:s,
    routes,
    __tag1,
    __tag2,
    __tag3,
    __tag4
  } = global.mitm
  const routez = Object.keys(r).filter(x=>!x.match('@'))
  const routey = Object.keys(r).filter(x=>x.match('@'))
  const routel = {} // feat: reference to _subns route
  for (const item of routey) {
    const [itm, ns] = item.split('@')
    if (!routel[ns]) {
      routel[ns] = {list: {}, _subns: ''}
    }
    routel[ns].list[item] = false
  }
  const data = {
    routel,
    routes,
    routez,
    files,
    _tags_: {
      __tag1,
      __tag2,
      __tag3,
      __tag4,
      __urls
    }
  }
  for (const ns in r) {
    const _secs = r[ns]
    let fpath = _secs.path
    if (fpath) {
      const arr = fpath.split('/')
      arr.pop()
      const path = arr.join('/')
      let content = s[ns]
      let title = ns
      files[ns] = {
        path,
        title,
        fpath,
        content
      }
      const macros = `${ns}/macros`
      if (s[macros]) {
        title = macros
        content = s[macros]
        const file = fpath.split('/').pop()
        fpath = fpath.replace(file, `_macros_/${file}`) // feat: _macros_
        fpath = fpath.replace('index.js', 'macros.js')
        files[macros] = {
          path,
          title,
          fpath,
          content
        }
      }
    }

    const urls = {}
    for (const sec in _secs) {
      if (typO.indexOf(sec)===-1||sec.indexOf(':')!==-1) {
        continue
      }
      const rules = _secs[sec]
      for (let _rule in rules) {
        const match = rules[_rule]
        const arr = _rule.match(rmethod)
        let url = _rule
        let pure = true // notag in Effected URL
        if (arr && arr[2]) { // check tag in URL
          url = noTagInRule(_rule)
          pure =false
        } else if (match.tags) { // check tags inside rule
          pure =false
        }
        if (sec==='flag' || sec==='args') {
          url = `${url}:${match}`
        }
        if (urls[url]===undefined) {
          urls[url] = {
            secs: {},
            ctyp: [],
            tags: ['notag'],
          }
        }
        if (match.contentType) {
          const arr = urls[url].ctyp.concat(match.contentType)
          urls[url].ctyp = arr.filter(uniq)
        }
        urls[url].secs[sec] = true
        urls[url].pure = pure
      }
    }
    __urls[ns] = urls
  }
  return data
}
