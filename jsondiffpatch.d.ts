/**
 * jsondiffpatch の型定義
 */
declare module 'jsondiffpatch' {
  interface DiffPatcherOptions {
    arrays?: {
      detectMove?: boolean;
      includeValueOnMove?: boolean;
    };
    textDiff?: {
      minLength?: number;
    };
    objectHash?: (obj: any) => string;
    propertyFilter?: (name: string, context: any) => boolean;
    cloneDiffValues?: boolean;
  }

  interface DiffPatcher {
    diff(left: any, right: any): any;
    patch(left: any, delta: any): any;
    unpatch(right: any, delta: any): any;
    reverse(delta: any): any;
  }

  interface JsonDiffPatch {
    create(options?: DiffPatcherOptions): DiffPatcher;
    diff(left: any, right: any): any;
    patch(left: any, delta: any): any;
    unpatch(right: any, delta: any): any;
    reverse(delta: any): any;
  }

  const jsondiffpatch: JsonDiffPatch;
  export = jsondiffpatch;
}
