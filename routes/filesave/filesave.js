const fs = require('fs-extra')
const c = require('ansi-colors')
const { logmsg } = global.mitm.fn
module.exports = ({ fpath1, body }, { fpath2, meta }, typ) => {
  fs.ensureFile(fpath1, err => {
    if (err) {
      logmsg(c.bgYellowBright.bold.red('>>> Error saving body'), fpath1)
    } else {
      fs.writeFile(fpath1, body, err => {
        err && logmsg(c.bgYellowBright.bold.red(`>>> Error write body ${typ}`), err)
      })
    }
  })
  fs.ensureFile(fpath2, err => {
    if (err) {
      logmsg(c.bgYellowBright.bold.red('>>> Error saving meta'), fpath2)
    } else {
      fs.writeFile(fpath2, JSON.stringify(meta, null, 2), err => {
        err && logmsg(c.bgYellowBright.bold.red(`>>> Error write meta ${typ}`), err)
      })
    }
  })
}
