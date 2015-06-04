module helpers {
  export function isArray(o: any): boolean {
    return (o instanceof Array);
  }

  export function isObject(o: any): boolean {
    return (typeof o === 'object');
  }
}

export = helpers;