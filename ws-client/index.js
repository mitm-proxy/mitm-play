'use strict';

var _ws_postmessage = () => {
  function receiveMessage(event) {
    if (window.mitm.client.postmessage) {
      console.log(`>> Postmessage: ${event.origin} => https://${location.host}`, event.data);
    }
  }
  window.addEventListener("message", receiveMessage, false);

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
    //ex: ws__help()
    _help({data}) {
      console.log(data);
    },
    //ex: ws__ping("there") 
    _ping({data}) {
      console.log(data);
    },
    //ex: ws__open({url: "https://google.com"})
    _open({data}) {
      const features = 'directories=0,titlebar=0,toolbar=0,location=0,status=0,menubar=0,width=800,height=600';
      windowRef = window.open(data.url, '_logs', features);
      windowRef.blur();
    },
    //ex: ws__style('.intro=>background:red;')
    _style({data}) {
      const {q,css} = data;
      document.querySelectorAll(q).forEach(
        node => (node.style.cssText = css)
      );
    },
    //ex: ws__
    _files({typ, data}) {
      const {files} = window.mitm;
      // console.log(`receive brodcast ${typ}`);
      for (let key in files[`${typ}_events`]) {
        files[`${typ}_events`][key](data);
      }
    },
    _setClient({data}) {
      console.log('_setClient', data);
      window.mitm.client = data;
    }
  };
};

const _ws_wccmd = _ws_client();

