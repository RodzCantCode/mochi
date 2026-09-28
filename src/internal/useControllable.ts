import { useCallback, useRef, useState } from "react";

/** Valor que puede venir controlado desde fuera (`value`) o gestionarse dentro (`defaultValue`). */
export function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (v: T) => void): [T, (v: T) => void] {
  const [inner, setInner] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : inner;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const set = useCallback(
    (v: T) => {
      if (!controlled) setInner(v);
      onChangeRef.current?.(v);
    },
    [controlled],
  );
  return [current, set];
}
