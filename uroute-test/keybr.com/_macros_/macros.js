const rbuttons = {
  'right1|yellow': async function () {
    console.log('right')
  },
  'download-right|yellow': async function () {
    console.log('download-right')
  },
}
const lbuttons = {
  'left1|yellow': async function () {
    console.log('left1')
  },
  'left2|yellow': async function () {
    console.log('left2')
  },
  'left3|yellow': async function () {
    console.log('left3')
  },
}
module.exports = () => {
  const hello = 'world'
  return {
    '/'() {
      console.log('olah')
      window.mitm.macrokeys = {
        'KeyA'() {
          console.log('KeyA')
          alert('Alert KeyA')
        }
      }
      window.mitm.autofill = ['input[type="password"] => password']
      window.mitm.rightbuttons = rbuttons
      window.mitm.autobuttons  = rbuttons
      window.mitm.leftbuttons  = lbuttons
    },
    zero: '0'
  }
}