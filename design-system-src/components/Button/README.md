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
- No cambies el texto del botón para decir «Saving…»: el cambio de forma ya lo dice.
