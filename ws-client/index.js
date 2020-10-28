'use strict';

/* global location */
var _ws_postmessage = () => {
  function receiveMessage (event) {
    if (window.mitm.client.postmessage) {
      console.log(`>>> Postmessage: ${event.origin} => https://${location.host}`, event.data);
    }
  }
  window.addEventListener('message', receiveMessage, false);

  // if (!chrome.windows) {
  //   function reportWindowSize() {
  //     const {innerWidth, innerHeight} = window;
  //     console.log({innerWidth, innerHeight});
  //   }
  //   window.addEventListener("resize", reportWindowSize);
  // }
};

var _ws_client = () => {
  let windowRef;
  return {
    // ex: ws__help()
    _help ({ data }) {
      console.log(data);
    },
    // ex: ws__ping("there")
    _ping ({ data }) {
      console.log(data);
    },
    // ex: ws__open({url: "https://google.com"})
    _open ({ data }) {
      const features = 'directories=0,titlebar=0,toolbar=0,location=0,status=0,menubar=0,width=800,height=600';
      windowRef = window.open(data.url, '_logs', features);
      windowRef.blur();
    },
    // ex: ws__style('.intro=>background:red;')
    _style ({ data }) {
      const { q, css } = data;
      document.querySelectorAll(q).forEach(
        node => (node.style.cssText = css)
      );
    },
    // ex: ws__
    _files ({ typ, data }) {
      const { files } = window.mitm;
      console.warn(`receive brodcast ${typ}`);
      /**
       * event handler after receiving ws packet
       * ie: window.mitm.files.route_events = {eventObject...}
       */
      for (const key in files[`${typ}_events`]) {
        console.warn(files[`${typ}_events`][key] + '');
        files[`${typ}_events`][key](data);
      }
    },
    _setClient ({ data }) {
      console.log('_setClient', data);
      window.mitm.client = data;
    }
  }
};

/* eslint-disable camelcase */
const _ws_wccmd = _ws_client();

var _ws_msgParser = (event, msg) => {
  if (window.mitm.argv.debug) {
    if (msg.length > 40) {
      console.log('>>> ws-message: `%s...`', msg.slice(0, 40));
    } else {
      console.log('>>> ws-message: `%s`', msg);
    }
  }
  const arr = msg.replace(/\s+$/, '').match(/^ *([\w:]+) *(\{.*)/);
  if (arr) {
    let [, cmd, json] = arr;
    try {
      if (typeof (json) === 'string') {
        json = JSON.parse(json);
      }
    } catch (error) {
      console.error(json, error);
    }
    if (window._ws_queue[cmd]) {
      const handler = window._ws_queue[cmd];
      delete window._ws_queue[cmd];
      handler(json.data);
    } else if (_ws_wccmd[cmd]) {
      _ws_wccmd[cmd].call(event, json);
    }
  }
};

var _ws_inIframe = () => {
  let ifrm;
  try {
    ifrm = window.self !== window.top;
  } catch (e) {
    ifrm = true;
  }
  return ifrm ? 'iframe' : 'window'
};

/* global WebSocket */

var _ws_initSocket = () => {
  window._ws_queue = {};
  window._ws_connect = {};
  window._ws_connected = false;

  const onopen = data => {
    console.timeEnd('ws: onopen');
    window._ws_connected = true;
    for (const key in window._ws_connect) {
      console.warn(window._ws_connect[key] + '');
      window._ws_connect[key](data);
    }
  };

  const onclose = function () {
    console.log('ws: Connection is closed');
  };

  const onmessage = function (event) {
    _ws_msgParser(event, event.data);
  };

  const url = `wss://localhost:3001/ws?page=${_ws_inIframe()}`;
  const ws = new WebSocket(url);
  console.time('ws: onopen');
  window._ws = ws;

  setTimeout(() => {
    ws.onopen = onopen;
    ws.onclose = onclose;
    ws.onmessage = onmessage;
  }, 10); // minimize intermitten
};

/* global location */
var _ws_namespace = () => {
  const { hostname: host } = location;
  let namespace;

  function toRegex (str) {
    return str.replace(/\./g, '\\.').replace(/\?/g, '\\?')
  }

  for (const key in window.mitm.routes) {
    if (host.match(toRegex(key.replace(/~/, '[^.]*')))) {
      namespace = key;
      break
    }
  }
  return namespace
};

var _ws_vendor = () => {
  const { vendor } = navigator;
  const browser = {
    '': 'firefox',
    'Google Inc.': 'chromium',
    'Apple Computer, Inc.': 'webkit'
  }[vendor];
  return browser
};

/* global location, mitm */

let act;
function screenshot (e) {
  if (mitm.argv.lazyclick) {
    if (mitm.screenshot) {
      window.mitm.screenshot = undefined;
      console.log('>>> delay action');
      return
    }
    if (act) {
      act = undefined;
      return
    }
  }
  const { hostname: host } = location;
  const namespace = _ws_namespace();
  const browser = _ws_vendor();
  const route = window.mitm.routes[namespace];
  const { selector } = route.screenshot;

  const arr = document.body.querySelectorAll(selector);
  const fname = location.pathname.replace(/^\//, '').replace(/\//g, '-');
  const delay = mitm.argv.lazyclick === true ? 700 : mitm.argv.lazyclick;
  for (const el of arr) {
    let node = e.target;
    while (el !== node && node !== document.body) {
      node = node.parentNode;
    }
    if (node !== document.body) {
      const params = { namespace, host, fname, browser };
      window.ws__send('screenshot', params);
      if (mitm.argv.lazyclick) {
        // delay action to finish screenshot
        window.mitm.screenshot = e.target;
        e.stopImmediatePropagation();
        e.stopPropagation();
        e.preventDefault();
        setTimeout(() => {
          // console.log('>>> clicked');
          act = window.mitm.screenshot;
          window.mitm.screenshot.node = undefined;
          act.click();
          act = undefined;
        }, delay);
      }
      return
    }
  }
}

var _ws_screenshot = () => {
  const route = window.mitm.routes[_ws_namespace()];
  if (route && route.screenshot) {
    window.addEventListener('DOMContentLoaded', () => {
      document.querySelector('body').addEventListener('click', screenshot);
    });
  }
};

/* global location, history, chrome, Event, CssSelectorGenerator */

var _ws_location = () => {
  const containerStyle = 'position: fixed;z-index: 9999;top: 8px;right: 5px;';
  const buttonStyle = 'border: none;border-radius: 15px;font-size: 10px;';
  const event = new Event('urlchanged');
  let container = {};
  let ctrl = false;
  let button = {};
  let buttons;
  let intervId;

  function toRegex (pathMsg) {
    let [path, msg] = pathMsg.split('=>').map(item => item.trim());
    path = path.replace(/\./g, '\\.').replace(/\?/g, '\\?');
    return { path, msg }
  }

  function setButtons () {
    if (window.mitm.autobuttons) {
      const { autobuttons } = window.mitm;
      setTimeout(() => {
        for (const key in autobuttons) {
          const btn = document.createElement('button');
          const br = document.createElement('span');
          const [caption, color] = key.split('|');
          btn.onclick = autobuttons[key];
          btn.innerText = caption;
          buttons.appendChild(btn);
          buttons.appendChild(br);
          br.innerHTML = '&nbsp;';
          btn.style = buttonStyle + (color ? `background: ${color};` : '');
        }
      }, 0);
    }
  }

  function urlChange (event) {
    const namespace = _ws_namespace();
    if (window.mitm.autofill) {
      delete window.mitm.autofill;
    }
    if (window.mitm.autointerval) {
      clearInterval(intervId);
      delete window.mitm.autointerval;
    }
    if (window.mitm.autobuttons) {
      delete window.mitm.autobuttons;
      buttons.innerHTML = '';
    }
    if (window.mitm.macrokeys) {
      delete window.mitm.macrokeys;
    }
    if (namespace) {
      const { pathname } = location;
      const { _macros_, macros } = window.mitm;
      // console.log(namespace, location);
      for (const key in macros) {
        const { path, msg } = toRegex(key);
        if (pathname.match(path)) {
          button.innerHTML = msg || 'Autofill';
          _macros_ && _macros_();
          macros[key]();
          setButtons();
        }
      }
    }
    container.style = containerStyle;
    const visible = (window.mitm.autofill);
    button.style = buttonStyle + (visible ? 'background-color: azure;' : 'display: none;');
    if (typeof (window.mitm.autointerval) === 'function') {
      intervId = setInterval(window.mitm.autointerval, 500);
    }
    ctrl = false;
  }

  function play (autofill) {
    if (autofill) {
      if (typeof (autofill) === 'function') {
        autofill = autofill();
      }
      const browser = _ws_vendor();
      const lenth = autofill.length;
      console.log(lenth === 1 ? `  ${autofill}` : JSON.stringify(autofill, null, 2));
      window.ws__send('autofill', { autofill, browser });
    }
  }

  function btnclick (e) {
    const { autofill } = window.mitm;
    play(autofill);
  }

  function keybCtrl (e) {
    const { macrokeys } = window.mitm;
    if (e.ctrlKey && e.key === 'Shift') {
      ctrl = !ctrl;
      container.style = containerStyle + (!ctrl ? '' : 'display: none;');
    } else if (e.ctrlKey && e.altKey) {
      console.log({ macro: `ctrl + alt + ${e.code}` });
      if (macrokeys) {
        let macro = macrokeys[e.code];
        if (macro) {
          macro = macro();
          if (Array.isArray(macro)) {
            let macroIndex = 0;
            const interval = setInterval(() => {
              let selector = macro[macroIndex];
              if (selector.match(/^ *[=-]>/)) {
                selector = `${CssSelectorGenerator.getCssSelector(document.activeElement)} ${selector}`;
              }
              play([selector]);

              macroIndex += 1;
              if (macroIndex >= macro.length) {
                clearInterval(interval);
              }
            }, 100);
          }
        }
      }
    }
  }
  if (!window.chrome) {
    return
  }
  if (!chrome.tabs) {
    document.querySelector('html').addEventListener('keydown', keybCtrl);
    window.addEventListener('urlchanged', urlChange);
    const fn = history.pushState;
    history.pushState = function () {
      fn.apply(history, arguments);
      window.dispatchEvent(event);
    };

    window.addEventListener('DOMContentLoaded', () => {
      const node = document.querySelector('html');
      const noderef = node.firstElementChild;
      const newNode = document.createElement('div');
      const html = '<button class="btn-autofill">Autofill</button>';

      newNode.innerHTML = `<span class="autofill-buttons"></span>${html}`;
      newNode.className = 'mitm autofill-container';
      newNode.style = containerStyle;

      node.insertBefore(newNode, noderef);
      setTimeout(() => {
        container = newNode;
        buttons = newNode.children[0];
        button = newNode.children[1];
        button.onclick = btnclick;
        button.style = `${buttonStyle}background-color: azure;`;
        urlChange();
      }, 1);
    });
  }
};

function debounce (fn, delay = 500) {
  let _timeout;
  return function () {
    const _this = this;
    const args = arguments;
    _timeout && clearTimeout(_timeout);
    _timeout = setTimeout(() => {
      fn.apply(_this, args);
    }, delay);
  }
}

/* global location, MutationObserver */

var _ws_observer = () => {
  const { hostname: host } = location;
  const namespace = _ws_namespace();
  const browser = _ws_vendor();
  const sshot = {}; const nodes = {};

  const route = window.mitm.routes[namespace];
  if (route && route.screenshot) {
    const { observer: ob } = route.screenshot;
    for (const id in ob) {
      let el = {};
      if (ob[id] === true) {
        el = {
          title: 'notitle',
          insert: true,
          remove: true
        };
      } else {
        const arr = ob[id].split(':');
        arr[1].split(',').map(e => {
          el[e] = true;
        });
        el.title = arr[0];
      }
      sshot[id] = el;
      nodes[id] = {
        insert: false,
        remove: true
      };
    }
  }

  let fname;
  const callback = debounce(function () {
    for (const id in nodes) {
      const el = document.body.querySelectorAll(id);
      if (el.length) {
        if (!nodes[id].insert) {
          nodes[id].insert = true;
          if (nodes[id].remove !== undefined) {
            nodes[id].remove = false;
          }
          if (sshot[id].insert) {
            fname = location.pathname.replace(/^\//, '').replace(/\//g, '-');
            fname = `${fname}-${sshot[id].title}-insert`;
            window.ws__send('screenshot', { namespace, host, fname, browser });
          }
        }
      } else {
        if (!nodes[id].remove) {
          nodes[id].remove = true;
          nodes[id].insert = false;
          if (sshot[id].remove) {
            fname = location.pathname.replace(/^\//, '').replace(/\//g, '-');
            fname = `${fname}-${sshot[id].title}-remove`;
            window.ws__send('screenshot', { namespace, host, fname, browser });
          }
        }
      }
    }
  }, 100);

  document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(callback);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true
    });
  });
};

