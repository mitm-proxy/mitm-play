module.exports = () => {
  const { files: { _log, log } } = global.mitm
  const logSorted = log.sort()
  const data = {}
  logSorted.forEach(element => {
    const [path, title] = element.split('@')
    data[element] = {
      ..._log[element],
      title,
      path
    }
  })
  return data
}
