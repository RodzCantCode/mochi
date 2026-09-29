# CommandPalette

Paleta de comandos que se abre con ⌘K, filtra al escribir y ejecuta con Enter.

## Cuándo usarlo

Como atajo a las acciones de una aplicación. No sustituye a la navegación visible: todo lo que está en la paleta tiene que poder hacerse también sin ella.

## Qué pones tú

- `open` + `onOpenChange`. `useCommandK(() => setOpen(o => !o))` conecta ⌘K / Ctrl+K en toda la página.
- `commands`: `[{ id, label, icon?, shortcut?, keywords?, onSelect }]`. `shortcut` son teclas: `["mod", "N"]` (mod = ⌘ en Apple y Ctrl en el resto).
- `placeholder` («Search commands…») y `emptyLabel` («No results»).
- Un disparador visible: `CommandPaletteTrigger` (la tecla ⌘K, o un buscador si le das texto). `Kbd` pinta atajos sueltos.

## Reglas

- Panel `surface` con `radius-lg` y `shadow-overlay` sobre `scrim`. El comando activo va resaltado en `accent` y su atajo se sustituye por ↵.
- Cada palabra buscada tiene que aparecer en el nombre o en sus `keywords`, sin distinguir mayúsculas ni tildes.
- Las filas que dejan de coincidir se desvanecen donde estaban; las que quedan suben con `morph` y la altura del panel se ajusta a lo que queda.
- ↑↓ mueven el resaltado, Enter ejecuta y cierra, Esc cierra; el foco vuelve adonde estaba.
- En el móvil se coloca sobre la parte de la pantalla que deja libre el teclado y muestra solo las filas que caben encima; mientras está abierta, la página de debajo no se desplaza.
- En pantallas táctiles sin ratón (iPhone, iPad sin trackpad) no enseña teclas: ni «esc», ni ↵, ni los atajos, ni el ⌘K del buscador. El buscador no pone mayúsculas ni corrige al escribir.