const t64 = 'Wabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZh';

const nanoid = (size = 8) => {
  let id = '';
  while (size-- > 0) {
    id += t64[Math.random() * 64 | 0];
  }
  return id
};

var _ws_general = () => {
  const { _ws } = window;

  // ex: ws_broadcast('_style{"data":{"q":"*","css":"color:blue;"}}')
  // ex: ws_broadcast('_ping{"data":"Hi!"}')
  window.ws_broadcast = (json, _all = true) => {
    const msg = { data: json, _all };
    _ws.send(`broadcast${JSON.stringify(msg)}`);
  };

  // ex: ws_emitpage('_style{"data":{"q":"*","css":"color:blue;"}}')
  // ex: ws_emitpage('_ping{"data":"Hi!"}')
  window.ws_emitpage = (json, regex = '') => {
    const msg = { data: json, regex };
    _ws.send(`emitpage${JSON.stringify(msg)}`);
  };

  // ex: ws__style({"q":"*","css":"color:blue;"})
  window.ws__style = (json, _all = true) => {
    const msg = { data: json, _all };
    _ws.send(`_style${JSON.stringify(msg)}`);
  };

  // ex: ws__ping('Hi!')
  window.ws__ping = (json) => {
    const msg = { data: json };
    _ws.send(`_ping${JSON.stringify(msg)}`);
  };

  // ex: ws__help()
  window.ws__help = () => {
    _ws.send('_help{}');
  };

  // ex: ws__open({url:'https://google.com'})
  window.ws__open = (json) => {
    const msg = { data: json };
    _ws.send(`_open${JSON.stringify(msg)}`);
  };

  window.ws__send = (cmd, data, handler) => {
    const id = nanoid();
    const key = `${cmd}:${id}`;
    window._ws_queue[key] = handler || (w => {});

    setTimeout(function () {
      if (window._ws_queue[key]) {
        delete window._ws_queue[key];
        console.log('>>> ws timeout!', key);
      }
    }, 5000);
    const params = `${key}${JSON.stringify({ data })}`;
    if (window.mitm.argv.debug) {
      console.log('_ws.send', params);
    }
    _ws.send(params);
  };
};
// ws__send('_ping', 'LOL', w=>console.log('>result',w));

/* global location */

