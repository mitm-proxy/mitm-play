const css = `
.Body-header,.Body-aside {
  display: none !important;
}`
;
const route = {
  url: 'https://keybr.com/',
  'mock:1.no-ads': {
    '#201:google.+.com': '',
    'doubleclick.net': '',
  },
  'mock:2.scenario 1.no-ads': {
    ':2.scenario-#404:/api/login': 'What you need is not here',
    ':2.scenario-1:/api/login': '...',
    ':2.scenario-2:/api/login': '...',
  },
  'css:1.no-ads    active': { 
    'GET#202:/assets/[a-z0-9]+': `=>${css}`
  },
  workspace: '_assets_/',
  'cache:select~1': { 
    '.(pn|sv)g$': {
      contentType: ['image'],
      tags: 'image'
    }
  },
  'log:select~2': {},
  'log:select~3': {},
  log: {
    '/lol': {
      contentType: ['html'],
      tags: '4.logging'
    }
  },
  'response:active': {},
  'html:active': {
    'GET:dodol:/': {
      tags: 'in-html',
      widi: ''
    },
  }
}
module.exports = route;