var _ws_msgParser = (event, msg) => {
  if (window.mitm.argv.debug) {
    if (msg.length>40) {
      console.log('>> ws-message: `%s...`', msg.slice(0,40));
    } else {
      console.log('>> ws-message: `%s`', msg);
    }  
  }
  const arr = msg.replace(/\s+$/, '').match(/^ *([\w:]+) *(\{.*)/);
  if (arr) {
    let [,cmd,json] = arr;
    try {
      if (typeof(json)==='string') {
        json = JSON.parse(json);
      }
    } catch (error) {
      console.error(json,error);
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
  return ifrm ? 'iframe' : 'window';
};

var _ws_initSocket = () => {
  const ws = new WebSocket(`wss://localhost:3001/ws?page=${_ws_inIframe()}`);

  ws.onmessage = function (event) { 
    _ws_msgParser(event, event.data);
   };

   ws.onopen = function() {                 
    ws.send(`url:${(location+'').split(/[?#]/)[0]}`);
    // console.log("ws: sent...");
  };  

  ws.onclose = function() { 
    console.log('ws: Connection is closed'); 
  };

  window._ws = ws;
  window._ws_queue = {};
};

var _ws_namespace = () => {
  const {hostname: host} = location;
  let namespace;

  function toRegex(str) {
    return str.replace(/\./g, '\\.').replace(/\?/g, '\\?');
  }

  for (let key in window.mitm.routes) {
    if (host.match(toRegex(key.replace(/~/,'[^.]*')))) {
      namespace = key;
      break;
    }
  }
  return namespace;
};

var _ws_vendor = () => {
  const {vendor} = navigator;
  const browser = {
    '': 'firefox',
    'Google Inc.': 'chromium',
    'Apple Computer, Inc.': 'webkit',
  }[vendor];
  return browser;
};

let act;
function screenshot(e) {
  if (mitm.argv.lazy) {
    if (mitm.screenshot) {
      window.mitm.screenshot = undefined;
      console.log('>> delay action');
      return;
    }
    if (act) {
      act = undefined;
      return;
    }  
  }
  const {hostname: host} = location;
  const namespace = _ws_namespace();
  const browser = _ws_vendor();
  const route = window.mitm.routes[namespace];
  const {selector} = route.screenshot;

  const arr = document.body.querySelectorAll(selector);
  const fname = location.pathname.replace(/^\//,'').replace(/\//g,'-');
  const delay = mitm.argv.lazy===true ? 700 : mitm.argv.lazy;
  for (let el of arr) {
    let node = e.target;
    while (el!==node && node!==document.body) {
      node = node.parentNode;
    }
    if (node!==document.body) {
      const params = {namespace, host, fname, browser};
      window.ws__send('screenshot', params);
      if (mitm.argv.lazy) {
        // delay action to finish screenshot
        window.mitm.screenshot = e.target;
        e.stopImmediatePropagation();
        e.stopPropagation();
        e.preventDefault();
        setTimeout(() => {
          // console.log('>> clicked');
          act = window.mitm.screenshot;
          window.mitm.screenshot.node = undefined;
          act.click();
          act = undefined;
        }, delay);
      }
      return;
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

var _ws_location = () => {
  const containerStyle = 'position: fixed;z-index: 9999;top: 8px;right: 5px;';
  const buttonStyle = 'border: none;border-radius: 15px;font-size: 10px;';
  const event = new Event('urlchanged');
  let container = {};
  let ctrl = false;
  let button = {};
  let buttons;
  let intervId;

  function toRegex(pathMsg) {
    let [path, msg] = pathMsg.split('=>').map(item=>item.trim());
    path = path.replace(/\./g, '\\.').replace(/\?/g, '\\?');
    return {path, msg};
  }

  function setButtons() {
    if (window.mitm.autobuttons) {
      const {autobuttons} = window.mitm;
      setTimeout(() => {
        for (let key in autobuttons) {
          const btn = document.createElement("button");
          const br = document.createElement("span");
          const [caption, color] = key.split('|');
          btn.onclick = autobuttons[key];
          btn.innerText = caption;
          buttons.appendChild(btn);
          buttons.appendChild(br);
          br.innerHTML = '&nbsp;';
          btn.style = buttonStyle + (color ? `background: ${color};` : '');
        }
      },0);  
    }
  }

  function urlChange(event) {
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
      const {pathname} = location;
      const {_macros_, macros} = window.mitm;
      // console.log(namespace, location);
      for (let key in macros) {
        const {path, msg} = toRegex(key);
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
    if (typeof(window.mitm.autointerval)==='function') {
      intervId = setInterval(window.mitm.autointerval, 500);
    }
    ctrl = false;
  }

  function play(autofill) {
    if (autofill) {
      if (typeof(autofill)==='function') {
        autofill = autofill();
      }
      const browser = _ws_vendor();
      const lenth = autofill.length;
      console.log(lenth===1 ? `  ${autofill}` : JSON.stringify(autofill, null, 2));
      window.ws__send('autofill', {autofill, browser});
    }
  }

  function btnclick(e) {
    let {autofill} = window.mitm;
    play(autofill);
  }

  function keybCtrl(e) { 
    const {macrokeys} = window.mitm;
    if (e.ctrlKey && e.key==='Shift') {
      ctrl = !ctrl;
      container.style = containerStyle + (!ctrl ? '' : 'display: none;');      
    } else if (e.ctrlKey && e.altKey) {
      console.log({macro: `ctrl + alt + ${e.code}`});
      if (macrokeys) {
        let macro = macrokeys[e.code];
        if (macro) {
          macro = macro();
          if (Array.isArray(macro)) {
            let macroIndex = 0;
            let interval = setInterval(() => {
              let selector = macro[macroIndex];
              if (selector.match(/^ *[=-]>/)) {
                selector = `${CssSelectorGenerator.getCssSelector(document.activeElement)} ${selector}`;
              }
              play([selector]);
    
              macroIndex += 1;
              if (macroIndex>=macro.length) {
                clearInterval(interval);
              }
            }, 100);  
          }
        }  
      }
    }
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
      const newNode = document.createElement("div");
      let html = '<button class="btn-autofill">Autofill</button>';
     
      newNode.innerHTML = `<span class="autofill-buttons"></span>${html}`;
      newNode.className = 'mitm autofill-container';
      newNode.style = containerStyle;

      node.insertBefore(newNode, noderef);
      setTimeout(()=> {
        container = newNode;
        buttons = newNode.children[0];
        button = newNode.children[1];
        button.onclick = btnclick;
        button.style = `${buttonStyle}background-color: azure;`;
        urlChange();
      },1);
    });
  }
};

function debounce(fn, delay=500) {
    let _timeout;
    return function() {
      const _this = this;
      const args = arguments;
      _timeout && clearTimeout(_timeout);
      _timeout = setTimeout(() => {
        fn.apply(_this, args);
      }, delay);
    }
  }
  var _ws_debounce = debounce;

var _ws_observer = () => {
  const {hostname: host} = location;
  const namespace = _ws_namespace();
  const browser = _ws_vendor();
  let sshot = {}, nodes = {};
  
  const route = window.mitm.routes[namespace];
  if (route && route.screenshot) {
    const {observer: ob} = route.screenshot;
    for (let id in ob) {
      let el = {};
      if (ob[id]===true) {
        el = {
          title: 'notitle',
          insert: true,
          remove: true,
        };
      } else {
        let arr = ob[id].split(':');
        arr[1].split(',').map(e => {
          el[e] = true;
        });
        el.title = arr[0];
      }
      sshot[id] = el;
      nodes[id] = {
        insert: false,
        remove: true,
      };
    }
  }

  let fname;
  const callback = _ws_debounce(function() {
    for (let id in nodes) {
      const el = document.body.querySelectorAll(id);
      if (el.length) {
        if (!nodes[id].insert) {
          nodes[id].insert = true;
          if (nodes[id].remove!==undefined) {
            nodes[id].remove = false;
          }
          if (sshot[id].insert) {
            fname = location.pathname.replace(/^\//,'').replace(/\//g,'-');
            fname = `${fname}-${sshot[id].title}-insert`;
            window.ws__send('screenshot', {namespace, host, fname, browser});
          }
        }
      } else {
        if (!nodes[id].remove) {
          nodes[id].remove = true;
          nodes[id].insert = false;
          if (sshot[id].remove) {
            fname = location.pathname.replace(/^\//,'').replace(/\//g,'-');
            fname = `${fname}-${sshot[id].title}-remove`;
            window.ws__send('screenshot', {namespace, host, fname, browser});
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

let nanoid = (size=8) => {
  let id = '';
  while (0 < size--) {
    id += t64[ Math.random()*64 | 0];
  }
  return id
};

var _ws_general = () => {
  const {_ws} = window;

  //ex: ws_broadcast('_style{"data":{"q":"*","css":"color:blue;"}}')
  //ex: ws_broadcast('_ping{"data":"Hi!"}')
  window.ws_broadcast = (json, _all=true) => {
    const msg = {data: json, _all};
    _ws.send(`broadcast${JSON.stringify(msg)}`);
  };

  //ex: ws_emitpage('_style{"data":{"q":"*","css":"color:blue;"}}')
  //ex: ws_emitpage('_ping{"data":"Hi!"}')
  window.ws_emitpage = (json, regex='') => {
    const msg = {data: json, regex};
    _ws.send(`emitpage${JSON.stringify(msg)}`);
  };

  //ex: ws__style({"q":"*","css":"color:blue;"})
  window.ws__style = (json, _all=true) => {
    const msg = {data: json, _all};
    _ws.send(`_style${JSON.stringify(msg)}`);
  };

  //ex: ws__ping('Hi!')
  window.ws__ping = (json) => {
    const msg = {data: json};
    _ws.send(`_ping${JSON.stringify(msg)}`);
  };
  
  //ex: ws__help()
  window.ws__help = () => {
    _ws.send('_help{}');
  };

  //ex: ws__open({url:'https://google.com'})
  window.ws__open = (json) => {
    const msg = {data: json};
    _ws.send(`_open${JSON.stringify(msg)}`);
  };

  window.ws__send = (cmd, data, handler) => {
    const id = nanoid();
    const key = `${cmd}:${id}`;
    window._ws_queue[key] = handler || (w => {});

    setTimeout(function() {
      if (window._ws_queue[key]) {
        delete  window._ws_queue[key];
        console.log('>> ws timeout!', key);
      } 
    }, 5000);
    const params = `${key}${JSON.stringify({data})}`;
    if (window.mitm.argv.debug) {
      console.log('_ws.send', params); 
    }
    _ws.send(params);
  };
};

let _timeout;
let _csp = {};
var _ws_cspErr = () => {
  const cspError = function(e) {
    const {hostname: host} = location;
    let namespace = _ws_namespace();
    const path = location.pathname
    .replace(/^\//,'')
    .replace(/\//g,'-');
    const {
      blockedURI,
      disposition,
      documentURI,
      effectiveDirective,
      originalPolicy,
      timeStamp,
      type,
      violatedDirective,
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
        path,
      };
    }
    const _doc = _csp[typ];
    if (!_doc[violatedDirective]) {
      _doc[violatedDirective] = {};
    }

    const _err =  _doc[violatedDirective];
    if (!_err[blockedURI]) {
      _err[blockedURI] = {};
    }
    const _match = originalPolicy.match(`${violatedDirective} [^;]+;`);
    const directive = _match ? _match[0] : effectiveDirective;
    _err[blockedURI] = {
      directive,
      timeStamp,
      type,
    };
    _timeout && clearTimeout(_timeout);
    _timeout = setTimeout(() => {
      console.log('>> CSP:', _csp);  
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

var _src = () => {
  _ws_postmessage();
  _ws_initSocket();
  _ws_screenshot();
  _ws_location();
  _ws_observer();
  _ws_general();
  _ws_cspErr();
};

_src();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIl9zcmMvX3dzX3Bvc3RtZXNzYWdlLmpzIiwiX3NyYy9fd3NfY2xpZW50LmpzIiwiX3NyYy9fd3NfbXNnLXBhcnNlci5qcyIsIl9zcmMvX3dzX2luLWlmcmFtZS5qcyIsIl9zcmMvX3dzX2luaXQtc29ja2V0LmpzIiwiX3NyYy9fd3NfbmFtZXNwYWNlLmpzIiwiX3NyYy9fd3NfdmVuZG9yLmpzIiwiX3NyYy9fd3Nfc2NyZWVuc2hvdC5qcyIsIl9zcmMvX3dzX2xvY2F0aW9uLmpzIiwiX3NyYy9fd3NfZGVib3VuY2UuanMiLCJfc3JjL193c19vYnNlcnZlci5qcyIsIl9zcmMvX3dzX2dlbmVyYWwuanMiLCJfc3JjL193c19jc3AtZXJyLmpzIiwiX3NyYy9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJtb2R1bGUuZXhwb3J0cyA9ICgpID0+IHtcclxuICBmdW5jdGlvbiByZWNlaXZlTWVzc2FnZShldmVudCkge1xyXG4gICAgaWYgKHdpbmRvdy5taXRtLmNsaWVudC5wb3N0bWVzc2FnZSkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgPj4gUG9zdG1lc3NhZ2U6ICR7ZXZlbnQub3JpZ2lufSA9PiBodHRwczovLyR7bG9jYXRpb24uaG9zdH1gLCBldmVudC5kYXRhKTtcclxuICAgIH1cclxuICB9XHJcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIHJlY2VpdmVNZXNzYWdlLCBmYWxzZSk7XHJcblxyXG4gIC8vIGlmICghY2hyb21lLndpbmRvd3MpIHtcclxuICAvLyAgIGZ1bmN0aW9uIHJlcG9ydFdpbmRvd1NpemUoKSB7XHJcbiAgLy8gICAgIGNvbnN0IHtpbm5lcldpZHRoLCBpbm5lckhlaWdodH0gPSB3aW5kb3c7XHJcbiAgLy8gICAgIGNvbnNvbGUubG9nKHtpbm5lcldpZHRoLCBpbm5lckhlaWdodH0pO1xyXG4gIC8vICAgfVxyXG4gIC8vICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgcmVwb3J0V2luZG93U2l6ZSk7ICBcclxuICAvLyB9XHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSAoKSA9PiB7XG4gIGxldCB3aW5kb3dSZWY7XG4gIHJldHVybiB7XG4gICAgLy9leDogd3NfX2hlbHAoKVxuICAgIF9oZWxwKHtkYXRhfSkge1xuICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgfSxcbiAgICAvL2V4OiB3c19fcGluZyhcInRoZXJlXCIpIFxuICAgIF9waW5nKHtkYXRhfSkge1xuICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgfSxcbiAgICAvL2V4OiB3c19fb3Blbih7dXJsOiBcImh0dHBzOi8vZ29vZ2xlLmNvbVwifSlcbiAgICBfb3Blbih7ZGF0YX0pIHtcbiAgICAgIGNvbnN0IGZlYXR1cmVzID0gJ2RpcmVjdG9yaWVzPTAsdGl0bGViYXI9MCx0b29sYmFyPTAsbG9jYXRpb249MCxzdGF0dXM9MCxtZW51YmFyPTAsd2lkdGg9ODAwLGhlaWdodD02MDAnO1xuICAgICAgd2luZG93UmVmID0gd2luZG93Lm9wZW4oZGF0YS51cmwsICdfbG9ncycsIGZlYXR1cmVzKTtcbiAgICAgIHdpbmRvd1JlZi5ibHVyKCk7XG4gICAgfSxcbiAgICAvL2V4OiB3c19fc3R5bGUoJy5pbnRybz0+YmFja2dyb3VuZDpyZWQ7JylcbiAgICBfc3R5bGUoe2RhdGF9KSB7XG4gICAgICBjb25zdCB7cSxjc3N9ID0gZGF0YTtcbiAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwocSkuZm9yRWFjaChcbiAgICAgICAgbm9kZSA9PiAobm9kZS5zdHlsZS5jc3NUZXh0ID0gY3NzKVxuICAgICAgKTtcbiAgICB9LFxuICAgIC8vZXg6IHdzX19cbiAgICBfZmlsZXMoe3R5cCwgZGF0YX0pIHtcbiAgICAgIGNvbnN0IHtmaWxlc30gPSB3aW5kb3cubWl0bTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGByZWNlaXZlIGJyb2RjYXN0ICR7dHlwfWApO1xuICAgICAgZm9yIChsZXQga2V5IGluIGZpbGVzW2Ake3R5cH1fZXZlbnRzYF0pIHtcbiAgICAgICAgZmlsZXNbYCR7dHlwfV9ldmVudHNgXVtrZXldKGRhdGEpO1xuICAgICAgfVxuICAgIH0sXG4gICAgX3NldENsaWVudCh7ZGF0YX0pIHtcbiAgICAgIGNvbnNvbGUubG9nKCdfc2V0Q2xpZW50JywgZGF0YSk7XG4gICAgICB3aW5kb3cubWl0bS5jbGllbnQgPSBkYXRhO1xuICAgIH1cbiAgfTtcbn1cbiIsImNvbnN0IF93c19jbGllbnQgPSByZXF1aXJlKCcuL193c19jbGllbnQnKTtcbmNvbnN0IF93c193Y2NtZCA9IF93c19jbGllbnQoKTtcblxubW9kdWxlLmV4cG9ydHMgPSAoZXZlbnQsIG1zZykgPT4ge1xuICBpZiAod2luZG93Lm1pdG0uYXJndi5kZWJ1Zykge1xuICAgIGlmIChtc2cubGVuZ3RoPjQwKSB7XG4gICAgICBjb25zb2xlLmxvZygnPj4gd3MtbWVzc2FnZTogYCVzLi4uYCcsIG1zZy5zbGljZSgwLDQwKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKCc+PiB3cy1tZXNzYWdlOiBgJXNgJywgbXNnKTtcbiAgICB9ICBcbiAgfVxuICBjb25zdCBhcnIgPSBtc2cucmVwbGFjZSgvXFxzKyQvLCAnJykubWF0Y2goL14gKihbXFx3Ol0rKSAqKFxcey4qKS8pO1xuICBpZiAoYXJyKSB7XG4gICAgbGV0IFssY21kLGpzb25dID0gYXJyO1xuICAgIHRyeSB7XG4gICAgICBpZiAodHlwZW9mKGpzb24pPT09J3N0cmluZycpIHtcbiAgICAgICAganNvbiA9IEpTT04ucGFyc2UoanNvbik7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoanNvbixlcnJvcik7XG4gICAgfSAgICAgICAgXG4gICAgaWYgKHdpbmRvdy5fd3NfcXVldWVbY21kXSkge1xuICAgICAgY29uc3QgaGFuZGxlciA9IHdpbmRvdy5fd3NfcXVldWVbY21kXTtcbiAgICAgIGRlbGV0ZSB3aW5kb3cuX3dzX3F1ZXVlW2NtZF07XG4gICAgICBoYW5kbGVyKGpzb24uZGF0YSk7XG4gICAgfSBlbHNlIGlmIChfd3Nfd2NjbWRbY21kXSkge1xuICAgICAgX3dzX3djY21kW2NtZF0uY2FsbChldmVudCwganNvbilcbiAgICB9ICAgICAgIFxuICB9ICAgIFxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSAoKSA9PiB7XHJcbiAgbGV0IGlmcm07XHJcbiAgdHJ5IHtcclxuICAgIGlmcm0gPSB3aW5kb3cuc2VsZiAhPT0gd2luZG93LnRvcDtcclxuICB9IGNhdGNoIChlKSB7XHJcbiAgICBpZnJtID0gdHJ1ZTtcclxuICB9XHJcbiAgcmV0dXJuIGlmcm0gPyAnaWZyYW1lJyA6ICd3aW5kb3cnO1xyXG59O1xyXG4iLCJjb25zdCBfd3NfbXNnUGFyc2VyID0gcmVxdWlyZSgnLi9fd3NfbXNnLXBhcnNlcicpO1xyXG5jb25zdCBfd3NfaW5JZnJhbWUgPSByZXF1aXJlKCcuL193c19pbi1pZnJhbWUnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKCkgPT4ge1xyXG4gIGNvbnN0IHdzID0gbmV3IFdlYlNvY2tldChgd3NzOi8vbG9jYWxob3N0OjMwMDEvd3M/cGFnZT0ke193c19pbklmcmFtZSgpfWApO1xyXG5cclxuICB3cy5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHsgXHJcbiAgICBfd3NfbXNnUGFyc2VyKGV2ZW50LCBldmVudC5kYXRhKTtcclxuICAgfTtcclxuXHJcbiAgIHdzLm9ub3BlbiA9IGZ1bmN0aW9uKCkgeyAgICAgICAgICAgICAgICAgXHJcbiAgICB3cy5zZW5kKGB1cmw6JHsobG9jYXRpb24rJycpLnNwbGl0KC9bPyNdLylbMF19YCk7XHJcbiAgICAvLyBjb25zb2xlLmxvZyhcIndzOiBzZW50Li4uXCIpO1xyXG4gIH07ICBcclxuXHJcbiAgd3Mub25jbG9zZSA9IGZ1bmN0aW9uKCkgeyBcclxuICAgIGNvbnNvbGUubG9nKCd3czogQ29ubmVjdGlvbiBpcyBjbG9zZWQnKTsgXHJcbiAgfTtcclxuXHJcbiAgd2luZG93Ll93cyA9IHdzO1xyXG4gIHdpbmRvdy5fd3NfcXVldWUgPSB7fTtcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9ICgpID0+IHtcbiAgY29uc3Qge2hvc3RuYW1lOiBob3N0fSA9IGxvY2F0aW9uO1xuICBsZXQgbmFtZXNwYWNlO1xuXG4gIGZ1bmN0aW9uIHRvUmVnZXgoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5yZXBsYWNlKC9cXC4vZywgJ1xcXFwuJykucmVwbGFjZSgvXFw/L2csICdcXFxcPycpO1xuICB9XG5cbiAgZm9yIChsZXQga2V5IGluIHdpbmRvdy5taXRtLnJvdXRlcykge1xuICAgIGlmIChob3N0Lm1hdGNoKHRvUmVnZXgoa2V5LnJlcGxhY2UoL34vLCdbXi5dKicpKSkpIHtcbiAgICAgIG5hbWVzcGFjZSA9IGtleTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbmFtZXNwYWNlO1xufSIsIm1vZHVsZS5leHBvcnRzID0gKCkgPT4ge1xyXG4gIGNvbnN0IHt2ZW5kb3J9ID0gbmF2aWdhdG9yO1xyXG4gIGNvbnN0IGJyb3dzZXIgPSB7XHJcbiAgICAnJzogJ2ZpcmVmb3gnLFxyXG4gICAgJ0dvb2dsZSBJbmMuJzogJ2Nocm9taXVtJyxcclxuICAgICdBcHBsZSBDb21wdXRlciwgSW5jLic6ICd3ZWJraXQnLFxyXG4gIH1bdmVuZG9yXTtcclxuICByZXR1cm4gYnJvd3NlcjtcclxufSIsImNvbnN0IF93c19uYW1lc3BhY2UgPSByZXF1aXJlKCcuL193c19uYW1lc3BhY2UnKTtcclxuY29uc3QgX3dzX3ZlbmRvciA9IHJlcXVpcmUoJy4vX3dzX3ZlbmRvcicpO1xyXG5cclxubGV0IGFjdDtcclxuZnVuY3Rpb24gc2NyZWVuc2hvdChlKSB7XHJcbiAgaWYgKG1pdG0uYXJndi5sYXp5KSB7XHJcbiAgICBpZiAobWl0bS5zY3JlZW5zaG90KSB7XHJcbiAgICAgIHdpbmRvdy5taXRtLnNjcmVlbnNob3QgPSB1bmRlZmluZWQ7XHJcbiAgICAgIGNvbnNvbGUubG9nKCc+PiBkZWxheSBhY3Rpb24nKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaWYgKGFjdCkge1xyXG4gICAgICBhY3QgPSB1bmRlZmluZWQ7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH0gIFxyXG4gIH1cclxuICBjb25zdCB7aG9zdG5hbWU6IGhvc3R9ID0gbG9jYXRpb247XHJcbiAgY29uc3QgbmFtZXNwYWNlID0gX3dzX25hbWVzcGFjZSgpO1xyXG4gIGNvbnN0IGJyb3dzZXIgPSBfd3NfdmVuZG9yKCk7XHJcbiAgY29uc3Qgcm91dGUgPSB3aW5kb3cubWl0bS5yb3V0ZXNbbmFtZXNwYWNlXTtcclxuICBjb25zdCB7c2VsZWN0b3J9ID0gcm91dGUuc2NyZWVuc2hvdDtcclxuXHJcbiAgY29uc3QgYXJyID0gZG9jdW1lbnQuYm9keS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcclxuICBjb25zdCBmbmFtZSA9IGxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKS5yZXBsYWNlKC9cXC8vZywnLScpO1xyXG4gIGNvbnN0IGRlbGF5ID0gbWl0bS5hcmd2Lmxhenk9PT10cnVlID8gNzAwIDogbWl0bS5hcmd2Lmxhenk7XHJcbiAgZm9yIChsZXQgZWwgb2YgYXJyKSB7XHJcbiAgICBsZXQgbm9kZSA9IGUudGFyZ2V0O1xyXG4gICAgd2hpbGUgKGVsIT09bm9kZSAmJiBub2RlIT09ZG9jdW1lbnQuYm9keSkge1xyXG4gICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xyXG4gICAgfVxyXG4gICAgaWYgKG5vZGUhPT1kb2N1bWVudC5ib2R5KSB7XHJcbiAgICAgIGNvbnN0IHBhcmFtcyA9IHtuYW1lc3BhY2UsIGhvc3QsIGZuYW1lLCBicm93c2VyfTtcclxuICAgICAgd2luZG93LndzX19zZW5kKCdzY3JlZW5zaG90JywgcGFyYW1zKTtcclxuICAgICAgaWYgKG1pdG0uYXJndi5sYXp5KSB7XHJcbiAgICAgICAgLy8gZGVsYXkgYWN0aW9uIHRvIGZpbmlzaCBzY3JlZW5zaG90XHJcbiAgICAgICAgd2luZG93Lm1pdG0uc2NyZWVuc2hvdCA9IGUudGFyZ2V0O1xyXG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZygnPj4gY2xpY2tlZCcpO1xyXG4gICAgICAgICAgYWN0ID0gd2luZG93Lm1pdG0uc2NyZWVuc2hvdDtcclxuICAgICAgICAgIHdpbmRvdy5taXRtLnNjcmVlbnNob3Qubm9kZSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIGFjdC5jbGljaygpO1xyXG4gICAgICAgICAgYWN0ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIH0sIGRlbGF5KTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9ICgpID0+IHtcclxuICBjb25zdCByb3V0ZSA9IHdpbmRvdy5taXRtLnJvdXRlc1tfd3NfbmFtZXNwYWNlKCldO1xyXG4gIGlmIChyb3V0ZSAmJiByb3V0ZS5zY3JlZW5zaG90KSB7XHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsICgpID0+IHtcclxuICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignYm9keScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgc2NyZWVuc2hvdCk7XHJcbiAgICB9KTtcclxuICB9XHJcbn07XHJcbiIsImNvbnN0IF93c19uYW1lc3BhY2UgPSByZXF1aXJlKCcuL193c19uYW1lc3BhY2UnKTtcclxuY29uc3QgX3dzX3ZlbmRvciA9IHJlcXVpcmUoJy4vX3dzX3ZlbmRvcicpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSAoKSA9PiB7XHJcbiAgY29uc3QgY29udGFpbmVyU3R5bGUgPSAncG9zaXRpb246IGZpeGVkO3otaW5kZXg6IDk5OTk7dG9wOiA4cHg7cmlnaHQ6IDVweDsnO1xyXG4gIGNvbnN0IGJ1dHRvblN0eWxlID0gJ2JvcmRlcjogbm9uZTtib3JkZXItcmFkaXVzOiAxNXB4O2ZvbnQtc2l6ZTogMTBweDsnXHJcbiAgY29uc3QgZXZlbnQgPSBuZXcgRXZlbnQoJ3VybGNoYW5nZWQnKTtcclxuICBsZXQgY29udGFpbmVyID0ge307XHJcbiAgbGV0IGN0cmwgPSBmYWxzZTtcclxuICBsZXQgYnV0dG9uID0ge307XHJcbiAgbGV0IGJ1dHRvbnM7XHJcbiAgbGV0IGludGVydklkO1xyXG5cclxuICBmdW5jdGlvbiB0b1JlZ2V4KHBhdGhNc2cpIHtcclxuICAgIGxldCBbcGF0aCwgbXNnXSA9IHBhdGhNc2cuc3BsaXQoJz0+JykubWFwKGl0ZW09Pml0ZW0udHJpbSgpKTtcclxuICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLi9nLCAnXFxcXC4nKS5yZXBsYWNlKC9cXD8vZywgJ1xcXFw/Jyk7XHJcbiAgICByZXR1cm4ge3BhdGgsIG1zZ307XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBzZXRCdXR0b25zKCkge1xyXG4gICAgaWYgKHdpbmRvdy5taXRtLmF1dG9idXR0b25zKSB7XHJcbiAgICAgIGNvbnN0IHthdXRvYnV0dG9uc30gPSB3aW5kb3cubWl0bTtcclxuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgZm9yIChsZXQga2V5IGluIGF1dG9idXR0b25zKSB7XHJcbiAgICAgICAgICBjb25zdCBidG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gICAgICAgICAgY29uc3QgYnIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcclxuICAgICAgICAgIGNvbnN0IFtjYXB0aW9uLCBjb2xvcl0gPSBrZXkuc3BsaXQoJ3wnKTtcclxuICAgICAgICAgIGJ0bi5vbmNsaWNrID0gYXV0b2J1dHRvbnNba2V5XTtcclxuICAgICAgICAgIGJ0bi5pbm5lclRleHQgPSBjYXB0aW9uO1xyXG4gICAgICAgICAgYnV0dG9ucy5hcHBlbmRDaGlsZChidG4pO1xyXG4gICAgICAgICAgYnV0dG9ucy5hcHBlbmRDaGlsZChicik7XHJcbiAgICAgICAgICBici5pbm5lckhUTUwgPSAnJm5ic3A7JztcclxuICAgICAgICAgIGJ0bi5zdHlsZSA9IGJ1dHRvblN0eWxlICsgKGNvbG9yID8gYGJhY2tncm91bmQ6ICR7Y29sb3J9O2AgOiAnJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LDApICBcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHVybENoYW5nZShldmVudCkge1xyXG4gICAgY29uc3QgbmFtZXNwYWNlID0gX3dzX25hbWVzcGFjZSgpO1xyXG4gICAgaWYgKHdpbmRvdy5taXRtLmF1dG9maWxsKSB7XHJcbiAgICAgIGRlbGV0ZSB3aW5kb3cubWl0bS5hdXRvZmlsbDtcclxuICAgIH1cclxuICAgIGlmICh3aW5kb3cubWl0bS5hdXRvaW50ZXJ2YWwpIHtcclxuICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZJZCk7XHJcbiAgICAgIGRlbGV0ZSB3aW5kb3cubWl0bS5hdXRvaW50ZXJ2YWw7XHJcbiAgICB9XHJcbiAgICBpZiAod2luZG93Lm1pdG0uYXV0b2J1dHRvbnMpIHtcclxuICAgICAgZGVsZXRlIHdpbmRvdy5taXRtLmF1dG9idXR0b25zO1xyXG4gICAgICBidXR0b25zLmlubmVySFRNTCA9ICcnO1xyXG4gICAgfVxyXG4gICAgaWYgKHdpbmRvdy5taXRtLm1hY3Jva2V5cykge1xyXG4gICAgICBkZWxldGUgd2luZG93Lm1pdG0ubWFjcm9rZXlzO1xyXG4gICAgfVxyXG4gICAgaWYgKG5hbWVzcGFjZSkge1xyXG4gICAgICBjb25zdCB7cGF0aG5hbWV9ID0gbG9jYXRpb247XHJcbiAgICAgIGNvbnN0IHtfbWFjcm9zXywgbWFjcm9zfSA9IHdpbmRvdy5taXRtO1xyXG4gICAgICAvLyBjb25zb2xlLmxvZyhuYW1lc3BhY2UsIGxvY2F0aW9uKTtcclxuICAgICAgZm9yIChsZXQga2V5IGluIG1hY3Jvcykge1xyXG4gICAgICAgIGNvbnN0IHtwYXRoLCBtc2d9ID0gdG9SZWdleChrZXkpO1xyXG4gICAgICAgIGlmIChwYXRobmFtZS5tYXRjaChwYXRoKSkge1xyXG4gICAgICAgICAgYnV0dG9uLmlubmVySFRNTCA9IG1zZyB8fCAnQXV0b2ZpbGwnO1xyXG4gICAgICAgICAgX21hY3Jvc18gJiYgX21hY3Jvc18oKTtcclxuICAgICAgICAgIG1hY3Jvc1trZXldKCk7XHJcbiAgICAgICAgICBzZXRCdXR0b25zKCk7XHJcbiAgICAgICAgfSBcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29udGFpbmVyLnN0eWxlID0gY29udGFpbmVyU3R5bGU7XHJcbiAgICBjb25zdCB2aXNpYmxlID0gKHdpbmRvdy5taXRtLmF1dG9maWxsKTtcclxuICAgIGJ1dHRvbi5zdHlsZSA9IGJ1dHRvblN0eWxlICsgKHZpc2libGUgPyAnYmFja2dyb3VuZC1jb2xvcjogYXp1cmU7JyA6ICdkaXNwbGF5OiBub25lOycpO1xyXG4gICAgaWYgKHR5cGVvZih3aW5kb3cubWl0bS5hdXRvaW50ZXJ2YWwpPT09J2Z1bmN0aW9uJykge1xyXG4gICAgICBpbnRlcnZJZCA9IHNldEludGVydmFsKHdpbmRvdy5taXRtLmF1dG9pbnRlcnZhbCwgNTAwKTtcclxuICAgIH1cclxuICAgIGN0cmwgPSBmYWxzZTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHBsYXkoYXV0b2ZpbGwpIHtcclxuICAgIGlmIChhdXRvZmlsbCkge1xyXG4gICAgICBpZiAodHlwZW9mKGF1dG9maWxsKT09PSdmdW5jdGlvbicpIHtcclxuICAgICAgICBhdXRvZmlsbCA9IGF1dG9maWxsKCk7XHJcbiAgICAgIH1cclxuICAgICAgY29uc3QgYnJvd3NlciA9IF93c192ZW5kb3IoKTtcclxuICAgICAgY29uc3QgbGVudGggPSBhdXRvZmlsbC5sZW5ndGg7XHJcbiAgICAgIGNvbnNvbGUubG9nKGxlbnRoPT09MSA/IGAgICR7YXV0b2ZpbGx9YCA6IEpTT04uc3RyaW5naWZ5KGF1dG9maWxsLCBudWxsLCAyKSk7XHJcbiAgICAgIHdpbmRvdy53c19fc2VuZCgnYXV0b2ZpbGwnLCB7YXV0b2ZpbGwsIGJyb3dzZXJ9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGJ0bmNsaWNrKGUpIHtcclxuICAgIGxldCB7YXV0b2ZpbGx9ID0gd2luZG93Lm1pdG07XHJcbiAgICBwbGF5KGF1dG9maWxsKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGtleWJDdHJsKGUpIHsgXHJcbiAgICBjb25zdCB7bWFjcm9rZXlzfSA9IHdpbmRvdy5taXRtO1xyXG4gICAgaWYgKGUuY3RybEtleSAmJiBlLmtleT09PSdTaGlmdCcpIHtcclxuICAgICAgY3RybCA9ICFjdHJsO1xyXG4gICAgICBjb250YWluZXIuc3R5bGUgPSBjb250YWluZXJTdHlsZSArICghY3RybCA/ICcnIDogJ2Rpc3BsYXk6IG5vbmU7Jyk7ICAgICAgXHJcbiAgICB9IGVsc2UgaWYgKGUuY3RybEtleSAmJiBlLmFsdEtleSkge1xyXG4gICAgICBjb25zb2xlLmxvZyh7bWFjcm86IGBjdHJsICsgYWx0ICsgJHtlLmNvZGV9YH0pO1xyXG4gICAgICBpZiAobWFjcm9rZXlzKSB7XHJcbiAgICAgICAgbGV0IG1hY3JvID0gbWFjcm9rZXlzW2UuY29kZV07XHJcbiAgICAgICAgaWYgKG1hY3JvKSB7XHJcbiAgICAgICAgICBtYWNybyA9IG1hY3JvKCk7XHJcbiAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShtYWNybykpIHtcclxuICAgICAgICAgICAgbGV0IG1hY3JvSW5kZXggPSAwO1xyXG4gICAgICAgICAgICBsZXQgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgbGV0IHNlbGVjdG9yID0gbWFjcm9bbWFjcm9JbmRleF07XHJcbiAgICAgICAgICAgICAgaWYgKHNlbGVjdG9yLm1hdGNoKC9eICpbPS1dPi8pKSB7XHJcbiAgICAgICAgICAgICAgICBzZWxlY3RvciA9IGAke0Nzc1NlbGVjdG9yR2VuZXJhdG9yLmdldENzc1NlbGVjdG9yKGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpfSAke3NlbGVjdG9yfWA7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIHBsYXkoW3NlbGVjdG9yXSk7XHJcbiAgICBcclxuICAgICAgICAgICAgICBtYWNyb0luZGV4ICs9IDE7XHJcbiAgICAgICAgICAgICAgaWYgKG1hY3JvSW5kZXg+PW1hY3JvLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbClcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIDEwMCk7ICBcclxuICAgICAgICAgIH1cclxuICAgICAgICB9ICBcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKCFjaHJvbWUudGFicykge1xyXG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaHRtbCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBrZXliQ3RybCk7XHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndXJsY2hhbmdlZCcsIHVybENoYW5nZSk7XHJcbiAgICBjb25zdCBmbiA9IGhpc3RvcnkucHVzaFN0YXRlO1xyXG4gICAgaGlzdG9yeS5wdXNoU3RhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGZuLmFwcGx5KGhpc3RvcnksIGFyZ3VtZW50cyk7XHJcbiAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcclxuICAgIH07XHJcbiAgXHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsICgpID0+IHtcclxuICAgICAgY29uc3Qgbm9kZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2h0bWwnKTtcclxuICAgICAgY29uc3Qgbm9kZXJlZiA9IG5vZGUuZmlyc3RFbGVtZW50Q2hpbGQ7XHJcbiAgICAgIGNvbnN0IG5ld05vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgICBsZXQgaHRtbCA9ICc8YnV0dG9uIGNsYXNzPVwiYnRuLWF1dG9maWxsXCI+QXV0b2ZpbGw8L2J1dHRvbj4nO1xyXG4gICAgIFxyXG4gICAgICBuZXdOb2RlLmlubmVySFRNTCA9IGA8c3BhbiBjbGFzcz1cImF1dG9maWxsLWJ1dHRvbnNcIj48L3NwYW4+JHtodG1sfWA7XHJcbiAgICAgIG5ld05vZGUuY2xhc3NOYW1lID0gJ21pdG0gYXV0b2ZpbGwtY29udGFpbmVyJztcclxuICAgICAgbmV3Tm9kZS5zdHlsZSA9IGNvbnRhaW5lclN0eWxlO1xyXG5cclxuICAgICAgbm9kZS5pbnNlcnRCZWZvcmUobmV3Tm9kZSwgbm9kZXJlZik7XHJcbiAgICAgIHNldFRpbWVvdXQoKCk9PiB7XHJcbiAgICAgICAgY29udGFpbmVyID0gbmV3Tm9kZTtcclxuICAgICAgICBidXR0b25zID0gbmV3Tm9kZS5jaGlsZHJlblswXTtcclxuICAgICAgICBidXR0b24gPSBuZXdOb2RlLmNoaWxkcmVuWzFdO1xyXG4gICAgICAgIGJ1dHRvbi5vbmNsaWNrID0gYnRuY2xpY2s7XHJcbiAgICAgICAgYnV0dG9uLnN0eWxlID0gYCR7YnV0dG9uU3R5bGV9YmFja2dyb3VuZC1jb2xvcjogYXp1cmU7YFxyXG4gICAgICAgIHVybENoYW5nZShldmVudCk7XHJcbiAgICAgIH0sMSlcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG4iLCJmdW5jdGlvbiBkZWJvdW5jZShmbiwgZGVsYXk9NTAwKSB7XHJcbiAgICBsZXQgX3RpbWVvdXQ7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XHJcbiAgICAgIGNvbnN0IF90aGlzID0gdGhpcztcclxuICAgICAgY29uc3QgYXJncyA9IGFyZ3VtZW50cztcclxuICAgICAgX3RpbWVvdXQgJiYgY2xlYXJUaW1lb3V0KF90aW1lb3V0KTtcclxuICAgICAgX3RpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICBmbi5hcHBseShfdGhpcywgYXJncyk7XHJcbiAgICAgIH0sIGRlbGF5KVxyXG4gICAgfVxyXG4gIH1cclxuICBtb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlOyIsImNvbnN0IF93c19uYW1lc3BhY2UgPSByZXF1aXJlKCcuL193c19uYW1lc3BhY2UnKTtcclxuY29uc3QgX3dzX2RlYm91bmNlID0gcmVxdWlyZSgnLi9fd3NfZGVib3VuY2UnKTtcclxuY29uc3QgX3dzX3ZlbmRvciA9IHJlcXVpcmUoJy4vX3dzX3ZlbmRvcicpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSAoKSA9PiB7XHJcbiAgY29uc3Qge2hvc3RuYW1lOiBob3N0fSA9IGxvY2F0aW9uO1xyXG4gIGNvbnN0IG5hbWVzcGFjZSA9IF93c19uYW1lc3BhY2UoKTtcclxuICBjb25zdCBicm93c2VyID0gX3dzX3ZlbmRvcigpO1xyXG4gIGxldCBzc2hvdCA9IHt9LCBub2RlcyA9IHt9O1xyXG4gIFxyXG4gIGNvbnN0IHJvdXRlID0gd2luZG93Lm1pdG0ucm91dGVzW25hbWVzcGFjZV07XHJcbiAgaWYgKHJvdXRlICYmIHJvdXRlLnNjcmVlbnNob3QpIHtcclxuICAgIGNvbnN0IHtvYnNlcnZlcjogb2J9ID0gcm91dGUuc2NyZWVuc2hvdDtcclxuICAgIGZvciAobGV0IGlkIGluIG9iKSB7XHJcbiAgICAgIGxldCBlbCA9IHt9O1xyXG4gICAgICBpZiAob2JbaWRdPT09dHJ1ZSkge1xyXG4gICAgICAgIGVsID0ge1xyXG4gICAgICAgICAgdGl0bGU6ICdub3RpdGxlJyxcclxuICAgICAgICAgIGluc2VydDogdHJ1ZSxcclxuICAgICAgICAgIHJlbW92ZTogdHJ1ZSxcclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IGFyciA9IG9iW2lkXS5zcGxpdCgnOicpO1xyXG4gICAgICAgIGFyclsxXS5zcGxpdCgnLCcpLm1hcChlID0+IHtcclxuICAgICAgICAgIGVsW2VdID0gdHJ1ZTtcclxuICAgICAgICB9KVxyXG4gICAgICAgIGVsLnRpdGxlID0gYXJyWzBdO1xyXG4gICAgICB9XHJcbiAgICAgIHNzaG90W2lkXSA9IGVsO1xyXG4gICAgICBub2Rlc1tpZF0gPSB7XHJcbiAgICAgICAgaW5zZXJ0OiBmYWxzZSxcclxuICAgICAgICByZW1vdmU6IHRydWUsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBsZXQgZm5hbWU7XHJcbiAgY29uc3QgY2FsbGJhY2sgPSBfd3NfZGVib3VuY2UoZnVuY3Rpb24oKSB7XHJcbiAgICBmb3IgKGxldCBpZCBpbiBub2Rlcykge1xyXG4gICAgICBjb25zdCBlbCA9IGRvY3VtZW50LmJvZHkucXVlcnlTZWxlY3RvckFsbChpZCk7XHJcbiAgICAgIGlmIChlbC5sZW5ndGgpIHtcclxuICAgICAgICBpZiAoIW5vZGVzW2lkXS5pbnNlcnQpIHtcclxuICAgICAgICAgIG5vZGVzW2lkXS5pbnNlcnQgPSB0cnVlO1xyXG4gICAgICAgICAgaWYgKG5vZGVzW2lkXS5yZW1vdmUhPT11bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgbm9kZXNbaWRdLnJlbW92ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKHNzaG90W2lkXS5pbnNlcnQpIHtcclxuICAgICAgICAgICAgZm5hbWUgPSBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykucmVwbGFjZSgvXFwvL2csJy0nKTtcclxuICAgICAgICAgICAgZm5hbWUgPSBgJHtmbmFtZX0tJHtzc2hvdFtpZF0udGl0bGV9LWluc2VydGA7XHJcbiAgICAgICAgICAgIHdpbmRvdy53c19fc2VuZCgnc2NyZWVuc2hvdCcsIHtuYW1lc3BhY2UsIGhvc3QsIGZuYW1lLCBicm93c2VyfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmICghbm9kZXNbaWRdLnJlbW92ZSkge1xyXG4gICAgICAgICAgbm9kZXNbaWRdLnJlbW92ZSA9IHRydWVcclxuICAgICAgICAgIG5vZGVzW2lkXS5pbnNlcnQgPSBmYWxzZTtcclxuICAgICAgICAgIGlmIChzc2hvdFtpZF0ucmVtb3ZlKSB7XHJcbiAgICAgICAgICAgIGZuYW1lID0gbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpLnJlcGxhY2UoL1xcLy9nLCctJyk7XHJcbiAgICAgICAgICAgIGZuYW1lID0gYCR7Zm5hbWV9LSR7c3Nob3RbaWRdLnRpdGxlfS1yZW1vdmVgO1xyXG4gICAgICAgICAgICB3aW5kb3cud3NfX3NlbmQoJ3NjcmVlbnNob3QnLCB7bmFtZXNwYWNlLCBob3N0LCBmbmFtZSwgYnJvd3Nlcn0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sIDEwMCk7XHJcblxyXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XHJcbiAgICBjb25zdCBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGNhbGxiYWNrKTtcclxuICAgIG9ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQuYm9keSwge1xyXG4gICAgICBhdHRyaWJ1dGVzOiB0cnVlLFxyXG4gICAgICBjaGlsZExpc3Q6IHRydWUsXHJcbiAgICAgIHN1YnRyZWU6IHRydWVcclxuICAgIH0pOyAgXHJcbiAgfSlcclxufVxyXG4iLCJjb25zdCB0NjQgPSAnV2FiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OUFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaaCc7XHJcblxyXG5sZXQgbmFub2lkID0gKHNpemU9OCkgPT4ge1xyXG4gIGxldCBpZCA9ICcnXHJcbiAgd2hpbGUgKDAgPCBzaXplLS0pIHtcclxuICAgIGlkICs9IHQ2NFsgTWF0aC5yYW5kb20oKSo2NCB8IDBdXHJcbiAgfVxyXG4gIHJldHVybiBpZFxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9ICgpID0+IHtcclxuICBjb25zdCB7X3dzfSA9IHdpbmRvdztcclxuXHJcbiAgLy9leDogd3NfYnJvYWRjYXN0KCdfc3R5bGV7XCJkYXRhXCI6e1wicVwiOlwiKlwiLFwiY3NzXCI6XCJjb2xvcjpibHVlO1wifX0nKVxyXG4gIC8vZXg6IHdzX2Jyb2FkY2FzdCgnX3Bpbmd7XCJkYXRhXCI6XCJIaSFcIn0nKVxyXG4gIHdpbmRvdy53c19icm9hZGNhc3QgPSAoanNvbiwgX2FsbD10cnVlKSA9PiB7XHJcbiAgICBjb25zdCBtc2cgPSB7ZGF0YToganNvbiwgX2FsbH07XHJcbiAgICBfd3Muc2VuZChgYnJvYWRjYXN0JHtKU09OLnN0cmluZ2lmeShtc2cpfWApO1xyXG4gIH1cclxuXHJcbiAgLy9leDogd3NfZW1pdHBhZ2UoJ19zdHlsZXtcImRhdGFcIjp7XCJxXCI6XCIqXCIsXCJjc3NcIjpcImNvbG9yOmJsdWU7XCJ9fScpXHJcbiAgLy9leDogd3NfZW1pdHBhZ2UoJ19waW5ne1wiZGF0YVwiOlwiSGkhXCJ9JylcclxuICB3aW5kb3cud3NfZW1pdHBhZ2UgPSAoanNvbiwgcmVnZXg9JycpID0+IHtcclxuICAgIGNvbnN0IG1zZyA9IHtkYXRhOiBqc29uLCByZWdleH07XHJcbiAgICBfd3Muc2VuZChgZW1pdHBhZ2Uke0pTT04uc3RyaW5naWZ5KG1zZyl9YCk7XHJcbiAgfVxyXG5cclxuICAvL2V4OiB3c19fc3R5bGUoe1wicVwiOlwiKlwiLFwiY3NzXCI6XCJjb2xvcjpibHVlO1wifSlcclxuICB3aW5kb3cud3NfX3N0eWxlID0gKGpzb24sIF9hbGw9dHJ1ZSkgPT4ge1xyXG4gICAgY29uc3QgbXNnID0ge2RhdGE6IGpzb24sIF9hbGx9O1xyXG4gICAgX3dzLnNlbmQoYF9zdHlsZSR7SlNPTi5zdHJpbmdpZnkobXNnKX1gKTtcclxuICB9XHJcblxyXG4gIC8vZXg6IHdzX19waW5nKCdIaSEnKVxyXG4gIHdpbmRvdy53c19fcGluZyA9IChqc29uKSA9PiB7XHJcbiAgICBjb25zdCBtc2cgPSB7ZGF0YToganNvbn07XHJcbiAgICBfd3Muc2VuZChgX3Bpbmcke0pTT04uc3RyaW5naWZ5KG1zZyl9YCk7XHJcbiAgfVxyXG4gIFxyXG4gIC8vZXg6IHdzX19oZWxwKClcclxuICB3aW5kb3cud3NfX2hlbHAgPSAoKSA9PiB7XHJcbiAgICBfd3Muc2VuZCgnX2hlbHB7fScpO1xyXG4gIH1cclxuXHJcbiAgLy9leDogd3NfX29wZW4oe3VybDonaHR0cHM6Ly9nb29nbGUuY29tJ30pXHJcbiAgd2luZG93LndzX19vcGVuID0gKGpzb24pID0+IHtcclxuICAgIGNvbnN0IG1zZyA9IHtkYXRhOiBqc29ufTtcclxuICAgIF93cy5zZW5kKGBfb3BlbiR7SlNPTi5zdHJpbmdpZnkobXNnKX1gKTtcclxuICB9XHJcblxyXG4gIHdpbmRvdy53c19fc2VuZCA9IChjbWQsIGRhdGEsIGhhbmRsZXIpID0+IHtcclxuICAgIGNvbnN0IGlkID0gbmFub2lkKCk7XHJcbiAgICBjb25zdCBrZXkgPSBgJHtjbWR9OiR7aWR9YDtcclxuICAgIHdpbmRvdy5fd3NfcXVldWVba2V5XSA9IGhhbmRsZXIgfHwgKHcgPT4ge30pO1xyXG5cclxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgIGlmICh3aW5kb3cuX3dzX3F1ZXVlW2tleV0pIHtcclxuICAgICAgICBkZWxldGUgIHdpbmRvdy5fd3NfcXVldWVba2V5XTtcclxuICAgICAgICBjb25zb2xlLmxvZygnPj4gd3MgdGltZW91dCEnLCBrZXkpO1xyXG4gICAgICB9IFxyXG4gICAgfSwgNTAwMClcclxuICAgIGNvbnN0IHBhcmFtcyA9IGAke2tleX0ke0pTT04uc3RyaW5naWZ5KHtkYXRhfSl9YDtcclxuICAgIGlmICh3aW5kb3cubWl0bS5hcmd2LmRlYnVnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdfd3Muc2VuZCcsIHBhcmFtcyk7IFxyXG4gICAgfVxyXG4gICAgX3dzLnNlbmQocGFyYW1zKTtcclxuICB9XHJcbn1cclxuLy93c19fc2VuZCgnX3BpbmcnLCAnTE9MJywgdz0+Y29uc29sZS5sb2coJz5yZXN1bHQnLHcpKTsiLCJjb25zdCBfd3NfbmFtZXNwYWNlID0gcmVxdWlyZSgnLi9fd3NfbmFtZXNwYWNlJyk7XG5cbmxldCBfdGltZW91dDtcbmxldCBfY3NwID0ge307XG5tb2R1bGUuZXhwb3J0cyA9ICgpID0+IHtcbiAgY29uc3QgY3NwRXJyb3IgPSBmdW5jdGlvbihlKSB7XG4gICAgY29uc3Qge2hvc3RuYW1lOiBob3N0fSA9IGxvY2F0aW9uO1xuICAgIGxldCBuYW1lc3BhY2UgPSBfd3NfbmFtZXNwYWNlKCk7XG4gICAgY29uc3QgcGF0aCA9IGxvY2F0aW9uLnBhdGhuYW1lXG4gICAgLnJlcGxhY2UoL15cXC8vLCcnKVxuICAgIC5yZXBsYWNlKC9cXC8vZywnLScpO1xuICAgIGNvbnN0IHtcbiAgICAgIGJsb2NrZWRVUkksXG4gICAgICBkaXNwb3NpdGlvbixcbiAgICAgIGRvY3VtZW50VVJJLFxuICAgICAgZWZmZWN0aXZlRGlyZWN0aXZlLFxuICAgICAgb3JpZ2luYWxQb2xpY3ksXG4gICAgICB0aW1lU3RhbXAsXG4gICAgICB0eXBlLFxuICAgICAgdmlvbGF0ZWREaXJlY3RpdmUsXG4gICAgfSA9IGU7XG4gICAgY29uc3QgdHlwID0gYFske2Rpc3Bvc2l0aW9ufV0gJHtkb2N1bWVudFVSSX1gXG4gICAgaWYgKCFfY3NwW3R5cF0pIHtcbiAgICAgIF9jc3BbdHlwXSA9IHt9O1xuICAgIH1cbiAgICBpZiAoIV9jc3BbdHlwXS5fZ2VuZXJhbF8pIHtcbiAgICAgIF9jc3BbdHlwXS5fZ2VuZXJhbF8gPSB7XG4gICAgICAgIHBvbGljeTogb3JpZ2luYWxQb2xpY3ksXG4gICAgICAgIG5hbWVzcGFjZSxcbiAgICAgICAgaG9zdCxcbiAgICAgICAgcGF0aCxcbiAgICAgIH07XG4gICAgfVxuICAgIGNvbnN0IF9kb2MgPSBfY3NwW3R5cF07XG4gICAgaWYgKCFfZG9jW3Zpb2xhdGVkRGlyZWN0aXZlXSkge1xuICAgICAgX2RvY1t2aW9sYXRlZERpcmVjdGl2ZV0gPSB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBfZXJyID0gIF9kb2NbdmlvbGF0ZWREaXJlY3RpdmVdO1xuICAgIGlmICghX2VycltibG9ja2VkVVJJXSkge1xuICAgICAgX2VycltibG9ja2VkVVJJXSA9IHt9O1xuICAgIH1cbiAgICBjb25zdCBfbWF0Y2ggPSBvcmlnaW5hbFBvbGljeS5tYXRjaChgJHt2aW9sYXRlZERpcmVjdGl2ZX0gW147XSs7YCk7XG4gICAgY29uc3QgZGlyZWN0aXZlID0gX21hdGNoID8gX21hdGNoWzBdIDogZWZmZWN0aXZlRGlyZWN0aXZlO1xuICAgIF9lcnJbYmxvY2tlZFVSSV0gPSB7XG4gICAgICBkaXJlY3RpdmUsXG4gICAgICB0aW1lU3RhbXAsXG4gICAgICB0eXBlLFxuICAgIH07XG4gICAgX3RpbWVvdXQgJiYgY2xlYXJUaW1lb3V0KF90aW1lb3V0KTtcbiAgICBfdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgY29uc29sZS5sb2coJz4+IENTUDonLCBfY3NwKTsgIFxuICAgICAgLy8gd2luZG93LndzX19zZW5kKCdjc3BfZXJyb3InLCB7XG4gICAgICAvLyAgIG5hbWVzcGFjZSxcbiAgICAgIC8vICAgaG9zdCxcbiAgICAgIC8vICAgcGF0aCxcbiAgICAgIC8vICAgX2NzcCxcbiAgICAgIC8vIH0pO1xuICAgICAgX2NzcCA9IHt9O1xuICAgICAgfSwgNDAwMCk7XG4gIH07XG5cbiAgaWYgKHdpbmRvdy5taXRtLmNsaWVudC5jc3ApIHtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdzZWN1cml0eXBvbGljeXZpb2xhdGlvbicsIGNzcEVycm9yKTtcbiAgfVxufVxuLy8gZGlzcG9zaXRpb246IFwicmVwb3J0XCJcbi8vIGRvY3VtZW50VVJJOiBcImh0dHBzOi8vd2hhdC9odG1sL2NvbnRhaW4vY3NwXCJcbi8vIHZpb2xhdGVkRGlyZWN0aXZlOiBcImltZy1zcmNcIlxuXG4vLyBibG9ja2VkVVJJOiBcImh0dHBzOi8vd2hhdC91cmwvZ2V0dGluZy9ibG9ja2VkXCJcbi8vIGVmZmVjdGl2ZURpcmVjdGl2ZTogXCJpbWctc3JjXCJcbi8vIG9yaWdpbmFsUG9saWN5OiBcInNjcmlwdC1zcmMgbnVsbDsgZnJhbWUtc3JjIG51bGw7IHN0eWxlLXNyYyBudWxsOyBzdHlsZS1zcmMtZWxlbSBudWxsOyBpbWctc3JjIG51bGw7XCJcbi8vIHRpbWVTdGFtcDogMTkzMy44MjAwMDAwMDU2NTMxXG4vLyB0eXBlOiBcInNlY3VyaXR5cG9saWN5dmlvbGF0aW9uXCJcbiIsImNvbnN0IF93c19wb3N0bWVzc2FnZSA9IHJlcXVpcmUoJy4vX3dzX3Bvc3RtZXNzYWdlJyk7XG5jb25zdCBfd3NfaW5pdFNvY2tldCA9IHJlcXVpcmUoJy4vX3dzX2luaXQtc29ja2V0Jyk7XG5jb25zdCBfd3Nfc2NyZWVuc2hvdCA9IHJlcXVpcmUoJy4vX3dzX3NjcmVlbnNob3QnKTtcbmNvbnN0IF93c19sb2NhdGlvbiA9IHJlcXVpcmUoJy4vX3dzX2xvY2F0aW9uJyk7XG5jb25zdCBfd3Nfb2JzZXJ2ZXIgPSByZXF1aXJlKCcuL193c19vYnNlcnZlcicpO1xuY29uc3QgX3dzX2dlbmVyYWwgPSByZXF1aXJlKCcuL193c19nZW5lcmFsJyk7XG5jb25zdCBfd3NfY3NwRXJyID0gcmVxdWlyZSgnLi9fd3NfY3NwLWVycicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9ICgpID0+IHtcbiAgX3dzX3Bvc3RtZXNzYWdlKCk7XG4gIF93c19pbml0U29ja2V0KCk7XG4gIF93c19zY3JlZW5zaG90KCk7XG4gIF93c19sb2NhdGlvbigpO1xuICBfd3Nfb2JzZXJ2ZXIoKTtcbiAgX3dzX2dlbmVyYWwoKTtcbiAgX3dzX2NzcEVycigpO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsbUJBQWMsR0FBRyxNQUFNO0FBQ3ZCLEVBQUUsU0FBUyxjQUFjLENBQUMsS0FBSyxFQUFFO0FBQ2pDLElBQUksSUFBSSxNQUFN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RUFBRSxLQUFLO0FBQzNDLElBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3BDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9DLElBQUc7QUFDSDtBQUNBO0FBQ0EsRUFBRSxNQUFNLENBQUMsU0FBUyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEtBQUs7QUFDMUMsSUFBSSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDbkMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0MsSUFBRztBQUNIO0FBQ0E7QUFDQSxFQUFFLE1BQU0sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFJLEtBQUs7QUFDOUIsSUFBSSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM3QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QyxJQUFHO0FBQ0g7QUFDQTtBQUNBLEVBQUUsTUFBTSxDQUFDLFFBQVEsR0FBRyxNQUFNO0FBQzFCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN4QixJQUFHO0FBQ0g7QUFDQTtBQUNBLEVBQUUsTUFBTSxDQUFDLFFBQVEsR0FBRyxDQUFDLElBQUksS0FBSztBQUM5QixJQUFJLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzdCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEtB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
