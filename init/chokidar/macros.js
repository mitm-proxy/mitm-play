const {nodeResolve} = require('@rollup/plugin-node-resolve')
const commonjs = require('@rollup/plugin-commonjs')
const chokidar = require('chokidar')
const esbuild = require('esbuild')
const rollup = require('rollup')
const c = require('ansi-colors')
const fg = require('fast-glob')
const fs = require('fs-extra')

const hotKeys = obj => {
  window.mitm.macrokeys = {
    ...window.mitm.macrokeys,
    ...obj
  }
}

const autoclick = () => {
  setTimeout(() => {
    document.querySelector('.btn-autofill').click()
  }, 1000)
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

function __autoKeys(body) {
return (`
// [Ctrl] + [Alt] + [A] => run hotkey KeyA
// [Ctrl] + [Shift] => Hide / Show Buttons
if (window._ws_connect===undefined) {
  window._ws_connect = {}
}
window.mitm.fn.getCookie = ${getCookie + ''}
window.mitm.fn.autoclick = ${autoclick + ''}
window.mitm.fn.hotKeys = ${hotKeys + ''}
window.mitm._macros_ = () => {
  window.mitm.macrokeys = {}
}
window._ws_connect.macrosOnMount = data => {
  console.log('macros code executed after ws open', data)
}
${body}\n`).replace(/\n/, '')}

function __body1(global, _body1) {
return (`
const {macros} = window.mitm
${_body1}
if (typeof _body1==='function') {
  _body1 = _body1()
}
${global}
if (typeof global==='function') { 
  global = global()
}
window.mitm.macros = {
  ...global,
  ...macros,
  ..._body1,
}`).replace(/\n/, '')}

function __body2(app, _global, _body1, _body2) {
return (`
const {macros} = window.mitm
${_body1}
if (typeof _body1==='function') { 
  _body1 = _body1()
}
${_body2}
if (typeof _body2==='function') {
  _body2 = _body2()
}
${_global}
if (typeof global==='function') { 
  global = global()
}
window.mitm.macros = {
  ...global,
  ...macros,
  ..._body1,
  ..._body2
}`).replace(/\n/, '')}

function genBuild(msg, fpath) {
  const {argv,win32} = global.mitm
  let _global = ''
  let _body1 = ''
  let _body2 = ''
  let body = ''
  let path

  if (win32) {
    fpath = fpath.replace(/\\/g, '/')
  }
  const rpath = fpath.replace(`${argv.route}/`, '')
  console.log(c.red(`${msg}: ${rpath}`))

  path = `${argv.route}/_global_/_macros_/macros.js`
  if (fs.existsSync(path)) {
    _global = `let global = require('../../_global_/_macros_/macros')`
  } else {
    _global = 'let global = {}'
  }

  const [folder, fmacro, file, other] = rpath.split('/')
  if (other===undefined) {
    path = `${argv.route}/${folder}/${fmacro}/macros.js`
    if (fs.existsSync(path)) {
      _body1 = `let _body1 = require('./macros')`
    } else {
      _body1 = `let _body1 = {}`
    }
    if (file.match('@')) {
      const [app] = file.split('@')
      path = `${argv.route}/${folder}/${fmacro}/${file}`
      if (fs.existsSync(path)) {
        _body2 = `let _body2 = require('./${file}')`
      } else {
        _body2 = `let _body2 = {}`
      }
      body = __body2(app, _global, _body1, _body2)
    } else {
      body = __body1(_global, _body1)
    }
  }
  body = __autoKeys(body)
  const bpath = fpath.replace('macros.js', 'build.js')
  // console.log(c.redBright('Write'), bpath)
  fs.writeFile(bpath, body, err => {
    if (err) {
      console.log(c.redBright('Error saving'), err)
      return
    }
    const opath = fpath.replace('_macros_', '_bundle_')
    bundleEsbuild(bpath, opath)
    // bundleRollup(bpath, opath)
  })
}

function addMacro (path) {
  genBuild('add', path)
}

function chgMacro (path) {
  genBuild('chg', path)
}

function delMacro (path) {
  const { win32 } = global.mitm
  win32 && (path = path.replace(/\\/g, '/'))
  console.log(c.red(`Macro del: ${path}`))
}

module.exports = () => {
  const {argv} = global.mitm
  const glob = [
    `${argv.route}/*/_macros_/macros.js`,
    `${argv.route}/*/_macros_/*@macros.js`,
  ]

  // Initialize watcher.
  console.log(c.magentaBright('>>> Macros watcher:'), glob, {
    ignored: /_.*_/,
    persistent: true
  })
  const macrosWatcher = chokidar.watch(glob, { persistent: true })

  macrosWatcher // Add event listeners.
    .on('add', path => addMacro(path))
    .on('change', path => chgMacro(path))
    .on('unlink', path => delMacro(path))
  global.mitm.watcher.macrosWatcher = macrosWatcher
  const files = fg.sync(glob) //[`${argv.route}/*/_macros_/*@macros.js`]
  let glob2 = {}
  for (const fpath of files) {
    const pre = `${argv.route}/`
    const wopre = fpath.replace(/\\/g, '/').replace(pre, '')
    let [ns, p1, p2] = wopre.split('/')
    let [app] = p2.split(/@/)
    app==='macros.js' && (app = '$')
    glob2[`${argv.route}/${ns}/${p1}/${app}/*.js`] = true
  }
  glob2 = Object.keys(glob2).sort()
  const macro2Watcher = chokidar.watch(glob2, { persistent: true })

  function rebuild (path) {
    path = path.replace(/\\/g, '/')
    const [p1, p2] = path.split('_macros_/')
    let app = p2.split('/')[0]
    if (app!=='$') {
      app = `${p1}_macros_/${app}@macros.js`
    } else {
      app = `${p1}_macros_/macros.js`
    }
    genBuild('rebuild', app)
  }
  setTimeout(() => {
    console.log(glob2)
    macro2Watcher // Add event listeners.
    .on('add', path => rebuild(path))
    .on('change', path => rebuild(path))
    .on('unlink', path => rebuild(path))
    global.mitm.watcher.macro2Watcher = macro2Watcher      
  }, 1000)
}

function bundleEsbuild(bpath, opath) {
  esbuild.build({
    entryPoints: [bpath],
    outfile: opath,
    bundle: true,
    sourcemap: 'inline',
    target: ['chrome89'],
    minifyWhitespace: true,
    // minify: true,
  }).then(prm => {
    fs.removeSync(bpath)
  }).catch(() => process.exit(1))  
}

function bundleRollup(bpath, opath) {
  // see below for details on the options
  const inputOptions = {
    input: bpath,
    plugins: [
      nodeResolve({
        browser: true,
        // dedupe: ['svelte'],
        // preferBuiltins: false
      }),
      commonjs()
    ]
  };
  const outputOptions = {
    file: opath,
    sourcemap: 'inline',
    format: 'iife'
  };

  async function build() {
    // create a bundle
    const bundle = await rollup.rollup(inputOptions);
    console.log(bundle.watchFiles); // an array of file names this bundle depends on
    const { output } = await bundle.generate(outputOptions);

    for (const chunkOrAsset of output) {
      if (chunkOrAsset.type === 'asset') {
        console.log('Asset', chunkOrAsset);
      } else {
        console.log('Chunk', chunkOrAsset.modules);
      }
    }
    await bundle.write(outputOptions);
    await bundle.close();
  }
  build();
}