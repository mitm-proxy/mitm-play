const headerCSP = function({headers}) {
  // delete headers['content-security-policy'];
  // let b = headers['content-security-policy'][0];
  // b = b.replace(/'unsafe-inline'/g, '').replace(/'self'/g, '')
  // headers['content-security-policy'] = b;
  return {headers};
};

const twitterJS = function() {
  document.addEventListener('DOMContentLoaded', (event) => {
    setTimeout(() => {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
        registration.unregister()
      }});
      console.log('unregister service worker')
    }, 1000)
  })
};

const unregisterJSCode = function() {
  return {
    headers: {
      'content-type': 'application/javascript'
    },
    body: `(${twitterJS+''})()`
  };
}

const {
  resp, 
  routeSet,
  stringify,
} = global.mitm.fn;

const routes = {
  mock: {
    'twitter.com/mitm-play/unregister.js': {
      resp: unregisterJSCode,
    },
  },
  json: {
    'twimg.com': {resp},
    'api.twitter.com': {resp}
  },
  html: {
    'twimg.com': {resp},
    'twitter.com': {
      resp: headerCSP,
      el: 'e_head',
      js: [twitterJS],
      src:['unregister.js'],
    },
  },
  css:{'twimg.com':   {resp}},
  js: {'twitter.com': {resp}},
}

console.log(stringify(routeSet(routes)));
