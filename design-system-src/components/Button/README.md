# Button

Botón que pasa de normal a cargando y a hecho transformando su propia forma.

## Cuándo usarlo

Para cualquier acción. Cuando la acción tarda (guardar, enviar, pagar), dale `status`: el botón se encoge a un círculo con un arco que gira y, al terminar, dibuja un check antes de volver. No pongas un spinner aparte.

## Qué pones tú

- `children`: el texto, un verbo corto en mayúscula inicial («Save», «Get started»).
- `status`: `"idle"` (por defecto), `"loading"` o `"success"`. `useButtonStatus(accion)` lo lleva solo: `run()` pasa a cargando, espera la acción, muestra el check 1,1 s y vuelve.
- `variant`: `"solid"` (por defecto, sobre `solid`), `"surface"`, `"accent"` (matcha, con texto en tinta) o `"danger"` (para acciones destructivas, como el «Delete» de una confirmación). Un solo `accent` por pantalla.
- `size`: `"sm"` (36 px), `"md"` (44 px) o `"lg"` (56 px).
- `icon`: un icono detrás del texto, p. ej. `<ArrowRightIcon />`.
- `iconOnly`: el contenido es solo un icono y el botón es un círculo de su alto; ponle `aria-label` (p. ej. el «…» de un menú).
- `loadingLabel`, `successLabel`: lo que anuncia un lector de pantalla («Loading», «Done» por defecto).

## Reglas

- Mientras carga o muestra el check no responde a clics y lo anuncia a lectores de pantalla; el nombre accesible sigue siendo el texto.
- Al pulsar se hunde a escala 0,965 con `press` y vuelve con `snappy`.
- Al cargar se encoge a círculo en su sitio: conserva su hueco, así que lo de alrededor no se mueve ni al encogerse ni al volver.
- Si cambias su `variant` (p. ej. de `surface` a `solid` al activar un filtro), el tono nuevo crece desde el centro y el texto se funde a su color nuevo con desenfoque.
- En oscuro, dentro de una ventana, hoja o panel lateral o flotante, `solid` va invertido (claro con texto oscuro) para destacar sobre la superficie.
- No cambies el texto del botón para decir «Saving…»: el cambio de forma ya lo dice.
- Su alto (y el ancho del círculo de `iconOnly`) ya está en el HTML del servidor: antes de que cargue JavaScript mide lo mismo, sin saltos.

## LinkButton

Cuando el botón lleva a otra página («See plans», «Contact»), usa `LinkButton`: es un enlace de verdad (se abre en otra pestaña, se copia, funciona sin JavaScript) con la misma forma, tamaños, variantes y pulsación. No tiene estados de carga.

- `href` (obligatorio) y lo de cualquier enlace (`target`, `rel`…).
- `variant`, `size`, `icon` e `iconOnly`, como en `Button`.
- `as`: el componente de enlace del framework, p. ej. `Link` de Next.js para navegar sin recargar; por defecto, `<a>`.
- Se sigue con Enter, como cualquier enlace; Espacio no lo pulsa (desplaza la página).
- En una página de Astro puede ir sin isla (sin `client:`): sale con su forma y su tamaño, y la pulsación se imita con CSS con las mismas curvas (se hunde a 0,965 y vuelve). Lo mismo vale para `Button` antes de que cargue JavaScript.
