const {fn: {home, _nameSpace}} = global.mitm;
const browser = {chromium: '[C]', firefox: '[F]', webkit: '[W]'};

function typTags(typ, namespace) {
  const {routes, __tag4} = global.mitm;
  const ns = __tag4[namespace];
  // if (typ==='proxy')
  //   debugger;
  if (ns) {
    return ns[typ] || [];
  } else {
    return [];
  }
}

const searchArr = ({typ: typs, url}) => {
  const {router,routes} = global.mitm;

  return function(nspace) {
    const namespace = _nameSpace(nspace);
    if (!namespace) {
      return;
    }
    if (routes[namespace]) {
      const list = typTags(typs, namespace);
      for (let typ of list) {
        let obj = router[namespace][typ];
        let arr = routes[namespace][typ] || [];
        for (let str of arr) {
          if (obj && url.match(obj[str])) {
            return str;
          }
        }
      }
    }
  };
};

const searchFN = (typs, {url, method, browserName}) => {
//const {router,routes, data} = global.mitm;
  const {router,routes, __tag3} = global.mitm;

  return function search(nspace) {
    const namespace = _nameSpace(nspace);
    if (!namespace) {
      return;
    }

    let workspace = routes[namespace].workspace;
    if (workspace) {
      workspace = home(workspace);
    }

    const list = typTags(typs, namespace);

    for (let typ of list) {
      // if (namespace==='oldstorage.com.sg' && typs==='cache' && url.match('meta'))
      //   debugger;
      const route = routes[namespace][typ];
      const obj = router[namespace][typ];
      const tg3 = __tag3[namespace]||{};

      for (let key in route) {
        let isTagsOk = true;
        if (tg3[key] && tg3[key][typ]) {
          const nodes = tg3[key][typ];
          for (let tag in nodes) {
            if (nodes[tag]===false) {
              isTagsOk = false;
              break;
            }
          }
        }
        const arr = isTagsOk && url.match(obj[key]);
        const _method = obj[`${key}~method`];
  
        if (arr && (_method===undefined || _method===method)) {
          const {host, origin, pathname, search} = new URL(url);
          const msg = pathname.length <= 100 ? pathname : pathname.slice(0,100)+'...';
          const log = `${browser[browserName]} ${typ} (${origin}${msg}).match(${key})`;
          const matched = {
            contentType: obj[`${key}~contentType`],
            route: route[key],
            workspace,
            namespace,
            pathname,
            search,
            host,
            url,
            key,
            arr,
            log,
            typ,
          }
          // if (data.maches===undefined) {
          //   data.maches = [];
          // } else if (data.maches.length>20) {
          //   data.maches.shift();
          // }
          // data.maches.push(matched);
          return matched;
        }
      }  
    }
  };
};

const searchKey = key => {
  const {router,routes} = global.mitm;

  return function search(nspace) {
    const namespace = _nameSpace(nspace);
    if (!namespace) {
      return;
    }

    return routes[namespace][key];
  };
};

const matched = (search, {url, headers}) => {
  //match to domain|origin|referer|_global_
  const {_tldomain} = global.mitm.fn;
  const {origin, referer} = headers;

  let domain = _tldomain(url);
  let match = search(domain);

  if (!match && (origin || referer)) {
    let orref = _tldomain(origin || referer);
    match = search(orref);
  } 
  if (!match) {
    match = search('_global_');
  }
  // console.log('>>> Match', tld, !!match)
  return match;
}

module.exports = {
  searchArr,
  searchKey,
  searchFN,
  matched,
}
