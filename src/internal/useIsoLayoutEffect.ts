import { useEffect, useLayoutEffect } from "react";

// useLayoutEffect en el navegador (sin parpadeo) y useEffect en el servidor (sin avisos de SSR)
export const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
