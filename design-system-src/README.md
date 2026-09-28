Mochi es un sistema de interfaz con una idea: **una sola forma que se transforma**. Cada control es la misma pieza que cambia de tamaño, esquinas y color con muelles suaves, y que cambia su contenido con un desenfoque corto. Negro, blanco y un único verde matcha.

## Principios

- **Una forma, sin cortes.** Un estado no sustituye a otro: lo transforma. El botón se encoge a círculo para cargar y se abre de nuevo al terminar; la island se abre en reproductor; el toast se transforma en el siguiente toast; el «…» se convierte en su menú, el selector en su lista y el botón que abre un diálogo crece hasta ser la ventana; el tooltip viaja de un elemento a otro.
- **Muelles, con un rebote mínimo.** Nada frena con una curva fija ni rebota: todo va con muelles cuyo rebote se queda por debajo del 1 %.
- **El contenido no se solapa.** Lo que sale se va deprisa y lo que entra llega 60 ms después, con desenfoque. Nunca hay dos textos legibles a la vez en el mismo sitio.
- **Blanco y negro, un acento.** El matcha es la única nota de color: interruptor encendido, línea de la gráfica, comando activo. Si todo es verde, nada lo es. El rojo no es un acento: solo aparece cuando algo va mal o no tiene vuelta atrás.

## Contenido

- Frases cortas y en voz activa. Un botón dice lo que hace («Save», «Get started») y el aviso confirma lo que pasó («Changes saved»).
- Mayúscula solo al principio («Invite teammate», no «Invite Teammate»).
- Sin emoji, ni como iconos ni como adorno.
- Los números se alinean con cifras tabulares (`font-variant-numeric: tabular-nums`): tiempos, importes, porcentajes.

## Color

- Pon la página sobre `canvas`. Nunca pongas texto directamente sobre `canvas` salvo con `on-canvas` u `on-canvas-muted`.
- `solid` es la forma de Mochi: botones, island y reproductor, interruptor apagado, pestañas, tarjeta de gráfica, toast. Texto encima en `on-solid`; lo secundario en `on-solid-muted`.
- `surface` es la superficie tranquila: paleta de comandos, pista del slider, tecla ⌘K. Texto encima en `on-surface` y `on-surface-muted`, separadores en `surface-border`.
- `thumb` es lo que se desplaza encima de `solid`: la bolita del interruptor, el indicador de las pestañas, el tooltip. Texto encima en `on-thumb`.
- `fill` es el relleno del slider sobre `surface`: negro en claro, blanco roto en oscuro. Iconos encima en `on-fill`.
- `accent` es un matcha pastel. Va siempre con texto `on-accent` (tinta) encima o sobre `solid` (la línea de la gráfica); sobre el lienzo claro solo, se pierde. Úsalo en una sola cosa por pantalla.
- `accent-strong` es el matcha profundo, para el verde que va solo sobre el lienzo o la superficie: el interruptor encendido, el check de «correcto».
- `danger` es un rojo coral suave para lo que va mal o no tiene vuelta atrás: el anillo de un campo con error, el icono de alerta, el resaltado de una opción destructiva, el botón «Delete». Lleva `on-danger` (tinta) encima.
- `danger-strong` es el rojo del texto de error sobre el lienzo o la superficie: mensajes, etiquetas con error, opciones destructivas de un menú.
- `focus-ring` marca el foco de teclado de todo lo interactivo: contorno de 2 px, separado 3 px. En un campo de texto es el anillo interior de 2 px mientras escribes.
- En oscuro, `solid` y `surface` se separan de `canvas` con un filo (`solid-border`, `surface-border`); en claro ese filo es invisible.
- Negro y blanco no se funden nunca entre sí (pasarían por gris): una copia de la forma en el tono nuevo crece desde su centro y el tono viejo se queda en un borde que se estrecha.

## Tipografía

- Todo va en Geist (`sans`). Tracking de −0,01 em en interfaz y −0,025 em en `display`.
- `body` para la mayoría de textos (filas, pestañas, botones medianos); `body-lg` para el cuadro de búsqueda y los avisos; `label` para tiempos, variaciones y botones pequeños; `caption` para ejes de gráficas y fechas; `title` para el título del reproductor; `display` para la cifra principal de una tarjeta.

## Forma, espacio y sombra

- Por defecto, las formas son píldoras (`radius-full`): botones, interruptor, pestañas, slider, campos de texto y selectores, toast, island. Las tarjetas y los diálogos usan `radius-xl`, la paleta, los menús y las listas de los selectores `radius-lg`, la carátula y el resaltado del menú `radius-md`, las filas de la paleta y el tooltip `radius-sm`, las teclas `radius-xs`.
- Los rellenos siguen la escala de espaciado: `space-1` es el margen de las bolitas e indicadores dentro de su pista, `space-5` el relleno de tarjetas.
- `shadow-surface` levanta `solid` y `surface` del lienzo; `shadow-thumb`, bolitas e indicadores; `shadow-pop`, el tooltip; `shadow-overlay`, la paleta, los menús y los diálogos sobre `scrim`.

## Movimiento

No hay valores de movimiento en la tabla de tokens: viven en el código (`mochi-ui/motion`) y en CSS como `--mochi-ease-<nombre>` y `--mochi-duration-<nombre>` (curvas `linear()` que reproducen cada muelle).

| Muelle | Periodo | Amortiguación | Para qué |
| --- | --- | --- | --- |
| `morph` | 0,42 s | 0,86 | Tamaño, esquinas y posición de la forma |
| `snappy` | 0,26 s | 0,88 | Cambios pequeños: soltar, un punto que aparece |
| `press` | 0,14 s | 0,95 | Hundirse al pulsar (escala 0,965) |
| `lead` | 0,20 s | 0,86 | Borde que va delante en lo que se desplaza |
| `trail` | 0,42 s | 0,88 | Borde que va detrás: por eso se estira |
| `fadeIn` | 0,24 s | 1 | Entrada de contenido, 60 ms después de la salida |
| `fadeOut` | 0,13 s | 1 | Salida de contenido |
| `draw` | 0,62 s | 1 | Trazos que se dibujan: línea de la gráfica, check |
| `back` | 0,34 s | 0,84 | Vuelta del estirón elástico al soltar |
| `color` | 0,30 s | 1 | Cambio de color dentro del mismo tono (negro → verde) |

- Lo que se desplaza (indicador de pestañas, bolita del interruptor) mueve sus dos bordes con muelles distintos: el de delante en `lead` y el de detrás en `trail`.
- En los arrastres manda el puntero: mientras está pulsado, el valor sale de su posición. Al pasar de un límite, la forma se estira con resistencia creciente; al soltar vuelve con `back` y la velocidad que llevaba.
- Todo se puede interrumpir a mitad sin saltos.
- Con «reducir movimiento» activado, los muelles saltan al destino.

## Temas

Dos temas: `light` y `dark`. En código se eligen con `data-theme="light" | "dark" | "system"` en `<html>` o en cualquier contenedor; `system` sigue la preferencia del sistema operativo.

## Iconografía

- Iconos propios en una cuadrícula de 24, trazo único de 1,6 px reales a cualquier tamaño, extremos y uniones redondeados (`ArrowRightIcon`, `SearchIcon`, `MoreIcon`, `TrashIcon`, `VolumeIcon`…).
- Los controles de reproducción (play, pausa, anterior, siguiente) van rellenos, como es costumbre.
- Un icono junto a texto se alinea al centro y deja `space-2` de separación.
- Los SVG del grupo Icons están dibujados en tinta `#0D0D0E` (el `on-surface` claro); en código heredan el color del texto.
