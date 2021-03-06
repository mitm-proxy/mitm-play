/* global location, history, chrome, Event, CssSelectorGenerator */
/* eslint-disable camelcase */
const _ws_namespace = require('./_ws_namespace')
const _ws_vendor = require('./_ws_vendor')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = () => {
  const containerStyle1 = 'position: fixed;z-index: 99999;right: 3px;'
  const containerStyle2 = 'position: fixed;z-index: 99999;left:  3px;'
  const containerStyle3 = 'position: fixed;z-index: 99999;right: 3px; top: 20px; text-align: end;'
  const buttonStyle = ''
  const style = `
  .mitm-btn {
    border: none;
    font-size: 8px;
    cursor: pointer;
    border-radius: 3px;
    font-family: monaco, Consolas, "Lucida Console", monospace;
  }
  .mitm-btn:hover{
    text-decoration:underline;
  }
  .bgroup-right .mitm-br,
  .bgroup-left .mitm-br{
    display:table;
  }`
  const event = new Event('urlchanged')
  let container = {
    right3: {},
    right: {},
    left: {},
  }
  let ctrl = false
  let button = {}
  let bgroup = {
    right3: {},
    right: {},
    left: {},
  }
  let intervId
  let observerfn = []

  function toRegex (pathMsg) {
    let [path, msg] = pathMsg.split('=>').map(item => item.trim())
    path = path.replace(/\./g, '\\.').replace(/\?/g, '\\?')
    return { path, msg }
  }

  function createButton(buttons, pos) {
    let br
    for (const id in buttons) {
      const [caption, color, klas] = id.split('|')
      const btn = document.createElement('button')
      const fn  = buttons[id]
      btn.onclick = async e => {
        let arr = fn(e)
        if (arr instanceof Promise) {
          arr = await arr
        }
        if (Array.isArray(arr)) {
          await play(arr)
        }
      }
      btn.innerText = caption
      btn.classList.add('mitm-btn')
      btn.classList.add(`${pos}`)
      btn.classList.add(klas || caption)
      btn.style = buttonStyle + (color ? `background: ${color};` : '')
      if (pos==='right') {
        br = document.createElement('span')
        br.innerHTML = '&nbsp;'
        bgroup[pos].appendChild(br)
        bgroup[pos].appendChild(btn)
      } else {
        br = document.createElement('span')
        br.className = 'mitm-br'
        bgroup[pos].appendChild(btn)
        bgroup[pos].appendChild(br)
      }
    }
  }

  function setButtons (buttons, position) {
    if (bgroup[position]) {
      bgroup[position].innerHTML = ''
      createButton(buttons, position)
    }
  }

  let debunk
  let onces = {} // feat: onetime fn call
  async function urlChange (event) {
    const namespace = _ws_namespace()
    if (window.mitm.autofill) {
      delete window.mitm.autofill
    }
    if (window.mitm.autointerval) {
      clearInterval(intervId)
      delete window.mitm.autointerval
    }
    if (window.mitm.autobuttons) {
      delete window.mitm.autobuttons
    }
    if (window.mitm.rightbuttons) {
      delete window.mitm.rightbuttons
    }
    if (window.mitm.leftbuttons) {
      delete window.mitm.leftbuttons
    }
    if (window.mitm.macrokeys) {
      delete window.mitm.macrokeys
    }
    if (namespace) {
      const {href, origin} = location
      const _href = href.replace(origin, '')
      const {_macros_, macros} = window.mitm
      observerfn = []
      for (const key in macros) {
        const { path, msg } = toRegex(key)
        if (_href.match(path)) {
          button.innerHTML = msg || 'Entry'
          _macros_ && _macros_()
          let fn = macros[key]()
          if (fn instanceof Promise) {
            fn = await fn
          }
          if (typeof fn === 'function') {
            observerfn.push(fn)
          } 
          debunk && clearTimeout(debunk)
          debunk = setTimeout(() => {
            onces = {} // feat: onetime fn call
            debunk = undefined
            const {autobuttons, rightbuttons, leftbuttons} = window.mitm
            rightbuttons && setButtons(rightbuttons, 'right3')
            leftbuttons && setButtons(leftbuttons, 'left')
            if (window.mitm.autofill) {
              autobuttons && setButtons({
                ...autobuttons,
                'Entry'() {
                  let {autofill} = window.mitm
                  if (typeof autofill === 'function') {
                    autofill = autofill()
                  }
                  play(autofill)
                }
              }, 'right')
            } else {
              autobuttons && setButtons(autobuttons, 'right')
            }
          }, 0)
        }
      }
    }
    container.right3.style = containerStyle3
    container.right.style = containerStyle1
    container.left.style  = containerStyle2
    const visible = (window.mitm.autofill)
    button.style = buttonStyle + (visible ? 'background-color: azure;' : 'display: none;')
    if (typeof (window.mitm.autointerval) === 'function') {
      intervId = setInterval(window.mitm.autointerval, 500)
    }
    ctrl = false
  }

  const vendor = _ws_vendor()
  if (['firefox', 'webkit'].includes(vendor) || (chrome && !chrome.tabs)) {
    document.querySelector('html').addEventListener('keydown', keybCtrl)
    window.addEventListener('urlchanged', urlChange)
    if(document.readyState !== 'loading') {
      init();
    } else {
      window.addEventListener('DOMContentLoaded', init)
    }    
  } else {
    return
  }

  const fn = history.pushState
  history.pushState = function () {
    fn.apply(history, arguments)
    compareHref()
  }

  _play = json => {
    return new Promise(function(resolve, reject) {
      try {
        window.ws__send('autofill', json, resolve)
      } catch (error) {
        reject(error)
      }
    })
  }

  _post = json => {
    return new Promise(function(resolve, reject) {
      try {
        const config = {
          method: 'POST',
          headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(json)
        }
        fetch('/mitm-play/play.json', config)
        .then(function(response) { resolve(response.json())})
        .then(function(data    ) { resolve(data)           })
      } catch (error) {
        reject(error)
      }
    })
  }

  async function play (autofill) {
    const {__args} = window.mitm
    if (autofill) {
      if (typeof (autofill) === 'function') {
        autofill = autofill()
      }
      const browser = _ws_vendor()
      const lenth = autofill.length
      const _page = window['xplay-page']
      const _frame = window['xplay-frame']
      const _json = {autofill, browser, _page, _frame}
      console.log(lenth === 1 ? `  ${autofill}` : JSON.stringify(autofill, null, 2))
      let result
      if ([true, 'off'].includes(__args.nosocket)) {
        result = await _post(_json)
      } else {
        result = await _play(_json)
      }
      return result
    }
  }
  window.mitm.fn.play = play
  window.mitm.fn.wait = wait
  
  function keybCtrl (e) {
    const { macrokeys } = window.mitm
    if (e.ctrlKey && e.key === 'Shift') {
      ctrl = !ctrl
      container.right3.style = containerStyle3 + (!ctrl ? '' : 'display: none;')
      container.right.style  = containerStyle1 + (!ctrl ? '' : 'display: none;')
      container.left.style   = containerStyle2 + (!ctrl ? '' : 'display: none;')
    } else if (e.ctrlKey && e.altKey) {
      console.log({ macro: `ctrl + alt + ${e.code}` })
      if (macrokeys) {
        let macro = macrokeys[e.code]
        if (macro) {
          macro = macro()
          if (Array.isArray(macro)) {
            let macroIndex = 0
            const interval = setInterval(() => {
              let selector = macro[macroIndex]
              if (selector.match(/^ *[=-]>/)) {
                const activeElement = CssSelectorGenerator.getCssSelector(document.activeElement)
                selector = `${activeElement} ${selector}`
              }
              play([selector])

              macroIndex += 1
              if (macroIndex >= macro.length) {
                clearInterval(interval)
              }
            }, 100)
          }
        }
      }
    }
  }

  const {location} = document
  let oldHref = location.href
  let oDebunk = undefined
  function compareHref(nodes) {
    // console.log('DOM mutated!')
    if (oldHref != location.href) {
      window.dispatchEvent(event)
      oldHref = location.href
    } else {
      if (observerfn.length) {
        oDebunk && clearTimeout(oDebunk)
        oDebunk = setTimeout(()=> {
          oDebunk = undefined
          for (const fn of observerfn) {
            const name = fn.name
            if (name && name.match(/Once$/)) {
              if (onces[name]) { // feat: onetime fn call
                continue
              } else {
                onces[name] = true
              }
            }
            fn(nodes)
          }
          const {autobuttons, rightbuttons, leftbuttons} = window.mitm
          rightbuttons && setButtons(rightbuttons, 'right3')
          leftbuttons && setButtons(leftbuttons, 'left')
          const { autofill } = window.mitm
          if (autofill) {
            autobuttons && setButtons({
              ...autobuttons,
              'Entry'() {play(autofill)}
            }, 'right')
          } else {
            autobuttons && setButtons(autobuttons, 'right')
          }

        }, 100)
      }
    }
  }

  function init() {
    const html = document.querySelector('html')
    const htmlref = html.firstElementChild
    const styleButtons = document.createElement('style')
    const divTopRight3 = document.createElement('div')
    const divTopRight = document.createElement('div')
    const divTopLeft = document.createElement('div')

    styleButtons.innerHTML = style
    divTopRight3.innerHTML = `<span class="bgroup-right"></span>`
    divTopRight.innerHTML  = `<span class="bgroup-right"></span>`
    divTopLeft.innerHTML   = `<span class="bgroup-left"></span>`
    divTopRight.className  = 'mitm autofill-container'
    divTopLeft.className   = 'mitm autofill-container'
    divTopRight3.style = containerStyle3
    divTopRight.style  = containerStyle1
    divTopLeft.style   = containerStyle2

    html.insertBefore(styleButtons, htmlref)
    html.insertBefore(divTopRight3, htmlref)
    html.insertBefore(divTopRight, htmlref)
    html.insertBefore(divTopLeft, htmlref)
    setTimeout(() => {
      container.right3 = divTopRight3
      container.right  = divTopRight
      container.left   = divTopLeft
      button.style  = `${buttonStyle}background-color: azure;`
      bgroup.right3 = divTopRight3.children[0]
      bgroup.right = divTopRight.children[0]
      bgroup.left  = divTopLeft.children[0]
      urlChange(event)
      observed()
    }, 0)
  }

  const observer = new MutationObserver(compareHref);
  window.observer = observer
  function observed() {
    observer.disconnect()
    observer.observe(document.body, {subtree: true, childList: true})
  }

}
