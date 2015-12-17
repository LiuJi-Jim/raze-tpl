let RE_HTML_ENTITIES = /[&<>"']/g;

function htmlFilterReplacer($0) {
  // 展开switch-case后这个函数比之前的dict mapping平均快5%
  // 而这个函数在总时间profiling里面占的比例还挺大的
  switch ($0) {
    case '&': return '&amp;';
    case '<': return '&lt;';
    case '>': return '&gt;';
    case '"': return '&quot;';
    case "'": return '&#39;';
    default: return '';
  }
};

export function html(input: any): string {
  return String(input).replace(RE_HTML_ENTITIES, htmlFilterReplacer);
}

export function raw(input: any): string {
  return String(input);
}

export function json(input: any): string {
  return JSON.stringify(input, undefined, '  ');
}

export function secret(str: any): string {
  str = String(str);
  let split = str.split('@');
  let $1 = '';
  let $2 = '';
  if (split.length > 1) {
    $2 = split[1];
  }
  let name = $1.substr(0, $1.length / 2);
  for (let i = name.length; i < $1.length; ++i) {
    name += '*';
  }
  let domain = $2.substr($2.length / 2);
  for (let i = domain.length; i < $2.length; ++i) {
    domain = '*' + domain;
  }
  return `${name}@${domain}`;
}
