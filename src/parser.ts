import utils = require('./utils');

let KEYWORDS =
  // 关键字
  'break,case,catch,continue,debugger,default,delete,do,else,false'
  + ',finally,for,function,if,in,instanceof,new,null,return,switch,this'
  + ',throw,true,try,typeof,var,void,while,with'

  // 保留字
  + ',abstract,boolean,byte,char,class,const,double,enum,export,extends'
  + ',final,float,goto,implements,import,int,interface,long,native'
  + ',package,private,protected,public,short,static,super,synchronized'
  + ',throws,transient,volatile'

  // 内置对象
  + ',Object,Date,Math,String,Number,Array,Boolean,Function,RegExp,JSON,Promise'
  + ',NaN,Infinity,console'

  // 内置函数
  + ',eval,parseInt,parseFloat,isNaN,isFinite,decodeURI,decodeURIComponent'
  + ',encodeURI,encodeURIComponent,'

  // ECMA 5 - use strict
  + ',arguments,let,yield'

  // ES 2015
  + ',Map,Set,WeakMap,WeakSet,Symbol'

  + ',undefined';

let REMOVE_RE = /\/\*[\w\W]*?\*\/|\/\/[^\n]*\n|\/\/[^\n]*$|"(?:[^"\\]|\\[\w\W])*"|'(?:[^'\\]|\\[\w\W])*'|\s*\.\s*[$\w\.]+/g;
let SPLIT_RE = /[^\w$]+/g;
let KEYWORDS_RE = new RegExp(["\\b" + KEYWORDS.replace(/,/g, '\\b|\\b') + "\\b"].join('|'), 'g');
let NUMBER_RE = /^\d[^,]*|,\d[^,]*/g;
let BOUNDARY_RE = /^,+|,+$/g;
let SPLIT2_RE = /^$|,+/;
let RE_EMAIL = (/^[a-zA-Z0-9.%]+@[a-zA-Z0-9.\-]+\.(?:ca|co\.uk|com|edu|net|org)\b/);

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


function parseArgs(args: string): string[] {
  args = args.trim();
  let result: string[] = [];
  if (args !== '') {
    result = args.split(',');
    for (let i = 0; i < result.length; ++i) {
      result[i] = result[i].trim();
    }
  } else {
    result = [];
  }
  return result;
}

/**
 * Parser
 */
class Parser {
  input: string;
  consumed: number = -1;
  tokens: utils.IToken[] = [];
  tpl: ITemplateObject;
  opts: IRazeOptions;

  constructor(input: string, tpl: ITemplateObject, opts: IRazeOptions) {
    this.input = input.replace(/^\uFEFF/, '').replace(/\r\n|\r/g, '\n'); // normalize
    this.tpl = tpl;
    this.opts = opts;
  }

  static parse(input: string, obj: ITemplateObject, opts: IRazeOptions): any[] {
    let parser = new Parser(input, obj, opts);
    return parser.parse();
  }

  scanIdentifiers(code: string): void {
    let arr = getIdentifiers(code);
    for (let i = 0; i < arr.length; ++i) {
      let id = arr[i];
      if (id.length > 2 && id.charAt(0) === '_' && id.charAt(1) === '_') {
        continue;
      }
      this.tpl.identifiers[id] = true;
    }
  }

  parseFragment(body: string, opts: IRazeOptions): ITemplateObject {
    // let fn = Compiler.parse(body, this.obj, opts, true);
    // let code = Compiler.codegen(fn.tokens, fn.args, {}, fn.opts, true);
    // let fnstr = Compiler.wrap(name, fn.args, code);
    let fragment = this.tpl.fragment(body, opts);
    return fragment;
  }

  /**
   * make a new Token(type,val)
   */
  tok(type: utils.TokenType, val: string): void {
    // console.log('tok', type, val);
    val = utils.escapeLiteralBlock(val);
    this.tokens.push({
      type: type,
      val: val
    });
  }

