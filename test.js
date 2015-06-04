var fs = require('fs');
var raze = require('./index');

var filename = './tpls/template.html';
var tpl = fs.readFileSync(filename, 'utf-8');

var data = { persons: [] };
(function () {
  var len = 1000;

  for (var i = 0; i < len; i++) {
    data.persons.push({
      name: '<myname' + i,
      email: 'myname' + i + '@myemail.com',
      age: i + 5
    })
  }
})();

data.lorem = 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
data.rubbish = '}/128150479/{}(Y!@#$%^()[]*';

raze.addFilter('textarea', function(str, width, height) {
  width = width || 200;
  height = height || 200;
  return '<textarea style="width:'+width+'px; height:'+height+'px;">' + str + '</textarea>';
});

console.time('compile');
var render = raze(tpl, {
  safe: false
});
console.timeEnd('compile');
console.log(render.__renderFn.toString());

console.time('render');
for (var i=0; i<100; ++i) {
  render(data);
}
console.timeEnd('render');

var result = render(data);
fs.writeFileSync('./tpls/template.out.html', result, 'utf-8');
