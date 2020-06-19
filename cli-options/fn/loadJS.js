const c = require('ansi-colors');

const load = function(path) {
  const rpath = require.resolve(path);
  if (require.cache[rpath]) {
    delete require.cache[rpath];
  }
  return require(path);
}

const resort = global._debounce(function() {
  let keys = Object.keys(global.mitm.routes);
  keys = keys.sort(function(a, b) {
    return b.length - a.length || // sort by length, if equal then
           a.localeCompare(b);    // sort by dictionary order
  });
  const routes = {};
  for (let key of keys) {
    routes[key] = global.mitm.routes[key];
  }
  console.log(c.red('>> Reset routes'));
  global.mitm.routes = routes;
  global.mitm.fn.clear();
});

const loadJS = function(path, log) {
  log && console.log(log);
  load(path);
  resort();
}

module.exports = loadJS;