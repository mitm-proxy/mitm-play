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
    if (host.match(toRegex(key))) {
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
        }, 700);
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
  let ctrl = false;
  let container;
  let intervId;
  let buttons;
  let button;

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
      const {macros} = window.mitm;
      // console.log(namespace, location);
      for (let key in macros) {
        const {path, msg} = toRegex(key);
        if (pathname.match(path)) {
          button.innerHTML = msg || 'Autofill';
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
    if (e.ctrlKey && e.key==='Shift') {
      ctrl = !ctrl;
      container.style = containerStyle + (!ctrl ? '' : 'display: none;');      
    } else if (e.ctrlKey && e.altKey && window.mitm.macrokeys) {
      let macro = window.mitm.macrokeys[e.code];
      if (macro) {
        macro = macro();
        console.log({macro: `ctrl + alt + ${e.code}`});
        if (Array.isArray(macro)) {
          let macroIndex = 0;
          let interval = setInterval(() => {
            let selector = macro[macroIndex];
            if (selector.match(/^ *[=-]>/)) {
              selector = `${nodeFinder(document.activeElement)} ${selector}`;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIl9zcmMvX3dzX3Bvc3RtZXNzYWdlLmpzIiwiX3NyYy9fd3NfY2xpZW50LmpzIiwiX3NyYy9fd3NfbXNnLXBhcnNlci5qcyIsIl9zcmMvX3dzX2luLWlmcmFtZS5qcyIsIl9zcmMvX3dzX2luaXQtc29ja2V0LmpzIiwiX3NyYy9fd3NfbmFtZXNwYWNlLmpzIiwiX3NyYy9fd3NfdmVuZG9yLmpzIiwiX3NyYy9fd3Nfc2NyZWVuc2hvdC5qcyIsIl9zcmMvX3dzX2xvY2F0aW9uLmpzIiwiX3NyYy9fd3NfZGVib3VuY2UuanMiLCJfc3JjL193c19vYnNlcnZlci5qcyIsIl9zcmMvX3dzX2dlbmVyYWwuanMiLCJfc3JjL193c19jc3AtZXJyLmpzIiwiX3NyYy9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJtb2R1bGUuZXhwb3J0cyA9ICgpID0+IHtcclxuICBmdW5jdGlvbiByZWNlaXZlTWVzc2FnZShldmVudCkge1xyXG4gICAgaWYgKHdpbmRvdy5taXRtLmNsaWVudC5wb3N0bWVzc2FnZSkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgPj4gUG9zdG1lc3NhZ2U6ICR7ZXZlbnQub3JpZ2lufSA9PiBodHRwczovLyR7bG9jYXRpb24uaG9zdH1gLCBldmVudC5kYXRhKTtcclxuICAgIH1cclxuICB9XHJcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIHJlY2VpdmVNZXNzYWdlLCBmYWxzZSk7XHJcblxyXG4gIC8vIGlmICghY2hyb21lLndpbmRvd3MpIHtcclxuICAvLyAgIGZ1bmN0aW9uIHJlcG9ydFdpbmRvd1NpemUoKSB7XHJcbiAgLy8gICAgIGNvbnN0IHtpbm5lcldpZHRoLCBpbm5lckhlaWdodH0gPSB3aW5kb3c7XHJcbiAgLy8gICAgIGNvbnNvbGUubG9nKHtpbm5lcldpZHRoLCBpbm5lckhlaWdodH0pO1xyXG4gIC8vICAgfVxyXG4gIC8vICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgcmVwb3J0V2luZG93U2l6ZSk7ICBcclxuICAvLyB9XHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSAoKSA9PiB7XG4gIGxldCB3aW5kb3dSZWY7XG4gIHJldHVybiB7XG4gICAgLy9leDogd3NfX2hlbHAoKVxuICAgIF9oZWxwKHtkYXRhfSkge1xuICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgfSxcbiAgICAvL2V4OiB3c19fcGluZyhcInRoZXJlXCIpIFxuICAgIF9waW5nKHtkYXRhfSkge1xuICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgfSxcbiAgICAvL2V4OiB3c19fb3Blbih7dXJsOiBcImh0dHBzOi8vZ29vZ2xlLmNvbVwifSlcbiAgICBfb3Blbih7ZGF0YX0pIHtcbiAgICAgIGNvbnN0IGZlYXR1cmVzID0gJ2RpcmVjdG9yaWVzPTAsdGl0bGViYXI9MCx0b29sYmFyPTAsbG9jYXRpb249MCxzdGF0dXM9MCxtZW51YmFyPTAsd2lkdGg9ODAwLGhlaWdodD02MDAnO1xuICAgICAgd2luZG93UmVmID0gd2luZG93Lm9wZW4oZGF0YS51cmwsICdfbG9ncycsIGZlYXR1cmVzKTtcbiAgICAgIHdpbmRvd1JlZi5ibHVyKCk7XG4gICAgfSxcbiAgICAvL2V4OiB3c19fc3R5bGUoJy5pbnRybz0+YmFja2dyb3VuZDpyZWQ7JylcbiAgICBfc3R5bGUoe2RhdGF9KSB7XG4gICAgICBjb25zdCB7cSxjc3N9ID0gZGF0YTtcbiAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwocSkuZm9yRWFjaChcbiAgICAgICAgbm9kZSA9PiAobm9kZS5zdHlsZS5jc3NUZXh0ID0gY3NzKVxuICAgICAgKTtcbiAgICB9LFxuICAgIC8vZXg6IHdzX19cbiAgICBfZmlsZXMoe3R5cCwgZGF0YX0pIHtcbiAgICAgIGNvbnN0IHtmaWxlc30gPSB3aW5kb3cubWl0bTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGByZWNlaXZlIGJyb2RjYXN0ICR7dHlwfWApO1xuICAgICAgZm9yIChsZXQga2V5IGluIGZpbGVzW2Ake3R5cH1fZXZlbnRzYF0pIHtcbiAgICAgICAgZmlsZXNbYCR7dHlwfV9ldmVudHNgXVtrZXldKGRhdGEpO1xuICAgICAgfVxuICAgIH0sXG4gICAgX3NldENsaWVudCh7ZGF0YX0pIHtcbiAgICAgIGNvbnNvbGUubG9nKCdfc2V0Q2xpZW50JywgZGF0YSk7XG4gICAgICB3aW5kb3cubWl0bS5jbGllbnQgPSBkYXRhO1xuICAgIH1cbiAgfTtcbn1cbiIsImNvbnN0IF93c19jbGllbnQgPSByZXF1aXJlKCcuL193c19jbGllbnQnKTtcbmNvbnN0IF93c193Y2NtZCA9IF93c19jbGllbnQoKTtcblxubW9kdWxlLmV4cG9ydHMgPSAoZXZlbnQsIG1zZykgPT4ge1xuICBpZiAod2luZG93Lm1pdG0uYXJndi5kZWJ1Zykge1xuICAgIGlmIChtc2cubGVuZ3RoPjQwKSB7XG4gICAgICBjb25zb2xlLmxvZygnPj4gd3MtbWVzc2FnZTogYCVzLi4uYCcsIG1zZy5zbGljZSgwLDQwKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKCc+PiB3cy1tZXNzYWdlOiBgJXNgJywgbXNnKTtcbiAgICB9ICBcbiAgfVxuICBjb25zdCBhcnIgPSBtc2cucmVwbGFjZSgvXFxzKyQvLCAnJykubWF0Y2goL14gKihbXFx3Ol0rKSAqKFxcey4qKS8pO1xuICBpZiAoYXJyKSB7XG4gICAgbGV0IFssY21kLGpzb25dID0gYXJyO1xuICAgIHRyeSB7XG4gICAgICBpZiAodHlwZW9mKGpzb24pPT09J3N0cmluZycpIHtcbiAgICAgICAganNvbiA9IEpTT04ucGFyc2UoanNvbik7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoanNvbixlcnJvcik7XG4gICAgfSAgICAgICAgXG4gICAgaWYgKHdpbmRvdy5fd3NfcXVldWVbY21kXSkge1xuICAgICAgY29uc3QgaGFuZGxlciA9IHdpbmRvdy5fd3NfcXVldWVbY21kXTtcbiAgICAgIGRlbGV0ZSB3aW5kb3cuX3dzX3F1ZXVlW2NtZF07XG4gICAgICBoYW5kbGVyKGpzb24uZGF0YSk7XG4gICAgfSBlbHNlIGlmIChfd3Nfd2NjbWRbY21kXSkge1xuICAgICAgX3dzX3djY21kW2NtZF0uY2FsbChldmVudCwganNvbilcbiAgICB9ICAgICAgIFxuICB9ICAgIFxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSAoKSA9PiB7XHJcbiAgbGV0IGlmcm07XHJcbiAgdHJ5IHtcclxuICAgIGlmcm0gPSB3aW5kb3cuc2VsZiAhPT0gd2luZG93LnRvcDtcclxuICB9IGNhdGNoIChlKSB7XHJcbiAgICBpZnJtID0gdHJ1ZTtcclxuICB9XHJcbiAgcmV0dXJuIGlmcm0gPyAnaWZyYW1lJyA6ICd3aW5kb3cnO1xyXG59O1xyXG4iLCJjb25zdCBfd3NfbXNnUGFyc2VyID0gcmVxdWlyZSgnLi9fd3NfbXNnLXBhcnNlcicpO1xyXG5jb25zdCBfd3NfaW5JZnJhbWUgPSByZXF1aXJlKCcuL193c19pbi1pZnJhbWUnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKCkgPT4ge1xyXG4gIGNvbnN0IHdzID0gbmV3IFdlYlNvY2tldChgd3NzOi8vbG9jYWxob3N0OjMwMDEvd3M/cGFnZT0ke193c19pbklmcmFtZSgpfWApO1xyXG5cclxuICB3cy5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHsgXHJcbiAgICBfd3NfbXNnUGFyc2VyKGV2ZW50LCBldmVudC5kYXRhKTtcclxuICAgfTtcclxuXHJcbiAgIHdzLm9ub3BlbiA9IGZ1bmN0aW9uKCkgeyAgICAgICAgICAgICAgICAgXHJcbiAgICB3cy5zZW5kKGB1cmw6JHsobG9jYXRpb24rJycpLnNwbGl0KC9bPyNdLylbMF19YCk7XHJcbiAgICAvLyBjb25zb2xlLmxvZyhcIndzOiBzZW50Li4uXCIpO1xyXG4gIH07ICBcclxuXHJcbiAgd3Mub25jbG9zZSA9IGZ1bmN0aW9uKCkgeyBcclxuICAgIGNvbnNvbGUubG9nKCd3czogQ29ubmVjdGlvbiBpcyBjbG9zZWQnKTsgXHJcbiAgfTtcclxuXHJcbiAgd2luZG93Ll93cyA9IHdzO1xyXG4gIHdpbmRvdy5fd3NfcXVldWUgPSB7fTtcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9ICgpID0+IHtcbiAgY29uc3Qge2hvc3RuYW1lOiBob3N0fSA9IGxvY2F0aW9uO1xuICBsZXQgbmFtZXNwYWNlO1xuXG4gIGZ1bmN0aW9uIHRvUmVnZXgoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5yZXBsYWNlKC9cXC4vZywgJ1xcXFwuJykucmVwbGFjZSgvXFw/L2csICdcXFxcPycpO1xuICB9XG5cbiAgZm9yIChsZXQga2V5IGluIHdpbmRvdy5taXRtLnJvdXRlcykge1xuICAgIGlmIChob3N0Lm1hdGNoKHRvUmVnZXgoa2V5KSkpIHtcbiAgICAgIG5hbWVzcGFjZSA9IGtleTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbmFtZXNwYWNlO1xufSIsIm1vZHVsZS5leHBvcnRzID0gKCkgPT4ge1xyXG4gIGNvbnN0IHt2ZW5kb3J9ID0gbmF2aWdhdG9yO1xyXG4gIGNvbnN0IGJyb3dzZXIgPSB7XHJcbiAgICAnJzogJ2ZpcmVmb3gnLFxyXG4gICAgJ0dvb2dsZSBJbmMuJzogJ2Nocm9taXVtJyxcclxuICAgICdBcHBsZSBDb21wdXRlciwgSW5jLic6ICd3ZWJraXQnLFxyXG4gIH1bdmVuZG9yXTtcclxuICByZXR1cm4gYnJvd3NlcjtcclxufSIsImNvbnN0IF93c19uYW1lc3BhY2UgPSByZXF1aXJlKCcuL193c19uYW1lc3BhY2UnKTtcclxuY29uc3QgX3dzX3ZlbmRvciA9IHJlcXVpcmUoJy4vX3dzX3ZlbmRvcicpO1xyXG5cclxubGV0IGFjdDtcclxuZnVuY3Rpb24gc2NyZWVuc2hvdChlKSB7XHJcbiAgaWYgKG1pdG0uYXJndi5sYXp5KSB7XHJcbiAgICBpZiAobWl0bS5zY3JlZW5zaG90KSB7XHJcbiAgICAgIHdpbmRvdy5taXRtLnNjcmVlbnNob3QgPSB1bmRlZmluZWQ7XHJcbiAgICAgIGNvbnNvbGUubG9nKCc+PiBkZWxheSBhY3Rpb24nKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaWYgKGFjdCkge1xyXG4gICAgICBhY3QgPSB1bmRlZmluZWQ7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH0gIFxyXG4gIH1cclxuICBjb25zdCB7aG9zdG5hbWU6IGhvc3R9ID0gbG9jYXRpb247XHJcbiAgY29uc3QgbmFtZXNwYWNlID0gX3dzX25hbWVzcGFjZSgpO1xyXG4gIGNvbnN0IGJyb3dzZXIgPSBfd3NfdmVuZG9yKCk7XHJcbiAgY29uc3Qgcm91dGUgPSB3aW5kb3cubWl0bS5yb3V0ZXNbbmFtZXNwYWNlXTtcclxuICBjb25zdCB7c2VsZWN0b3J9ID0gcm91dGUuc2NyZWVuc2hvdDtcclxuXHJcbiAgY29uc3QgYXJyID0gZG9jdW1lbnQuYm9keS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcclxuICBjb25zdCBmbmFtZSA9IGxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKS5yZXBsYWNlKC9cXC8vZywnLScpO1xyXG4gIGZvciAobGV0IGVsIG9mIGFycikge1xyXG4gICAgbGV0IG5vZGUgPSBlLnRhcmdldDtcclxuICAgIHdoaWxlIChlbCE9PW5vZGUgJiYgbm9kZSE9PWRvY3VtZW50LmJvZHkpIHtcclxuICAgICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcclxuICAgIH1cclxuICAgIGlmIChub2RlIT09ZG9jdW1lbnQuYm9keSkge1xyXG4gICAgICBjb25zdCBwYXJhbXMgPSB7bmFtZXNwYWNlLCBob3N0LCBmbmFtZSwgYnJvd3Nlcn07XHJcbiAgICAgIHdpbmRvdy53c19fc2VuZCgnc2NyZWVuc2hvdCcsIHBhcmFtcyk7XHJcbiAgICAgIGlmIChtaXRtLmFyZ3YubGF6eSkge1xyXG4gICAgICAgIC8vIGRlbGF5IGFjdGlvbiB0byBmaW5pc2ggc2NyZWVuc2hvdFxyXG4gICAgICAgIHdpbmRvdy5taXRtLnNjcmVlbnNob3QgPSBlLnRhcmdldDtcclxuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgLy8gY29uc29sZS5sb2coJz4+IGNsaWNrZWQnKTtcclxuICAgICAgICAgIGFjdCA9IHdpbmRvdy5taXRtLnNjcmVlbnNob3Q7XHJcbiAgICAgICAgICB3aW5kb3cubWl0bS5zY3JlZW5zaG90Lm5vZGUgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBhY3QuY2xpY2soKTtcclxuICAgICAgICAgIGFjdCA9IHVuZGVmaW5lZDtcclxuICAgICAgICB9LCA3MDApO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKCkgPT4ge1xyXG4gIGNvbnN0IHJvdXRlID0gd2luZG93Lm1pdG0ucm91dGVzW193c19uYW1lc3BhY2UoKV07XHJcbiAgaWYgKHJvdXRlICYmIHJvdXRlLnNjcmVlbnNob3QpIHtcclxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKCkgPT4ge1xyXG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBzY3JlZW5zaG90KTtcclxuICAgIH0pO1xyXG4gIH1cclxufTtcclxuIiwiY29uc3QgX3dzX25hbWVzcGFjZSA9IHJlcXVpcmUoJy4vX3dzX25hbWVzcGFjZScpO1xyXG5jb25zdCBfd3NfdmVuZG9yID0gcmVxdWlyZSgnLi9fd3NfdmVuZG9yJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9ICgpID0+IHtcclxuICBjb25zdCBjb250YWluZXJTdHlsZSA9ICdwb3NpdGlvbjogZml4ZWQ7ei1pbmRleDogOTk5OTt0b3A6IDhweDtyaWdodDogNXB4Oyc7XHJcbiAgY29uc3QgYnV0dG9uU3R5bGUgPSAnYm9yZGVyOiBub25lO2JvcmRlci1yYWRpdXM6IDE1cHg7Zm9udC1zaXplOiAxMHB4OydcclxuICBjb25zdCBldmVudCA9IG5ldyBFdmVudCgndXJsY2hhbmdlZCcpO1xyXG4gIGxldCBjdHJsID0gZmFsc2U7XHJcbiAgbGV0IGNvbnRhaW5lcjtcclxuICBsZXQgaW50ZXJ2SWQ7XHJcbiAgbGV0IGJ1dHRvbnM7XHJcbiAgbGV0IGJ1dHRvbjtcclxuXHJcbiAgZnVuY3Rpb24gdG9SZWdleChwYXRoTXNnKSB7XHJcbiAgICBsZXQgW3BhdGgsIG1zZ10gPSBwYXRoTXNnLnNwbGl0KCc9PicpLm1hcChpdGVtPT5pdGVtLnRyaW0oKSk7XHJcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC4vZywgJ1xcXFwuJykucmVwbGFjZSgvXFw/L2csICdcXFxcPycpO1xyXG4gICAgcmV0dXJuIHtwYXRoLCBtc2d9O1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc2V0QnV0dG9ucygpIHtcclxuICAgIGlmICh3aW5kb3cubWl0bS5hdXRvYnV0dG9ucykge1xyXG4gICAgICBjb25zdCB7YXV0b2J1dHRvbnN9ID0gd2luZG93Lm1pdG07XHJcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgIGZvciAobGV0IGtleSBpbiBhdXRvYnV0dG9ucykge1xyXG4gICAgICAgICAgY29uc3QgYnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICAgICAgICAgIGNvbnN0IGJyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIik7XHJcbiAgICAgICAgICBjb25zdCBbY2FwdGlvbiwgY29sb3JdID0ga2V5LnNwbGl0KCd8Jyk7XHJcbiAgICAgICAgICBidG4ub25jbGljayA9IGF1dG9idXR0b25zW2tleV07XHJcbiAgICAgICAgICBidG4uaW5uZXJUZXh0ID0gY2FwdGlvbjtcclxuICAgICAgICAgIGJ1dHRvbnMuYXBwZW5kQ2hpbGQoYnRuKTtcclxuICAgICAgICAgIGJ1dHRvbnMuYXBwZW5kQ2hpbGQoYnIpO1xyXG4gICAgICAgICAgYnIuaW5uZXJIVE1MID0gJyZuYnNwOyc7XHJcbiAgICAgICAgICBidG4uc3R5bGUgPSBidXR0b25TdHlsZSArIChjb2xvciA/IGBiYWNrZ3JvdW5kOiAke2NvbG9yfTtgIDogJycpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSwwKSAgXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiB1cmxDaGFuZ2UoZXZlbnQpIHtcclxuICAgIGNvbnN0IG5hbWVzcGFjZSA9IF93c19uYW1lc3BhY2UoKTtcclxuICAgIGlmICh3aW5kb3cubWl0bS5hdXRvZmlsbCkge1xyXG4gICAgICBkZWxldGUgd2luZG93Lm1pdG0uYXV0b2ZpbGw7XHJcbiAgICB9XHJcbiAgICBpZiAod2luZG93Lm1pdG0uYXV0b2ludGVydmFsKSB7XHJcbiAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2SWQpO1xyXG4gICAgICBkZWxldGUgd2luZG93Lm1pdG0uYXV0b2ludGVydmFsO1xyXG4gICAgfVxyXG4gICAgaWYgKHdpbmRvdy5taXRtLmF1dG9idXR0b25zKSB7XHJcbiAgICAgIGRlbGV0ZSB3aW5kb3cubWl0bS5hdXRvYnV0dG9ucztcclxuICAgICAgYnV0dG9ucy5pbm5lckhUTUwgPSAnJztcclxuICAgIH1cclxuICAgIGlmICh3aW5kb3cubWl0bS5tYWNyb2tleXMpIHtcclxuICAgICAgZGVsZXRlIHdpbmRvdy5taXRtLm1hY3Jva2V5cztcclxuICAgIH1cclxuICAgIGlmIChuYW1lc3BhY2UpIHtcclxuICAgICAgY29uc3Qge3BhdGhuYW1lfSA9IGxvY2F0aW9uO1xyXG4gICAgICBjb25zdCB7bWFjcm9zfSA9IHdpbmRvdy5taXRtO1xyXG4gICAgICAvLyBjb25zb2xlLmxvZyhuYW1lc3BhY2UsIGxvY2F0aW9uKTtcclxuICAgICAgZm9yIChsZXQga2V5IGluIG1hY3Jvcykge1xyXG4gICAgICAgIGNvbnN0IHtwYXRoLCBtc2d9ID0gdG9SZWdleChrZXkpO1xyXG4gICAgICAgIGlmIChwYXRobmFtZS5tYXRjaChwYXRoKSkge1xyXG4gICAgICAgICAgYnV0dG9uLmlubmVySFRNTCA9IG1zZyB8fCAnQXV0b2ZpbGwnO1xyXG4gICAgICAgICAgbWFjcm9zW2tleV0oKTtcclxuICAgICAgICAgIHNldEJ1dHRvbnMoKTtcclxuICAgICAgICB9IFxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBjb250YWluZXIuc3R5bGUgPSBjb250YWluZXJTdHlsZTtcclxuICAgIGNvbnN0IHZpc2libGUgPSAod2luZG93Lm1pdG0uYXV0b2ZpbGwpO1xyXG4gICAgYnV0dG9uLnN0eWxlID0gYnV0dG9uU3R5bGUgKyAodmlzaWJsZSA/ICdiYWNrZ3JvdW5kLWNvbG9yOiBhenVyZTsnIDogJ2Rpc3BsYXk6IG5vbmU7Jyk7XHJcbiAgICBpZiAodHlwZW9mKHdpbmRvdy5taXRtLmF1dG9pbnRlcnZhbCk9PT0nZnVuY3Rpb24nKSB7XHJcbiAgICAgIGludGVydklkID0gc2V0SW50ZXJ2YWwod2luZG93Lm1pdG0uYXV0b2ludGVydmFsLCA1MDApO1xyXG4gICAgfVxyXG4gICAgY3RybCA9IGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcGxheShhdXRvZmlsbCkge1xyXG4gICAgaWYgKGF1dG9maWxsKSB7XHJcbiAgICAgIGlmICh0eXBlb2YoYXV0b2ZpbGwpPT09J2Z1bmN0aW9uJykge1xyXG4gICAgICAgIGF1dG9maWxsID0gYXV0b2ZpbGwoKTtcclxuICAgICAgfVxyXG4gICAgICBjb25zdCBicm93c2VyID0gX3dzX3ZlbmRvcigpO1xyXG4gICAgICBjb25zdCBsZW50aCA9IGF1dG9maWxsLmxlbmd0aDtcclxuICAgICAgY29uc29sZS5sb2cobGVudGg9PT0xID8gYCAgJHthdXRvZmlsbH1gIDogSlNPTi5zdHJpbmdpZnkoYXV0b2ZpbGwsIG51bGwsIDIpKTtcclxuICAgICAgd2luZG93LndzX19zZW5kKCdhdXRvZmlsbCcsIHthdXRvZmlsbCwgYnJvd3Nlcn0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYnRuY2xpY2soZSkge1xyXG4gICAgbGV0IHthdXRvZmlsbH0gPSB3aW5kb3cubWl0bTtcclxuICAgIHBsYXkoYXV0b2ZpbGwpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24ga2V5YkN0cmwoZSkgeyBcclxuICAgIGlmIChlLmN0cmxLZXkgJiYgZS5rZXk9PT0nU2hpZnQnKSB7XHJcbiAgICAgIGN0cmwgPSAhY3RybDtcclxuICAgICAgY29udGFpbmVyLnN0eWxlID0gY29udGFpbmVyU3R5bGUgKyAoIWN0cmwgPyAnJyA6ICdkaXNwbGF5OiBub25lOycpOyAgICAgIFxyXG4gICAgfSBlbHNlIGlmIChlLmN0cmxLZXkgJiYgZS5hbHRLZXkgJiYgd2luZG93Lm1pdG0ubWFjcm9rZXlzKSB7XHJcbiAgICAgIGxldCBtYWNybyA9IHdpbmRvdy5taXRtLm1hY3Jva2V5c1tlLmNvZGVdO1xyXG4gICAgICBpZiAobWFjcm8pIHtcclxuICAgICAgICBtYWNybyA9IG1hY3JvKCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coe21hY3JvOiBgY3RybCArIGFsdCArICR7ZS5jb2RlfWB9KTtcclxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShtYWNybykpIHtcclxuICAgICAgICAgIGxldCBtYWNyb0luZGV4ID0gMDtcclxuICAgICAgICAgIGxldCBpbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcclxuICAgICAgICAgICAgbGV0IHNlbGVjdG9yID0gbWFjcm9bbWFjcm9JbmRleF07XHJcbiAgICAgICAgICAgIGlmIChzZWxlY3Rvci5tYXRjaCgvXiAqWz0tXT4vKSkge1xyXG4gICAgICAgICAgICAgIHNlbGVjdG9yID0gYCR7bm9kZUZpbmRlcihkb2N1bWVudC5hY3RpdmVFbGVtZW50KX0gJHtzZWxlY3Rvcn1gO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHBsYXkoW3NlbGVjdG9yXSk7XHJcbiAgXHJcbiAgICAgICAgICAgIG1hY3JvSW5kZXggKz0gMTtcclxuICAgICAgICAgICAgaWYgKG1hY3JvSW5kZXg+PW1hY3JvLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0sIDEwMCk7ICBcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmICghY2hyb21lLnRhYnMpIHtcclxuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2h0bWwnKS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywga2V5YkN0cmwpO1xyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3VybGNoYW5nZWQnLCB1cmxDaGFuZ2UpO1xyXG4gICAgY29uc3QgZm4gPSBoaXN0b3J5LnB1c2hTdGF0ZTtcclxuICAgIGhpc3RvcnkucHVzaFN0YXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICBmbi5hcHBseShoaXN0b3J5LCBhcmd1bWVudHMpO1xyXG4gICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XHJcbiAgICB9O1xyXG4gIFxyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IG5vZGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdodG1sJyk7XHJcbiAgICAgIGNvbnN0IG5vZGVyZWYgPSBub2RlLmZpcnN0RWxlbWVudENoaWxkO1xyXG4gICAgICBjb25zdCBuZXdOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICAgICAgbGV0IGh0bWwgPSAnPGJ1dHRvbiBjbGFzcz1cImJ0bi1hdXRvZmlsbFwiPkF1dG9maWxsPC9idXR0b24+JztcclxuICAgICBcclxuICAgICAgbmV3Tm9kZS5pbm5lckhUTUwgPSBgPHNwYW4gY2xhc3M9XCJhdXRvZmlsbC1idXR0b25zXCI+PC9zcGFuPiR7aHRtbH1gO1xyXG4gICAgICBuZXdOb2RlLmNsYXNzTmFtZSA9ICdtaXRtIGF1dG9maWxsLWNvbnRhaW5lcic7XHJcbiAgICAgIG5ld05vZGUuc3R5bGUgPSBjb250YWluZXJTdHlsZTtcclxuXHJcbiAgICAgIG5vZGUuaW5zZXJ0QmVmb3JlKG5ld05vZGUsIG5vZGVyZWYpO1xyXG4gICAgICBzZXRUaW1lb3V0KCgpPT4ge1xyXG4gICAgICAgIGNvbnRhaW5lciA9IG5ld05vZGU7XHJcbiAgICAgICAgYnV0dG9ucyA9IG5ld05vZGUuY2hpbGRyZW5bMF07XHJcbiAgICAgICAgYnV0dG9uID0gbmV3Tm9kZS5jaGlsZHJlblsxXTtcclxuICAgICAgICBidXR0b24ub25jbGljayA9IGJ0bmNsaWNrO1xyXG4gICAgICAgIGJ1dHRvbi5zdHlsZSA9IGAke2J1dHRvblN0eWxlfWJhY2tncm91bmQtY29sb3I6IGF6dXJlO2BcclxuICAgICAgICB1cmxDaGFuZ2UoZXZlbnQpO1xyXG4gICAgICB9LDEpXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIiwiZnVuY3Rpb24gZGVib3VuY2UoZm4sIGRlbGF5PTUwMCkge1xyXG4gICAgbGV0IF90aW1lb3V0O1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xyXG4gICAgICBjb25zdCBfdGhpcyA9IHRoaXM7XHJcbiAgICAgIGNvbnN0IGFyZ3MgPSBhcmd1bWVudHM7XHJcbiAgICAgIF90aW1lb3V0ICYmIGNsZWFyVGltZW91dChfdGltZW91dCk7XHJcbiAgICAgIF90aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgZm4uYXBwbHkoX3RoaXMsIGFyZ3MpO1xyXG4gICAgICB9LCBkZWxheSlcclxuICAgIH1cclxuICB9XHJcbiAgbW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZTsiLCJjb25zdCBfd3NfbmFtZXNwYWNlID0gcmVxdWlyZSgnLi9fd3NfbmFtZXNwYWNlJyk7XHJcbmNvbnN0IF93c19kZWJvdW5jZSA9IHJlcXVpcmUoJy4vX3dzX2RlYm91bmNlJyk7XHJcbmNvbnN0IF93c192ZW5kb3IgPSByZXF1aXJlKCcuL193c192ZW5kb3InKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKCkgPT4ge1xyXG4gIGNvbnN0IHtob3N0bmFtZTogaG9zdH0gPSBsb2NhdGlvbjtcclxuICBjb25zdCBuYW1lc3BhY2UgPSBfd3NfbmFtZXNwYWNlKCk7XHJcbiAgY29uc3QgYnJvd3NlciA9IF93c192ZW5kb3IoKTtcclxuICBsZXQgc3Nob3QgPSB7fSwgbm9kZXMgPSB7fTtcclxuICBcclxuICBjb25zdCByb3V0ZSA9IHdpbmRvdy5taXRtLnJvdXRlc1tuYW1lc3BhY2VdO1xyXG4gIGlmIChyb3V0ZSAmJiByb3V0ZS5zY3JlZW5zaG90KSB7XHJcbiAgICBjb25zdCB7b2JzZXJ2ZXI6IG9ifSA9IHJvdXRlLnNjcmVlbnNob3Q7XHJcbiAgICBmb3IgKGxldCBpZCBpbiBvYikge1xyXG4gICAgICBsZXQgZWwgPSB7fTtcclxuICAgICAgaWYgKG9iW2lkXT09PXRydWUpIHtcclxuICAgICAgICBlbCA9IHtcclxuICAgICAgICAgIHRpdGxlOiAnbm90aXRsZScsXHJcbiAgICAgICAgICBpbnNlcnQ6IHRydWUsXHJcbiAgICAgICAgICByZW1vdmU6IHRydWUsXHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBhcnIgPSBvYltpZF0uc3BsaXQoJzonKTtcclxuICAgICAgICBhcnJbMV0uc3BsaXQoJywnKS5tYXAoZSA9PiB7XHJcbiAgICAgICAgICBlbFtlXSA9IHRydWU7XHJcbiAgICAgICAgfSlcclxuICAgICAgICBlbC50aXRsZSA9IGFyclswXTtcclxuICAgICAgfVxyXG4gICAgICBzc2hvdFtpZF0gPSBlbDtcclxuICAgICAgbm9kZXNbaWRdID0ge1xyXG4gICAgICAgIGluc2VydDogZmFsc2UsXHJcbiAgICAgICAgcmVtb3ZlOiB0cnVlLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgbGV0IGZuYW1lO1xyXG4gIGNvbnN0IGNhbGxiYWNrID0gX3dzX2RlYm91bmNlKGZ1bmN0aW9uKCkge1xyXG4gICAgZm9yIChsZXQgaWQgaW4gbm9kZXMpIHtcclxuICAgICAgY29uc3QgZWwgPSBkb2N1bWVudC5ib2R5LnF1ZXJ5U2VsZWN0b3JBbGwoaWQpO1xyXG4gICAgICBpZiAoZWwubGVuZ3RoKSB7XHJcbiAgICAgICAgaWYgKCFub2Rlc1tpZF0uaW5zZXJ0KSB7XHJcbiAgICAgICAgICBub2Rlc1tpZF0uaW5zZXJ0ID0gdHJ1ZTtcclxuICAgICAgICAgIGlmIChub2Rlc1tpZF0ucmVtb3ZlIT09dW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIG5vZGVzW2lkXS5yZW1vdmUgPSBmYWxzZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmIChzc2hvdFtpZF0uaW5zZXJ0KSB7XHJcbiAgICAgICAgICAgIGZuYW1lID0gbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpLnJlcGxhY2UoL1xcLy9nLCctJyk7XHJcbiAgICAgICAgICAgIGZuYW1lID0gYCR7Zm5hbWV9LSR7c3Nob3RbaWRdLnRpdGxlfS1pbnNlcnRgO1xyXG4gICAgICAgICAgICB3aW5kb3cud3NfX3NlbmQoJ3NjcmVlbnNob3QnLCB7bmFtZXNwYWNlLCBob3N0LCBmbmFtZSwgYnJvd3Nlcn0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZiAoIW5vZGVzW2lkXS5yZW1vdmUpIHtcclxuICAgICAgICAgIG5vZGVzW2lkXS5yZW1vdmUgPSB0cnVlXHJcbiAgICAgICAgICBub2Rlc1tpZF0uaW5zZXJ0ID0gZmFsc2U7XHJcbiAgICAgICAgICBpZiAoc3Nob3RbaWRdLnJlbW92ZSkge1xyXG4gICAgICAgICAgICBmbmFtZSA9IGxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKS5yZXBsYWNlKC9cXC8vZywnLScpO1xyXG4gICAgICAgICAgICBmbmFtZSA9IGAke2ZuYW1lfS0ke3NzaG90W2lkXS50aXRsZX0tcmVtb3ZlYDtcclxuICAgICAgICAgICAgd2luZG93LndzX19zZW5kKCdzY3JlZW5zaG90Jywge25hbWVzcGFjZSwgaG9zdCwgZm5hbWUsIGJyb3dzZXJ9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LCAxMDApO1xyXG5cclxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKCkgPT4ge1xyXG4gICAgY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihjYWxsYmFjayk7XHJcbiAgICBvYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LmJvZHksIHtcclxuICAgICAgYXR0cmlidXRlczogdHJ1ZSxcclxuICAgICAgY2hpbGRMaXN0OiB0cnVlLFxyXG4gICAgICBzdWJ0cmVlOiB0cnVlXHJcbiAgICB9KTsgIFxyXG4gIH0pXHJcbn1cclxuIiwiY29uc3QgdDY0ID0gJ1dhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODlBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmgnO1xyXG5cclxubGV0IG5hbm9pZCA9IChzaXplPTgpID0+IHtcclxuICBsZXQgaWQgPSAnJ1xyXG4gIHdoaWxlICgwIDwgc2l6ZS0tKSB7XHJcbiAgICBpZCArPSB0NjRbIE1hdGgucmFuZG9tKCkqNjQgfCAwXVxyXG4gIH1cclxuICByZXR1cm4gaWRcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSAoKSA9PiB7XHJcbiAgY29uc3Qge193c30gPSB3aW5kb3c7XHJcblxyXG4gIC8vZXg6IHdzX2Jyb2FkY2FzdCgnX3N0eWxle1wiZGF0YVwiOntcInFcIjpcIipcIixcImNzc1wiOlwiY29sb3I6Ymx1ZTtcIn19JylcclxuICAvL2V4OiB3c19icm9hZGNhc3QoJ19waW5ne1wiZGF0YVwiOlwiSGkhXCJ9JylcclxuICB3aW5kb3cud3NfYnJvYWRjYXN0ID0gKGpzb24sIF9hbGw9dHJ1ZSkgPT4ge1xyXG4gICAgY29uc3QgbXNnID0ge2RhdGE6IGpzb24sIF9hbGx9O1xyXG4gICAgX3dzLnNlbmQoYGJyb2FkY2FzdCR7SlNPTi5zdHJpbmdpZnkobXNnKX1gKTtcclxuICB9XHJcblxyXG4gIC8vZXg6IHdzX2VtaXRwYWdlKCdfc3R5bGV7XCJkYXRhXCI6e1wicVwiOlwiKlwiLFwiY3NzXCI6XCJjb2xvcjpibHVlO1wifX0nKVxyXG4gIC8vZXg6IHdzX2VtaXRwYWdlKCdfcGluZ3tcImRhdGFcIjpcIkhpIVwifScpXHJcbiAgd2luZG93LndzX2VtaXRwYWdlID0gKGpzb24sIHJlZ2V4PScnKSA9PiB7XHJcbiAgICBjb25zdCBtc2cgPSB7ZGF0YToganNvbiwgcmVnZXh9O1xyXG4gICAgX3dzLnNlbmQoYGVtaXRwYWdlJHtKU09OLnN0cmluZ2lmeShtc2cpfWApO1xyXG4gIH1cclxuXHJcbiAgLy9leDogd3NfX3N0eWxlKHtcInFcIjpcIipcIixcImNzc1wiOlwiY29sb3I6Ymx1ZTtcIn0pXHJcbiAgd2luZG93LndzX19zdHlsZSA9IChqc29uLCBfYWxsPXRydWUpID0+IHtcclxuICAgIGNvbnN0IG1zZyA9IHtkYXRhOiBqc29uLCBfYWxsfTtcclxuICAgIF93cy5zZW5kKGBfc3R5bGUke0pTT04uc3RyaW5naWZ5KG1zZyl9YCk7XHJcbiAgfVxyXG5cclxuICAvL2V4OiB3c19fcGluZygnSGkhJylcclxuICB3aW5kb3cud3NfX3BpbmcgPSAoanNvbikgPT4ge1xyXG4gICAgY29uc3QgbXNnID0ge2RhdGE6IGpzb259O1xyXG4gICAgX3dzLnNlbmQoYF9waW5nJHtKU09OLnN0cmluZ2lmeShtc2cpfWApO1xyXG4gIH1cclxuICBcclxuICAvL2V4OiB3c19faGVscCgpXHJcbiAgd2luZG93LndzX19oZWxwID0gKCkgPT4ge1xyXG4gICAgX3dzLnNlbmQoJ19oZWxwe30nKTtcclxuICB9XHJcblxyXG4gIC8vZXg6IHdzX19vcGVuKHt1cmw6J2h0dHBzOi8vZ29vZ2xlLmNvbSd9KVxyXG4gIHdpbmRvdy53c19fb3BlbiA9IChqc29uKSA9PiB7XHJcbiAgICBjb25zdCBtc2cgPSB7ZGF0YToganNvbn07XHJcbiAgICBfd3Muc2VuZChgX29wZW4ke0pTT04uc3RyaW5naWZ5KG1zZyl9YCk7XHJcbiAgfVxyXG5cclxuICB3aW5kb3cud3NfX3NlbmQgPSAoY21kLCBkYXRhLCBoYW5kbGVyKSA9PiB7XHJcbiAgICBjb25zdCBpZCA9IG5hbm9pZCgpO1xyXG4gICAgY29uc3Qga2V5ID0gYCR7Y21kfToke2lkfWA7XHJcbiAgICB3aW5kb3cuX3dzX3F1ZXVlW2tleV0gPSBoYW5kbGVyIHx8ICh3ID0+IHt9KTtcclxuXHJcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICBpZiAod2luZG93Ll93c19xdWV1ZVtrZXldKSB7XHJcbiAgICAgICAgZGVsZXRlICB3aW5kb3cuX3dzX3F1ZXVlW2tleV07XHJcbiAgICAgICAgY29uc29sZS5sb2coJz4+IHdzIHRpbWVvdXQhJywga2V5KTtcclxuICAgICAgfSBcclxuICAgIH0sIDUwMDApXHJcbiAgICBjb25zdCBwYXJhbXMgPSBgJHtrZXl9JHtKU09OLnN0cmluZ2lmeSh7ZGF0YX0pfWA7XHJcbiAgICBpZiAod2luZG93Lm1pdG0uYXJndi5kZWJ1Zykge1xyXG4gICAgICBjb25zb2xlLmxvZygnX3dzLnNlbmQnLCBwYXJhbXMpOyBcclxuICAgIH1cclxuICAgIF93cy5zZW5kKHBhcmFtcyk7XHJcbiAgfVxyXG59XHJcbi8vd3NfX3NlbmQoJ19waW5nJywgJ0xPTCcsIHc9PmNvbnNvbGUubG9nKCc+cmVzdWx0Jyx3KSk7IiwiY29uc3QgX3dzX25hbWVzcGFjZSA9IHJlcXVpcmUoJy4vX3dzX25hbWVzcGFjZScpO1xuXG5sZXQgX3RpbWVvdXQ7XG5sZXQgX2NzcCA9IHt9O1xubW9kdWxlLmV4cG9ydHMgPSAoKSA9PiB7XG4gIGNvbnN0IGNzcEVycm9yID0gZnVuY3Rpb24oZSkge1xuICAgIGNvbnN0IHtob3N0bmFtZTogaG9zdH0gPSBsb2NhdGlvbjtcbiAgICBsZXQgbmFtZXNwYWNlID0gX3dzX25hbWVzcGFjZSgpO1xuICAgIGNvbnN0IHBhdGggPSBsb2NhdGlvbi5wYXRobmFtZVxuICAgIC5yZXBsYWNlKC9eXFwvLywnJylcbiAgICAucmVwbGFjZSgvXFwvL2csJy0nKTtcbiAgICBjb25zdCB7XG4gICAgICBibG9ja2VkVVJJLFxuICAgICAgZGlzcG9zaXRpb24sXG4gICAgICBkb2N1bWVudFVSSSxcbiAgICAgIGVmZmVjdGl2ZURpcmVjdGl2ZSxcbiAgICAgIG9yaWdpbmFsUG9saWN5LFxuICAgICAgdGltZVN0YW1wLFxuICAgICAgdHlwZSxcbiAgICAgIHZpb2xhdGVkRGlyZWN0aXZlLFxuICAgIH0gPSBlO1xuICAgIGNvbnN0IHR5cCA9IGBbJHtkaXNwb3NpdGlvbn1dICR7ZG9jdW1lbnRVUkl9YFxuICAgIGlmICghX2NzcFt0eXBdKSB7XG4gICAgICBfY3NwW3R5cF0gPSB7fTtcbiAgICB9XG4gICAgaWYgKCFfY3NwW3R5cF0uX2dlbmVyYWxfKSB7XG4gICAgICBfY3NwW3R5cF0uX2dlbmVyYWxfID0ge1xuICAgICAgICBwb2xpY3k6IG9yaWdpbmFsUG9saWN5LFxuICAgICAgICBuYW1lc3BhY2UsXG4gICAgICAgIGhvc3QsXG4gICAgICAgIHBhdGgsXG4gICAgICB9O1xuICAgIH1cbiAgICBjb25zdCBfZG9jID0gX2NzcFt0eXBdO1xuICAgIGlmICghX2RvY1t2aW9sYXRlZERpcmVjdGl2ZV0pIHtcbiAgICAgIF9kb2NbdmlvbGF0ZWREaXJlY3RpdmVdID0ge307XG4gICAgfVxuXG4gICAgY29uc3QgX2VyciA9ICBfZG9jW3Zpb2xhdGVkRGlyZWN0aXZlXTtcbiAgICBpZiAoIV9lcnJbYmxvY2tlZFVSSV0pIHtcbiAgICAgIF9lcnJbYmxvY2tlZFVSSV0gPSB7fTtcbiAgICB9XG4gICAgY29uc3QgX21hdGNoID0gb3JpZ2luYWxQb2xpY3kubWF0Y2goYCR7dmlvbGF0ZWREaXJlY3RpdmV9IFteO10rO2ApO1xuICAgIGNvbnN0IGRpcmVjdGl2ZSA9IF9tYXRjaCA/IF9tYXRjaFswXSA6IGVmZmVjdGl2ZURpcmVjdGl2ZTtcbiAgICBfZXJyW2Jsb2NrZWRVUkldID0ge1xuICAgICAgZGlyZWN0aXZlLFxuICAgICAgdGltZVN0YW1wLFxuICAgICAgdHlwZSxcbiAgICB9O1xuICAgIF90aW1lb3V0ICYmIGNsZWFyVGltZW91dChfdGltZW91dCk7XG4gICAgX3RpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCc+PiBDU1A6JywgX2NzcCk7ICBcbiAgICAgIC8vIHdpbmRvdy53c19fc2VuZCgnY3NwX2Vycm9yJywge1xuICAgICAgLy8gICBuYW1lc3BhY2UsXG4gICAgICAvLyAgIGhvc3QsXG4gICAgICAvLyAgIHBhdGgsXG4gICAgICAvLyAgIF9jc3AsXG4gICAgICAvLyB9KTtcbiAgICAgIF9jc3AgPSB7fTtcbiAgICAgIH0sIDQwMDApO1xuICB9O1xuXG4gIGlmICh3aW5kb3cubWl0bS5jbGllbnQuY3NwKSB7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignc2VjdXJpdHlwb2xpY3l2aW9sYXRpb24nLCBjc3BFcnJvcik7XG4gIH1cbn1cbi8vIGRpc3Bvc2l0aW9uOiBcInJlcG9ydFwiXG4vLyBkb2N1bWVudFVSSTogXCJodHRwczovL3doYXQvaHRtbC9jb250YWluL2NzcFwiXG4vLyB2aW9sYXRlZERpcmVjdGl2ZTogXCJpbWctc3JjXCJcblxuLy8gYmxvY2tlZFVSSTogXCJodHRwczovL3doYXQvdXJsL2dldHRpbmcvYmxvY2tlZFwiXG4vLyBlZmZlY3RpdmVEaXJlY3RpdmU6IFwiaW1nLXNyY1wiXG4vLyBvcmlnaW5hbFBvbGljeTogXCJzY3JpcHQtc3JjIG51bGw7IGZyYW1lLXNyYyBudWxsOyBzdHlsZS1zcmMgbnVsbDsgc3R5bGUtc3JjLWVsZW0gbnVsbDsgaW1nLXNyYyBudWxsO1wiXG4vLyB0aW1lU3RhbXA6IDE5MzMuODIwMDAwMDA1NjUzMVxuLy8gdHlwZTogXCJzZWN1cml0eXBvbGljeXZpb2xhdGlvblwiXG4iLCJjb25zdCBfd3NfcG9zdG1lc3NhZ2UgPSByZXF1aXJlKCcuL193c19wb3N0bWVzc2FnZScpO1xuY29uc3QgX3dzX2luaXRTb2NrZXQgPSByZXF1aXJlKCcuL193c19pbml0LXNvY2tldCcpO1xuY29uc3QgX3dzX3NjcmVlbnNob3QgPSByZXF1aXJlKCcuL193c19zY3JlZW5zaG90Jyk7XG5jb25zdCBfd3NfbG9jYXRpb24gPSByZXF1aXJlKCcuL193c19sb2NhdGlvbicpO1xuY29uc3QgX3dzX29ic2VydmVyID0gcmVxdWlyZSgnLi9fd3Nfb2JzZXJ2ZXInKTtcbmNvbnN0IF93c19nZW5lcmFsID0gcmVxdWlyZSgnLi9fd3NfZ2VuZXJhbCcpO1xuY29uc3QgX3dzX2NzcEVyciA9IHJlcXVpcmUoJy4vX3dzX2NzcC1lcnInKTtcblxubW9kdWxlLmV4cG9ydHMgPSAoKSA9PiB7XG4gIF93c19wb3N0bWVzc2FnZSgpO1xuICBfd3NfaW5pdFNvY2tldCgpO1xuICBfd3Nfc2NyZWVuc2hvdCgpO1xuICBfd3NfbG9jYXRpb24oKTtcbiAgX3dzX29ic2VydmVyKCk7XG4gIF93c19nZW5lcmFsKCk7XG4gIF93c19jc3BFcnIoKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG1CQUFjLEdBQUcsTUFBTTtBQUN2QixFQUFFLFNBQVMsY0FBYyxDQUFDLEtBQUssRUFBRTtBQUNqQyxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFO0FBQ3hDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM3RixLQUFLO0FBQ0wsR0FBRztBQUNILEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxjQUFjLEVBQUUsS0FBSyxD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
