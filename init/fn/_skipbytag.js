const c = require('ansi-colors')

function _skipByTag (match, typ) {
  let tags
  const { __tag3 } = global.mitm
  const { namespace, key, url } = match
  if (__tag3._global_ && __tag3._global_[key]) {
    tags = __tag3._global_[key][typ]
  } else if (__tag3[namespace] && __tag3[namespace][key]) {
    tags = __tag3[namespace][key][typ]
  }
  if (tags) {
    for (const tag in tags) {
      if (tags[tag] === false) {
        const { origin, pathname } = new URL(url)
        const msg = pathname.length <= 100 ? pathname : pathname.slice(0, 100) + '...'
        console.log(c.magentaBright(`>>> tags (${tag}).match(${match.key}) ${origin}${msg}`))
        return true
      }
    }
  }
  return false
}

module.exports = _skipByTag
