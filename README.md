# mitm-play
### Man in the middle using playwright

<details><summary><b>mitm-play in action</b></summary>
<p>

![mitm-play](https://raw.githubusercontent.com/mitm-proxy/user-route/master/docs/mitm-proxy.gif)
</p>
</details>

   * [Installation](#installation)
   * [Features](#features)
   * [Concept](#concept)
   * [Profile: ~/.mitm-play](#profile-mitm-play)
   * [Route Sections](#route-sections)
   * [HTTP_PROXY](#http_proxy)
   * [User Route](#user-route)
   * [Early Stage](#early-stage)

# Installation
```bash
npm install -g mitm-play
```
<details><summary>Example</summary>
<p>

```js
// create new folder/file: google.com/index.js and add this content:
const googlJS = function() {
  document.querySelectorAll('g-section-with-header').forEach(n=>n.remove())
  document.querySelectorAll('.obcontainer').forEach(n=>n.remove())
  document.querySelectorAll('.g-blk').forEach(n=>n.remove())
};

const {hello} = global.mitm.fn;

const route = {
  title: 'Search - google',
  url: 'https://google.com/search?q=github+playwright',
  html: {
    'www.google.com/search': {
      el: 'e_end', 
      js: [googlJS, hello], //JS will be placed at end of html body
    },
  }, //all js from gstatic.com will be replace with an empty response
  js: {'gstatic.com': ''} 
}
module.exports = route;
```

```bash
# run the demo:
mitm-play --url='google.com/search?q=covid-19' --delete --save --route='.'
mitm-play -u='google.com/search?q=covid-19' --dsr='.'

# next run should be simple as:
mitm-play
```
</p>
</details>

# Features

| Feature     | payload      | note
|-------------|--------------|----------------------------------------
| `screenshot`| ----------   | DOM specific rules for taking screenshot
| `skip`      | ----------   | array ..of `[domain]` - browser will handle it
| `request`   | __request__  | modify request object - call to remote server
| `noproxy`   | ----------   | array ..of `[domain]` - will serve directly
| `proxy`     | ----------   | array ..of `[domain]` - will serve using proxy
| `mock`      | __response__ | modify response object - no call to remote server
| `cache`     | __response__ | save first remote call to local - next, read from cache
| `log`       | __response__ | save reqs/resp call to local - call to remote server
|             | __response__ | modify response based on contentType - call remote server
| =>>         | * `html`     | - response handler (replace / update + JS)
| =>>         | * `json`     | - response handler (replace / update)
| =>>         | * `css`      | - response handler (replace / update)
| =>>         | * `js`       | - response handler (replace / update)
| `response`  | __response__ | modify response object - call to remote server

# Concept
Mitm intercept is hierarchical checking routes. First check is try to `match` domain on the url, `if match` then next action is to `match` url regex expression on each **type/content-type** listed on the route and `if match` again, then it will execute the handler route event registered in the route.

If the process of checking is not match, then it will fallback to `_global_` namespace to check, and the operation is the same as mention in first paragraph. 

Usually html page load with several assets (image, js & css) that not belong to the same domain, and to match those type of assets, it use browser headers attributes: `origin` or `referer`, in which will scoping to the same namespace.

<details><summary>Example</summary>
<p>

In below example the route is having a `js` object and the process of checking narrated as: 

>  when user access url that having `google.com` and having subsequent request from `gstatic.com`, if there is a JS assets, then the response will get replace with an empty string.

Namespaces: `_global_`, `google.com` on nodejs global scope:
```js
global.mitm.route = {
  '_global_': {
    mock: {...}
  },
  'google.com': {
    html: {
      'www.google.com/search': {
        el: 'e_end', // JS at end of 
        js: [googlJS, hello], // html body
      },
    },
    js: {
      'gstatic.com': ''
    }
  },
}
```
</p>
</details>

# Profile: ~/.mitm-play
By default all save file are on the `~/.mitm-play` profile folder.

# Route Sections
on each route you can add section supported:

<details><summary>Skeleton</summary>
<p>

```js
routes = {
  url:     '',
  title:   '',
  workspace: '',
  screenshot: {}, //user interaction rules & observe DOM-Element
  skip:    [], //start routing rules
  request: {},
  noproxy: [], 
  proxy:   [], //request with proxy
  mock:    {}, 
  cache:   {},
  log:     {},
  html:    {},
  json:    {},
  css:     {},
  js:      {},
  response:{}, //end routing rules
}
```
</p>
</details>
<p>
the execution order as documented start with `skip`, end with `js`, no need to implement all of routing rules. 
</p>

<details><summary><b>Title, url & workspace</b></summary>
<p>

`Title`: provide basic information about this route.

`Url`: when user enter cli with first param as `non dashes`, it will try to find it in **`url`**, if match it will open the browser with that **`url`**.

`workspace`: will be use as the base folder for `file` option in `Mock`.

```js
routes = {
  title: 'Amazon - amazon',
  url:  'https://www.amazon.com/b?node=229189',
  workspace: '~/Projects',
};
// mitm-play ama -dpsr='.' -> search: 'ama' in url and go to the website
```
</p>
</details>
<details><summary><b>Screenshot</b></summary>
<p>

Capture/Screeshot when user *click* specific DOM-Element *match* with `selector` or state-change, like DOM-Element getting *insert* or *remove* and match **selector** inside `observer` key.

Below example show three selector in `observer`:
*  *'.field.error'* -> **filename**: field-error -> **state**: `insert` or `remove`
*  *'.input.focus'* -> **filename**: input -> **state**: `insert` or `remove`
*  *'.panel.error'* -> **filename**: panel-error -> **state**: `insert`

Caveat: `observer` is an *experimental feature*, take it as a grain salt, expectation of selector should be like toggling and it need a unique match to the DOM-Element, *please do test on chrome-devtools before reporting a bug*.

Caveat 2: this `Screenshot` rule(s), required successful injection of websocket client to html document, if it not success (error can be seen on chrome dev-tools),might be *content-security-policy* restriction. 

Caveat 3: process screenshot sometime take times and for SPA, transition between page usually instantly and it lead to capturing next page, even if the trigger come from button in previouse page, there is a CLI option: -z/--lazy to delay click action for about ~400ms 
```js
screenshot: {
  selector: '[type=button],[type=submit],button,a', //click event
  observer: {
    /***
     * selector must be uniq, represent not in the dom 
     * state change couse element tobe insert or remove,
     * or can be just class change 
    */
    '.field.error': 'field-error:insert,remove',
    '.input.focus': 'input:insert,remove',
    '.panel.error': 'panel-error:insert',
  },
  at: 'sshot', //'^sshot' part of log filename
},
```
`at` is a partion of filename and having a simple rule attach on it. Guess what is it?.
</p>
</details>
<details><summary><b>Skip</b></summary>
<p>

Skipping back **`url`** to the browser if partion of **`url`** match text in array of `skip` section, `mitm-play` will not process further.
```js
skip: ['wp-admin'],
```
</p>
</details>
<details><summary><b>Request</b></summary>
<p>

Manipulate Request with `request` function
```js
request: {
  'disqus.com/embed/comments/': {
    request({url, method, headers, body, browserName}) {
      return {}
    }
  }
},
```
</p>
</details>
<details><summary><b>Noproxy</b></summary>
<p>

if proxy config was set to all request/response, `noproxy` will exclude it from proxy. Example below will set domain nytimes.com with direct access and the rest will go thru proxy. 
```js
// HTTP_PROXY env need to be set, cli: --proxy .. --noproxy ..
noproxy: ['nytimes.com'],
proxy:   ['.+'],
```
</p>
</details>
<details><summary><b>Proxy</b></summary>
<p>

Certain domain will go thru proxy
```js
// HTTP_PROXY env need to be set, cli: --proxy ..
proxy: [
  'google-analytics.com',
],
```
</p>
</details>
<details><summary><b>Mock</b></summary>
<p>

Mocking the **response**.

Basic rule: replace **response body** with **the matcher** value 
```js
mock: {'2mdn.net': ''},
```

`response` manipulate **response** with return value of `response` *function*
```js
mock: {
  'mitm-play/twitter.js': {
    response({status, headers, body}) {
      return {body} //can be {} or combination of {status, headers, body}
    },
  },
},
```
`file` getting **mock body** from `file`, if `workspace` exists, it will be use as base path (ie: `${workspace}/${file}`)
```js
mock: {
  'mitm-play/twitter.js': {
    file: 'path/to/my/file.html',
  },
},
```
`js` **the mock body** will be a concatenation of JS code
```js
const unregisterJS = () => {
  ...
  console.log('unregister service worker')
};

mock: {
  'mitm-play/twitter.js': {
    js: [unregisterJS],
  },
},
```
If both options are created `response`, `js`, `response` will be used and `js` will be ignored.
</p>
</details>
<details><summary><b>Cache</b></summary>
<p>

Save the first request to your local disk so next request will serve from there.
```js
cache: {
  'amazon.com': {
    contentType: ['javascript', 'image'], //required! 
    session: true, // optional - set session id
    hidden: true, // optional - no consolo.log
    nolog: true, // optional - disable logging
    at: 'mycache', // 'mycache' part of cache filename
  }
},
```
`cache` support `response` function, it means the result can be manipulate first before send to the browser.
```js
cache: {
  'amazon.com': {
    contentType: ['json'], //required! 
    response({status, headers, body}) {
      return {body} //can be {} or combination of {status, headers, body}
    },    
  }
},
```
</p>
</details>
<details><summary><b>Log</b></summary>
<p>

Save the response to your local disk. by default contentType `json` will log complete request / response, for different type default log should be response payload. 

Special usacase like google-analytic will send contentType of `gif` with [GET] request, and response payload is not needed, there is an option `log` to force log with json complete request / response.  
```js
log: {
  'amazon.com': {
    contentType: ['json'],
    at: 'myjson', // 'myjson' part of log filename
  },
  'google-analytics.com/collect': {
    contentType: ['gif'],
    log: true, //'<remove>'
  }
},
```
`log` support `response` function, it means the result can be manipulate first before send to the browser.
```js
log: {
  'amazon.com': {
    contentType: ['json'], //required! 
    response({status, headers, body}) {
      return {body} //can be {} or combination of {status, headers, body}
    },    
  }
},
```
</p>
</details>
<details><summary><b>Html</b></summary>
<p>

Manipulate the response.

Basic rule: replace **response body** with **the matcher** value 
```js
html: {'twitter.net': ''},
```

`response` rule: manipulate **response** with return value of `response` *function*
```js
html: {
  'twitter.com/home': {
    response({status, headers, body}) {
      ....
      return {body} //can be {} or combination of {status, headers, body}
    },
    hidden: true, // optional - no consolo.log
  },
},
```
`js` rule: insert js script element into specific area in html document
```js
html: {
  'www.google.com/search': {
    el: 'e_end', // JS at end of 
    js: [googlJS, hello], // html body
  },
},
```
</p>
</details>
<details><summary><b>Json</b></summary>
<p>

Manipulate the response.

Basic rule: replace **response body** with **the matcher** value 
```js
json: {'twitter.net': '{}'},
```

`response` rule: manipulate **response** with return value of `response` *function*
```js
json: {
  'twitter.com/home': {
    response({status, headers, body}) {
      ....
      return {body} //can be {} or combination of {status, headers, body}
    },
  },
},
```
</p>
</details>
<details><summary><b>Css</b></summary>
<p>

Manipulate the response.

Basic rule: replace **response body** with **the matcher** value -or- add to the end of response body by adding FAT arrow syntax `=>${style}`
```js
const style = 'body: {color: red}';
...
css: {'twitter.net': style}, //or `=>${style}`
```

`response` rule: manipulate **response** with return value of `response` *function*
```js
css: {
  'twitter.com/home': {
    response({status, headers, body}) {
      ....
      return {body} //can be {} or combination of {status, headers, body}
    },
  },
},
```
</p>
</details>
<details><summary><b>Js</b></summary>
<p>

Manipulate the response.

Basic rule: replace **response body** with **the matcher** value -or- add to the end of response body by adding FAT arrow syntax `=>${style}`
```js
const code = 'alert(0);'
...
js: {'twitter.net': code}, //or `=>${code}`
```

`response` rule: manipulate **response** with return value of `response` *function*
```js
js: {
  'twitter.com/home': {
    response({status, headers, body}) {
      ....
      return {body} //can be {} or combination of {status, headers, body}
    },
  },
},
```
</p>
</details>
<details><summary><b>Response</b></summary>
<p>

Manipulate Response with `response` function
```js
response: {
  '.+': {
    request({status, headers, body}) {
      headers['new-header'] = 'with some value';
      return {headers};
    }
  }
},
```
</p>
</details>

# _\_global\__ route
A special route to handle global scope (without namespace) and serving as a common config. 

The default `config.logs` setting can be override as needed.
<details><summary><b>Common route rules</b></summary>
<p>

```js
_global_ = {
  skip:    [], //start routing rules
  request: {},
  noproxy: [], 
  proxy:   [], //request with proxy
  mock:    {}, 
  cache:   {},
  log:     {},
  html:    {},
  json:    {},
  css:     {},
  js:      {},
  response:{}, //end routing rules
  config:  {}, //see Default config below
}
```
</p>
</details>
<details><summary><b>Default config</b></summary>
<p>

```js
// toggle to show/hide from console.log()
_global_.config = {
  logs: {
    'no-namespace':  true,
    'not-handle':    true,
    'ws-receive':    true,
    'ws-broadcast':  true,
    silent: false, //true: hide all
    skip:   false,
    request: true,
    mock:    true,
    cache:   true,
    log:     true,
    html:    true,
    json:    true,
    css:     true,
    js:      true,
    response:true,
  }
}
```
</p>
</details>

# HTTP_PROXY
mitm-play support env variable **HTTP_PROXY** and **NO_PROXY** if your system required proxy to access internet. Please check on `CLI Options > -x --proxy` section for detail explanation. 

# CLI Options
<details><summary><b>-h --help</b></summary>
<p>
To show all the options Command Line Interface (CLI). this option can be arbitrary position on cli, the result should be always display this messages:

```
$ mitm-play -h  <OR>
$ mitm-play --help

  Usage: mitm-play <profl> [options]

  Options:
    -h --help            show this help
    -u --url             go to specific url
    -s --save            save as default <profl>
    -r --route           userscript folder routes
    -d --delete          delete/clear cache & logs
    -p --pristine        pristine browser, default option
    -i --insecure        accept insecure cert in nodejs env
    -n --nosocket        no websocket injection to html page
    -o --ommitlog        removed unnecessary console log
    -v --verbose         show more detail of console log
    -k --cookie          reset cookies expire date
    -g --group           create cache group/rec
    -t --incognito       set chromium incognito
    -c --chromium        run chromium browser
    -f --firefox         run firefox browser
    -w --webkit          run webkit browser
    -x --proxy           a proxy request
    -z --lazy            delay ~400ms click action
    --proxypac           set chromium proxypac
    --plugins            add chrome plugins
    --debug              show ws messages

  v0.6.xx
```
</p>
</details>
<details><summary><b>-u --url</b></summary>
<p>

Open Browser to specific `URL`

```
$ mitm-play -u='https://google.com'  <OR>
$ mitm-play --url='https://google.com'
```
</p>
</details>
<details><summary><b>-s --save</b></summary>
<p>

Save CLI options with `default`  or named so later time you don't need to type long CLI options

```
$ mitm-play -s  <OR>
$ mitm-play --save
  <OR>
$ mitm-play -s='google'  <OR>
$ mitm-play --save='google'
```
</p>
</details>
<details><summary><b>-r --route</b></summary>
<p>

Specify which folder contains routes config

```
$ mitm-play -r='../userroutes'  <OR>
$ mitm-play --route='../userroutes'
```
</p>
</details>
<details><summary><b>-d --delete</b></summary>
<p>

Delete logs or cache, can be all or specific one

```
$ mitm-play -d  <OR>
$ mitm-play --delete
  <OR>
$ mitm-play -d='log'  <OR>
$ mitm-play --delete='log'
  <OR>
$ mitm-play -d='cache'  <OR>
$ mitm-play --delete='cache'
```
</p>
</details>
<details><summary><b>-p --pristine [default]</b></summary>
<p>

Launch browser with non Incognito, this is the default configuration, the opposite is to use --incognito. 

```
$ mitm-play -p  <OR>
$ mitm-play --pristine
```
</p>
</details>
<details><summary><b>-i --insecure</b></summary>
<p>

Set NodeJS to operate within insecure / no https checking 

```
$ mitm-play -i  <OR>
$ mitm-play --insecure
```
</p>
</details>
<details><summary><b>-n --nosocket</b></summary>
<p>

No Injection of websocket to the browser

```
$ mitm-play -n  <OR>
$ mitm-play --nosocket
```
</p>
</details>
<details><summary><b>-o --ommitlog</b></summary>
<p>

hide some console.log

```
$ mitm-play -o  <OR>
$ mitm-play --ommitlog
```
</p>
</details>
<details><summary><b>-v --verbose</b></summary>
<p>

Add additional info in console.log

```
$ mitm-play -v  <OR>
$ mitm-play --verbose
```
</p>
</details>
<details><summary><b>-k --cookie</b></summary>
<p>

Set proper cache retriver with an update expiry of the cookies

```
$ mitm-play -k  <OR>
$ mitm-play --cookie
```
</p>
</details>
<details><summary><b>-g --group</b></summary>
<p>

Add group name to file cache/logs, if necessary when large capturing is done and difficult to check the files. 

There is an option `at` on the rules of `cache`/`log` for additional filename grouping path.

```
$ mitm-play -g='mygroup'  <OR>
$ mitm-play --group='mygroup'
```
</p>
</details>
<details><summary><b>-t --incognito</b></summary>
<p>

By Default program will run in normal/--pristine browser, adding this option will result in Incognito mode.

```
$ mitm-play -t  <OR>
$ mitm-play --incognito
```
</p>
</details>
<details><summary><b>-c --chromium</b></summary>
<p>

Launch Chromium browser

```
$ mitm-play -c  <OR>
$ mitm-play --chromium
```
</p>
</details>
<details><summary><b>-f --firefox</b></summary>
<p>

Launch Firefox browser

```
$ mitm-play -f  <OR>
$ mitm-play --firefox
```
</p>
</details>
<details><summary><b>-w --webkit</b></summary>
<p>

Launch Webkit browser

```
$ mitm-play -w  <OR>
$ mitm-play --webkit
```
</p>
</details>
<details><summary><b>-x --proxy</b></summary>
<p>

will force some traffict that having proxy section defined, it will use proxy.

this option serving two kind of needs:
1. if the option put just plain --proxy, certain traffict that was handle by mitm-play will get thru proxy, certain traffict that was handle by browser will not effected. and the configuration will come from the enviroment variable.
2. if the option come with string configuration, all traffict will get thru proxy. and the configuration come from --proxy (ie: --proxy='http://username:pass@my.proxy.com')  

```
$ mitm-play -x  <OR>
$ mitm-play --proxy
```
</p>
</details>
<details><summary><b>-z --lazy</b></summary>
<p>

Delay click action ~400ms, to provide enough time for screenshot to be taken

```
$ mitm-play -z  <OR>
$ mitm-play --lazy
```
</p>
</details>
<details><summary><b>--proxypac</b></summary>
<p>

When network on your having a proxypac settings, might be usefull to use the same. This option only in Chromium

```
$ mitm-play --proxypac
```
</p>
</details>
<details><summary><b>--plugins</b></summary>
<p>

Specific only on chromium / chrome browser

```
$ mitm-play --plugins
```
</p>
</details>
<details><summary><b>--debug</b></summary>
<p>

More information will be shown in console.log (ex: websocket)

```
$ mitm-play --debug
```
</p>
</details>

# Macros
When creating rule for specific website site (ie: **autologin to gmail**), inside folder you can add `macros.js` to contains what automation need to be run 
```bash
# folder
./accounts.google.com/index.js
./accounts.google.com/macros.js
```
```js
// macros.js
window.mitm.macros = {
  '^/signin/v2/identifier?'() {
    console.log('login to google account...!');
    window.mitm.autofill = [
      '#identifierId => myemailname',
      '#identifierId -> press ~> Enter',
    ];
    //document.querySelector('.btn-autofill').click() // executed when loaded
  },
  '^/signin/v2/challenge/pwd?'() {
    window.mitm.autofill = [
      'input[type="password"] => password',
      'input[type="password"] -> press ~> Enter',
    ];
    //document.querySelector('.btn-autofill').click() // executed when loaded
  },
}
```
```js
// will be send to playwright to execute when user click button "Autofill"
window.mitm.autofill = [...]

// it will run on interval 500ms
window.mitm.autointerval = () => {...};

// additinal buttons to be visible on the page top-right
// buttons can be toggle show / hide by clicking [LCtrl]
window.mitm.autobuttons = {
  'one|blue'() {console.log('one')},
  'two|green'() {console.log('two')}
}
```

# User Route
[User-route](https://github.com/mitm-proxy/user-route) are available on this repo: https://github.com/mitm-proxy/user-route and it should be taken as an experiment to test `mitm-play` functionality. 

If you think you have a nice routing want to share, you can create a PR to the [user-route](https://github.com/mitm-proxy/user-route) or add a `link` to your repo.  

# Use Cases
<details><summary><b>Reduce Internet usage</b></summary>
<p>

There are several strategy to reduce internet usage, user commonly use different tools to achieve, either install new browser (ie: Brave) or install Add Blocker (ie: uBlock). Using mitm-play, developer can controll which need to be pass, blocked or cached. 

__Cache any reguest with content type: font, image, javascript, css__, if url contains cached busting, it may miss the cached, you can experiment by turning off `querystring` to `false`.
```js
cache: {
  '.+': {
    contentType: ['font','image','javascript','css'],
    querystring: true,
    nolog: true,
  }
},
```

__Block/Mock unnecessary javascript with an empty result__, be careful to not block UX or content navigation.
```js
mock: {
  'some/url/with/adv.js': {
    response({body}) {
      return {body: '/* content is blocked! */'}
    },
  },
},
```
</p>
</details>
<details><summary><b>Simplify Developer workflow</b></summary>
<p>

as developer sometime we need to get access to lots website in which some of the page need to be automated fill in and submit to the next page. 

With `Macros` it can be done!
</p>
</details>

# Early Stage
Expect to have some `rule changed` as feature/fix code are incrementally committed.

.

Goodluck!,
>*-wharsojo*.
