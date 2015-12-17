/// <reference path="../typings/tsd.d.ts"/>


interface IRenderFunc {
  (data: any): string;
  __renderFn?: Function;
  addFilter?(name: string, fn: Function);
}

interface ITemplateObject {
  source: string;
  layout?: ITemplateObject;
  derived?: ITemplateObject;
  funcs?: any;
  blocks?: any;
  appends?: any;
  prepends?: any;
  identifiers: any;
  code?: any;
  render?: IRenderFunc;
  opts: IRazeOptions;
  import(name: string, data: any);
  extend(name: string);
  fragment(input: string, opts: IRazeOptions): ITemplateObject;
}

interface IRazeOptions {
  local?: string;
  strip: boolean;
  safe: boolean;
  template?: string;
  filename?: string;
  basedir?: string;
  extname?: string;
  plainObjEach?: boolean;
  args?: string[];
}
