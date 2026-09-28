# Progress y ProgressRing

Progreso de algo que tarda: una barra (`Progress`) o un anillo (`ProgressRing`). El valor avanza con un muelle y, sin valor, un tramo recorre la barra sin parar.

## Cuándo usarlo

- `Progress`: subidas, descargas, pasos de un proceso, espacio usado. Con una etiqueta que diga qué está pasando («Uploading 12 photos»).
- `ProgressRing`: lo mismo donde no cabe una barra (junto a un nombre de archivo, dentro de una fila) o para esperar sin valor. Si lo que carga es un botón, usa el estado `loading` de `Button`; si es una pantalla, `Skeleton`.

## Qué pones tú

- `value` (de 0 a `max`, 100 por defecto). Sin `value` (con `null`, o con algo que no es un número, como `0/0` al empezar) es indeterminado: se sabe que avanza, no cuánto.
- `Progress`: `label` (texto visible encima y nombre accesible) o `aria-label`; `showValue` para ver el valor a la derecha; `size` (`"md"`, 10 px de alto, o `"sm"`, 6 px).
- `ProgressRing`: `aria-label` siempre; `size` (`"md"`, 40 px, o `"sm"`, 20 px, para ir junto a un texto).
- `formatValue(value, max)`: el texto del valor para lectores de pantalla y para `showValue` (por defecto, el porcentaje). Con `showValue` también recibe los valores por los que pasa la cifra mientras cuenta: enteros si `value` y `max` lo son.

## Reglas

- Surco teñido del color del relleno (`fill` al 12 %) y relleno `fill` (negro en claro, blanco roto en oscuro), en píldora; valen sobre el lienzo y sobre una superficie. Nunca verde: el acento no es para esperar.
- El valor avanza con `morph` y la cifra de `showValue` cuenta con él, en cifras tabulares; al llegar el primer valor tras lo indeterminado, cuenta desde 0.
- Indeterminado, en bucle y a velocidad constante (sin muelle, como lo que espera sin final conocido): en la barra, un tramo del 30 % del ancho sale estirándose por la izquierda, la cruza en 1,1 s y se encoge contra el final mientras el siguiente asoma. En el anillo, el arco gira a 0,95 vueltas por segundo y se alarga y se acorta (del 8 al 34 % de la vuelta) en ciclos de 1,5 s, sin ir nunca hacia atrás.
- Al pasar de indeterminado a un valor, lo que se ve del tramo se transforma en el relleno con `morph`; el arco termina hacia delante, hasta las 12.
- Al llegar al máximo, un disco `fill` crece desde el centro del anillo y dentro se dibuja el check en `on-fill` con `draw`.
- Con «reducir movimiento», lo indeterminado se queda quieto en el centro y respira (solo cambia su opacidad).
- Con colores forzados (alto contraste del sistema), el surco lleva borde y el relleno toma el color de resaltado del sistema.
- Lectores de pantalla: `role="progressbar"` con `aria-valuenow` y `aria-valuemax`; indeterminado, sin `aria-valuenow`.
