const attach = require('../playwright/attach')

module.exports = async ({ data }) => {
  const c = require('ansi-colors')
  const { autofill, browser: b, _page, _frame } = data
  const browser = global.mitm.browsers[b]
  let page = await browser.currentTab(_page, _frame)
  let oldPage = page

  console.log(c.greenBright('>>> autofill'))
  let lastObj;
  for await (let obj of autofill) {
    if (typeof (obj) === 'string') {
      console.log(c.greenBright(`   ${obj}`))
      if (lastObj && obj.match(/^ *[=-]>/)) {
        obj = `${lastObj.split(/^(.*)([=-]>)/)[1]}${obj}`
      }
      lastObj = obj
      const [selector, typ, value] = obj.match(/^(.*)([=-]>)(.*)$/).slice(1).map(x => x.trim())
      if (typ === '=>') {
        obj = { selector, value }
      } else if (typ === '->') {
        const [act, store] = value.split('~>').map(x => x.trim())
        if (store) {
          obj = { selector, act, store }
        } else {
          obj = { selector, act: value }
        }
      } else {
        continue
      }
    } else {
      console.log(c.greenBright(`${JSON.stringify(obj, null, 2)}`))
    }
    /**
     * valid variations
     * =========================
     * input[name="firstname"]=>
     * => how are you
     * -> newpage ~> https://mailinator.com
     * #addOverlay -> type ~> widi
     * -> press ~> Enter
     * #inbox_field -> wait
     * -> save ~> getAttribute~class:mailinator
     * -> close
     * input[name="email"] => :mailinator
     */
    const {
      store = '',
      selector,
      value,
      act,
    } = obj

    if (act) {
      const [action, val] = act.split(':')
      let options = {delay: val ? +val : 100}
      if (action === 'type') {
        await input('type', selector, store, options)
      } else if (action === 'wait') {
        await page.waitForSelector(selector)
      } else if (action === 'fill') {
        await page.fill(selector, store, options)
      } else if (action === 'press') {
        await page.press(selector, store)
      } else if (action === 'click') {
        await page.click(selector, store)
      } else if (action === 'focus') {
        await page.focus(selector)
      } else if (action === 'check') {
        await page.check(selector)
      } else if (action === 'uncheck') {
        await page.uncheck(selector)
      } else if (action === 'selectOption') {
        await page.selectOption(selector, store)
      } else if (action === 'newpage') {
        page = await browser.newPage()
        attach(page)
        await page.goto(store)
      } else if (action === 'close') {
        await page.close()
        await oldPage.bringToFront()
        page = oldPage
      } else if (action === 'save') {
        const obj2 = await page.$eval(selector, (e, opt) => {
          const [attr, key] = opt.split(':')
          const [id1, id2] = attr.split('~')
          const value = id2 ? e[id1](id2) : e[id1]
          return {key, value}
        }, store);
        await oldPage.$eval('body', (e, obj2) => {
          const {key, value: val} = obj2
          localStorage.setItem(key, val)
        }, obj2);
      }
    } else if (value) {
      await input('fill', selector, value)
    }
  }
  return { ok: 'OK' }
  async function input(act, selector, value) {
    if (value.match(/^:/)) {
      value = await page.$eval('body', (e, key) => {
        return localStorage.getItem(key)
      }, value.slice(1));
    }
    page[act](selector, value)
  }
}

