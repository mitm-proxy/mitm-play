# mitm-play
Man in the middle using playwright

# Features
* `mock` response (under development)
* `skip` continue `request` back to browser   
* `cache` response based on Content-Type header
* `log` any response based on Content-Type header
* Update response based on url and Content-Type
  * `html` - can add js on &lt;head&gt; or end of &lt;body&gt;
  * `json`
  * `css`
  * `js`

The distribution contains sample Mitm to google search and twitter 

Sample built in route(s)
```js
const googlJS = function() {
  document.querySelectorAll('g-section-with-header').forEach(n=>n.remove())
  document.querySelectorAll('.obcontainer').forEach(n=>n.remove())
  document.querySelectorAll('.g-blk').forEach(n=>n.remove())
};

const resp = function(){
  return {};
};

mitm.route = {
  cache: {
    // 'application/x-ww': { ext: '.json' }
  },
  logs: {
    // 'application/json': { ext: '.json' },
  },
  skip: {
    '.(jpg|png|svg|ico|mp4)': {},
  },
  mock: {},
  html: {
    'twimg.com': {resp},
    'twitter.com': {resp},
    'www.google.com/search': {
      resp,
      el: 'e_end', //or e_head
      js: googlJS,
    },
  },
  json: {
    'twimg.com': {resp},
    'api.twitter.com': {resp}
  },
  css:  {'twimg.com': {resp}},
  js:   {'twimg.com': {resp}},
};
```

## Limitation (WSL2)
this limitation was tested on WSl2, other system not test yet, looking up for volunter

#### Browser (Chromium)
- chromium - incognito, no video
- firefox - stale after page full load
- webkit - response will render text not html

#### Only the first tab will have the mitm
currently the intention is to stabilize base features, and isolate the bug only on first tab

#### Playing video in playwright (firefox on WSL2 works!)
when testing on twitter with auto play video, target system need to have video codec installed 

WSL2 - below is the step if the `apt update` failed <br> 
https://stackoverflow.com/questions/61281700/cannot-perform-apt-update-closed
https://github.com/microsoft/playwright/commit/222d01caaadad7419c4e54b4f36a6e9d41d8dc65
```
sudo sed -i -e 's/archive.ubuntu.com\|security.ubuntu.com/ \
  old-releases.ubuntu.com/g' /etc/apt/sources.list

grep -E 'archive.ubuntu.com|security.ubuntu.com' /etc/apt/sources.list.d/*

sudo apt-get update
sudo apt install -y ffmpeg
```
