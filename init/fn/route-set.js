const c = require('ansi-colors');
const stringify = require('./stringify');
const logs = require('./setlogs');
const typs = require('./typs');

const {typC, typA, typO} = typs;

function toRegex(str, flags='') {
  return new RegExp(str.replace(/\./g, '\\.').replace(/\?/g, '\\?'), flags);
}
const fkeys = x=>x!=='tags' && x!=='contentType';

function routeSet(r, namespace, print=false) {
  const {routes, __mock} = global.mitm;
  routes[namespace] = r;
  if (namespace==='_global_') {
    routes._global_.mock = {
      ...routes._global_.mock,
      ...__mock,
    };
  }
  const tags = {};
  const urls = {};
  const router = {};
  router._namespace_ = toRegex(namespace.replace(/~/,'[^.]*'));

  const _typlist = function(typs) {
    const typlist = Object.keys(r).filter(x=>{
      if (x.startsWith(`${typs}:`)) {
        tags[x] = true;
        return true;
      }
    });
    r[typs] && typlist.unshift(typs);
    return typlist;
  }

  for (let typs of typC) {
    _typlist(typs);
  }
  
  for (let typs of typA) {
    // if (namespace==='_global_' && typs==='proxy') 
    //   debugger;
    const typlist = _typlist(typs);
    for (let typ of typlist) {
      router[typ] = {};
      for (let str of r[typ]) {
        const regex = toRegex(str);
        router[typ][str] = regex;
      }
    }
  }

  function addType(typ) {
    router[typ] = {};
    for (let str in r[typ]) {
      const regex = toRegex(str);
      router[typ][str] = regex;
      const site = r[typ][str];
      if (site) {
        if (site.tags) {
          if (urls[str]===undefined) {
            urls[str] = {};
          }
          const nss = urls[str];
          if (nss[typ]===undefined) {
            nss[typ] = {};
          }
          const nsstag = nss[typ];
          const ctype = site.contentType ? `[${site.contentType.join(',')}]` : '';
          const keys = Object.keys(site).filter(fkeys).join(',');
          nss[`:${typ}`] = `${ctype}<${keys}>`.replace('<>', '');

          if (site.tags.match(':')) {
            throw 'char ":" cannot be included in tags!';
          }
          const arr = site.tags.split(/ +/);
          for (let key of arr) {
            nsstag[key] = true;
            tags[key] = true;
          }
        }
        if (site.contentType) {
          const contentType = {};
          for (let typ2 of site.contentType) {
            if (contentType[typ2]) {
              const ct = site.contentType.join("', '");
              throw [
                `contentType should be unique:`,
                `${namespace}.${typ}['${str}'].contentType => ['${ct}']`];
            }
            contentType[typ2] = toRegex(typ2);
          }
          router[typ][`${str}~contentType`] = contentType;
        }
      } 
    }  
  }

  for (let typs of typO) {
    const typlist = _typlist(typs);
    for (let typ of typlist) {
      addType(typ);
    }
  }

  if (namespace==='_global_') {
    const {config} = global.mitm.router[namespace];
    router.config = config;
  }
  global.mitm.router[namespace] = router;
  if (Object.keys(tags).length) {
    global.mitm.__tag2[namespace] = tags;
    global.mitm.__tag3[namespace] = urls;
  } else {
    if (global.mitm.__tag2[namespace]) {
      delete global.mitm.__tag2[namespace];
    }
    if (global.mitm.__tag3[namespace]) {
      delete global.mitm.__tag3[namespace];
    }
  }
  if (!global.mitm.data.nolog && global.mitm.argv.verbose) {
    const msg = `>> ${namespace}\n${stringify(routes[namespace])}`;
    print && console.log(c.blueBright(msg));  
  }
  return r;
}

module.exports = {
  routeSet,
  toRegex,
};
