# raze-tpl
A js template engine with syntax like [Microsoft Razor Render Engine](https://github.com/aspnet/Razor)

## how to use

### install

```
npm install raze-tpl
```

### use

```
var raze = require('raze-tpl');

var tpl = fs.readFileSync(filename, 'utf-8');

var render = raze({
  template: tpl
});

// or
var render = raze({
  filename: filename
});
// which will use fs.readFileSync

var result = render(data);
```

### options

| key | usage |
|-----|-------|
|`safe`|`true` to add try/catch to variables accessing (default to `true`)|
|`strip`|`true` to remove whitespace (default to `false`)|
|`extname`|define extname when using `import` and `extend` (default to `'.html'`)|
|`plainObjEach`|`true` to use `Object.keys()` when loop on K-V objects (default to `true`)|

### test and see the demo of syntax/features

* `node test/test.js` (not published in npm package. only available in source code)
* see `tpls/template.html` and `tpls/template.out.html`

## syntax and features

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

#### also available on k-v objects

```
@each (value in kv) {
  <li>@value</li>
}
@each (k:v in kv) {
  <dt>@k</dt>
  <dd>@v</dd>
}
```

### "alias foreach=each"

```
@foreach (i:n in arr) {
  ...
}
```

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

@if (condition) {
  <span>Yes!!</span>
} else if (another_condition) {
  <span>So so..</span>
} else {
  <span>Ooops..</span>
}
```

### function definition add calling

#### definition

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

### block definition and overriding

#### definition

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

### importing (experimental)

```
@import ('_partials/header')
@import (variable_is_ok)
@import ('_components/card', {
  title: 'params is available',
  content: local_var,
  footer: scope_will_be_extended
})
```

### layout and extending (experimental)

```
@extend ('layout.html')
@override (pageBody) {
  <strong>this block is what will really show at block#pageBody</strong>
}
```

`import` and `extend` only available when passing `filename` to `options` or or passing both `template` and `basedir`, because `import` and `extend` are using relative path.

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

## trouble shooting

```
var render = raze(opts);
console.log(render.__renderFn.toString());
```

## benchmark (for fun)
```
etpl
2000 tests in 3767.63ms.
530.84op/s.
1.8838ms/op.
-----------
art-template
2000 tests in 3634.60ms.
550.27op/s.
1.8173ms/op.
-----------
raze safe
2000 tests in 3643.93ms.
548.86op/s.
1.8220ms/op.
-----------
raze unsafe
2000 tests in 3259.28ms.
613.63op/s.
1.6296ms/op.
-----------
```

## inspired by

* [aspnet/Razor](https://github.com/aspnet/Razor)
* [magicdawn/razor-tmpl](https://github.com/magicdawn/razor-tmpl)
* [aui/artTemplate](https://github.com/aui/artTemplate)
* [ecomfe/etpl](https://github.com/ecomfe/etpl)
