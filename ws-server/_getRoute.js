const {typC, typA, typO} = require('../init/fn/_typs')
const rmethod = /^(GET|PUT|POST|DELETE|)#?\d*!?:([\w.#~-]+:|)(.+)/ // feat: tags in url

function noTagInRule(rule) {
  const arr = rule.match(rmethod) // feat: tags in url
  return arr ? `${arr[1]}:${arr[3]}` : rule
}

function uniq(value, index, self) {
  return self.indexOf(value) === index;
}

module.exports = () => {
  const __urls = {}
  const files = {}
  const {
    routes,
    __tag1,
    __tag2,
    __tag3,
    __tag4
  } = global.mitm
  const data = {
    routes,
    files,
    _tags_: {
      __tag1,
      __tag2,
      __tag3,
      __tag4,
      __urls
    }
  }
  const {source:s, routes: r} = global.mitm
  for (const ns in r) {
    const _secs = r[ns]
    const fpath = _secs.path
    if (fpath) {
      const arr = fpath.split('/')
      arr.pop()
      const path = arr.join('/')
      const content = s[ns]
      const title = ns
      files[ns] = {
        path,
        title,
        fpath,
        content
      }
    }

    const urls = {}
    for (const sec in _secs) {
      let pure = true
      if (typO.indexOf(sec)===-1||sec.indexOf(':')!==-1) {
        continue
      }
      const rules = _secs[sec]
      for (let _rule in rules) {
        const match = rules[_rule]
        const arr = _rule.match(rmethod)
        let url = _rule
        if (arr && arr[3]) {
          url = noTagInRule(_rule)
          pure =false
        } else if (match.tags) {
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
