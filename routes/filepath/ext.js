const types = {
  MP2T: 'ts',
  webm: 'webm',
  html: 'html',
  json: 'json',
  jpeg: 'jpeg',
  webp: 'webp',
  gif: 'gif',
  png: 'png',
  svg: 'svg',
  mp4: 'mp4',
  xml: 'xml',
  css: 'css',
  plain: 'txt',
  woff2: 'woff2',
  mpegURL: 'm3u8',
  javascript: 'js'
}

module.exports = (resp) => {
  const ext = ''
  let ctype = resp.headers['content-type'] || 'plain'
  if (ctype) {
    if (Array.isArray(ctype)) {
      ctype = ctype[0]
    }
    if (ctype.indexOf('script') > -1 && ctype.indexOf('json') === -1) {
      return 'js'
    } else {
      for (const key in types) {
        if (ctype.indexOf(key) > -1) {
          return types[key]
        }
      }
    }
  }
  return ext
}
