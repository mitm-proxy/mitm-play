module.exports = () => {
  let windowRef
  return {
    // ex: ws__help()
    _help ({ data }) {
      console.log(data)
    },
    // ex: ws__ping("there")
    _ping ({ data }) {
      console.log(data)
    },
    // ex: ws__open({url: "https://google.com"})
    _open ({ data }) {
      const features = 'directories=0,titlebar=0,toolbar=0,location=0,status=0,menubar=0,width=800,height=600'
      windowRef = window.open(data.url, '_logs', features)
      windowRef.blur()
    },
    // ex: ws__style('.intro=>background:red;')
    _style ({ data }) {
      const { q, css } = data
      document.querySelectorAll(q).forEach(
        node => (node.style.cssText = css)
      )
    },
    // ex: ws__
    _saveTags ({ routes }) {
      if (!location.origin.match('chrome-extension')) {
        console.log('Update routes')
        window.mitm.routes = routes
      }
    },
    // ex: ws__
    _files ({ data, typ }) {
      const { files } = window.mitm
      console.warn(`receive brodcast ${typ}`)
      /**
       * event handler after receiving ws packet
       * ie: window.mitm.files.route_events = {eventObject...}
       */
      for (const key in files[`${typ}_events`]) {
        console.warn(files[`${typ}_events`][key] + '')
        files[`${typ}_events`][key](data)
      }
    },
    _setClient ({ data }) {
      console.log('_setClient', data)
      window.mitm.client = data
    }
  }
}
