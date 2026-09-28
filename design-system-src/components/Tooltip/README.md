# Tooltip

Etiqueta pequeña que sale del elemento al pasar el ratón por encima o al enfocarlo con el teclado.

## Cuándo usarlo

Para nombrar lo que no lleva texto (una barra de iconos) o recordar un atajo. No metas dentro información que haga falta para usar la pantalla: en pantallas táctiles no aparece.

## Qué pones tú

- `content`: una o dos palabras («Copy link», «Delete»).
- El elemento como hijo: `<Tooltip content="Copy link"><Button iconOnly aria-label="Copy link"><CopyIcon /></Button></Tooltip>`. Recibe los manejadores de ratón y foco y `aria-describedby` mientras se ve.
- `side`: `"top"` (por defecto), `"bottom"`, `"left"` o `"right"`.
- `delay`: la espera con el ratón (500 ms por defecto).

## Reglas

- Fondo `thumb` con `on-thumb`, `radius-sm`, `shadow-pop` y texto `label`. Sin flecha.
- Sale del elemento: crece desde el lado que da a él con `snappy`, con un desenfoque corto; se va con `fadeOut`.
- Solo hay uno en pantalla. Si ya se ve uno y pasas a otro elemento, viaja hasta él, cambia de tamaño y cambia el texto con desenfoque, sin espera.
- Con el foco de teclado sale al momento; Esc lo cierra. Se puede pasar el ratón por encima sin que se vaya. Pulsar el elemento o desplazar la página lo cierra.
- Un icono sin texto necesita su propio `aria-label`: el tooltip lo describe, no lo nombra.
