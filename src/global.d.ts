interface RenderFunc {
  (data: any): string;
  __renderFn?: Function;
  addFilter?(name: string, fn: Function);
}

interface ITemplateObject {
  blocks: any;
  appends: any;
  prepends: any;
  funcs: any;
  identifiers: any;
}

interface IRazeOptions {
  local?: string;
  safe: boolean;

  args?: string[];
}
