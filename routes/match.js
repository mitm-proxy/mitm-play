const {fn: {nameSpace}} = global.mitm;

const searchArr = ({typ, url}) => {
  const {router,routes} = global.mitm;

  return function(nspace) {
    const namespace = nameSpace(nspace);
    if (!namespace) {
      return;
    }

    if (routes[namespace]) {
      let obj = router[namespace][typ];
      let arr = routes[namespace][typ] || [];
      for (let str of arr) {
        if (url.match(obj[str])) {
          return str;
        }
      }  
    }
  };
};

const searchFN = (typ, {url}) => {
  const {router,routes} = global.mitm;

  return function search(nspace) {
    const namespace = nameSpace(nspace);
    if (!namespace) {
      return;
    }

    const obj = router[namespace][typ];
    const route = routes[namespace][typ];
    const splitter = global.mitm.splitter;
    const workspace = routes[namespace].workspace;

    for (let key in route) {
      const arr = url.match(obj[key]);

      if (arr) {
        const split = url.split(splitter);
        const path = `${split[0]}${split.length>1 ? '?' : ''}`;
        const {host, pathname, search} = new URL(url);
        const log = `>> ${typ} (${path}).match(${key})`;
        return {
          contentType: obj[`${key}~contentType`],
          route: route[key],
          workspace,
          pathname,
          search,
          host,
          url,
          key,
          arr,
          log,
        }
      }
    }
  };
};

const matched = (search, {url, headers}) => {
  const {tldomain} = global.mitm.fn;
  const {origin, referer} = headers;

  let domain = tldomain(url);
  let match = search(domain);

  if (!match && (origin || referer)) {
    let orref = tldomain(origin || referer);
    match = search(orref);
  } 
  if (!match) {
    match = search('_global_');
  }
  // console.log('>> Match', tld, !!match)
  return match;
}

module.exports = {
  searchArr,
  searchFN,
  matched,
}
