const c = require('ansi-colors')
const chokidar = require('chokidar')
const broadcast = require('./broadcast')

const showFiles = global._debounce(broadcast('markdown'), 1002, 'markdown')

function addMarkdown (path) {
  const { win32, files: { markdown } } = global.mitm
  win32 && (path = path.replace(/\\/g, '/'))
  markdown.push(path)
  showFiles()
}

function delMarkdown (path) {
  const { win32, files: { markdown } } = global.mitm
  win32 && (path = path.replace(/\\/g, '/'))
  const idx = markdown.indexOf(path);
  (idx > -1) && markdown.splice(idx, 1)
  showFiles()
}

module.exports = () => {
  const { app, route } = global.mitm.path
  const glob = [
    `${app}/*.md`,
    `${route}/**/*.md`
  ]

  // Initialize watcher.
  console.log(c.magentaBright('markdown watcher:'), glob)
  const markdownWatcher = chokidar.watch(glob, { persistent: true })

  markdownWatcher // Add event listeners.
    .on('add', path => addMarkdown(path))
    .on('unlink', path => delMarkdown(path))
  global.mitm.watcher.markdownWatcher = markdownWatcher
}
