module.exports = nspace => {
  let namespace;
  for (let id in global.mitm.routes) {
    if (nspace.match(`(^${id}|.${id})`)) {
      namespace = id;
      break;
    }
  }
  return namespace;
}