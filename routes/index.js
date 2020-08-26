const c = require('ansi-colors');
const {extract, fetch} = require('./fetch');
const _3rdparties    = require('./_3rdparties');
const _jsResponse    = require('./_jsResponse');
const _allResponse   = require('./_allResponse');
const _chngRequest   = require('./_chngRequest');
const _cssResponse   = require('./_cssResponse');
const _logResponse   = require('./_logResponse');
const _jsonResponse  = require('./_jsonResponse');
const _htmlResponse  = require('./_htmlResponse');
const _proxyRequest  = require('./_proxyRequest');
const _skipResponse  = require('./_skipResponse');
const _mockResponse  = require('./_mockResponse');
const _addWebSocket  = require('./_addWebSocket');
const _cacheResponse = require('./_cacheResponse');

const _resp = {
  status: 200,
  headers: {},
  body: ''
};

module.exports =  ({route, browserName}) => {
  const {routes, argv: {nosocket, proxy}} = global.mitm;
  const reqs = extract({route, browserName});
  const {origin, pathname} = new URL(reqs.url);
  const {logs} = routes._global_.config;
  const responseHandler = [];

  // catch unknown url scheme & respond it 
  if (reqs.url.match('(brave|edge)://')) {
    route.fulfill(_resp);
    return;
  }

  const _3d = _3rdparties(reqs);
  const skip = _skipResponse(reqs, _3d);
  if (skip) {
    if (logs.skip) {
      console.log(c.grey(`>> skip (${origin}${pathname}).match(${skip})`));
    }
    route.continue({});
    return;
  }

  if (_mockResponse({reqs, route}, _3d)) {
    return;
  }

  if (proxy && _proxyRequest(reqs, _3d)) {
    reqs.proxy = proxy;
  }

  //--resp can be undefined or local cached & can skip logs (.nolog)
  let {match, resp} = _cacheResponse(reqs, responseHandler, _3d);

  //--order is important and log must not contain the body modification
  if (!match || !match.route.nolog) {
    _logResponse(reqs, responseHandler, _3d);
  }

  _htmlResponse(reqs, responseHandler, _3d);
  _jsonResponse(reqs, responseHandler, _3d);
  _cssResponse (reqs, responseHandler, _3d);
  _jsResponse  (reqs, responseHandler, _3d);
  _allResponse (reqs, responseHandler, _3d);
  if (!nosocket) {
    //--inject websocket client to html
    _addWebSocket(reqs, responseHandler);
  }

  if (resp) {
    Events(responseHandler, resp, route);
  } else if (responseHandler.length) { //call BE 
    fetch(route, browserName, (_chngRequest(reqs, _3d) || reqs), function(resp) {
      Events(responseHandler, resp, route);
    });
  } else {
    if (logs) {
      if (_3d) {
        if (logs['no-namespace']) {
          console.log(c.redBright(`>> no-namespace (${origin}${pathname})`));
        }
      } else {
        if (logs['not-handle']) {
          console.log(c.redBright(`>> not-handle (${origin}${pathname})`));
        }
      }  
    }
    route.continue({});
  }
}

function Events(responseHandler, resp, route) {
  for (let fn of responseHandler) {
    resp = fn(resp);
    if (resp===undefined) {
      break;
    }
  }
  resp && route.fulfill(resp);
}
