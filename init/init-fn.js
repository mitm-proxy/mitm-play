const fs = require('fs-extra')
const fg = require('fast-glob')
const c = require('ansi-colors')
const chokidar = require('chokidar')

const { routeSort } = require('./chokidar/loadJS')
const { _routeSet, toRegex } = require('./fn/_route-set')
const { formToObj, objToForm } = require('./fn/form')
const { _proxy, _noproxy } = require('./fn/_proxies')
const { exec, execFile } = require('./fn/_exec-file')
const { tilde, home } = require('./fn/tildehome')
const _skipByTag = require('./fn/_skipbytag')
const _nameSpace = require('./fn/_namespace')
const _stringify = require('./fn/_stringify')
const _tldomain = require('./fn/_tldomain')
const _wsclient = require('./fn/_wsclient')
const _debounce = require('./fn/_debounce')
const relaxCSP = require('./fn/relaxCSP')
const _session = require('./fn/_session')
const _wsmitm = require('./fn/_wsmitm')
const _clear = require('./fn/_clear')
const _tag4 = require('./fn/_tag4')
const flist = require('./fn/flist')

module.exports = () => {
  global.mitm.lib = {
    routeSort,
    chokidar,
    execFile,
    exec,
    fg,
    fs,
    c
  }
  global.mitm.fn = {
    _nameSpace,
    _stringify,
    _skipByTag,
    _debounce,
    _routeSet,
    _tldomain,
    _wsclient,
    _session,
    _noproxy,
    _wsmitm,
    _proxy,
    _clear,
    _tag4,
    formToObj,
    objToForm,
    relaxCSP,
    toRegex,
    flist,
    tilde,
    home
  }
}
