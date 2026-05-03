declare module 'unidiff' {
  export function diffLines(a: string | string[], b: string | string[], cb?: (line: string) => void): Array<{
    value: string;
    added?: boolean;
    removed?: boolean;
    count?: number;
  }>;

  export function formatLines(changes: Array<{
    value: string;
    added?: boolean;
    removed?: boolean;
    count?: number;
  }>, opt?: {
    aname?: string;
    bname?: string;
    context?: number;
    pre_context?: number;
    post_context?: number;
  }): string;

  export function diffAsText(a: string | string[], b: string | string[], opt?: any): string;

  export function assertEqual(actual: any, expected: any, okFn: (expr: boolean, msg?: string) => void, label?: string, logFn?: (msg: string) => void): void;
}