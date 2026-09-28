# MediaPlayer

Island compacta con carátula y ecualizador que se abre en un reproductor con barra arrastrable y play/pausa que se transforma.

## Cuándo usarlo

Para audio o vídeo que sigue sonando mientras se navega: un mini reproductor fijo, una actividad en curso. También sueltos: `PlayPauseIcon` (el icono que se transforma) y `Scrubber` (la barra de progreso arrastrable).

## Qué pones tú

- `title`, `artist` y `artwork` (URL de imagen o un nodo; sin ella, un disco neutro).
- `duration` en segundos y `currentTime` + `onSeek` desde tu elemento de audio (o `defaultCurrentTime`).
- `playing` + `onPlayingChange`, `expanded` + `onExpandedChange` (o sus `default…`).
- `onPrevious`, `onNext`.
- `align`: `"center"` (por defecto) o `"start"` dentro del hueco disponible.

## Reglas

- La forma es `solid`. Compacta mide 232 × 44; abierta, 344 × 236 como máximo y se estrecha si el hueco es menor (mínimo 260).
- La carátula y el ecualizador viajan de un sitio a otro con `morph`; el resto entra con desenfoque 80 ms después.
- La barra engorda al agarrarla; mientras arrastras muestra el tiempo bajo el puntero y salta al soltar. Flechas ±5 s.
- Compacta, toda la píldora abre el reproductor; abierta, la cabecera lo cierra. Los controles ocultos no reciben foco.
