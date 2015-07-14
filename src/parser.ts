/// <reference path="./global.d.ts" />

import utils = require('./utils');
import Compiler = require('./compiler');

var KEYWORDS =
  // 关键字
  'break,case,catch,continue,debugger,default,delete,do,else,false'
  + ',finally,for,function,if,in,instanceof,new,null,return,switch,this'
  + ',throw,true,try,typeof,var,void,while,with'

  // 保留字
  + ',abstract,boolean,byte,char,class,const,double,enum,export,extends'
  + ',final,float,goto,implements,import,int,interface,long,native'
  + ',package,private,protected,public,short,static,super,synchronized'
  + ',throws,transient,volatile'

  // ECMA 5 - use strict
  + ',arguments,let,yield'

  + ',undefined';
var REMOVE_RE = /\/\*[\w\W]*?\*\/|\/\/[^\n]*\n|\/\/[^\n]*$|"(?:[^"\\]|\\[\w\W])*"|'(?:[^'\\]|\\[\w\W])*'|\s*\.\s*[$\w\.]+/g;
var SPLIT_RE = /[^\w$]+/g;
var KEYWORDS_RE = new RegExp(["\\b" + KEYWORDS.replace(/,/g, '\\b|\\b') + "\\b"].join('|'), 'g');
var NUMBER_RE = /^\d[^,]*|,\d[^,]*/g;
var BOUNDARY_RE = /^,+|,+$/g;
var SPLIT2_RE = /^$|,+/;
var RE_EMAIL = (/^[a-zA-Z0-9.%]+@[a-zA-Z0-9.\-]+\.(?:ca|co\.uk|com|edu|net|org)\b/);

function getIdentifiers(code: string): string[] {
  if (!code) {
    return [];
  }
  return code
    .replace(REMOVE_RE, '')
    .replace(SPLIT_RE, ',')
    .replace(KEYWORDS_RE, '')
    .replace(NUMBER_RE, '')
    .replace(BOUNDARY_RE, '')
    .split(SPLIT2_RE);
}

/**
 * Parser
 */
class Parser {
  input: string;
  consumed: number = -1;
  tokens: utils.IToken[] = [];
  obj: ITemplateObject;
  opts: IRazeOptions;

  constructor(input: string, obj: ITemplateObject, opts: IRazeOptions) {
    this.input = input.replace(/^\uFEFF/, '').replace(/\r\n|\r/g, '\n'); // normalize
    this.obj = obj;
    this.opts = opts;
  }

  static parse(input: string, obj: ITemplateObject, opts: IRazeOptions): any[] {
    var parser = new Parser(input, obj, opts);
    return parser.parse();
  }

  scanIdentifiers(code: string): void {
    var arr = getIdentifiers(code);
    for (var i = 0; i < arr.length; ++i) {
      var id = arr[i];
      if (id.length > 2 && id.charAt(0) === '_' && id.charAt(1) === '_') {
        continue;
      }
      this.obj.identifiers[id] = true;
    }
  }
  
  /**
   * make a new Token(type,val)
   */
  tok(type: utils.TokenType, val: string): void {
    //console.log('tok', type, val);
    val = utils.escapeLiteralBlock(val);
    this.tokens.push({
      type: type,
      val: val
    });
  }

