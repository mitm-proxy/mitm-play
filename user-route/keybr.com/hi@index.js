const {requires} = global.mitm.fn
const [lol] = requires('./reload')

lol()

const route = {
  urls: {
    keyb2: 'https://keybr.com/',
  },  
  'html:hi': {
    'GET:/url': {
      // tags: 'in-html',
      amir: ''
    },
  }
}
module.exports = route;