const c = require('ansi-colors');
const _fetch = require('make-fetch-happen');

function extract({route, browserName}) {
  const {
    _url: url, 
    _method: method, 
    _headers: headers,
    _postData: body,
  } = route._request;
  return {url, method, headers, body, browserName};
}

function fetch(route, {url, proxy, ...reqs}, handler) {
  const opts = {redirect: 'manual'};

  if (proxy) {
    if (proxy===true) {
      const { 
        HTTP_PROXY, NO_PROXY,
        http_proxy, no_proxy,
      } = process.env;
      if (HTTP_PROXY || http_proxy) {
        opts.proxy = HTTP_PROXY || http_proxy;
        opts.noProxy = NO_PROXY || no_proxy || '';
      } 
    } else {
      opts.proxy = proxy;
    }
  }

  _fetch(url, {...reqs, ...opts}).then(resp => {
    const {argv, splitter} = global.mitm;
    const _headers = resp.headers.raw();
    let status = resp.status;
    if (proxy && argv.verbose) {
      console.log(c.grey(`>> proxy (${url.split(splitter)[0]})`));
    }
    const headers = {};
    for (let key in _headers) {
      if (key!=='set-cookie') {
        headers[key] = _headers[key].join(',');
      } else {
        headers[key] = _headers[key];
      }
    }
    // if (status===301 || status===302) {
    //   route.fulfill({url, status, headers});
    //   return;
    // }
    resp.buffer().then(body => {
      if (status===undefined) {
        status = headers['x-app-status'];
      }
      if (status>=400) {
        console.log(c.redBright(`[${reqs.method}] ${url} => ${status}`));
        console.log(c.red(`${body}`));
      }
      const resp2 = handler({url, status, headers, body});
      route.fulfill(resp2);
    });
    //.nextact.catch(err => {
    //   console.log(c.redBright('>> fetch error:'), err);
    // });
  })
}

module.exports = {
  extract,
  fetch,
};
