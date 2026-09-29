# Movimiento: Presence, PresenceGroup, AutoHeight y Swap

Piezas para que lo que construyas con Mochi se mueva como sus componentes.

## Cuándo usarlas

- `Presence`: algo que aparece y desaparece (un aviso en línea, un botón que solo sale a veces, el contenido que llega).
- `PresenceGroup`: una lista a la que se añaden y se quitan elementos.
- `AutoHeight`: un bloque cuyo contenido cambia de alto (leer más, un formulario que crece, un panel).
- `Swap`: cambiar un contenido por otro en el mismo sitio (un texto, un icono, un panel).

## Qué pones tú

- `Presence`: `show`; `effect` (`"blur"` por defecto, `"rise"` o `"fade"`); `collapse` para que abra y cierre su hueco; `appear` para animar también al montar; `onExited`; `as` para el elemento que envuelve.
- `PresenceGroup`: hijos con `key`; `as` y `itemAs` (p. ej. `"ul"` y `"li"`); `effect`; `collapse` (sí por defecto).
- `AutoHeight`: el contenido como hijo.
- `Swap`: `id` (la identidad del contenido); `align="start"` para bloques (la capa que sale se queda arriba a la izquierda); `slide` en px para que el cambio se desplace (con signo: el nuevo entra desde +slide).

## Reglas

- Lo que entra lo hace con `fadeIn` y un desenfoque corto; lo que sale, con `fadeOut`. Nunca se leen dos textos a la vez en el mismo sitio.
- Con `collapse`, el hueco se abre con `morph` antes de que entre el contenido (60 ms después) y se cierra mientras sale: lo de alrededor se desliza, no salta.
- Lo que sale se sigue pintando hasta terminar, pero ya no se puede usar (ni con teclado ni con lector de pantalla).
- `AutoHeight` solo recorta mientras se mueve; en reposo no corta focos ni sombras. Si lo de dentro ya anima su alto (un desplegable que se abre, un mensaje de error), lo sigue al momento sin recortar: un segundo muelle iría detrás y cortaría esquinas y sombras.
- En una lista, reordenar no se anima: los elementos cambian de sitio al momento. Los que salen se quedan justo detrás del que tenían delante, aunque se quiten varios seguidos.
- Con `collapse`, el relleno del propio elemento no se puede cerrar: pon el relleno en lo de dentro.
- Visible y quieto, un `Presence` con `collapse` sigue a su contenido al momento; lo que haya dentro anima lo suyo.
- Con «reducir movimiento», todo aparece y desaparece al instante.
