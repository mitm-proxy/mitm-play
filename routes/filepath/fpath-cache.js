const { root, filename } = require('./file-util')
const filePath = require('./file-path')

module.exports = ({ match, reqs }) => {
  let { host, route: { at, path, file } } = match
  const fpath = filename(match)
  let fpath1, fpath2;

  (at === undefined) && (at = '')

  let stamp1, stamp2
  if (at.match(/^\^/)) {
    at = at.slice(1)
    stamp1 = `${at}/${host}${fpath}`
    stamp2 = `${at}/${host}/$${fpath}`
  } else {
    at && (at = `/${at}`)
    stamp1 = `${host}${at}${fpath}`
    stamp2 = `${host}${at}/$${fpath}`
  }
  let _root
  if (path) {
    _root = filePath(path, match)
  } else if (file) {
    const fullpath = filePath(file, match).split('/')
    file = fullpath.pop()
    _root = fullpath.join('/')
  } else {
    _root = root(reqs, 'cache')
  }
  const { method } = reqs
  if (file) {
    let id = 1
    for (const key of match.arr.slice(1)) {
      file = file.replace(`:${id}`, key)
      id++
    }
    fpath1 = `${_root}/${file}~${method}`
    fpath2 = `${_root}/$/${file}~${method}.json`
  } else {
    fpath1 = `${_root}/${stamp1}~${method}`
    fpath2 = `${_root}/${stamp2}~${method}.json`
  }
  return { fpath1, fpath2 }
}
