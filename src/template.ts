/// <reference path="./global.d.ts" />

import utils = require('./utils');
import Compiler = require('./compiler');
import engine = require('./engine');

function raze(input: string, opts: IRazeOptions): RenderFunc {
  opts = utils.extend({
    local: 'data',
    safe: true,
    args: []
  }, opts);

  var obj: Template = new Template(input, opts);
  obj.render = Compiler.compile(input, obj, opts);

  return obj.render;
}

class Template implements ITemplateObject {
  source: string;
  opts: IRazeOptions;
  blocks = {};
  appends = {};
  prepends = {};
  funcs = {};
  identifiers = {};
  render: RenderFunc;

  constructor(input: string, opts: IRazeOptions) {
    this.source = input;
    this.opts = opts;
  }

  renderBlock(name: string, data: any): string {
    var result = '';
    var before = (this.prepends[name] || []);
    var after = (this.appends[name] || []);
    for (var i = 0; i < before.length; ++i) {
      result += before[i](data, this, engine);
    }
    result += this.blocks[name](data, this, engine);
    for (var i = 0; i < after.length; ++i) {
      result += after[i](data, this, engine);
    }
    return result;
  }
}

raze['addFilter'] = function(name: string, fn: Function) {
  engine.filters[name] = fn;
}

export = raze;