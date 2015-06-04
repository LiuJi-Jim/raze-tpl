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
}

export = utils;