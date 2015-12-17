import utils = require('./utils');
import Parser = require('./parser');
import engine = require('./engine');

export interface ICompiler {
  args: string[];
  tokens: utils.IToken[];
  opts: IRazeOptions;
}

function parseExpression(expr: string): string {
  // console.log('parseExpression', expr);
  let arr: string[] = [];
  let segment = '';
  for (let i = 0, len = expr.length; i < len; ++i) {
    let curr = expr[i];
    let next = (i < len - 1) ? expr[i + 1] : '';
    if (curr === '|') {
      if (next !== '|') {
        arr.push(segment);
        segment = '';
      } else {
        segment += (curr + next);
        i++;
      }
    } else {
      segment += curr;
    }
  }
  if (segment !== '') {
    arr.push(segment);
  }
  let value = arr[0];
  let pipes = arr.slice(1);
  let result = value;
  for (let i = 0; i < pipes.length; ++i) {
    let curr = pipes[i].trim();
    let fn = curr;
    let open = curr.indexOf('(');
    let args = [];
    if (open > 0) {
      let close = utils.findMatching(curr, open);
      fn = curr.substring(0, open).trim();
      args = curr.substring(open + 1, close).split(',');
    }
    let arg = args.length > 0 ? (', ' + args.join(', ')) : '';
    result = `__fs.${fn}(${result}${arg})`;
  }
  return result;
}

function pushCode(codes: string[], code: string, safe: boolean): void {
  if (safe) {
    code = `try{${code}}catch(ex){}`;
  }
  codes.push(code);
}

/**
 * compile `tokens` to `codes`
 *
 * returns string[]
 * in case someone want to hook the code before new Function
 */
export function codegen(cp: ICompiler, tpl: ITemplateObject, pure = false): string[] {
  let tokens = cp.tokens;
  let args = cp.args;
  let opts = tpl.opts;
  let identifiers = tpl.identifiers;
  let result_varname = utils.nextGUID();
  let codes = ['var ' + result_varname + ' = "";'];
  // codes.push(`console.log('data', typeof ${opts.local})`);
  // codes.push(`console.log('obj', typeof __obj)`);
  // codes.push(`console.log('engine', typeof __engine)`);
  if (!pure) {
    codes.push('var __hs=__engine.helpers,__fs=__engine.filters;');
  }
  for (let id in identifiers) {
    if (args.indexOf(id) === -1) {
      codes.push(`var ${id} = ${opts.local}["${id}"];`);
    }
  }

  ['blocks', 'funcs'].forEach(function(type) {
    let map = tpl[type];
    for (let name in map) {
      let frag: ITemplateObject = map[name];
      let body = codegen(frag.code, frag, true);
      let code = wrap(name, frag.opts.args, body);
      pushCode(codes, code, false);
    }
  });
  ['appends', 'prepends'].forEach(function(type) {
    let map = tpl[type];
    for (var name in map) {
      let arr = map[name];
      arr.forEach(function(frag) {
        let fn = `${name}_${type}${utils.nextGUID()}`;
        let body = codegen(frag.code, frag, true);
        let code = wrap(fn, frag.opts.args, body);
        frag.funcname = fn;
        frag.funcstr = code;
        pushCode(codes, code, false);
      });
    }
  });

  for (let i = 0; i < tokens.length; ++i) {
    let token = tokens[i];
    let data = token.val;
    let inner: string;
    switch (token.type) {
      case utils.TokenType.COMMAND:
        inner = `${result_varname} += (${data});`;
        pushCode(codes, inner, opts.safe);
        break;
      case utils.TokenType.CODE_BLOCK:
        /**
         * @{ var data=10; }
         */
        pushCode(codes, data, false);
        break;
      case utils.TokenType.BLOCK:
        let name = data;
        let prepends = tpl.prepends[name] || [];
        prepends.forEach(function(frag) {
          pushCode(codes, `${result_varname} += (${frag.funcname}());`, false);
        });
        inner = `${result_varname} += (${name}());`;
        pushCode(codes, inner, false);
        let appends = tpl.appends[name] || [];
        appends.forEach(function(frag) {
          pushCode(codes, `${result_varname} += (${frag.funcname}());`, false);
        });
        break;
      case utils.TokenType.VAR:
        /**
         * @(data)
         * 不允许空值,就是值不存在的情况下会报错
         */
        data = parseExpression(data);
        inner = `${result_varname} += __fs.html(${data});`;
        pushCode(codes, inner, opts.safe);
        break;
      case utils.TokenType.VAR_RAW:
        data = parseExpression(data);
        inner = `${result_varname} += ${data};`;
        pushCode(codes, inner, opts.safe);
        break;
      case utils.TokenType.STRING:
        /**
         * div -> result+='div';
         * "div" -> result+='\"div\"';
         */
        data = utils.escapeInNewFunction(data);
        inner = `${result_varname} += '${data}';`;
        pushCode(codes, inner, false);
        break;
      default:
        break;
    }
  }
  codes.push(`return ${result_varname};`);
  return codes;
}

/**
 * wrap a compiled tpl into JavaScript Function source code
 */
export function wrap(name: string, args: string[], body: string[]): string {
  let codes = [`function ${name}(${args.join(",") }){`];
  codes = codes.concat(body);
  codes.push('}');
  return codes.join('\n');
}

/**
 * link a compiled tpl to JavaScript Function
 */
export function link(cp: ICompiler, tpl: ITemplateObject): Function {
  if (tpl.layout) {
    utils.extend(tpl.layout.appends, tpl.appends);
    utils.extend(tpl.layout.prepends, tpl.prepends);
    utils.extend(tpl.layout.blocks, tpl.blocks);
    utils.extend(tpl.layout.funcs, tpl.funcs);
    utils.extend(tpl.layout.identifiers, tpl.identifiers);

    return link(tpl.layout.code, tpl.layout);
  }

  let body = codegen(cp, tpl).join('\n');
  let args = cp.args.slice(0);
  args.push(body);

  let render = Function.apply(undefined, args);

  let fn: IRenderFunc = function(data: any): string {
    return render(data, tpl, engine);
  };

  fn.__renderFn = render;

  return fn;
}

/**
 * compile to function
 */
export function compile(tpl: ITemplateObject, pure = false): ICompiler {
  let input = tpl.source;
  let opts = tpl.opts;
  let parser = new Parser(input, tpl, opts);
  let tokens = parser.parse();

  let args: string[] = [];
  if (opts.args.length > 0) {
    args = opts.args.slice(0);
  }
  if (!pure) {
    args.push(opts.local);
    args.push('__obj');
    args.push('__engine');
  }

  return {
    args: args,
    tokens: tokens,
    opts: opts
  };
}
