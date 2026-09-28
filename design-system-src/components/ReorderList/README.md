# ReorderList

Lista vertical que se reordena arrastrando cada fila por su asa. La fila sigue al dedo, las demás se apartan y al soltar se asienta en su hueco.

## Cuándo usarlo

Cuando el orden lo decide la persona: una lista de reproducción, prioridades, los pasos de algo, las columnas de una tabla. Si el orden sale de un criterio (fecha, nombre), ofrece ese criterio en vez de arrastrar.

## Qué pones tú

- `items`, `getKey` (una clave única y estable), `getLabel` (el texto de cada elemento, para su asa y los avisos) y `onReorder`, que recibe los elementos en el orden nuevo.
- `renderItem(item, { handle, dragging })`: pinta la fila y pon `handle` (el asa, un botón con `GripIcon`) donde quieras dentro.
- `aria-label` de la lista y `messages` para traducir las instrucciones y los avisos (en inglés por defecto).

## Reglas

- El asa es `GripIcon` (seis puntos) en `on-surface-muted`, de 32 px; se arrastra solo por ella (en táctil, así el dedo sigue desplazando la página por el resto de la fila).
- Manipulación directa, como `Slider`: mientras se arrastra, la fila sigue al puntero sin muelle, se levanta (escala 1,02 con `snappy` y una sombra que sigue su forma) y va por encima. Las demás se apartan con `morph` cuando su centro pasa por la mitad de ellas. Más allá de la primera o la última se resiste con el estirón elástico. Al soltar se asienta en su hueco con `back` y la velocidad que llevaba.
- Cerca del borde de su contenedor (o de la ventana), la lista se desplaza sola.
- Cualquier cambio de orden se anima, también si viene de fuera (un botón «Sort A–Z»): cada fila parte de donde se veía.
- Teclado, en el asa: Espacio o Enter la cogen, ↑↓ la mueven, Espacio o Enter la sueltan y Esc la devuelve a su sitio; tras soltarla, el asa sigue enfocada. Cada paso se anuncia a lectores de pantalla («Night Drive, position 3 of 5») y el asa describe cómo se usa.
- Una sola lista vertical: no pasa filas de una lista a otra ni ordena cuadrículas. Añadir o quitar filas no tiene animación propia (las demás sí se deslizan a su sitio nuevo).
