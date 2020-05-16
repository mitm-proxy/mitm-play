const { e_head, script_src } = require('./fetch');
const _initWebsocket = require('../socketclnt');

function addWebSocket(arr, reqs) {
  if ((reqs.headers.accept+'').indexOf('text/html') > -1) {
    arr.push(resp => { 
      // resp = {
      //   ...resp,
      //   body: e_head(resp.body, [_initWebsocket])
      // }; 
      resp.body = script_src(resp.body, ['websocket.js']);
      return resp;
    });
  }
}

module.exports = addWebSocket;