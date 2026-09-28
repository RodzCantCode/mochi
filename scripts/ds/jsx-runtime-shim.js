// Sustituto de react/jsx-runtime para el bundle del sistema de diseño: las vistas previas cargan
// React 18 como script clásico (window.React), que no trae el runtime de JSX.
const R = window.React;
export const Fragment = R.Fragment;
function make(type, props, key, isStatic) {
  const { children, ...rest } = props || {};
  if (key !== undefined) rest.key = key;
  if (children === undefined) return R.createElement(type, rest);
  return isStatic && Array.isArray(children) ? R.createElement(type, rest, ...children) : R.createElement(type, rest, children);
}
export const jsx = (type, props, key) => make(type, props, key, false);
export const jsxs = (type, props, key) => make(type, props, key, true);
export const jsxDEV = jsx;
