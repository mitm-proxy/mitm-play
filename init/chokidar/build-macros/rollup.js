const rollup = require('rollup')
const svelte = require('rollup-plugin-svelte')
const preprocess = require('svelte-preprocess')
const commonjs = require('@rollup/plugin-commonjs')
const {nodeResolve} = require('@rollup/plugin-node-resolve')
const { logmsg } = global.mitm.fn

function bundleRollup(bpath, opath) {
  // see below for details on the options
  const inputOptions = {
    input: bpath,
    plugins: [
      svelte({
        compilerOptions: {dev: true},
        preprocess:  preprocess()
      }),
      nodeResolve({
        browser: true,
        dedupe: ['svelte'],
        preferBuiltins: false
      }),
      commonjs()
    ]
  };
  const outputOptions = {
    file: opath,
    sourcemap: 'inline',
    format: 'iife'
  };

  async function build() {
    // create a bundle
    const bundle = await rollup.rollup(inputOptions);
    logmsg(bundle.watchFiles); // an array of file names this bundle depends on
    const { output } = await bundle.generate(outputOptions);

    for (const chunkOrAsset of output) {
      if (chunkOrAsset.type === 'asset') {
        logmsg('Asset', chunkOrAsset);
      } else {
        logmsg('Chunk', chunkOrAsset.modules);
      }
    }
    await bundle.write(outputOptions);
    await bundle.close();
  }
  build();
}
module.exports = bundleRollup