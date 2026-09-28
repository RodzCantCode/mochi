# MorphBox

La forma base de Mochi: ajusta tamaño y esquinas a su contenido con muelles, cambia ese contenido con desenfoque y cambia de tono sin pasar por gris.

## Cuándo usarlo

Para construir estados propios con el mismo comportamiento que los componentes (un chip que pasa a confirmación, una tarjeta que cambia de modo). Para cambiar solo un texto dentro de otra pieza, usa `Swap`.

## Qué pones tú

- `contentKey`: la identidad del contenido. Cuando cambia, el contenido anterior sale y el nuevo entra; si no cambia, el contenido se actualiza sin animación.
- `tone`: `"solid"`, `"surface"` o `"accent"`.
- `radius`: px o `"pill"` (media altura).
- `width` / `height` fijos si los quieres; si no, los del contenido más `padding`.
- `as` (`"button"` para acciones) y `pressScale` si debe hundirse al pulsar.

## Reglas

- Tamaño y esquinas con `morph`; contenido con `fadeOut` → `fadeIn` y desenfoque; entre `solid` y `surface`, una copia de la forma en el tono nuevo crece desde el centro con `snappy`.
- El contenido que sale conserva el color de su tono hasta desaparecer.
