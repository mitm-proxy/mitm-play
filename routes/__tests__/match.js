require('../../init/init-ap');
const {routeSort} = require('../../init/chokidar/loadJS');
const {_routeSet} = require('../../init/fn/_route-set');

global.mitm = {
  ...global.mitm,
  routes: require('../__fixture__/routes'),
  fn: {
    _routeSet,
    _clear: () =>{},
    _nameSpace: require('../../init/fn/_namespace'),
    _tldomain : require('../../init/fn/_tldomain'),
    _tag4     : require('../../init/fn/_tag4'),
  }
};
const {routes} = global.mitm;
_routeSet(routes['_global_'], '_global_', true);
_routeSet(routes['google.com'], 'google.com', true);
routeSort();

const {
  searchArr,
  searchFN,
  matched,
} = require('../match');

const {
  test, 
  expect,
  describe, 
} = global;

describe('match.js - searchArr', () => {
  test('return undefined for not found or string for found in url', () => {
    const typ = 'skip';
    const url = 'https://google.com/search?q=github+playwright';
    const fn = searchArr({typ, url});

    const r1 = fn('google');
    expect(typeof r1).toBe('undefined');

    const r2 = fn('google.com');
    expect(typeof r2).toBe('string');
  })
})

describe('match.js - searchFN', () => {
  test('return undefined for not found or object for found in url', () => {
    const typ = 'html';
    const url = 'https://www.google.com/search?q=github+playwright';
    const fn = searchFN(typ, {url});

    const r1 = fn('google');
    expect(typeof r1).toBe('undefined');

    const r2 = fn('google.com');
    expect(typeof r2).toBe('undefined');
  })
})

describe('match.js - matched', () => {
  test('return matched name-space', () => {
    const typ = 'skip';
    const url = 'https://google.com/search?q=github+playwright';
    const fn = searchArr({typ, url});

    const found = matched(fn, {url, headers: {}})
    expect(typeof found).toBe('string');
  })

  test('return matched origin/referer', () => {
    const req = {
      url: 'https://www.gtm.com/search?q=github+playwright',
      headers: {
        'content-type': 'text/html',
        origin: 'https://google.com'
      }
    }

    const fn = searchFN('html', req);
    const found = matched(fn, req);

    expect(typeof found).toBe('object');
  })

  test('return exclude domain', () => {
    const typ = 'html';
    const url = 'https://www.exclude.com/search?q=github+playwright';
    const fn = searchArr(typ, {url});

    let found = matched(fn, {url, headers: {
      'content-type': 'text/html',
      origin: 'https://google.com'
    }})
    expect(typeof found).toBe('undefined');

    found = matched(fn, {url, headers: {
      'content-type': 'text/html',
      referer: 'https://google.com'
    }})
    expect(typeof found).toBe('undefined');
  })

  test('return with no headers', () => {
    const typ = 'html';
    const url = 'https://www.exclude.com/search?q=github+playwright';
    const fn = searchArr(typ, {url});

    const found = matched(fn, {url, headers: {}})
    expect(typeof found).toBe('undefined');
  })

})
