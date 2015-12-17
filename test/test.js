var fs = require('fs');
var path = require('path');
var raze = require('../dist/index');
var filename = path.join(__dirname, '../tpls/template.html');
var data = { persons: [], kv: {}, rows: [] };
(function () {
    var len = 20;
    for (var i = 0; i < len; i++) {
        data.persons.push({
            name: '<myname' + i,
            email: 'myname' + i + '@myemail.com',
            age: i + 5
        });
    }
})();
data.kv = {};
for (var i = 0; i < 10; ++i) {
    data.kv['key-' + i] = 'value-' + i;
}
data.rows = [];
for (var i = 0; i < 10; ++i) {
    var col = [];
    for (var j = 0; j < 10; ++j) {
        col.push({
            value: 'table-' + i + ', ' + j
        });
    }
    data.rows.push(col);
}
data.nested = {
    name: 'root',
    child: {
        name: 'a',
        child: {
            name: 'b',
            child: {
                name: 'c'
            }
        }
    }
};
data.param_capture = 'i am captured by param';
data.block_capture = 'i am captured by block';
data.import_param_capture = 'i am captured by import param';
data.dynamic_import_filename = 'imported';
raze.addFilter('textarea', function (str, width, height) {
    width = width || 200;
    height = height || 200;
    return '<textarea style="width:' + width + 'px; height:' + height + 'px;">' + str + '</textarea>';
});
raze.addFilter('replace', function (str, search, rep) {
    return String(str).replace(search, rep);
});
console.time('// compile');
var render = raze({
    filename: filename,
    local: 'data',
    safe: true
});
console.timeEnd('// compile');
console.log(render.__renderFn.toString());
console.time('// render');
for (var i = 0; i < 100; ++i) {
    render(data);
}
console.timeEnd('// render');
var result = render(data);
var output = path.join(__dirname, '../tpls/template.out.html');
fs.writeFileSync(output, result, 'utf-8');
