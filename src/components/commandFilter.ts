// Filtrado de la paleta: cada palabra buscada debe aparecer en la etiqueta o en sus palabras
// clave, sin distinguir mayúsculas ni tildes ("configuracion" encuentra "Configuración").
export interface Searchable {
  label: string;
  keywords?: string[];
}

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function matchCommand(query: string, item: Searchable): boolean {
  const q = normalize(query);
  if (!q) return true;
  const hay = normalize([item.label, ...(item.keywords ?? [])].join(" "));
  return q.split(/\s+/).every(word => hay.includes(word));
}
