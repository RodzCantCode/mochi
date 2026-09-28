# Toast

Aviso en píldora que confirma lo que acaba de pasar; si llega otro, la píldora se transforma en el nuevo.

## Cuándo usarlo

Para confirmar una acción que no deja otra huella visible («Changes saved», «Link copied»), con una acción para deshacer si procede. Los errores que piden atención no van aquí.

## Qué pones tú

- Un `<Toaster />` por página (arriba o abajo con `position`, a `offset` px del borde).
- `toast("Link copied")` o `toast({ title, icon?, action?, duration? })` desde cualquier sitio. `icon`: `"success"` (el check, por defecto), `"none"` o un icono propio. `action`: `{ label: "Undo", onClick }`. `duration` en ms (3000 por defecto; `Infinity` para que se quede).
- `toast.dismiss(id?)` para quitarlo.

## Reglas

- Píldora `solid` de 52 px, texto `body-lg`, acción en una píldora `solid-subtle`.
- Solo hay uno a la vez: el nuevo cambia el contenido con desenfoque y la forma se ajusta a su ancho.
- Entra desde el borde con `morph` y sale con `fadeOut`. La cuenta atrás se para mientras el puntero o el foco están encima.
- Se anuncia a lectores de pantalla sin robar el foco.
