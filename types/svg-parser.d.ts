declare module 'svg-parser' {
  export function parse(svg: string): {
    children: Array<{
      tagName: string;
      properties: Record<string, any>;
      children: any[];
      value?: string;
    }>;
  };
} 