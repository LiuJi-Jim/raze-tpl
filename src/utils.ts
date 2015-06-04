module utils {
  export enum TokenType {
    VAR,
    VAR_RAW,
    CODE_BLOCK,
    STRING,
    COMMAND
  }
  
  export interface IToken {
    type: TokenType;
    val: string;
  }
  
  export var escapeChars: string = '@}';

  export function extend(o: any, ...rest: any[]): any {
    for (var i = 0; i < rest.length; ++i) {
      var b = rest[i];
      for (var key in b) {
        o[key] = b[key];
      }
    }
    return o;
  }

  var guid: number = 19880824;

  export function nextGUID(): string {
    return '__' + (guid++).toString(36);
  }
  
  /**
   * getRightIndex respond to fi from input
   *
   * input : input string
   * fi : first index
   */
  export function getRight(input: string, fi: number): number {
    var pair = {
      '{': '}',
      '(': ')',
      '[': ']'
    };

    var left: string = input.charAt(fi); // '{' or '('
    var right: string = pair[left];
    var count: number = 1; // input[fi]
    
    for (var i = fi + 1; i < input.length; ++i) {
      var cur: string = input.charAt(i);

      if (cur === right) {
        count--;
        if (count === 0) {
          return i;
        }
      } else if (cur === left) {
        count++;
      }
    }

    return -1; // not found
  }

  export function parseExpression(expr: string): string {
    var arr: string[] = []; // 管道拆分后的所有分段
    var segment: string = '';

    for (let i = 0, len = expr.length; i < len; ++i) {
      var curr: string = expr.charAt(i);
      var next: string = (i < len - 1) ? expr.charAt(i + 1) : '';
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

    var value: string = arr[0]; // 最左边的值
    var pipes: string[] = arr.slice(1); // 管道段落
    var result: string = pipes.reduce(function(prev, curr) {
      curr = curr.trim();
      var fn: string = curr;
      var open: number = curr.indexOf('(');
      var args: string[] = [];
      if (open > 0) {
        // 有括号，是有参数的形式，如 xxx | replace(/a/ig, 'AAA')
        var close: number = getRight(curr, open);
        fn = curr.substring(0, open).trim();
        // 对args进行一个规范化重新拼接，但似乎并没有什么卵用
        args = curr.substring(open + 1, close).split(',');
      }
      var arg: string = args.length > 0 ? (', ' + args.join(', ')) : '';
      return `filters.${fn}(${prev}${arg})`;
    }, value);

    return result;
  }
  
  /**
   * unescape
   *
   * escape means :
   *   < &lt;
   *   > &gt;
   *   & &amp;
   *
   * 在浏览器中,html()等方法会将特殊字符encode,导致处理之前是@while(a &gt; 10) { }
   * http://www.w3school.com.cn/html/html_entities.asp
   */
  export function unescape(encoded: string): string {
    return encoded
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&');
  }
  
  /**
   * if a string contains "abcd\nabcd",so
   * `$result += "abcd
   *  abcd";`
   *
   * Error in new Function
   *
   * ' => \'
   * " => \"
   * \n => \\n
   */
  export function escapeInNewFunction(str: string): string {
    if (!str) return str;
    return str
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/(\r?\n)/g, "\\n");
  }

  export function escapeLiteralBlock(str: string): string {
    return str.replace(/@#(.+)#@/g, '$1');
  }

  export function parseLiteralBlock(input: string, i: number): number {
    var remain = input.substr(i + 1);
    var closing = '#@';
    var closeIndex = remain.indexOf(closing);

    if (closeIndex > 0) {
      // found #@
      return i + closeIndex + closing.length;
    } else {
      return -1;
    }
  }
  
  /**
   * utils.findMatching respond to fi from input
   *
   * input : input string
   * fi : first index
   */
  export function findMatching(input: string, fi: number): number {
    var pair = {
      '{': '}',
      '(': ')',
      '[': ']'
    };
    var last = '';
    var left = input[fi]; //'{' or '('
    var right = pair[left];
    var count = 1; //input[fi]
    
    for (var i = fi + 1; i < input.length; ++i) {
      var curr = input.charAt(i);
      if (last === '@') {
        if (escapeChars.indexOf(curr) >= 0) {
          // 转义
          last = '';
          continue;
        }
        if (curr === '#') {
          // literal
          var ri = parseLiteralBlock(input, i);
          if (ri >= 0) {
            i = ri;
            last = '';
            continue;
          }
        }
      }
      if (curr === right) {
        count--;
        if (count === 0) {
          return i;
        }
      } else if (curr === left) {
        count++;
      }
      last = curr;
    }
    return -1; // not found
  }

  export function getDate(d = (new Date())) {
    var year = d.getFullYear();
    var mon = d.getMonth() + 1 + '';
    if (mon.length === 1) {
      mon = '0' + mon;
    }
    var day = d.getDate() + '';
    if (day.length === 1) {
      day = '0' + day;
    }

    return `${year}-${mon}-${day}`;
  }
}

export = utils;