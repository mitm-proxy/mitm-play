# Cache rule

<div class="details" title="Diagram">
<div class="mermaid">
sequenceDiagram
    participant Browser as Browser
    participant Route as Mitm-play
    participant Cached as Cached
    participant Server as Server
    Browser->>+Route: Request
    Route-->>+Server: no cache!
    Server-->>-Route: response
    Route-->>Cached: Save for future request
    Route->>-Browser: Response
    Browser->>+Route: Request
    Route-->>+Cached: cached!
    Cached-->>-Route: response
    Route->>-Browser: Response
</div>
</div>

"_Save the first request to your local disk so next request will serve from there._"

## Simple Usage
For simple caching, minimum requirement to set up are the `url` and `contentType`. Example below show `url` combine with regex notation 

```js
'cache:_test~01': {
  '/css/_.+': { // internally, lookup will use regex: /\/css\/_.+/
    contentType: ['css']
  }
}
```
By default, file-cache will be stored in Mitm-play profile under browser name folder
<div class="details" title="Cache will be save on Mitm-play profile">

![Icon](./cache-01-file.png 'cache-01-file:att height=50% width=50%')

Structure folder will resemble the URL path, the `headers` information is saved into `$` folder 

![Icon](./cache-01-logs.png 'cache-01-logs:att width=100%')

</div>

## Dynamic file: with regex grouping
`file` property was introduce to move file-cache from Mitm-profile, value can be just literal String (but restricted the usefullness) or combine with _reqex search-result-label_ denoted with `:1`, `:2`, etc.
```js
'cache:_test~02': {
  '/css/(_.+).css': { // regex: /\/css\/(_.+).css/
    contentType: ['css'],
    file: '_assets_/:1',
  }
},
```
if file containts _forward slash_ `/` it will be interpeted as folder

<div class="details" title="Cache will be save on user-route">

![Icon](./cache-02-file.png 'cache-02-file:att width=30%')

The file-name saved will have additional text to covers some scenarios:
* `method` to support action based on `method` ie: CRUD in REST style API
* `file-ext` it's a translate from content-type

![Icon](./cache-02-logs.png 'cache-02-logs:att width=100%')

</div>

`path` property can be use to denoted folder so file doesn't need to contains path 
```js
'cache:_test~03': {
  '/css/(_.+).css': {
    contentType: ['css'],
    path: '_assets_',
    file: ':1',
  }
},
```
or file-cached need to be living on your home-folder
```js
path: '~/_assets_'
```
or your root-folder
```js
path: '/_assets_'
```
