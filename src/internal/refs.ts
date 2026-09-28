import type { Ref, RefCallback } from "react";

/** Une varias refs (de objeto o de función) en una sola. */
export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  return value => {
    for (const r of refs) {
      if (typeof r === "function") r(value);
      else if (r) (r as { current: T | null }).current = value;
    }
  };
}
