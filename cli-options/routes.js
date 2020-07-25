const logs = require('./fn/logs');

module.exports = () => {  
  const _global_vars = resp => {
    return {body: global.mitm.fn.wsclient(resp)};
  };
  
  const mock = {
    '/mitm-play/websocket.js': {
      response: _global_vars,
    },
  }
  global.mitm.__mock = mock;
  global.mitm.source = {};
  global.mitm.routes = {
    '_global_': {
      mock,
      config: {
        logs: logs()
      }
    }
  };
  global.mitm.router = {
    '_global_': {
      _namespace_: /_global_/,
      mock: {
        '/mitm-play/websocket.js': new RegExp('/mitm-play/websocket.js')
      },
    }
  };
};
