module filters {
  var RE_HTML_ENTITIES = /[&<>"']/g;
  var HTML_ENTITIES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  function htmlFilterReplacer(c) {
    return HTML_ENTITIES[c];
  }

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