const fs = require('fs-extra');
const cssbeauty = require('cssbeautify');

module.exports = ({data}) =>{ 
  const {fpath} = data;
  const fmeta = fpath.replace(/\/log\/\w+/,m => `${m}/$`);
  let headers = `${fs.readFileSync(fmeta.replace(/.\w+$/, '.json'))}`;
  let content = `${fs.readFileSync(fpath)}`;
  let source = content;
  let ext = fpath.match(/\.(\w+)$/);

  if (ext) {
    ext = ext[1];
    if (ext === 'js') {
      ext = 'javaacript';
    } else if (ext === 'css') {
      source = cssbeauty(content, {
        autosemicolon: true,
      });
    } else if (ext === 'json') {
      const obj = JSON.parse(content);
      source = JSON.stringify(obj.respBody, null, 2);
    }
  } else {
    ext = '';
  }
  return {
    headers: headers,
    content: '',
    source,
    ext,
  };
};
