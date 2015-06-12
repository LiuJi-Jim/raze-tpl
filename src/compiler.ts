/// <reference path="./global.d.ts" />

import utils = require('./utils');
import Parser = require('./parser');
import engine = require('./engine');

export interface ICompiler {
  args: string[];
  tokens: utils.IToken[];
  opts: IRazeOptions;
}

function parseExpression(expr: string): string {
  //console.log('parseExpression', expr);
  var arr: string[] = []; // 管道拆分后的所有分段
  var segment = '';
  
  for (var i = 0, len = expr.length; i < len; ++i) {
    var curr = expr[i];
    var next = (i < len - 1) ? expr[i + 1] : '';
    if (curr === '|') {
      if (next !== '|') {
        // 避免 || 运算符
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
    // 最后一段
    arr.push(segment);
  }
  var value = arr[0]; // 最左边的值
  var pipes = arr.slice(1); // 管道段落
  var result = value;
  for (var i = 0; i < pipes.length; ++i) {
    var curr = pipes[i].trim();
    var fn = curr;
    var open = curr.indexOf('(');
    var args = [];
    if (open > 0) {
      // 有括号，是有参数的形式，如 xxx | replace(/a/ig, 'AAA')
      var close = utils.findMatching(curr, open);
      fn = curr.substring(0, open).trim();
      // 对args进行一个规范化重新拼接，但似乎并没有什么卵用
      args = curr.substring(open + 1, close).split(',');
    }
    var arg = args.length > 0 ? (', ' + args.join(', ')) : '';
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
function codegen(tokens: utils.IToken[], args: string[], identifiers: string[], opts: IRazeOptions): string[] {
  var result = utils.nextGUID();
  var codes = ['var ' + result + ' = "";'];
  //codes.push(`console.log('data', typeof ${opts.local})`);
  //codes.push(`console.log('obj', typeof __obj)`);
  //codes.push(`console.log('engine', typeof __engine)`);
  codes.push('var __hs=__engine.helpers,__fs=__engine.filters;');
  for (var id in identifiers) {
    if (args.indexOf(id) == -1) {
      codes.push(`var ${id} = ${opts.local}["${id}"];`);
    }
  }
  for (var i = 0; i < tokens.length; ++i) {
    var token = tokens[i];
    var data = token.val;

    switch (token.type) {
      case utils.TokenType.COMMAND:
        var inner = `${result} += (${data});`
        pushCode(codes, inner, opts.safe);
        break;
      case utils.TokenType.CODE_BLOCK:
        /**
         * @{ var data=10; }
         */
        pushCode(codes, data, false);
        break;
      case utils.TokenType.VAR:
        /**
         * @(data)
         * 不允许空值,就是值不存在的情况下会报错
         */
        data = parseExpression(data);
        var inner = `${result} += __fs.html(${data});`;
        pushCode(codes, inner, opts.safe);
        break;
      case utils.TokenType.VAR_RAW:
        data = parseExpression(data);
        var inner = `${result} += ${data};`;
        pushCode(codes, inner, opts.safe);
        break;
      case utils.TokenType.STRING:
        /**
         * div -> result+='div';
         * "div" -> result+='\"div\"';
         */
        data = utils.escapeInNewFunction(data);
        var inner = `${result} += '${data}';`;
        pushCode(codes, inner, false);
        break;
      default:
        break;
    }
  }
  codes.push('return ' + result);
  return codes;
}

function link(fn: ICompiler, obj: ITemplateObject, opts: IRazeOptions): Function {
  var tokens = fn.tokens;
  var args = fn.args.slice(0);
  var code = codegen(tokens, args, obj.identifiers, opts).join('\n');

  args.push(code);
  return Function.apply(this, args);
}

export function parse(input: string, obj: ITemplateObject, opts: IRazeOptions): ICompiler {
  var parser = new Parser(input, obj, opts);
  var tokens = parser.parse();

  var args: string[] = [];
  if (opts.args.length > 0) {
    args = opts.args.slice(0);
  }
  args.push(opts.local);
  args.push('__obj');
  args.push('__engine');

  return {
    args: args,
    tokens: tokens,
    opts: opts
  };
}

/**
 * compile to function
 */
export function compile(input: string, obj: ITemplateObject, opts: IRazeOptions): RenderFunc {
  var code = parse(input, obj, opts);

  for (var name in obj.blocks) {
    var block = obj.blocks[name];
    obj.blocks[name] = link(block, obj, block.opts);
  }
  for (var name in obj.funcs) {
    var func = obj.funcs[name];
    obj.funcs[name] = link(func, obj, func.opts);
  }

  var list = [obj.appends, obj.prepends];
  for (var i = 0; i < list.length; ++i) {
    var fns = list[i];
    for (var name in fns) {
      var arr = fns[name];
      for (var j = 0; j < arr.length; ++j) {
        arr[j] = link(arr[j], obj, opts);
      }
    }
  }

  var localFn = link(code, obj, opts);

  var fn: RenderFunc = function(data: any): string {
    return localFn(data, obj, engine);
  };

  fn.__renderFn = localFn;
  fn.__template = obj;

  return fn;
}