  parse(): utils.IToken[] {
    for (let index = 0; index < this.input.length; index++) {
      let cur = this.input.charAt(index);
      let next = '';
      let matchEmail = RE_EMAIL.exec(this.input.substring(index));
      if (matchEmail) {
        // email 不完美
        index += matchEmail[0].length;
        continue;
      }
      if (cur === '\n' && this.opts.strip) {
        this.handleString(index);
      }
      if (cur === '@') {
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
          let tokenIndex = index + 1;
          // @ if ( name == 'zhangsan' )
          while (next === ' ') {
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
              let remain = this.input.substring(tokenIndex);
              // each - for/while/if/else - 普通 @...{}
              if (/^(foreach|each)\s*\([\s\S]*\)\s*\{/.test(remain)) {
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
              } else if (/^(extend|func|use|block|override|append|prepend|filter|import)\s*([\w_$]+)?\s*\([\s\S]*\)/.test(remain)) {
                index = this.handleCommand(index, tokenIndex);
                continue;
              }
              break;
          }

          // 防止@each 等 被识别为 implicitVariable, 放在后面
          let match = /^(-)?([\w._[\]]+)/.exec(this.input.substring(index + 1));
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
   * leading_index -> @                                             *
   * returns the  `index` in Parser#parse should be     *
   * after current handle operation                     *
   *----------------------------------------------------*/

  /**
   * normal string
   * leading_index -> @
   */
  handleString(leading_index: number): number {
    let content = this.input.substring(this.consumed + 1, leading_index);
    if (this.opts.strip) {
      content = content.replace(/^\n[\x20\t\r\n]*/, '');
    }
    if (content) {
      this.tok(utils.TokenType.STRING, content);
    }
    this.consumed = leading_index - 1;
    return this.consumed;
  }

  /**
   * comment
   * leading_index -> @
   */
  handleComment(leading_index: number): number {
    // @* comment *@
    let remain = this.input.substr(leading_index);
    let star_index = remain.indexOf('*@');

    if (star_index > -1) {
      // *@ exists
      let commentEnd = star_index + 1 + leading_index;
      return this.consumed = commentEnd;
    } else {
      // no *@ found
      // just ignore it , treat @* as normal string
      return leading_index;

      // throw error
      // let before = this.input.substring(0, i + 2); // start...@*
      // let line = before.split('\n').length + 1;
      // let chr = (i + 2) - before.split('\n').reduce(function(sum, line) {
      //   return sum += line.length; // '\r\n'.length = 2
      // }, 0);
      // let msg = utils.format("line : {0},column : {1} no comment-end(*{3}) found",
      //   line, chr, this.symbol);
      // throw new Error(msg);
    }
  }

  /**
   * literal
   * leading_index -> @
   */
  handleLiteralBlock(leading_index: number): number {
    let closing_index = utils.parseLiteralBlock(this.input, leading_index);
    if (closing_index >= 0) {
      let literal = this.input.substring(leading_index + 1, closing_index - 1);
      this.tok(utils.TokenType.STRING, literal);
      return this.consumed = closing_index;
    } else {
      throw 'no matching #@ found';
    }
  }

  /**
   * escape chars
   * leading_index -> @
   */
  handleEscapeSymbol(leading_index: number): number {
    // @@ i i+1
    let ch = this.input.charAt(leading_index + 1);
    this.tok(utils.TokenType.STRING, ch);
    return this.consumed = leading_index + 1;
  }

  /**
   * @{ ... } code block
   * leading_index -> @
   * start_brace -> {
   */
  handleCodeBlock(leading_index: number, start_brace: number): number {
    let end_brace = utils.findMatching(this.input, start_brace);
    let content = this.input.substring(start_brace + 1, end_brace);
    content = content.trim();

    this.scanIdentifiers(content);

    if (content) {
      this.tok(utils.TokenType.CODE_BLOCK, content);
    }

    return this.consumed = end_brace;
  }

  /**
   * explicit variable @(var)
   * leading_index -> '@'
   * start_parenthesis -> (
   */
  handleExplicitVariable(leading_index: number, start_parenthesis: number): number {
    // razor-tmpl not only used for generating html
    // so default not escape html
    // use @(- ) to escape

    let end_parenthesis = utils.findMatching(this.input, start_parenthesis); // sec -> )
    let content = this.input.substring(start_parenthesis + 1, end_parenthesis);
    let tk = utils.TokenType.VAR;

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
    return this.consumed = end_parenthesis;
  }

  /**
   * @name implicit variable
   * leading_index -> @
   * variable -> name
   */
  handleImplicitVariable(leading_index: number, variable: string): number {
    let tk = utils.TokenType.VAR;
    if (variable[0] === '-') {
      variable = variable.substring(1);
      tk = utils.TokenType.VAR_RAW;
    }
    this.scanIdentifiers(variable);
    this.tok(tk, variable);
    return this.consumed = leading_index + variable.length;
  }

  arrayEach(index_varname, iter_varname, items_varname, inner_tokens) {
    var loop_head: string[] = [];
    var loop_foot: string[] = ['}'];
    var length_varname = utils.nextGUID();

    loop_head.push(`if(__hs.isArray(${items_varname})){`);
    loop_head.push(`for(var ${index_varname}=0,${length_varname}=${items_varname}.length;${index_varname}<${length_varname};++${index_varname}){`);
    loop_head.push(`var ${iter_varname}=${items_varname}[${index_varname}];`);
    loop_foot.push('}');

    this.tok(utils.TokenType.CODE_BLOCK, loop_head.join('\n'));
    this.tokens = this.tokens.concat(inner_tokens);
    this.tok(utils.TokenType.CODE_BLOCK, loop_foot.join('\n'));
  }

  objEach(index_varname, iter_varname, items_varname, inner_tokens) {
    var loop_head: string[] = [];
    var loop_foot: string[] = ['}'];
    loop_head.push(`if(__hs.isObject(${items_varname})){`);
    if (this.opts.plainObjEach) {
      let keys_array_varname = utils.nextGUID();
      let keys_index_varname = utils.nextGUID();
      let keys_length_varname = utils.nextGUID();
      loop_head.push(`var ${keys_array_varname}=Object.keys(${items_varname});`);
      loop_head.push(`for(var ${keys_index_varname}=0,${keys_length_varname}=${keys_array_varname}.length;${keys_index_varname}<${keys_length_varname};++${keys_index_varname}){`);
      loop_head.push(`var ${index_varname}=${keys_array_varname}[${keys_index_varname}];`);
      loop_head.push(`var ${iter_varname}=${items_varname}[${index_varname}];`);
    } else {
      loop_head.push(`for(var ${index_varname} in ${items_varname}){`);
      loop_head.push(`var ${iter_varname}=${items_varname}[${index_varname}];`);
    }
    loop_foot.push('}');

    this.tok(utils.TokenType.CODE_BLOCK, loop_head.join('\n'));
    this.tokens = this.tokens.concat(inner_tokens);
    this.tok(utils.TokenType.CODE_BLOCK, loop_foot.join('\n'));
  }

  /**
   * @each(item in items) {
   *   <div>@item.name</div>
   * }
   * leading_index -> @
   * each_index -> e , each's first letter
   */
  handleEach(leading_index: number, each_index: number): number {
    // '(' ')'
    let remain = this.input.substring(leading_index); // @xxxxx
    let start_parenthesis = remain.indexOf('(') + leading_index;
    let end_parenthesis = utils.findMatching(this.input, start_parenthesis);

    // '{' '}'
    remain = this.input.substring(end_parenthesis);
    let start_brace = remain.indexOf('{') + end_parenthesis;
    let end_brace = utils.findMatching(this.input, start_brace);

    // 1.for(var i in items){ item = items[i];
    let loop = this.input.substring(start_parenthesis + 1, end_parenthesis); // item in items
    let inSplit = ' in ';
    let inIndex = loop.indexOf(inSplit);
    let item = loop.substring(0, inIndex).trim();
    let items_varname = loop.substring(inIndex + inSplit.length).trim();
    this.scanIdentifiers(items_varname);

    let index_varname, iter_varname;
    if (item.indexOf(':') >= 0) {
      let pair = item.split(':');
      index_varname = pair[0].trim();
      iter_varname = pair[1].trim();
    } else {
      index_varname = utils.nextGUID();
      iter_varname = item;
    }

    let loop_body = this.input.substring(start_brace + 1, end_brace).trim() + '\n';
    let inner_tokens = Parser.parse(loop_body, this.tpl, this.opts);

    this.objEach(index_varname, iter_varname, items_varname, inner_tokens);
    this.arrayEach(index_varname, iter_varname, items_varname, inner_tokens);

    return this.consumed = end_brace;
  }

  /**
   * @if(condition){ ... }
   * leading_index -> @
   * if_index -> if's first letter `i`
   */
  handleIfElse(leading_index: number, if_index: number): number {
    // lastRightIndex : 上一个block 结尾的右大括号 index
    // if(){ } <- lastRightIndex
    let lastRightIndex: number;
    let remain: string;

    do {
      lastRightIndex = this.handleControlFlow(leading_index, if_index);
      // see whether `else [if]` exists
      remain = this.input.substring(lastRightIndex + 1);
      // decide else's e index
      if_index = remain.indexOf('else') + lastRightIndex + 1;
    } while (/^\s*else/.test(remain));

    return this.consumed = lastRightIndex;
  }

  /**
   * handle @for/while control flow
   * _ -> @ , not important
   * loop_index -> [for,while]'s first letter
   */
  handleControlFlow(_: any, loop_index: number): number {
    let remain = this.input.substring(loop_index);
    let start_brace = remain.indexOf('{') + loop_index;
    let end_brace = utils.findMatching(this.input, start_brace);

    let part1 = this.input.substring(loop_index, start_brace + 1); // for(xxx){
    let part2 = this.input.substring(start_brace + 1, end_brace); // <div>@(data)</div>
    let part3 = '}'; // }

    this.scanIdentifiers(part1);
    // 1.part1
    this.tok(utils.TokenType.CODE_BLOCK, part1);

    // 2.part2
    // part2 = part2.trim(); // + '\n';
    let inner_tokens = Parser.parse(part2, this.tpl, this.opts);
    this.tokens = this.tokens.concat(inner_tokens);

    // 3.part3
    this.tok(utils.TokenType.CODE_BLOCK, part3);

    return this.consumed = end_brace;
  }

  /**
   * @xxxxx (other commands)
   * leading_index -> @
   * cmd_index -> xxxxx's first letter
   */
  handleCommand(leading_index: number, cmd_index: number): number {
    // '(' ')'
    let remain = this.input.substring(leading_index); // @xxxxx
    let start_parenthesis = remain.indexOf('(') + leading_index;
    let end_parenthesis = utils.findMatching(this.input, start_parenthesis);

    let part1 = this.input.substring(leading_index + 1, start_parenthesis).trim().split(' ');
    let command = part1[0].trim();
    let name = (part1[1] || '').trim();

    // 1.@COMMAND (args) {
    let args = this.input.substring(start_parenthesis + 1, end_parenthesis).trim();
    let body: string;
    let end = end_parenthesis;

    if ('block override append prepend func filter'.indexOf(command) >= 0) {
      // '{' '}'
      remain = this.input.substring(end_parenthesis);
      let fi_big = remain.indexOf('{') + end_parenthesis;
      let sec_big = utils.findMatching(this.input, fi_big);

      // 2.body
      // { <div>@(data)</div> }
      body = this.input.substring(fi_big + 1, sec_big).trim() + '\n';

      end = sec_big;
    }

    this[command](args, body, name);

    return this.consumed = end;
  }

  /**
   * @import(filename[, args = {}])
   */
  import(args) {
    debugger;
    let comma = args.indexOf(',');
    let name;
    if (comma > 0) {
      name = args.substr(0, comma).trim();
      args = args.substr(comma + 1).trim();
    } else {
      name = args.trim();
      args = '{}';
    }
    this.scanIdentifiers(name);
    this.scanIdentifiers(args);
    // console.log('dynamicImport', name, args);
    let cmd = `__obj.import(${name}, __hs.extend({},${this.opts.local},${args}))`;

    // console.log(cmd)
    this.tok(utils.TokenType.COMMAND, cmd);
  }

  /**
   * @extend(filename)
   */
  extend(filename) {
    this.tpl.extend(filename);
  }

  /**
   * @func name(args) {
   *   body
   * }
   */
  func(args, body, name) {
    let opts = utils.extend({}, this.opts);
    opts.args = parseArgs(args);

    name = `__fn_${name}`;
    let frag = this.parseFragment(body, opts);

    this.tpl.funcs[name] = frag;
  }

  /**
   * @use name(args)
   */
  use(args, _, name) {
    this.scanIdentifiers(args);
    args = parseArgs(args);
    name = `__fn_${name}`;
    let arg = args.join(',');
    this.tok(
      utils.TokenType.COMMAND,
      `${name}(${arg})`
    );
  }

  /**
   * @block (name) {
   *   body
   * }
   */
  block(name, body) {
    let opts = utils.extend({}, this.opts);
    opts.args = [];
    name = `__block_${name}`;
    let frag = this.parseFragment(body, opts);
    // this.tok(
    //   utils.TokenType.COMMAND,
    //   `${name}()`
    // );
    this.tok(
      utils.TokenType.BLOCK,
      name
    );
    this.tpl.blocks[name] = frag;
  }

  /**
   * @override (name) {
   *   body
   * }
   */
  override(name, body) {
    let opts = utils.extend({}, this.opts);
    opts.args = [];
    name = `__block_${name}`;
    let fnstr = this.parseFragment(body, opts);
    this.tpl.blocks[name] = fnstr;
  }

  /**
   * @append (name) {
   *   body
   * }
   */
  append(name, body) {
    var tpl = this.tpl;
    let opts = utils.extend({}, this.opts);
    opts.args = [];
    name = `__block_${name}`;
    let appends = tpl.appends[name] || (tpl.appends[name] = []);
    let frag = this.parseFragment(body, opts);
    appends.push(frag);
  }

  /**
   * @prepend (name) {
   *   body
   * }
   */
  prepend(name, body) {
    var tpl = this.tpl;
    let opts = utils.extend({}, this.opts);
    opts.args = [];
    name = `__block_${name}`;
    let prepends = tpl.prepends[name] || (tpl.prepends[name] = []);
    let frag = this.parseFragment(body, opts);
    prepends.push(frag);
  }

  /**
   * @filter name(args) {
   *   body
   * }
   */
  filter(args, body, name) {
    this.scanIdentifiers(args);
    let opts = utils.extend({}, this.opts);
    opts.args = [];

    let id = '__filter_' + utils.nextGUID();
    let frag = this.parseFragment(body, opts);
    this.tpl.blocks[id] = frag;

    args = parseArgs(args);
    var argstr = args.length > 0 ? `,${args.join(',')}` : '';
    this.tok(
      utils.TokenType.COMMAND,
      `__fs["${name}"](${id}()${argstr})`
    );
  }
}

export = Parser;
