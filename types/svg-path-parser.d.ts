declare module 'svg-path-parser' {
  export function parseSVG(path: string): any[];
  export function makeAbsolute(commands: any[]): any[];
} 