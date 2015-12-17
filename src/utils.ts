export enum TokenType {
  VAR,
  VAR_RAW,
  CODE_BLOCK,
  STRING,
  COMMAND,
  BLOCK
}

export interface IToken {
  type: TokenType;
  val: string;
}

export var escapeChars: string[] = '@}'.split('');

export function extend(o: any, ...rest: any[]): any {
  for (let i = 0; i < rest.length; ++i) {
    let b = rest[i];
    for (let key in b) {
      o[key] = b[key];
    }
  }
  return o;
}

let guid: number = 19880824;

export function nextGUID(): string {
  return '__' + (guid++).toString(36);
}

/**
 * getRightIndex respond to first_index from input
 *
 * input : input string
 * first_index : first_index
 */
export function getRight(input: string, first_index: number): number {
  let pair = {
    '{': '}',
    '(': ')',
    '[': ']'
  };

  let left: string = input.charAt(first_index); // '{' or '('
  let right: string = pair[left];
  let count: number = 1; // input[fi]

  for (let i = first_index + 1; i < input.length; ++i) {
    let cur: string = input.charAt(i);

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
  let arr: string[] = [];
  let segment: string = '';
  let or: boolean = false;

  for (let i = 0, len = expr.length; i < len; ++i) {
    let curr: string = expr.charAt(i);
    let next: string = (i < len - 1) ? expr.charAt(i + 1) : '';
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

  let value: string = arr[0];
  let pipes: string[] = arr.slice(1);
  let result: string = pipes.reduce(function(prev, curr) {
    curr = curr.trim();
    let fn: string = curr;
    let open: number = curr.indexOf('(');
    let args: string[] = [];
    if (open > 0) {
      let close: number = getRight(curr, open);
      fn = curr.substring(0, open).trim();
      args = curr.substring(open + 1, close).split(',');
    }
    let arg: string = args.length > 0 ? (', ' + args.join(', ')) : '';
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

export function parseLiteralBlock(input: string, first_index: number): number {
  var remain = input.substr(first_index + 1);
  var closing = '#@';
  var closeIndex = remain.indexOf(closing);

  if (closeIndex > 0) {
    // found #@
    return first_index + closeIndex + closing.length;
  } else {
    return -1;
  }
}

/**
 * utils.findMatching respond to first_index from input
 *
 * input : input string
 * first_index : first index
 */
export function findMatching(input: string, first_index: number): number {
  var pair = {
    '{': '}',
    '(': ')',
    '[': ']'
  };
  var last = '';
  var left = input[first_index]; // '{' or '('
  var right = pair[left];
  var count = 1; // input[fi]

  for (var i = first_index + 1; i < input.length; ++i) {
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
