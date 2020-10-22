const fs = require('fs-extra')
const c = require('ansi-colors')

function argsChg (id, key) {
  const { argv } = global.mitm
  if (argv[id]) {
    argv[key] = argv[id]
    delete argv[id]
  }
}

function obj (key, id) {
  const { argv } = global.mitm
  if (argv[id]) {
    if (argv[key] === undefined) {
      argv[key] = {}
    }
    argv[key][id] = argv[id]
  }
}

module.exports = () => {
  let { argv, path } = global.mitm
  const [, prm1] = argv._
  argv.profile = false

  let browser, saveArgs
  function loadProfile (profile) {
    const _prfl = `${path.home}/argv/${profile}.js`
    const exist = fs.existsSync(_prfl)
    if (!exist) {
      return false
    }
    saveArgs = JSON.parse(fs.readFileSync(_prfl))
    console.log(c.green(`>>> cmd: mitm-play ${saveArgs._args}`), `(${profile})`)
    // console.log(c.green(`>>> cmd: mitm-play ${JSON.stringify(saveArgs._args, null, 2)}`),`(${profile})`);
    return true
  }

  if (prm1 && loadProfile(prm1)) {
    argv.profile = true
  } else if (prm1 !== 'default') {
    loadProfile('default')
  }

  if (saveArgs && !argv.save) {
    let msg2 = process.argv.slice(2).join(' ')
    const arr2 = msg2.match(/=([^:]+:[^@]+)@\w+/)
    if (arr2) {
      // feat: hide password
      msg2 = msg2.replace(arr2[1], '******:******')
    }
    console.log(c.green(`>>> cmd2 mitm-play ${msg2}`))
    const {
      _argv: {
        browser: b,
        chromium,
        firefox,
        webkit,
        ...rest
      }
    } = saveArgs
    browser = b
    if (argv._.length === 0) {
      delete argv._
    }
    global.mitm.argv = { ...rest, ...argv }
    argv = global.mitm.argv
  }

  argsChg('c', 'relaxcsp')
  argsChg('d', 'delete')
  argsChg('g', 'group')
  argsChg('h', 'help')
  argsChg('i', 'insecure')
  argsChg('k', 'cookie')
  argsChg('l', 'lazylog')
  argsChg('n', 'nosocket')
  argsChg('p', 'pristine')
  argsChg('r', 'route')
  argsChg('s', 'save')
  argsChg('t', 'incognito')
  argsChg('u', 'url')
  argsChg('x', 'proxy')
  argsChg('z', 'lazyclick')

  argsChg('D', 'debug')
  argsChg('O', 'ommitlog')
  argsChg('R', 'redirect')
  argsChg('V', 'verbose')
  argsChg('X', 'proxypac')

  argsChg('C', 'chromium')
  argsChg('F', 'firefox')
  argsChg('W', 'webkit')

  obj('browser', 'chromium') // on Window: Chrome POST payload is missing!
  obj('browser', 'firefox')
  obj('browser', 'webkit')

  if (argv.debug) {
    process.env.DEBUG = 'pw:api'
  }

  if (browser === undefined || Object.keys(browser).length === 0) {
    browser = { chromium: true }
  }

  if (argv.browser === undefined || Object.keys(argv.browser).length === 0) {
    argv.browser = { ...browser }
  }
  for (const id in argv.browser) {
    const browser = argv.browser[id]
    if (typeof (browser) === 'string') {
      argv.browser[id] = browser.replace(/\\/g, '/')
    }
  }

  const { ommitlog } = argv
  if (ommitlog) {
    ommitlog.split(',').forEach(element => {
      argv.ommit[element] = true
    })
  }

  if (argv.incognito) {
    argv.pristine && (delete argv.pristine)
  } else if (argv.pristine === undefined) {
    argv.pristine = true
  }
}
