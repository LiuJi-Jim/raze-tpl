import path = require('path');
import fs = require('fs');
import utils = require('./utils');
import Compiler = require('./compiler');
import engine = require('./engine');

class Template implements ITemplateObject {
  source: string;
  opts: IRazeOptions;
  layout = undefined;
  derived = undefined;
  code: Compiler.ICompiler = undefined;
  blocks = {};
  appends = {};
  prepends = {};
  funcs = {};
  identifiers = {};
  render: IRenderFunc;

  constructor(opts: IRazeOptions) {
    this.source = opts.template;
    this.opts = opts;
  }

  import(name: string, data: any): string {
    let filename = path.join(this.opts.basedir, `${name}${this.opts.extname}`);

    debugger;
    // console.log('importing', this.opts.filename, this.opts.basedir, filename);
    let opts = utils.extend({}, this.opts, {
      args: [],
      template: undefined,
      filename: filename,
      basedir: undefined
    });
    let render = raze(opts);
    return render(data);
  }

  extend(name: string) {
    let filename = path.join(this.opts.basedir, name + this.opts.extname);

    // console.log('extend', name, filename);
    let input = fs.readFileSync(filename, 'utf-8');
    let opts = utils.extend({}, this.opts, {
      args: [],
      template: input,
      filename: filename,
      basedir: path.dirname(filename)
    });

    var layout = this.layout = new Template(opts);
    layout.derived = this;
    layout.code = Compiler.compile(layout);
  }

  fragment(input: string, opts: IRazeOptions): ITemplateObject {
    opts = utils.extend({}, opts, {
      template: input
    });
    var frag = new Template(opts);
    frag.code = Compiler.compile(frag, true);

    return frag;
  }
}

function raze(opts: IRazeOptions): IRenderFunc {
  opts = utils.extend({
    local: utils.nextGUID(),
    template: undefined,
    strip: false,
    safe: true,
    args: [],
    filename: undefined,
    basedir: undefined,
    extname: '.html',
    plainObjEach: true
  }, opts);
  if (opts.template === undefined && opts.filename !== undefined) {
    opts.template = fs.readFileSync(opts.filename, 'utf-8');
    opts.basedir = opts.basedir || path.dirname(opts.filename);
  }

  var tpl: ITemplateObject = new Template(opts);
  tpl.code = Compiler.compile(tpl);
  var render = <IRenderFunc> Compiler.link(tpl.code, tpl);

  tpl.render = render;

  return tpl.render;
}

raze['addFilter'] = function(name: string, fn: Function) {
  engine.filters[name] = fn;
};

export = raze;
