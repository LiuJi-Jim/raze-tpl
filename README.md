# raze-tpl
A js template engine with syntax like [Microsoft Razor Render Engine](https://github.com/aspnet/Razor)

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

## test and see the demo of syntax/features
* `node test.js`
* see `tpls/template.html` and `tpls/template.out.html`

## syntax and fetures

### variable outputing
#### implicit
```
<span>@some_variable[index]</span>
```
#### explicit
```
<span>@(some_variable[index])</span>
```
#### no html escaping
```
<span@(-some_variable[index])</span>
```
#### filtering
```
<span>@(some_variable[index] | replace(/lorem/ig, '>>$0<<')</span>
```

### flow control
#### loop on array
```
@each (value in arr) {
  <li>@value</li>
}
@each (index:value in arr) {
  <li>No.@index of arr is @value</li>
}
```
#### loop on kv-obj
```
@objEach (value in kv) {
  <li>@value</li>
}
@objEach (k:v in kv) {
  <dt>@k</dt>
  <dd>@v</dd>
}
#### conditions
```
@if (condition) {
  <span>Yes!!</span>
}

@if (condition) {
  <span>Yes!!</span>
} else {
  <span>Ooops..</span>
}
```

### function defination add calling
#### defination
```
@func sayHello(name) {
  <span>Hello, <strong>@name</strong>!</span>
}
```
#### calling
```
@use sayHello('jim')

@each (person in persons) {
  @use sayHello(person.name)
}
```
in functions you can enjoy closure variables just like what you have in javascript

### block defination and overriding
#### defination
```
@block pageBody {
  <span>default empty page body</span>
}
```
#### overriding
```
@override (pageBody) {
  <strong>this block is what will really show at block#pageBody</strong>
}
```
#### appending
```
@append (pageBody) {
  <span>this will be appended to block#pageBody</span>
}
```
#### prepending
```
@prepend (pageBody) {
  <span>this will be prepended to block#pageBody</span>
}
```

### layout and extending (experimental)
```
@extend ('layout.html')
@override (pageBody) {
  <strong>this block is what will really show at block#pageBody</strong>
}
```
not published yet

### filter blocks
register filters first
``` JavaScript
raze.addFilter('textarea', function(str, width, height) {
  width = width || 200;
  height = height || 200;
  return '<textarea style="width:'+width+'px; height:'+height+'px;">' + str + '</textarea>';
});
raze.addFilter('json', function(obj) {
  return JSON.stringify(obj, null, '  ');
});
```
and then you can use such filters and you can try 'filter block'
```
@filter textarea(400, 200) {
  @(nested | json)
}
```
which will generate
```
<textarea style="width:400px; height:200px;">
{
  &quot;value&quot;: &quot;root&quot;,
  &quot;nested&quot;: {
    &quot;value&quot;: &quot;nested-0&quot;,
    &quot;nested&quot;: {
      &quot;value&quot;: &quot;nested-1&quot;,
      &quot;nested&quot;: {
        &quot;value&quot;: &quot;nested-2&quot;,
        &quot;nested&quot;: {
          &quot;value&quot;: &quot;nested-3&quot;,
          &quot;nested&quot;: {
            &quot;value&quot;: &quot;nested-4&quot;
          }
        }
      }
    }
  }
}
</textarea>
```



### miscellaneous
#### escape chars
```
@@ -> @
@} -> }
```
#### literal blocks
```
@# everything in literal block will be echoed as plain text #@
```
#### comments
```
@* comments *@
```

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