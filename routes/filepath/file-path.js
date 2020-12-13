const _home = /^[\t ]*~\/(.+)/
const _route = /^[\t ]*\.\.\/(.+)/
const _nmspace = /^[\t ]*\.\/(.+)/

function filePath (file, match, path) {
  const { fn: { home }, __args, argv, routes } = global.mitm
  let fmatch, fpath

  if (path) {
    fpath = file
  } else {
    fmatch = file.match(_home)
    if (fmatch) {
      fpath = home(`~/${fmatch[1]}`)
    } else {
      fmatch = file.match(_route)
      if (fmatch) {
        fpath = `${__args.route}/${fmatch[1]}`
      } else {
        fmatch = file.match(_nmspace)
        if (fmatch) {
          fpath = `${__args.route}/${match.namespace}/${fmatch[1]}`
        } else {
          const { workspace: ws } = routes._global_
          const workspace = match.workspace || ws
          fpath = workspace ? `${workspace}/${file}` : file
        }
      }
    }
  }
  let id = 1
  for (const key of match.arr.slice(1)) {
    fpath = fpath.replace(`:${id}`, key)
    id++
  }
  return fpath
}

module.exports = filePath
