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

  export function json(input: any): string {
    return JSON.stringify(input, null, '  ');
  }

  export function secret(str: any): string {
    str = String(str);
    var split = str.split('@');
    var $1 = '';
    var $2 = '';
    if (split.length > 1) {
      $2 = split[1];
    }
    var name = $1.substr(0, $1.length / 2);
    for (var i = name.length; i < $1.length; ++i) {
      name += '*';
    }
    var domain = $2.substr($2.length / 2);
    for (var i = domain.length; i < $2.length; ++i) {
      domain = '*' + domain;
    }
    return `${name}@${domain}`;
  }
  
  export function replace(str: any, reg: RegExp, rep): string {
    return String(str).replace(reg, rep);
  }
}

export = filters;