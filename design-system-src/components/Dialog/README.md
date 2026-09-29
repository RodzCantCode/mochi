# Dialog

Ventana que crece desde el botón que la abre y vuelve a él al cerrar. En pantallas estrechas es una hoja que sube desde abajo.

## Cuándo usarlo

Para confirmar algo importante («Delete project?») o para una tarea corta que no merece una página (renombrar, invitar). No lo uses para avisar de algo que ya pasó: para eso está `toast`.

## Qué pones tú

- `open` + `onOpenChange`.
- `title` (también es el nombre accesible) y, si hace falta, `description`.
- `children`: el contenido, p. ej. un `TextField`.
- `actions`: los botones de abajo, el secundario primero (`Cancel`) y la acción después.
- `origin`: la ref del botón que la abre, para crecer desde él. Si no la das, crece desde el botón enfocado, si lo hay. Safari de escritorio no enfoca un botón al pulsarlo: ahí, sin `origin`, la ventana aparece en su sitio con un fundido.
- `presentation`: `"auto"` (hoja por debajo de 640 px, ventana en el resto), `"center"` o `"sheet"`.
- `role="alertdialog"` para confirmaciones destructivas; `dismissible={false}` si no debe cerrarse con Esc, fondo ni arrastre.
- `width` (440 px por defecto) e `initialFocus` (qué recibe el foco al abrir). Un campo con `autoFocus` también lo recibe; si no hay ninguno, va al primer control del contenido.

## Reglas

- `surface` con `radius-xl` y `shadow-overlay` sobre `scrim`. Título de 20 px en peso 620, descripción en `body` y `on-surface-muted`.
- Al abrir, la forma del botón se estira con `morph` hasta la ventana. Si el botón es negro, el negro queda en un borde que se estrecha mientras el blanco crece desde el centro, con la forma ligeramente desenfocada hasta que el blanco lo cubre todo. El texto del botón se desvanece y el contenido entra con desenfoque. Al cerrar ocurre lo mismo al revés, y el foco vuelve al botón.
- La hoja deja 8 px con los bordes, tiene un asa arriba y se arrastra desde la cabecera; su contenido va con ella al subir, al arrastrarla y al bajar. Cuando sale el teclado, sube con él hasta quedar justo encima (y la ventana centrada se centra en lo que queda visible), sin que el contenido salte. Si no cabe entera, el título y los botones siguen a la vista y solo se desplaza lo de en medio. Al cerrarla con el teclado abierto baja hasta salir por abajo de la pantalla. Al soltarla vuelve con `back` y la velocidad que llevaba; se cierra si baja más de un 30 % o la lanzas hacia abajo.
- La acción destructiva va con `Button variant="danger"`. Dentro de la ventana, los botones `surface` y los campos van en el tono del lienzo.
- Mientras está abierta, la página no se desplaza, Tab no sale de la ventana y Esc la cierra. Al cerrarse, la página vuelve a donde estaba aunque Safari de iOS la haya movido con el teclado.