  parse(): utils.IToken[] {
    for (var index = 0; index < this.input.length; index++) {
      var cur = this.input.charAt(index);
      var next = '';
      var matchEmail = RE_EMAIL.exec(this.input.substring(index));
      if (matchEmail) {
        // email 不完美
        index += matchEmail[0].length;
        continue;
      }

      if (cur == '@') {
        // '@'
        // handle string before handle symbol @xxx
        this.handleString(index);

        // 2. @之后的判断,不允许空白
        next = this.input[index + 1];
        // @@
        if (utils.escapeChars.indexOf(next) >= 0) {
          index = this.handleEscapeSymbol(index);
          continue;
        } else if (next === '*') {
          // @* comment *@
          index = this.handleComment(index);
          continue;
        } else if (next === '#') {
          // @# literal #@
          index = this.handleLiteralBlock(index + 1);
          continue;
        } else {
          var tokenIndex = index + 1;
          //@ if ( name == 'zhangsan' )
          while (next == ' ') {
            tokenIndex++;
            next = this.input[tokenIndex];
          }

          switch (next) {
            case '{': // @{code block}
              index = this.handleCodeBlock(index, tokenIndex);
              continue;
            case '(': // @(var)
              index = this.handleExplicitVariable(index, tokenIndex);
              continue;
            default: // 可能有@if @for @while等
              var remain = this.input.substring(tokenIndex);
              // each - for/while/if/else - 普通 @...{}
              if (/^(foreach|each|objEach)\s*\([\s\S]*\)\s*\{/.test(remain)) {
                // @each/foreach
                index = this.handleEach(index, tokenIndex);
                continue;
              } else if (/^if\s*\([\s\S]*\)\s*\{/.test(remain)) {
                index = this.handleIfElse(index, tokenIndex);
                continue;
              } else if (/^(for|while)\s*\([\s\S]*\)\s*\{/.test(remain)) {
                // @ for/while {}
                index = this.handleControlFlow(index, tokenIndex);
                continue;
              } else if (/^(func|use|block|override|append|prepend|filter)\s*([\w_$]+)?\s*\([\s\S]*\)/.test(remain)) {
                index = this.handleCommand(index, tokenIndex)
                continue;
              }
              break;
          }

          // 防止@each 等 被识别为 implicitVariable, 放在后面
          var match = /^(-)?([\w._[\]]+)/.exec(this.input.substring(index + 1));
          if (match && match[0]) {
            // @locals.name
            index = this.handleImplicitVariable(index, match[0]);
            continue;
          }
        }
      }
    }
    // for退出后,还有一段string
    // handleString取 [handleedIndex+1,atIndex)就是atIndex前面一个
    // (template.length-1)+1 如length=10,0-9,9+1,包括9
    this.handleString(this.input.length);

    return this.tokens;
  }
  
  /*----------------------------------------------------*
   * handleType                                         *
   *                                                    *
   * i -> @                                             *
   * returns the  `index` in Parser#parse should be     *
   * after current handle operation                     *
   *----------------------------------------------------*/
   
  /**
   * normal string
   *
   * i -> @
   */
  handleString(i: number): void {
    var content = this.input.substring(this.consumed + 1, i);
    if (content) {
      this.tok(utils.TokenType.STRING, content);
    }
    this.consumed = i - 1;
  }

  handleComment(i: number): number {
    // @* comment *@
    var remain = this.input.substr(i);
    var star_index = remain.indexOf('*@');

    if (star_index > -1) {
      // *@ exists
      var commentEnd = star_index + 1 + i;
      return this.consumed = commentEnd;
    } else {
      // no *@ found
      // just ignore it , treat @* as normal string
      return i;

      // throw error
      // var before = this.input.substring(0, i + 2); // start...@*
      // var line = before.split('\n').length + 1;
      // var chr = (i + 2) - before.split('\n').reduce(function(sum, line) {
      //   return sum += line.length; // '\r\n'.length = 2
      // }, 0);
      // var msg = utils.format("line : {0},column : {1} no comment-end(*{3}) found",
      //   line, chr, this.symbol);
      // throw new Error(msg);
    }
  }

  handleLiteralBlock(i: number): number {
    var closing_index = utils.parseLiteralBlock(this.input, i);
    if (closing_index >= 0) {
      var literal = this.input.substring(i + 1, closing_index - 1);
      this.tok(utils.TokenType.STRING, literal);
      return this.consumed = closing_index;
    } else {
      throw 'no matching #@ found';
    }
  }

  handleEscapeSymbol(i: number): number {
    // @@ i i+1
    var ch = this.input.charAt(i + 1);
    this.tok(utils.TokenType.STRING, ch);
    return this.consumed = i + 1;
  }
  
  /**
   * @{ ... } code block
   *
   * i -> @
   * fi -> {
   */
  handleCodeBlock(i: number, fi: number): number {
    var sec = utils.findMatching(this.input, fi);
    var content = this.input.substring(fi + 1, sec);
    content = content.trim();

    this.scanIdentifiers(content);

    if (content) {
      this.tok(utils.TokenType.CODE_BLOCK, content);
    }

    return this.consumed = sec;
  }
  
  /**
   * explicit variable @(var)
   *
   * i -> '@'
   * fi -> (
   */
  handleExplicitVariable(i: number, fi: number): number {
    // razor-tmpl not only used for generating html
    // so default not escape html
    // use @(- ) to escape

    var sec = utils.findMatching(this.input, fi); // sec -> )
    var content = this.input.substring(fi + 1, sec);
    var tk = utils.TokenType.VAR;

    if (content) {
      // content = utils.unescape(content); //like @( p.age &gt;= 10)

      // @(- data) escape html entity
      if (content[0] === '-') {
        content = content.substring(1).trim();
        tk = utils.TokenType.VAR_RAW;
        // content += ".replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')";
        // content += ".replace(/'/g,'&#39;')";
        // content += '.replace(/"/g,"&#34;")';
        // content += ".replace(/\\//g,'&#47;')";
      }
      this.scanIdentifiers(content);

      // @(data)
      this.tok(tk, content);
    }
    return this.consumed = sec;
  }
  
  /**
   * @name implicit variable
   *
   * i -> @
   * variable -> name
   */
  handleImplicitVariable(i: number, variable: string): number {
    var tk = utils.TokenType.VAR;
    if (variable[0] === '-') {
      variable = variable.substring(1);
      tk = utils.TokenType.VAR_RAW;
    }
    this.scanIdentifiers(variable);
    this.tok(tk, variable);
    return this.consumed = i + variable.length;
  }
  
  /**
   * @each(item in items) {
   *   <div>@item.name</div>
   * }
   *
   * i -> @
   * fi -> e , each's first letter
   */
  handleEach(i: number, fi: number): number {
    // '(' ')'
    var remain = this.input.substring(i); // @xxxxx
    var fi_small = remain.indexOf('(') + i;
    var sec_small = utils.findMatching(this.input, fi_small);

    var loop_type = this.input.substring(i + 1, fi_small).trim();

    // '{' '}'
    remain = this.input.substring(sec_small);
    var fi_big = remain.indexOf('{') + sec_small;
    var sec_big = utils.findMatching(this.input, fi_big);

    // 1.for(var i in items){ item = items[i];
    var loop = this.input.substring(fi_small + 1, sec_small); //item in items
    var inIndex = loop.indexOf('in');
    var item = loop.substring(0, inIndex).trim()
    var items = loop.substring(inIndex + 2).trim();
    this.scanIdentifiers(items);

    var index, iter;
    if (item.indexOf(':') >= 0) {
      var pair = item.split(':');
      index = pair[0].trim();
      iter = pair[1].trim();
    } else {
      index = utils.nextGUID();
      iter = item;
    }
    var length = utils.nextGUID();

    var loop_head: string;
    if (loop_type === 'objEach') {
      var keys = utils.nextGUID();
      var $i = utils.nextGUID();
      loop_head = `if (__hs.isObject(${items})) for(var ${index} in ${items}){var ${iter}=${items}[${index}];`;
      //loop_head = `if (__hs.isObject(${items})){ var ${keys}=Object.getOwnPropertyNames(${items}); for(var ${$i}=0,${length}=${keys}.length;${$i}<${length};++${$i}){var ${index}=${keys}[${$i}], ${iter}=${items}[${index}];`;
    } else {
      loop_head = `if (__hs.isArray(${items})){ for(var ${index}=0,${length}=${items}.length;${index}<${length};++${index}){var ${iter}=${items}[${index}];`;
    }
    this.tok(utils.TokenType.CODE_BLOCK, loop_head);

    // 2.循环体
    // { <div>@(data)</div> }
    var loop_body = this.input.substring(fi_big + 1, sec_big).trim() + '\n';
    var inner_tokens = Parser.parse(loop_body, this.obj, this.opts);
    this.tokens = this.tokens.concat(inner_tokens);

    // 3.}
    this.tok(utils.TokenType.CODE_BLOCK, '}}');

    return this.consumed = sec_big;
  }
  
  /**
   * @if(condition){ ... }
   *
   * i -> @
   * fi -> if's first letter `i`
   */
  handleIfElse(i: number, fi: number): number {
    // lastRightIndex : 上一个block 结尾的右大括号 index
    // if(){ } <- lastRightIndex
    var lastRightIndex: number;
    var remain: string;

    do {
      lastRightIndex = this.handleControlFlow(i, fi);
      // see whether `else [if]` exists
      remain = this.input.substring(lastRightIndex + 1);
      // decide else's e index
      fi = remain.indexOf('else') + lastRightIndex + 1;
    } while (/^\s*else/.test(remain));

    return this.consumed = lastRightIndex;
  }
  
  /**
   * handle @for/while control flow
   *
   * _ -> @ , not important
   * fi -> [for,while]'s first letter
   */
  handleControlFlow(_: any, fi: number): number {
    var remain = this.input.substring(fi);
    var fi_big = remain.indexOf('{') + fi;
    var sec_big = utils.findMatching(this.input, fi_big);

    var part1 = this.input.substring(fi, fi_big + 1); // for(xxx){
    var part2 = this.input.substring(fi_big + 1, sec_big); // <div>@(data)</div>
    var part3 = '}'; // }

    this.scanIdentifiers(part1);
    // 1.part1
    this.tok(utils.TokenType.CODE_BLOCK, part1);

    // 2.part2
    part2 = part2.trim(); // + '\n';
    var inner_tokens = Parser.parse(part2, this.obj, this.opts);
    this.tokens = this.tokens.concat(inner_tokens);

    // 3.part3
    this.tok(utils.TokenType.CODE_BLOCK, part3);

    return this.consumed = sec_big;
  }

  handleCommand(i: number, fi: number): number {
    // '(' ')'
    var remain = this.input.substring(i); // @xxxxx
    var fi_small = remain.indexOf('(') + i;
    var sec_small = utils.findMatching(this.input, fi_small);

    var part1 = this.input.substring(i + 1, fi_small).trim().split(' ');
    var command = part1[0].trim();
    var name = (part1[1] || '').trim();

    // 1.@COMMAND (args) {
    var args = this.input.substring(fi_small + 1, sec_small).trim();
    var body: string;
    var end = sec_small;

    if ('block override append prepend func filter'.indexOf(command) >= 0) {
      // '{' '}'
      remain = this.input.substring(sec_small);
      var fi_big = remain.indexOf('{') + sec_small;
      var sec_big = utils.findMatching(this.input, fi_big);

      // 2.body
      // { <div>@(data)</div> }
      body = this.input.substring(fi_big + 1, sec_big).trim() + '\n';

      end = sec_big;
    }

    this[command](args, body, name);

    return this.consumed = end;
  }

  func(args, body, name) {
    this.scanIdentifiers(args);
    var obj = this.obj;
    var opts = utils.extend({}, this.opts);
    opts.local = utils.nextGUID();
    args = args.trim();
    if (args !== '') {
      args = args.split(',');
      for (var i = 0; i < args.length; ++i) {
        args[i] = args[i].trim();
      }
      opts.args = args;
    }
    var fn = Compiler.parse(body, obj, opts);
    obj.funcs[name] = fn;
  }

  use(args, _, name) {
    this.scanIdentifiers(args);
    args = args.trim();
    var arr = [];
    if (args) {
      arr.push(args);
    }
    arr.push(this.opts.local);
    arr.push('__obj');
    arr.push('__engine');

    var arg = arr.join(',');
    this.tok(
      utils.TokenType.COMMAND,
      `__obj.funcs["${name}"](${arg})`
      );
  }

  block(name, body) {
    var obj = this.obj;
    var opts = this.opts;
    var fn = Compiler.parse(body, obj, opts);
    obj.blocks[name] = fn;
    this.tok(
      utils.TokenType.COMMAND,
      `__obj.renderBlock("${name}", ${opts.local})`
      );
  }

  override(name, body) {
    var obj = this.obj;
    var opts = this.opts;
    var fn = Compiler.parse(body, obj, opts);
    obj.blocks[name] = fn;
  }

  append(name, body) {
    var obj = this.obj;
    var opts = this.opts;
    var appends = obj.appends[name] || (obj.appends[name] = []);
    var fn = Compiler.parse(body, obj, opts);
    appends.push(fn);
  }

  prepend(name, body) {
    var obj = this.obj;
    var opts = this.opts;
    var prepends = obj.prepends[name] || (obj.prepends[name] = []);
    var fn = Compiler.parse(body, obj, opts);
    prepends.push(fn);
  }

  filter(args, body, name) {
    var obj = this.obj;
    var opts = this.opts;
    var id = '__filter_' + utils.nextGUID();
    var fn = Compiler.parse(body, obj, opts);
    obj.blocks[id] = fn;
    args = args.trim();
    var arg = (args ? ',' + args : '');
    this.tok(
      utils.TokenType.COMMAND,
      `__fs["${name}"](__obj.renderBlock("${id}", ${opts.local})${arg})`
      );
  }
}

export = Parser;