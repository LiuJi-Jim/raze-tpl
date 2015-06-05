module filters {
  var RE_HTML_ENTITIES = /[&<>"']/g;
  function htmlFilterReplacer($0) {
    // 展开switch-case后这个函数比之前的dict mapping平均快5%
    // 而这个函数在总时间profiling里面占的比例还挺大的
    switch ($0) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
    }
    return '';
  };

  export function html(input: any): string {
    return String(input).replace(RE_HTML_ENTITIES, htmlFilterReplacer);
  }

  export function raw(input: any): string {
    return String(input);
  }
  
  export function replace(str: any, reg: RegExp, rep): string {
    return String(str).replace(reg, rep);
  }
}

export = filters;