let _timeout;
let _csp = {};
var _ws_cspErr = () => {
  const cspError = function (e) {
    const { hostname: host } = location;
    const namespace = _ws_namespace();
    const path = location.pathname
      .replace(/^\//, '')
      .replace(/\//g, '-');
    const {
      blockedURI,
      disposition,
      documentURI,
      effectiveDirective,
      originalPolicy,
      timeStamp,
      type,
      violatedDirective
    } = e;
    const typ = `[${disposition}] ${documentURI}`;
    if (!_csp[typ]) {
      _csp[typ] = {};
    }
    if (!_csp[typ]._general_) {
      _csp[typ]._general_ = {
        policy: originalPolicy,
        namespace,
        host,
        path
      };
    }
    const _doc = _csp[typ];
    if (!_doc[violatedDirective]) {
      _doc[violatedDirective] = {};
    }

    const _err = _doc[violatedDirective];
    if (!_err[blockedURI]) {
      _err[blockedURI] = {};
    }
    const _match = originalPolicy.match(`${violatedDirective} [^;]+;`);
    const directive = _match ? _match[0] : effectiveDirective;
    _err[blockedURI] = {
      directive,
      timeStamp,
      type
    };
    _timeout && clearTimeout(_timeout);
    _timeout = setTimeout(() => {
      console.log('>>> CSP:', _csp);
      // window.ws__send('csp_error', {
      //   namespace,
      //   host,
      //   path,
      //   _csp,
      // });
      _csp = {};
    }, 4000);
  };

  if (window.mitm.client.csp) {
    document.addEventListener('securitypolicyviolation', cspError);
  }
};
// disposition: "report"
// documentURI: "https://what/html/contain/csp"
// violatedDirective: "img-src"

// blockedURI: "https://what/url/getting/blocked"
// effectiveDirective: "img-src"
// originalPolicy: "script-src null; frame-src null; style-src null; style-src-elem null; img-src null;"
// timeStamp: 1933.8200000056531
// type: "securitypolicyviolation"

/* eslint-disable camelcase */

var index = () => {
  _ws_postmessage();
  _ws_initSocket();
  _ws_screenshot();
  _ws_location();
  _ws_observer();
  _ws_general();
  _ws_cspErr();
};

index();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIl9zcmMvX3dzX3Bvc3RtZXNzYWdlLmpzIiwiX3NyYy9fd3NfY2xpZW50LmpzIiwiX3NyYy9fd3NfbXNnLXBhcnNlci5qcyIsIl9zcmMvX3dzX2luLWlmcmFtZS5qcyIsIl9zcmMvX3dzX2luaXQtc29ja2V0LmpzIiwiX3NyYy9fd3NfbmFtZXNwYWNlLmpzIiwiX3NyYy9fd3NfdmVuZG9yLmpzIiwiX3NyYy9fd3Nfc2NyZWVuc2hvdC5qcyIsIl9zcmMvX3dzX2xvY2F0aW9uLmpzIiwiX3NyYy9fd3NfZGVib3VuY2UuanMiLCJfc3JjL193c19vYnNlcnZlci5qcyIsIl9zcmMvX3dzX2dlbmVyYWwuanMiLCJfc3JjL193c19jc3AtZXJyLmpzIiwiX3NyYy9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBnbG9iYWwgbG9jYXRpb24gKi9cbm1vZHVsZS5leHBvcnRzID0gKCkgPT4ge1xuICBmdW5jdGlvbiByZWNlaXZlTWVzc2FnZSAoZXZlbnQpIHtcbiAgICBpZiAod2luZG93Lm1pdG0uY2xpZW50LnBvc3RtZXNzYWdlKSB7XG4gICAgICBjb25zb2xlLmxvZyhgPj4+IFBvc3RtZXNzYWdlOiAke2V2ZW50Lm9yaWdpbn0gPT4gaHR0cHM6Ly8ke2xvY2F0aW9uLmhvc3R9YCwgZXZlbnQuZGF0YSlcbiAgICB9XG4gIH1cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCByZWNlaXZlTWVzc2FnZSwgZmFsc2UpXG5cbiAgLy8gaWYgKCFjaHJvbWUud2luZG93cykge1xuICAvLyAgIGZ1bmN0aW9uIHJlcG9ydFdpbmRvd1NpemUoKSB7XG4gIC8vICAgICBjb25zdCB7aW5uZXJXaWR0aCwgaW5uZXJIZWlnaHR9ID0gd2luZG93O1xuICAvLyAgICAgY29uc29sZS5sb2coe2lubmVyV2lkdGgsIGlubmVySGVpZ2h0fSk7XG4gIC8vICAgfVxuICAvLyAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIHJlcG9ydFdpbmRvd1NpemUpO1xuICAvLyB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9ICgpID0+IHtcbiAgbGV0IHdpbmRvd1JlZlxuICByZXR1cm4ge1xuICAgIC8vIGV4OiB3c19faGVscCgpXG4gICAgX2hlbHAgKHsgZGF0YSB9KSB7XG4gICAgICBjb25zb2xlLmxvZyhkYXRhKVxuICAgIH0sXG4gICAgLy8gZXg6IHdzX19waW5nKFwidGhlcmVcIilcbiAgICBfcGluZyAoeyBkYXRhIH0pIHtcbiAgICAgIGNvbnNvbGUubG9nKGRhdGEpXG4gICAgfSxcbiAgICAvLyBleDogd3NfX29wZW4oe3VybDogXCJodHRwczovL2dvb2dsZS5jb21cIn0pXG4gICAgX29wZW4gKHsgZGF0YSB9KSB7XG4gICAgICBjb25zdCBmZWF0dXJlcyA9ICdkaXJlY3Rvcmllcz0wLHRpdGxlYmFyPTAsdG9vbGJhcj0wLGxvY2F0aW9uPTAsc3RhdHVzPTAsbWVudWJhcj0wLHdpZHRoPTgwMCxoZWlnaHQ9NjAwJ1xuICAgICAgd2luZG93UmVmID0gd2luZG93Lm9wZW4oZGF0YS51cmwsICdfbG9ncycsIGZlYXR1cmVzKVxuICAgICAgd2luZG93UmVmLmJsdXIoKVxuICAgIH0sXG4gICAgLy8gZXg6IHdzX19zdHlsZSgnLmludHJvPT5iYWNrZ3JvdW5kOnJlZDsnKVxuICAgIF9zdHlsZSAoeyBkYXRhIH0pIHtcbiAgICAgIGNvbnN0IHsgcSwgY3NzIH0gPSBkYXRhXG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHEpLmZvckVhY2goXG4gICAgICAgIG5vZGUgPT4gKG5vZGUuc3R5bGUuY3NzVGV4dCA9IGNzcylcbiAgICAgIClcbiAgICB9LFxuICAgIC8vIGV4OiB3c19fXG4gICAgX2ZpbGVzICh7IHR5cCwgZGF0YSB9KSB7XG4gICAgICBjb25zdCB7IGZpbGVzIH0gPSB3aW5kb3cubWl0bVxuICAgICAgY29uc29sZS53YXJuKGByZWNlaXZlIGJyb2RjYXN0ICR7dHlwfWApXG4gICAgICAvKipcbiAgICAgICAqIGV2ZW50IGhhbmRsZXIgYWZ0ZXIgcmVjZWl2aW5nIHdzIHBhY2tldFxuICAgICAgICogaWU6IHdpbmRvdy5taXRtLmZpbGVzLnJvdXRlX2V2ZW50cyA9IHtldmVudE9iamVjdC4uLn1cbiAgICAgICAqL1xuICAgICAgZm9yIChjb25zdCBrZXkgaW4gZmlsZXNbYCR7dHlwfV9ldmVudHNgXSkge1xuICAgICAgICBjb25zb2xlLndhcm4oZmlsZXNbYCR7dHlwfV9ldmVudHNgXVtrZXldICsgJycpXG4gICAgICAgIGZpbGVzW2Ake3R5cH1fZXZlbnRzYF1ba2V5XShkYXRhKVxuICAgICAgfVxuICAgIH0sXG4gICAgX3NldENsaWVudCAoeyBkYXRhIH0pIHtcbiAgICAgIGNvbnNvbGUubG9nKCdfc2V0Q2xpZW50JywgZGF0YSlcbiAgICAgIHdpbmRvdy5taXRtLmNsaWVudCA9IGRhdGFcbiAgICB9XG4gIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlIGNhbWVsY2FzZSAqL1xuY29uc3QgX3dzX2NsaWVudCA9IHJlcXVpcmUoJy4vX3dzX2NsaWVudCcpXG5jb25zdCBfd3Nfd2NjbWQgPSBfd3NfY2xpZW50KClcblxubW9kdWxlLmV4cG9ydHMgPSAoZXZlbnQsIG1zZykgPT4ge1xuICBpZiAod2luZG93Lm1pdG0uYXJndi5kZWJ1Zykge1xuICAgIGlmIChtc2cubGVuZ3RoID4gNDApIHtcbiAgICAgIGNvbnNvbGUubG9nKCc+Pj4gd3MtbWVzc2FnZTogYCVzLi4uYCcsIG1zZy5zbGljZSgwLCA0MCkpXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKCc+Pj4gd3MtbWVzc2FnZTogYCVzYCcsIG1zZylcbiAgICB9XG4gIH1cbiAgY29uc3QgYXJyID0gbXNnLnJlcGxhY2UoL1xccyskLywgJycpLm1hdGNoKC9eICooW1xcdzpdKykgKihcXHsuKikvKVxuICBpZiAoYXJyKSB7XG4gICAgbGV0IFssIGNtZCwganNvbl0gPSBhcnJcbiAgICB0cnkge1xuICAgICAgaWYgKHR5cGVvZiAoanNvbikgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGpzb24gPSBKU09OLnBhcnNlKGpzb24pXG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoanNvbiwgZXJyb3IpXG4gICAgfVxuICAgIGlmICh3aW5kb3cuX3dzX3F1ZXVlW2NtZF0pIHtcbiAgICAgIGNvbnN0IGhhbmRsZXIgPSB3aW5kb3cuX3dzX3F1ZXVlW2NtZF1cbiAgICAgIGRlbGV0ZSB3aW5kb3cuX3dzX3F1ZXVlW2NtZF1cbiAgICAgIGhhbmRsZXIoanNvbi5kYXRhKVxuICAgIH0gZWxzZSBpZiAoX3dzX3djY21kW2NtZF0pIHtcbiAgICAgIF93c193Y2NtZFtjbWRdLmNhbGwoZXZlbnQsIGpzb24pXG4gICAgfVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9ICgpID0+IHtcbiAgbGV0IGlmcm1cbiAgdHJ5IHtcbiAgICBpZnJtID0gd2luZG93LnNlbGYgIT09IHdpbmRvdy50b3BcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmcm0gPSB0cnVlXG4gIH1cbiAgcmV0dXJuIGlmcm0gPyAnaWZyYW1lJyA6ICd3aW5kb3cnXG59XG4iLCIvKiBnbG9iYWwgV2ViU29ja2V0ICovXG4vKiBlc2xpbnQtZGlzYWJsZSBjYW1lbGNhc2UgKi9cbmNvbnN0IF93c19tc2dQYXJzZXIgPSByZXF1aXJlKCcuL193c19tc2ctcGFyc2VyJylcbmNvbnN0IF93c19pbklmcmFtZSA9IHJlcXVpcmUoJy4vX3dzX2luLWlmcmFtZScpXG5cbm1vZHVsZS5leHBvcnRzID0gKCkgPT4ge1xuICB3aW5kb3cuX3dzX3F1ZXVlID0ge31cbiAgd2luZG93Ll93c19jb25uZWN0ID0ge31cbiAgd2luZG93Ll93c19jb25uZWN0ZWQgPSBmYWxzZVxuXG4gIGNvbnN0IG9ub3BlbiA9IGRhdGEgPT4ge1xuICAgIGNvbnNvbGUudGltZUVuZCgnd3M6IG9ub3BlbicpXG4gICAgd2luZG93Ll93c19jb25uZWN0ZWQgPSB0cnVlXG4gICAgZm9yIChjb25zdCBrZXkgaW4gd2luZG93Ll93c19jb25uZWN0KSB7XG4gICAgICBjb25zb2xlLndhcm4od2luZG93Ll93c19jb25uZWN0W2tleV0gKyAnJylcbiAgICAgIHdpbmRvdy5fd3NfY29ubmVjdFtrZXldKGRhdGEpXG4gICAgfVxuICB9XG5cbiAgY29uc3Qgb25jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBjb25zb2xlLmxvZygnd3M6IENvbm5lY3Rpb24gaXMgY2xvc2VkJylcbiAgfVxuXG4gIGNvbnN0IG9ubWVzc2FnZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIF93c19tc2dQYXJzZXIoZXZlbnQsIGV2ZW50LmRhdGEpXG4gIH1cblxuICBjb25zdCB1cmwgPSBgd3NzOi8vbG9jYWxob3N0OjMwMDEvd3M/cGFnZT0ke193c19pbklmcmFtZSgpfWBcbiAgY29uc3Qgd3MgPSBuZXcgV2ViU29ja2V0KHVybClcbiAgY29uc29sZS50aW1lKCd3czogb25vcGVuJylcbiAgd2luZG93Ll93cyA9IHdzXG5cbiAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgd3Mub25vcGVuID0gb25vcGVuXG4gICAgd3Mub25jbG9zZSA9IG9uY2xvc2VcbiAgICB3cy5vbm1lc3NhZ2UgPSBvbm1lc3NhZ2VcbiAgfSwgMTApIC8vIG1pbmltaXplIGludGVybWl0dGVuXG59XG4iLCIvKiBnbG9iYWwgbG9jYXRpb24gKi9cbm1vZHVsZS5leHBvcnRzID0gKCkgPT4ge1xuICBjb25zdCB7IGhvc3RuYW1lOiBob3N0IH0gPSBsb2NhdGlvblxuICBsZXQgbmFtZXNwYWNlXG5cbiAgZnVuY3Rpb24gdG9SZWdleCAoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5yZXBsYWNlKC9cXC4vZywgJ1xcXFwuJykucmVwbGFjZSgvXFw/L2csICdcXFxcPycpXG4gIH1cblxuICBmb3IgKGNvbnN0IGtleSBpbiB3aW5kb3cubWl0bS5yb3V0ZXMpIHtcbiAgICBpZiAoaG9zdC5tYXRjaCh0b1JlZ2V4KGtleS5yZXBsYWNlKC9+LywgJ1teLl0qJykpKSkge1xuICAgICAgbmFtZXNwYWNlID0ga2V5XG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuICByZXR1cm4gbmFtZXNwYWNlXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9ICgpID0+IHtcbiAgY29uc3QgeyB2ZW5kb3IgfSA9IG5hdmlnYXRvclxuICBjb25zdCBicm93c2VyID0ge1xuICAgICcnOiAnZmlyZWZveCcsXG4gICAgJ0dvb2dsZSBJbmMuJzogJ2Nocm9taXVtJyxcbiAgICAnQXBwbGUgQ29tcHV0ZXIsIEluYy4nOiAnd2Via2l0J1xuICB9W3ZlbmRvcl1cbiAgcmV0dXJuIGJyb3dzZXJcbn1cbiIsIi8qIGdsb2JhbCBsb2NhdGlvbiwgbWl0bSAqL1xuLyogZXNsaW50LWRpc2FibGUgY2FtZWxjYXNlICovXG5jb25zdCBfd3NfbmFtZXNwYWNlID0gcmVxdWlyZSgnLi9fd3NfbmFtZXNwYWNlJylcbmNvbnN0IF93c192ZW5kb3IgPSByZXF1aXJlKCcuL193c192ZW5kb3InKVxuXG5sZXQgYWN0XG5mdW5jdGlvbiBzY3JlZW5zaG90IChlKSB7XG4gIGlmIChtaXRtLmFyZ3YubGF6eWNsaWNrKSB7XG4gICAgaWYgKG1pdG0uc2NyZWVuc2hvdCkge1xuICAgICAgd2luZG93Lm1pdG0uc2NyZWVuc2hvdCA9IHVuZGVmaW5lZFxuICAgICAgY29uc29sZS5sb2coJz4+PiBkZWxheSBhY3Rpb24nKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmIChhY3QpIHtcbiAgICAgIGFjdCA9IHVuZGVmaW5lZFxuICAgICAgcmV0dXJuXG4gICAgfVxuICB9XG4gIGNvbnN0IHsgaG9zdG5hbWU6IGhvc3QgfSA9IGxvY2F0aW9uXG4gIGNvbnN0IG5hbWVzcGFjZSA9IF93c19uYW1lc3BhY2UoKVxuICBjb25zdCBicm93c2VyID0gX3dzX3ZlbmRvcigpXG4gIGNvbnN0IHJvdXRlID0gd2luZG93Lm1pdG0ucm91dGVzW25hbWVzcGFjZV1cbiAgY29uc3QgeyBzZWxlY3RvciB9ID0gcm91dGUuc2NyZWVuc2hvdFxuXG4gIGNvbnN0IGFyciA9IGRvY3VtZW50LmJvZHkucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcilcbiAgY29uc3QgZm5hbWUgPSBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywgJycpLnJlcGxhY2UoL1xcLy9nLCAnLScpXG4gIGNvbnN0IGRlbGF5ID0gbWl0bS5hcmd2LmxhenljbGljayA9PT0gdHJ1ZSA/IDcwMCA6IG1pdG0uYXJndi5sYXp5Y2xpY2tcbiAgZm9yIChjb25zdCBlbCBvZiBhcnIpIHtcbiAgICBsZXQgbm9kZSA9IGUudGFyZ2V0XG4gICAgd2hpbGUgKGVsICE9PSBub2RlICYmIG5vZGUgIT09IGRvY3VtZW50LmJvZHkpIHtcbiAgICAgIG5vZGUgPSBub2RlLnBhcmVudE5vZGVcbiAgICB9XG4gICAgaWYgKG5vZGUgIT09IGRvY3VtZW50LmJvZHkpIHtcbiAgICAgIGNvbnN0IHBhcmFtcyA9IHsgbmFtZXNwYWNlLCBob3N0LCBmbmFtZSwgYnJvd3NlciB9XG4gICAgICB3aW5kb3cud3NfX3NlbmQoJ3NjcmVlbnNob3QnLCBwYXJhbXMpXG4gICAgICBpZiAobWl0bS5hcmd2LmxhenljbGljaykge1xuICAgICAgICAvLyBkZWxheSBhY3Rpb24gdG8gZmluaXNoIHNjcmVlbnNob3RcbiAgICAgICAgd2luZG93Lm1pdG0uc2NyZWVuc2hvdCA9IGUudGFyZ2V0XG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKVxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coJz4+PiBjbGlja2VkJyk7XG4gICAgICAgICAgYWN0ID0gd2luZG93Lm1pdG0uc2NyZWVuc2hvdFxuICAgICAgICAgIHdpbmRvdy5taXRtLnNjcmVlbnNob3Qubm9kZSA9IHVuZGVmaW5lZFxuICAgICAgICAgIGFjdC5jbGljaygpXG4gICAgICAgICAgYWN0ID0gdW5kZWZpbmVkXG4gICAgICAgIH0sIGRlbGF5KVxuICAgICAgfVxuICAgICAgcmV0dXJuXG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gKCkgPT4ge1xuICBjb25zdCByb3V0ZSA9IHdpbmRvdy5taXRtLnJvdXRlc1tfd3NfbmFtZXNwYWNlKCldXG4gIGlmIChyb3V0ZSAmJiByb3V0ZS5zY3JlZW5zaG90KSB7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBzY3JlZW5zaG90KVxuICAgIH0pXG4gIH1cbn1cbiIsIi8qIGdsb2JhbCBsb2NhdGlvbiwgaGlzdG9yeSwgY2hyb21lLCBFdmVudCwgQ3NzU2VsZWN0b3JHZW5lcmF0b3IgKi9cbi8qIGVzbGludC1kaXNhYmxlIGNhbWVsY2FzZSAqL1xuY29uc3QgX3dzX25hbWVzcGFjZSA9IHJlcXVpcmUoJy4vX3dzX25hbWVzcGFjZScpXG5jb25zdCBfd3NfdmVuZG9yID0gcmVxdWlyZSgnLi9fd3NfdmVuZG9yJylcblxubW9kdWxlLmV4cG9ydHMgPSAoKSA9PiB7XG4gIGNvbnN0IGNvbnRhaW5lclN0eWxlID0gJ3Bvc2l0aW9uOiBmaXhlZDt6LWluZGV4OiA5OTk5O3RvcDogOHB4O3JpZ2h0OiA1cHg7J1xuICBjb25zdCBidXR0b25TdHlsZSA9ICdib3JkZXI6IG5vbmU7Ym9yZGVyLXJhZGl1czogMTVweDtmb250LXNpemU6IDEwcHg7J1xuICBjb25zdCBldmVudCA9IG5ldyBFdmVudCgndXJsY2hhbmdlZCcpXG4gIGxldCBjb250YWluZXIgPSB7fVxuICBsZXQgY3RybCA9IGZhbHNlXG4gIGxldCBidXR0b24gPSB7fVxuICBsZXQgYnV0dG9uc1xuICBsZXQgaW50ZXJ2SWRcblxuICBmdW5jdGlvbiB0b1JlZ2V4IChwYXRoTXNnKSB7XG4gICAgbGV0IFtwYXRoLCBtc2ddID0gcGF0aE1zZy5zcGxpdCgnPT4nKS5tYXAoaXRlbSA9PiBpdGVtLnRyaW0oKSlcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC4vZywgJ1xcXFwuJykucmVwbGFjZSgvXFw/L2csICdcXFxcPycpXG4gICAgcmV0dXJuIHsgcGF0aCwgbXNnIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNldEJ1dHRvbnMgKCkge1xuICAgIGlmICh3aW5kb3cubWl0bS5hdXRvYnV0dG9ucykge1xuICAgICAgY29uc3QgeyBhdXRvYnV0dG9ucyB9ID0gd2luZG93Lm1pdG1cbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBhdXRvYnV0dG9ucykge1xuICAgICAgICAgIGNvbnN0IGJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpXG4gICAgICAgICAgY29uc3QgYnIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJylcbiAgICAgICAgICBjb25zdCBbY2FwdGlvbiwgY29sb3JdID0ga2V5LnNwbGl0KCd8JylcbiAgICAgICAgICBidG4ub25jbGljayA9IGF1dG9idXR0b25zW2tleV1cbiAgICAgICAgICBidG4uaW5uZXJUZXh0ID0gY2FwdGlvblxuICAgICAgICAgIGJ1dHRvbnMuYXBwZW5kQ2hpbGQoYnRuKVxuICAgICAgICAgIGJ1dHRvbnMuYXBwZW5kQ2hpbGQoYnIpXG4gICAgICAgICAgYnIuaW5uZXJIVE1MID0gJyZuYnNwOydcbiAgICAgICAgICBidG4uc3R5bGUgPSBidXR0b25TdHlsZSArIChjb2xvciA/IGBiYWNrZ3JvdW5kOiAke2NvbG9yfTtgIDogJycpXG4gICAgICAgIH1cbiAgICAgIH0sIDApXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdXJsQ2hhbmdlIChldmVudCkge1xuICAgIGNvbnN0IG5hbWVzcGFjZSA9IF93c19uYW1lc3BhY2UoKVxuICAgIGlmICh3aW5kb3cubWl0bS5hdXRvZmlsbCkge1xuICAgICAgZGVsZXRlIHdpbmRvdy5taXRtLmF1dG9maWxsXG4gICAgfVxuICAgIGlmICh3aW5kb3cubWl0bS5hdXRvaW50ZXJ2YWwpIHtcbiAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2SWQpXG4gICAgICBkZWxldGUgd2luZG93Lm1pdG0uYXV0b2ludGVydmFsXG4gICAgfVxuICAgIGlmICh3aW5kb3cubWl0bS5hdXRvYnV0dG9ucykge1xuICAgICAgZGVsZXRlIHdpbmRvdy5taXRtLmF1dG9idXR0b25zXG4gICAgICBidXR0b25zLmlubmVySFRNTCA9ICcnXG4gICAgfVxuICAgIGlmICh3aW5kb3cubWl0bS5tYWNyb2tleXMpIHtcbiAgICAgIGRlbGV0ZSB3aW5kb3cubWl0bS5tYWNyb2tleXNcbiAgICB9XG4gICAgaWYgKG5hbWVzcGFjZSkge1xuICAgICAgY29uc3QgeyBwYXRobmFtZSB9ID0gbG9jYXRpb25cbiAgICAgIGNvbnN0IHsgX21hY3Jvc18sIG1hY3JvcyB9ID0gd2luZG93Lm1pdG1cbiAgICAgIC8vIGNvbnNvbGUubG9nKG5hbWVzcGFjZSwgbG9jYXRpb24pO1xuICAgICAgZm9yIChjb25zdCBrZXkgaW4gbWFjcm9zKSB7XG4gICAgICAgIGNvbnN0IHsgcGF0aCwgbXNnIH0gPSB0b1JlZ2V4KGtleSlcbiAgICAgICAgaWYgKHBhdGhuYW1lLm1hdGNoKHBhdGgpKSB7XG4gICAgICAgICAgYnV0dG9uLmlubmVySFRNTCA9IG1zZyB8fCAnQXV0b2ZpbGwnXG4gICAgICAgICAgX21hY3Jvc18gJiYgX21hY3Jvc18oKVxuICAgICAgICAgIG1hY3Jvc1trZXldKClcbiAgICAgICAgICBzZXRCdXR0b25zKClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjb250YWluZXIuc3R5bGUgPSBjb250YWluZXJTdHlsZVxuICAgIGNvbnN0IHZpc2libGUgPSAod2luZG93Lm1pdG0uYXV0b2ZpbGwpXG4gICAgYnV0dG9uLnN0eWxlID0gYnV0dG9uU3R5bGUgKyAodmlzaWJsZSA/ICdiYWNrZ3JvdW5kLWNvbG9yOiBhenVyZTsnIDogJ2Rpc3BsYXk6IG5vbmU7JylcbiAgICBpZiAodHlwZW9mICh3aW5kb3cubWl0bS5hdXRvaW50ZXJ2YWwpID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpbnRlcnZJZCA9IHNldEludGVydmFsKHdpbmRvdy5taXRtLmF1dG9pbnRlcnZhbCwgNTAwKVxuICAgIH1cbiAgICBjdHJsID0gZmFsc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIHBsYXkgKGF1dG9maWxsKSB7XG4gICAgaWYgKGF1dG9maWxsKSB7XG4gICAgICBpZiAodHlwZW9mIChhdXRvZmlsbCkgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgYXV0b2ZpbGwgPSBhdXRvZmlsbCgpXG4gICAgICB9XG4gICAgICBjb25zdCBicm93c2VyID0gX3dzX3ZlbmRvcigpXG4gICAgICBjb25zdCBsZW50aCA9IGF1dG9maWxsLmxlbmd0aFxuICAgICAgY29uc29sZS5sb2cobGVudGggPT09IDEgPyBgICAke2F1dG9maWxsfWAgOiBKU09OLnN0cmluZ2lmeShhdXRvZmlsbCwgbnVsbCwgMikpXG4gICAgICB3aW5kb3cud3NfX3NlbmQoJ2F1dG9maWxsJywgeyBhdXRvZmlsbCwgYnJvd3NlciB9KVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGJ0bmNsaWNrIChlKSB7XG4gICAgY29uc3QgeyBhdXRvZmlsbCB9ID0gd2luZG93Lm1pdG1cbiAgICBwbGF5KGF1dG9maWxsKVxuICB9XG5cbiAgZnVuY3Rpb24ga2V5YkN0cmwgKGUpIHtcbiAgICBjb25zdCB7IG1hY3Jva2V5cyB9ID0gd2luZG93Lm1pdG1cbiAgICBpZiAoZS5jdHJsS2V5ICYmIGUua2V5ID09PSAnU2hpZnQnKSB7XG4gICAgICBjdHJsID0gIWN0cmxcbiAgICAgIGNvbnRhaW5lci5zdHlsZSA9IGNvbnRhaW5lclN0eWxlICsgKCFjdHJsID8gJycgOiAnZGlzcGxheTogbm9uZTsnKVxuICAgIH0gZWxzZSBpZiAoZS5jdHJsS2V5ICYmIGUuYWx0S2V5KSB7XG4gICAgICBjb25zb2xlLmxvZyh7IG1hY3JvOiBgY3RybCArIGFsdCArICR7ZS5jb2RlfWAgfSlcbiAgICAgIGlmIChtYWNyb2tleXMpIHtcbiAgICAgICAgbGV0IG1hY3JvID0gbWFjcm9rZXlzW2UuY29kZV1cbiAgICAgICAgaWYgKG1hY3JvKSB7XG4gICAgICAgICAgbWFjcm8gPSBtYWNybygpXG4gICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobWFjcm8pKSB7XG4gICAgICAgICAgICBsZXQgbWFjcm9JbmRleCA9IDBcbiAgICAgICAgICAgIGNvbnN0IGludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgICBsZXQgc2VsZWN0b3IgPSBtYWNyb1ttYWNyb0luZGV4XVxuICAgICAgICAgICAgICBpZiAoc2VsZWN0b3IubWF0Y2goL14gKls9LV0+LykpIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RvciA9IGAke0Nzc1NlbGVjdG9yR2VuZXJhdG9yLmdldENzc1NlbGVjdG9yKGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpfSAke3NlbGVjdG9yfWBcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBwbGF5KFtzZWxlY3Rvcl0pXG5cbiAgICAgICAgICAgICAgbWFjcm9JbmRleCArPSAxXG4gICAgICAgICAgICAgIGlmIChtYWNyb0luZGV4ID49IG1hY3JvLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDEwMClcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYgKCF3aW5kb3cuY2hyb21lKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgaWYgKCFjaHJvbWUudGFicykge1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2h0bWwnKS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywga2V5YkN0cmwpXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3VybGNoYW5nZWQnLCB1cmxDaGFuZ2UpXG4gICAgY29uc3QgZm4gPSBoaXN0b3J5LnB1c2hTdGF0ZVxuICAgIGhpc3RvcnkucHVzaFN0YXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgZm4uYXBwbHkoaGlzdG9yeSwgYXJndW1lbnRzKVxuICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpXG4gICAgfVxuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG4gICAgICBjb25zdCBub2RlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaHRtbCcpXG4gICAgICBjb25zdCBub2RlcmVmID0gbm9kZS5maXJzdEVsZW1lbnRDaGlsZFxuICAgICAgY29uc3QgbmV3Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgICBjb25zdCBodG1sID0gJzxidXR0b24gY2xhc3M9XCJidG4tYXV0b2ZpbGxcIj5BdXRvZmlsbDwvYnV0dG9uPidcblxuICAgICAgbmV3Tm9kZS5pbm5lckhUTUwgPSBgPHNwYW4gY2xhc3M9XCJhdXRvZmlsbC1idXR0b25zXCI+PC9zcGFuPiR7aHRtbH1gXG4gICAgICBuZXdOb2RlLmNsYXNzTmFtZSA9ICdtaXRtIGF1dG9maWxsLWNvbnRhaW5lcidcbiAgICAgIG5ld05vZGUuc3R5bGUgPSBjb250YWluZXJTdHlsZVxuXG4gICAgICBub2RlLmluc2VydEJlZm9yZShuZXdOb2RlLCBub2RlcmVmKVxuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGNvbnRhaW5lciA9IG5ld05vZGVcbiAgICAgICAgYnV0dG9ucyA9IG5ld05vZGUuY2hpbGRyZW5bMF1cbiAgICAgICAgYnV0dG9uID0gbmV3Tm9kZS5jaGlsZHJlblsxXVxuICAgICAgICBidXR0b24ub25jbGljayA9IGJ0bmNsaWNrXG4gICAgICAgIGJ1dHRvbi5zdHlsZSA9IGAke2J1dHRvblN0eWxlfWJhY2tncm91bmQtY29sb3I6IGF6dXJlO2BcbiAgICAgICAgdXJsQ2hhbmdlKGV2ZW50KVxuICAgICAgfSwgMSlcbiAgICB9KVxuICB9XG59XG4iLCJmdW5jdGlvbiBkZWJvdW5jZSAoZm4sIGRlbGF5ID0gNTAwKSB7XG4gIGxldCBfdGltZW91dFxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIGNvbnN0IF90aGlzID0gdGhpc1xuICAgIGNvbnN0IGFyZ3MgPSBhcmd1bWVudHNcbiAgICBfdGltZW91dCAmJiBjbGVhclRpbWVvdXQoX3RpbWVvdXQpXG4gICAgX3RpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGZuLmFwcGx5KF90aGlzLCBhcmdzKVxuICAgIH0sIGRlbGF5KVxuICB9XG59XG5tb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlXG4iLCIvKiBnbG9iYWwgbG9jYXRpb24sIE11dGF0aW9uT2JzZXJ2ZXIgKi9cbi8qIGVzbGludC1kaXNhYmxlIGNhbWVsY2FzZSAqL1xuY29uc3QgX3dzX25hbWVzcGFjZSA9IHJlcXVpcmUoJy4vX3dzX25hbWVzcGFjZScpXG5jb25zdCBfd3NfZGVib3VuY2UgPSByZXF1aXJlKCcuL193c19kZWJvdW5jZScpXG5jb25zdCBfd3NfdmVuZG9yID0gcmVxdWlyZSgnLi9fd3NfdmVuZG9yJylcblxubW9kdWxlLmV4cG9ydHMgPSAoKSA9PiB7XG4gIGNvbnN0IHsgaG9zdG5hbWU6IGhvc3QgfSA9IGxvY2F0aW9uXG4gIGNvbnN0IG5hbWVzcGFjZSA9IF93c19uYW1lc3BhY2UoKVxuICBjb25zdCBicm93c2VyID0gX3dzX3ZlbmRvcigpXG4gIGNvbnN0IHNzaG90ID0ge307IGNvbnN0IG5vZGVzID0ge31cblxuICBjb25zdCByb3V0ZSA9IHdpbmRvdy5taXRtLnJvdXRlc1tuYW1lc3BhY2VdXG4gIGlmIChyb3V0ZSAmJiByb3V0ZS5zY3JlZW5zaG90KSB7XG4gICAgY29uc3QgeyBvYnNlcnZlcjogb2IgfSA9IHJvdXRlLnNjcmVlbnNob3RcbiAgICBmb3IgKGNvbnN0IGlkIGluIG9iKSB7XG4gICAgICBsZXQgZWwgPSB7fVxuICAgICAgaWYgKG9iW2lkXSA9PT0gdHJ1ZSkge1xuICAgICAgICBlbCA9IHtcbiAgICAgICAgICB0aXRsZTogJ25vdGl0bGUnLFxuICAgICAgICAgIGluc2VydDogdHJ1ZSxcbiAgICAgICAgICByZW1vdmU6IHRydWVcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgYXJyID0gb2JbaWRdLnNwbGl0KCc6JylcbiAgICAgICAgYXJyWzFdLnNwbGl0KCcsJykubWFwKGUgPT4ge1xuICAgICAgICAgIGVsW2VdID0gdHJ1ZVxuICAgICAgICB9KVxuICAgICAgICBlbC50aXRsZSA9IGFyclswXVxuICAgICAgfVxuICAgICAgc3Nob3RbaWRdID0gZWxcbiAgICAgIG5vZGVzW2lkXSA9IHtcbiAgICAgICAgaW5zZXJ0OiBmYWxzZSxcbiAgICAgICAgcmVtb3ZlOiB0cnVlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgbGV0IGZuYW1lXG4gIGNvbnN0IGNhbGxiYWNrID0gX3dzX2RlYm91bmNlKGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKGNvbnN0IGlkIGluIG5vZGVzKSB7XG4gICAgICBjb25zdCBlbCA9IGRvY3VtZW50LmJvZHkucXVlcnlTZWxlY3RvckFsbChpZClcbiAgICAgIGlmIChlbC5sZW5ndGgpIHtcbiAgICAgICAgaWYgKCFub2Rlc1tpZF0uaW5zZXJ0KSB7XG4gICAgICAgICAgbm9kZXNbaWRdLmluc2VydCA9IHRydWVcbiAgICAgICAgICBpZiAobm9kZXNbaWRdLnJlbW92ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBub2Rlc1tpZF0ucmVtb3ZlID0gZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHNzaG90W2lkXS5pbnNlcnQpIHtcbiAgICAgICAgICAgIGZuYW1lID0gbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sICcnKS5yZXBsYWNlKC9cXC8vZywgJy0nKVxuICAgICAgICAgICAgZm5hbWUgPSBgJHtmbmFtZX0tJHtzc2hvdFtpZF0udGl0bGV9LWluc2VydGBcbiAgICAgICAgICAgIHdpbmRvdy53c19fc2VuZCgnc2NyZWVuc2hvdCcsIHsgbmFtZXNwYWNlLCBob3N0LCBmbmFtZSwgYnJvd3NlciB9KVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFub2Rlc1tpZF0ucmVtb3ZlKSB7XG4gICAgICAgICAgbm9kZXNbaWRdLnJlbW92ZSA9IHRydWVcbiAgICAgICAgICBub2Rlc1tpZF0uaW5zZXJ0ID0gZmFsc2VcbiAgICAgICAgICBpZiAoc3Nob3RbaWRdLnJlbW92ZSkge1xuICAgICAgICAgICAgZm5hbWUgPSBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywgJycpLnJlcGxhY2UoL1xcLy9nLCAnLScpXG4gICAgICAgICAgICBmbmFtZSA9IGAke2ZuYW1lfS0ke3NzaG90W2lkXS50aXRsZX0tcmVtb3ZlYFxuICAgICAgICAgICAgd2luZG93LndzX19zZW5kKCdzY3JlZW5zaG90JywgeyBuYW1lc3BhY2UsIGhvc3QsIGZuYW1lLCBicm93c2VyIH0pXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LCAxMDApXG5cbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsICgpID0+IHtcbiAgICBjb25zdCBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGNhbGxiYWNrKVxuICAgIG9ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQuYm9keSwge1xuICAgICAgYXR0cmlidXRlczogdHJ1ZSxcbiAgICAgIGNoaWxkTGlzdDogdHJ1ZSxcbiAgICAgIHN1YnRyZWU6IHRydWVcbiAgICB9KVxuICB9KVxufVxuIiwiY29uc3QgdDY0ID0gJ1dhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODlBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmgnXG5cbmNvbnN0IG5hbm9pZCA9IChzaXplID0gOCkgPT4ge1xuICBsZXQgaWQgPSAnJ1xuICB3aGlsZSAoc2l6ZS0tID4gMCkge1xuICAgIGlkICs9IHQ2NFtNYXRoLnJhbmRvbSgpICogNjQgfCAwXVxuICB9XG4gIHJldHVybiBpZFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9ICgpID0+IHtcbiAgY29uc3QgeyBfd3MgfSA9IHdpbmRvd1xuXG4gIC8vIGV4OiB3c19icm9hZGNhc3QoJ19zdHlsZXtcImRhdGFcIjp7XCJxXCI6XCIqXCIsXCJjc3NcIjpcImNvbG9yOmJsdWU7XCJ9fScpXG4gIC8vIGV4OiB3c19icm9hZGNhc3QoJ19waW5ne1wiZGF0YVwiOlwiSGkhXCJ9JylcbiAgd2luZG93LndzX2Jyb2FkY2FzdCA9IChqc29uLCBfYWxsID0gdHJ1ZSkgPT4ge1xuICAgIGNvbnN0IG1zZyA9IHsgZGF0YToganNvbiwgX2FsbCB9XG4gICAgX3dzLnNlbmQoYGJyb2FkY2FzdCR7SlNPTi5zdHJpbmdpZnkobXNnKX1gKVxuICB9XG5cbiAgLy8gZXg6IHdzX2VtaXRwYWdlKCdfc3R5bGV7XCJkYXRhXCI6e1wicVwiOlwiKlwiLFwiY3NzXCI6XCJjb2xvcjpibHVlO1wifX0nKVxuICAvLyBleDogd3NfZW1pdHBhZ2UoJ19waW5ne1wiZGF0YVwiOlwiSGkhXCJ9JylcbiAgd2luZG93LndzX2VtaXRwYWdlID0gKGpzb24sIHJlZ2V4ID0gJycpID0+IHtcbiAgICBjb25zdCBtc2cgPSB7IGRhdGE6IGpzb24sIHJlZ2V4IH1cbiAgICBfd3Muc2VuZChgZW1pdHBhZ2Uke0pTT04uc3RyaW5naWZ5KG1zZyl9YClcbiAgfVxuXG4gIC8vIGV4OiB3c19fc3R5bGUoe1wicVwiOlwiKlwiLFwiY3NzXCI6XCJjb2xvcjpibHVlO1wifSlcbiAgd2luZG93LndzX19zdHlsZSA9IChqc29uLCBfYWxsID0gdHJ1ZSkgPT4ge1xuICAgIGNvbnN0IG1zZyA9IHsgZGF0YToganNvbiwgX2FsbCB9XG4gICAgX3dzLnNlbmQoYF9zdHlsZSR7SlNPTi5zdHJpbmdpZnkobXNnKX1gKVxuICB9XG5cbiAgLy8gZXg6IHdzX19waW5nKCdIaSEnKVxuICB3aW5kb3cud3NfX3BpbmcgPSAoanNvbikgPT4ge1xuICAgIGNvbnN0IG1zZyA9IHsgZGF0YToganNvbiB9XG4gICAgX3dzLnNlbmQoYF9waW5nJHtKU09OLnN0cmluZ2lmeShtc2cpfWApXG4gIH1cblxuICAvLyBleDogd3NfX2hlbHAoKVxuICB3aW5kb3cud3NfX2hlbHAgPSAoKSA9PiB7XG4gICAgX3dzLnNlbmQoJ19oZWxwe30nKVxuICB9XG5cbiAgLy8gZXg6IHdzX19vcGVuKHt1cmw6J2h0dHBzOi8vZ29vZ2xlLmNvbSd9KVxuICB3aW5kb3cud3NfX29wZW4gPSAoanNvbikgPT4ge1xuICAgIGNvbnN0IG1zZyA9IHsgZGF0YToganNvbiB9XG4gICAgX3dzLnNlbmQoYF9vcGVuJHtKU09OLnN0cmluZ2lmeShtc2cpfWApXG4gIH1cblxuICB3aW5kb3cud3NfX3NlbmQgPSAoY21kLCBkYXRhLCBoYW5kbGVyKSA9PiB7XG4gICAgY29uc3QgaWQgPSBuYW5vaWQoKVxuICAgIGNvbnN0IGtleSA9IGAke2NtZH06JHtpZH1gXG4gICAgd2luZG93Ll93c19xdWV1ZVtrZXldID0gaGFuZGxlciB8fCAodyA9PiB7fSlcblxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHdpbmRvdy5fd3NfcXVldWVba2V5XSkge1xuICAgICAgICBkZWxldGUgd2luZG93Ll93c19xdWV1ZVtrZXldXG4gICAgICAgIGNvbnNvbGUubG9nKCc+Pj4gd3MgdGltZW91dCEnLCBrZXkpXG4gICAgICB9XG4gICAgfSwgNTAwMClcbiAgICBjb25zdCBwYXJhbXMgPSBgJHtrZXl9JHtKU09OLnN0cmluZ2lmeSh7IGRhdGEgfSl9YFxuICAgIGlmICh3aW5kb3cubWl0bS5hcmd2LmRlYnVnKSB7XG4gICAgICBjb25zb2xlLmxvZygnX3dzLnNlbmQnLCBwYXJhbXMpXG4gICAgfVxuICAgIF93cy5zZW5kKHBhcmFtcylcbiAgfVxufVxuLy8gd3NfX3NlbmQoJ19waW5nJywgJ0xPTCcsIHc9PmNvbnNvbGUubG9nKCc+cmVzdWx0Jyx3KSk7XG4iLCIvKiBnbG9iYWwgbG9jYXRpb24gKi9cbi8qIGVzbGludC1kaXNhYmxlIGNhbWVsY2FzZSAqL1xuY29uc3QgX3dzX25hbWVzcGFjZSA9IHJlcXVpcmUoJy4vX3dzX25hbWVzcGFjZScpXG5cbmxldCBfdGltZW91dFxubGV0IF9jc3AgPSB7fVxubW9kdWxlLmV4cG9ydHMgPSAoKSA9PiB7XG4gIGNvbnN0IGNzcEVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICBjb25zdCB7IGhvc3RuYW1lOiBob3N0IH0gPSBsb2NhdGlvblxuICAgIGNvbnN0IG5hbWVzcGFjZSA9IF93c19uYW1lc3BhY2UoKVxuICAgIGNvbnN0IHBhdGggPSBsb2NhdGlvbi5wYXRobmFtZVxuICAgICAgLnJlcGxhY2UoL15cXC8vLCAnJylcbiAgICAgIC5yZXBsYWNlKC9cXC8vZywgJy0nKVxuICAgIGNvbnN0IHtcbiAgICAgIGJsb2NrZWRVUkksXG4gICAgICBkaXNwb3NpdGlvbixcbiAgICAgIGRvY3VtZW50VVJJLFxuICAgICAgZWZmZWN0aXZlRGlyZWN0aXZlLFxuICAgICAgb3JpZ2luYWxQb2xpY3ksXG4gICAgICB0aW1lU3RhbXAsXG4gICAgICB0eXBlLFxuICAgICAgdmlvbGF0ZWREaXJlY3RpdmVcbiAgICB9ID0gZVxuICAgIGNvbnN0IHR5cCA9IGBbJHtkaXNwb3NpdGlvbn1dICR7ZG9jdW1lbnRVUkl9YFxuICAgIGlmICghX2NzcFt0eXBdKSB7XG4gICAgICBfY3NwW3R5cF0gPSB7fVxuICAgIH1cbiAgICBpZiAoIV9jc3BbdHlwXS5fZ2VuZXJhbF8pIHtcbiAgICAgIF9jc3BbdHlwXS5fZ2VuZXJhbF8gPSB7XG4gICAgICAgIHBvbGljeTogb3JpZ2luYWxQb2xpY3ksXG4gICAgICAgIG5hbWVzcGFjZSxcbiAgICAgICAgaG9zdCxcbiAgICAgICAgcGF0aFxuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBfZG9jID0gX2NzcFt0eXBdXG4gICAgaWYgKCFfZG9jW3Zpb2xhdGVkRGlyZWN0aXZlXSkge1xuICAgICAgX2RvY1t2aW9sYXRlZERpcmVjdGl2ZV0gPSB7fVxuICAgIH1cblxuICAgIGNvbnN0IF9lcnIgPSBfZG9jW3Zpb2xhdGVkRGlyZWN0aXZlXVxuICAgIGlmICghX2VycltibG9ja2VkVVJJXSkge1xuICAgICAgX2VycltibG9ja2VkVVJJXSA9IHt9XG4gICAgfVxuICAgIGNvbnN0IF9tYXRjaCA9IG9yaWdpbmFsUG9saWN5Lm1hdGNoKGAke3Zpb2xhdGVkRGlyZWN0aXZlfSBbXjtdKztgKVxuICAgIGNvbnN0IGRpcmVjdGl2ZSA9IF9tYXRjaCA/IF9tYXRjaFswXSA6IGVmZmVjdGl2ZURpcmVjdGl2ZVxuICAgIF9lcnJbYmxvY2tlZFVSSV0gPSB7XG4gICAgICBkaXJlY3RpdmUsXG4gICAgICB0aW1lU3RhbXAsXG4gICAgICB0eXBlXG4gICAgfVxuICAgIF90aW1lb3V0ICYmIGNsZWFyVGltZW91dChfdGltZW91dClcbiAgICBfdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgY29uc29sZS5sb2coJz4+PiBDU1A6JywgX2NzcClcbiAgICAgIC8vIHdpbmRvdy53c19fc2VuZCgnY3NwX2Vycm9yJywge1xuICAgICAgLy8gICBuYW1lc3BhY2UsXG4gICAgICAvLyAgIGhvc3QsXG4gICAgICAvLyAgIHBhdGgsXG4gICAgICAvLyAgIF9jc3AsXG4gICAgICAvLyB9KTtcbiAgICAgIF9jc3AgPSB7fVxuICAgIH0sIDQwMDApXG4gIH1cblxuICBpZiAod2luZG93Lm1pdG0uY2xpZW50LmNzcCkge1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3NlY3VyaXR5cG9saWN5dmlvbGF0aW9uJywgY3NwRXJyb3IpXG4gIH1cbn1cbi8vIGRpc3Bvc2l0aW9uOiBcInJlcG9ydFwiXG4vLyBkb2N1bWVudFVSSTogXCJodHRwczovL3doYXQvaHRtbC9jb250YWluL2NzcFwiXG4vLyB2aW9sYXRlZERpcmVjdGl2ZTogXCJpbWctc3JjXCJcblxuLy8gYmxvY2tlZFVSSTogXCJodHRwczovL3doYXQvdXJsL2dldHRpbmcvYmxvY2tlZFwiXG4vLyBlZmZlY3RpdmVEaXJlY3RpdmU6IFwiaW1nLXNyY1wiXG4vLyBvcmlnaW5hbFBvbGljeTogXCJzY3JpcHQtc3JjIG51bGw7IGZyYW1lLXNyYyBudWxsOyBzdHlsZS1zcmMgbnVsbDsgc3R5bGUtc3JjLWVsZW0gbnVsbDsgaW1nLXNyYyBudWxsO1wiXG4vLyB0aW1lU3RhbXA6IDE5MzMuODIwMDAwMDA1NjUzMVxuLy8gdHlwZTogXCJzZWN1cml0eXBvbGljeXZpb2xhdGlvblwiXG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBjYW1lbGNhc2UgKi9cbmNvbnN0IF93c19wb3N0bWVzc2FnZSA9IHJlcXVpcmUoJy4vX3dzX3Bvc3RtZXNzYWdlJylcbmNvbnN0IF93c19pbml0U29ja2V0ID0gcmVxdWlyZSgnLi9fd3NfaW5pdC1zb2NrZXQnKVxuY29uc3QgX3dzX3NjcmVlbnNob3QgPSByZXF1aXJlKCcuL193c19zY3JlZW5zaG90JylcbmNvbnN0IF93c19sb2NhdGlvbiA9IHJlcXVpcmUoJy4vX3dzX2xvY2F0aW9uJylcbmNvbnN0IF93c19vYnNlcnZlciA9IHJlcXVpcmUoJy4vX3dzX29ic2VydmVyJylcbmNvbnN0IF93c19nZW5lcmFsID0gcmVxdWlyZSgnLi9fd3NfZ2VuZXJhbCcpXG5jb25zdCBfd3NfY3NwRXJyID0gcmVxdWlyZSgnLi9fd3NfY3NwLWVycicpXG5cbm1vZHVsZS5leHBvcnRzID0gKCkgPT4ge1xuICBfd3NfcG9zdG1lc3NhZ2UoKVxuICBfd3NfaW5pdFNvY2tldCgpXG4gIF93c19zY3JlZW5zaG90KClcbiAgX3dzX2xvY2F0aW9uKClcbiAgX3dzX29ic2VydmVyKClcbiAgX3dzX2dlbmVyYWwoKVxuICBfd3NfY3NwRXJyKClcbn1cbiJdLCJuYW1lcyI6WyJfd3NfZGVib3VuY2UiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFD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QUM5QyxJQUFHO0FBQ0g7QUFDQTtBQUNBLEVBQUUsTUFBTSxDQUFDLFNBQVMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLEdBQUcsSUFBSSxLQUFLO0FBQzVDLElBQUksTUFBTSxHQUFHLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksR0FBRTtBQUNwQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFDNUMsSUFBRztBQUNIO0FBQ0E7QUFDQSxFQUFFLE1BQU0sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFJLEtBQUs7QUFDOUIsSUFBSSxNQUFNLEdBQUcsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEdBQUU7QUFDOUIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQzNDLElBQUc7QUFDSDtBQUNBO0FBQ0EsRUFBRSxNQUFNLENBQUMsUUFBUSxHQUFHLE1BQU07QUFDMUIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQztBQUN2QixJQUFHO0FBQ0g7QUFDQTtBQUNBLEVBQUUsTUFBTSxDQUFDLFFBQVEsR0FBRyxDQUFDLElBQUksS0FBSztBQUM5QixJQUFJLE1BQU0sR0FBRyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksR0FBRTtBQUM5QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFDM0MsSUFBRztBQUNIO0FBQ0EsRUFBRSxNQUFNLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLEtBQUs7QUFDNUMsSUFBSSxNQUFNLEVBQUUsR0FBRyxNQUFNLEdBQUU7QUFDdkIsSUFBSSxNQUFNLEdBQUcsR0FBRyxDQUFDLEVB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
