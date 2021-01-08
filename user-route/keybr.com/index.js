// create file: ~/user-route/keybr.com/index.js & add this content:
const css = `
.Body-header,.Body-aside {
  display: none !important;
}`;
 
const route = {
  url: 'https://keybr.com',
  tags: ['no-ads'],
  'mock:1.no-ads~g': {
    'doubleclick.net': '',
    'a.pub.network': '',
    'GET:google.+.com': '',
    'GET:/test': {
      //tags: '3.in-mock~1'
    }
  },
  'css:parent-tag': {
    'GET:/test': `=>${css}`,
    'GET:hide-content:/assets/[a-z0-9]+': `=>${css}`
  },
  'log:sample-tag1': {
    'GET:/log1': {
      contentType: ['html'],
      tags: 'sample-tag1',
    }
  },
  html: {
    'GET:/html1': {
      tags: 'sample-tag1 hide-content',
      log: true
    },
    'GET:/assets/[a-z0-9]+': {
      tags: 'hide-content',
      log: true
    },
  }
}
module.exports = route;