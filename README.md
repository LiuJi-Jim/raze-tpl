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

### test and learn more syntax/features
* `node test.js`
* see `tpls/template.html` and `tpls/template.out.html`