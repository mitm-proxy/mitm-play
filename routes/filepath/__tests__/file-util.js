const {
  root,
  hashCode,
  filename,
  fileWithHash
} = require('../file-util')

const {
  test,
  expect,
  describe
} = global

describe('file-util.js - hashCode - function', () => {
  test('return hash code of text', () => {
    const result = hashCode('Widi Harsojo')
    expect(result).toBe('1960247921')
  })
  test('return empty hash code of empty text', () => {
    const result = hashCode('')
    expect(result).toBe('')
  })
})

describe('file-util.js - fileWithHash - function', () => {
  test('return file with hash code', () => {
    const result = fileWithHash('Widi Harsojo;with-this-special-url-options')
    expect(result).toBe('Widi Harsojo-781355081')
  })
  test('return same text if no splitter identify', () => {
    const result = fileWithHash('Widi Harsojo')
    expect(result).toBe('Widi Harsojo')
  })
})

describe('file-util.js - filename - function', () => {
  test('return file with hash code', () => {
    const match = {
      pathname: '/one/two/three;Nicker-man;Lostworld',
      route: {
        querystring: true
      }
    }
    const result = filename(match)
    expect(result).toBe('/one/two/hash-20137621')
  })
  test('return same text if no splitter identify', () => {
    const match = {
      pathname: '/one/two/three',
      route: {
        querystring: true
      }
    }
    const result = filename(match)
    expect(result).toBe('/one/two/hash--1943458446')
  })
  test('return same text if no filename', () => {
    const match = {
      pathname: '/one/two/three/',
      route: {
        querystring: true
      }
    }
    const result = filename(match)
    expect(result).toBe('/one/two/three/hash-1767922641')
  })
  test('return same text if no filename', () => {
    const match = {
      pathname: '/one/two/three/',
      route: {}
    }
    const result = filename(match)
    expect(result).toBe('/one/two/three/_')
  })
  test('return same text if no filename', () => {
    const match = {
      pathname: '/one/two/three/l.json',
      route: {}
    }
    const result = filename(match)
    expect(result).toBe('/one/two/three/l.json')
  })
})

describe('file-util.js - root - function', () => {
  test('return file root with group', () => {
    global.mitm = {
      argv: { group: 'one' },
      path: {
        home: '~'
      }
    }
    const reqs = {
      browserName: 'firefox'
    }
    const result = root(reqs, 'log')
    expect(result).toBe('~/firefox/_one/log')
  })
  test('return file root without group', () => {
    global.mitm = {
      argv: {},
      path: {
        home: '~'
      }
    }
    const reqs = {
      browserName: 'firefox'
    }
    const result = root(reqs, 'log')
    expect(result).toBe('~/firefox/log')
  })
})
