const fs = require('fs-extra');
const cssbeauty = require('cssbeautify');
const hjs = require("highlight.js/lib/core");
const xml = require('highlight.js/lib/languages/xml');
const css = require('highlight.js/lib/languages/css');
const js = require('highlight.js/lib/languages/javascript');
hjs.registerLanguage('javascript', js);
hjs.registerLanguage('css', css);
hjs.registerLanguage('xml', xml);

const regx = /hljs-string(">)&#x27;([\w-]+)&#x27;/g;
const repl = (m,p1,p2) => `hljs-built_in${p1}${p2}`;

function gutter(code) {
  code = code.replace(regx, repl);
  return code.split('\n').map((n,i) => {
    const id = ((i+1)+'').padStart(4,' ');
    return `${id} ${n}`;
  }).join('\n');
}

function json(code) {
  code = code.replace(/   "(.+)"(:)/g, (m,p1,p2) =>  `   '${p1}':`).
              replace(  / "(.+)"(:)/g, (m,p1,p2) =>  ` ${p1}:`);
  code = hjs.highlight('javascript', code).value;
  return code;
}

module.exports = ({data}) =>{ 
  const {fpath} = data;
  const fmeta = fpath.replace(/\/log\/\w+/,m => `${m}/$`);
  let headers = `${fs.readFileSync(fmeta.replace(/.\w+$/, '.json'))}`;
  let content = `${fs.readFileSync(fpath)}`;
  let source = content;
  let ext = fpath.match(/\.(\w+)$/);

  if (ext) {
    ext = ext[1];
    if (ext === 'html') {
      content = hjs.highlight('html', content).value;
    } else if (ext === 'js') {
      ext = 'javaacript';
      content = hjs.highlight('js', content).value;
    } else if (ext === 'css') {
      content = cssbeauty(content, {
        autosemicolon: true,
      });
      content = hjs.highlight('css', content).value;
    } else {
      if (ext === 'json') {
        const obj = JSON.parse(content);
        content = JSON.stringify(obj.respBody, null, 2);
      }
      content = json(content);
    }
  } else {
    ext = '';
  }
  headers = json(headers);
  return {
    headers: gutter(headers),
    content: gutter(content),
    source,
    ext,
  };
};
