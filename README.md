# raze-tpl
A js template engine with syntax like Microsoft Razor

## how to use
### build
`make`

### use
```
var raze = require('./index');

var tpl = fs.readFileSync(filename, 'utf-8');

var render = raze(tpl, {
  safe: false // true to add try/catch to variables accessing
});

var html = render(data);
```

## test and learn more syntax/features
* `node test.js`
* see `tpls/template.html` and `tpls/template.out.html`

## benchmark (for fun)
```
etpl
2000 tests in 4649.02ms.
430.20op/s.
2.3245ms/op.
-----------
art-template
2000 tests in 4054.16ms.
493.32op/s.
2.0271ms/op.
-----------
raze safe
2000 tests in 4326.85ms.
462.23op/s.
2.1634ms/op.
-----------
raze unsafe
2000 tests in 3840.70ms.
520.74op/s.
1.9203ms/op.
```

## inspired by
* [aspnet/Razor](https://github.com/aspnet/Razor)
* [magicdawn/razor-tmpl](https://github.com/magicdawn/razor-tmpl)
* [aui/artTemplate](https://github.com/aui/artTemplate)
* [ecomfe/etpl](https://github.com/ecomfe/etpl)