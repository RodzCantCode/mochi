# Skeleton y SkeletonSwap

Huecos con la forma de lo que va a llegar y un brillo suave que los recorre. `SkeletonSwap` cambia el esqueleto por el contenido real.

## Cuándo usarlo

Mientras carga el contenido de una zona cuya forma ya conoces (una ficha, una lista, una tarjeta): así la página no salta al llegar. Para una acción que tarda, usa el estado `loading` de `Button`; para algo cuyo avance se puede medir, `Progress`.

## Qué pones tú

- `Skeleton`: `shape` (`"line"` por defecto, `"circle"` o `"block"`), `width` y `height` (en px o en CSS), `size` (el diámetro del círculo, 40 px por defecto) y `lines` para varias líneas seguidas.
- `SkeletonSwap`: `loading`, `skeleton` (las formas con la disposición del contenido) y el contenido como hijo; `loadingLabel` es lo que oye un lector de pantalla mientras carga («Loading»).

## Reglas

- Las formas van en `on-canvas` al 8 %, así valen sobre el lienzo y sobre una superficie. Línea: una píldora del 75 % del alto de la letra que la rodea, con el hueco de su interlineado; la última de `lines` es más corta. Círculo: redondo. Bloque: `radius-md`, 120 px de alto por defecto.
- El brillo es una banda en el tono de `surface` que recorre la pantalla de izquierda a derecha: pasa por todas las formas a la vez, como una sola luz. Con «reducir movimiento» se detiene.
- Al llegar el contenido, el esqueleto sale con `fadeOut` y el contenido entra 60 ms después con `fadeIn` y desenfoque; la altura pasa de la del esqueleto a la del contenido con `morph`.
- Imita la disposición real (avatar, dos líneas, un bloque), no un bloque genérico: el cambio casi no debe moverse.
- Mientras carga, el contenedor lleva `aria-busy="true"` y un texto oculto «Loading»; las formas se ocultan a los lectores de pantalla.
