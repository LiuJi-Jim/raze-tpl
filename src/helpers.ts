import utils = require('./utils');

export function isArray(o: any): boolean {
  return Array.isArray(o);
}

export function isObject(o: any): boolean {
  return Object.prototype.toString.call(o) === '[object Object]';
}

export var extend = utils.extend;
