var etpl = require('etpl');
var art = require('art-template');

// to run this benchmark you should install etpl and art-template
// npm install etpl art-template

var raze = require('./index');
var fs = require('fs');

var length = 2000;
var times = 2000;

var data = {
  persons: []
};
for (var i=0; i<length; ++i) {
  data.persons.push({
    name: '<myname' + i,
    email: 'myname' + i + '@myemail.com',
    age: i + 5
  });
}

function hrtime() {
  var diff = process.hrtime();
  return (diff[0] * 1e9 + diff[1]) / 1e6; // nano second -> ms
}

function bench(fn, times) {
  var start = hrtime();
  var result;
  for (var i=0; i<times; ++i) {
    result = fn();
  }
  var end = hrtime();
  var elapsed = end - start;
  var op_per_s = times / elapsed * 1000;
  var ms_per_op = elapsed / times;
  console.log(times + ' tests in ' + elapsed.toFixed(2) +'ms.');
  console.log(op_per_s.toFixed(2) + 'op/s.');
  console.log(ms_per_op.toFixed(4) + 'ms/op.');
  console.log('-----------');
  return result;
}

var test_etpl = (function() {
  var tpl =[
    '<ul>',
    '<!-- for: ${persons} as ${person} -->',
    '  <li>My name is ${person.name} and I\'m ${person.age} years old. My email is [${person.email}].</li>',
    '<!-- /for -->',
    '</ul>'
  ].join('\n');
  var render = etpl.compile(tpl);
  function test() {
    return render(data);
  }
  return test;
})();
console.log('etpl');
var result_etpl = bench(test_etpl, times);
fs.writeFileSync('./etpl.out.html', result_etpl, 'utf-8');

var test_art = (function() {
  var tpl = [
    '<ul>',
    '{{each persons as person}}',
    '  <li>My name is {{person.name}} and I\'m {{person.age}} years old. My email is [{{person.email}}].</li>',
    '{{/each}}',
    '</ul>'
  ].join('\n');
  var render = art.compile(tpl);
  function test() {
    return render(data);
  }
  return test;
})();
console.log('art-template');
var result_art = bench(test_art, times);
fs.writeFileSync('./art.out.html', result_art, 'utf-8');

var test_raze_safe = (function() {
  var tpl = [
    '<ul>',
    '@foreach (person in persons) {',
      '<li>My name is @person.name and I\'m @person.age years old. My email is [@(person.email)].</li>',
    '}',
    '</ul>'
  ].join('\n');
  var render = raze(tpl, {
    safe: true
  });
  function test() {
    return render(data);
  }
  return test;
})();
console.log('raze safe');
var result_raze_safe = bench(test_raze_safe, times);
fs.writeFileSync('./raze_safe.out.html', result_raze_safe, 'utf-8');

var test_raze_unsafe = (function() {
  var tpl = [
    '<ul>',
    '@foreach (person in persons) {',
      '<li>My name is @person.name and I\'m @person.age years old. My email is [@(person.email)].</li>',
    '}',
    '</ul>'
  ].join('\n');
  var render = raze(tpl, {
    safe: false
  });
  function test() {
    return render(data);
  }
  return test;
})();
console.log('raze unsafe');
var result_raze_unsafe = bench(test_raze_unsafe, times);
fs.writeFileSync('./raze_unsafe.out.html', result_raze_unsafe, 'utf-8');
