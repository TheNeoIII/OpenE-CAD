import { Badge } from '@/components/ui/primitives'

const AREAS = [
  ['Standardsymbole', 'scope = system, ownerUserId = null. Symbolversionierung ist vorbereitet. Historische Versionen und versionsgebundene Platzierungen werden mit der serverseitigen Bibliothek umgesetzt.', 'symbol.editSystem'],
  ['Artikel', 'Artikelstammdaten für alle Projekte. Benutzer lesen und verwenden, nur Administratoren erstellen, bearbeiten, löschen und importieren.', 'article.manage'],
  ['System-Potentiale', 'Projektübergreifende Potentialvorlagen (z. B. L1–L3, N, PE, 24V DC).', 'library.manageSystem'],
  ['System-Leiterstile', 'Farben, Querschnitte und Linienstile für neue Projekte.', 'library.manageSystem'],
] as const

/** Overview of system-wide library data. Editing happens in the respective editors, gated by permission. */
export function SystemLibraryPanel() {
  return <div className="max-w-3xl p-4">
    <p className="mb-4 text-[12px] text-muted">Systemweite Bibliotheksdaten sind für alle Benutzer lesbar und verwendbar. Änderungen sind Administratoren vorbehalten und werden vom Rust-Server autorisiert und im Audit-Log protokolliert.</p>
    <ul className="flex flex-col gap-2">
      {AREAS.map(([title, text, permission]) => <li key={title} className="rounded-md border border-line bg-panel p-3">
        <div className="flex items-center justify-between gap-2"><h2 className="text-[12.5px] font-semibold text-fg">{title}</h2><Badge>{permission}</Badge></div>
        <p className="mt-1 text-[12px] text-fg-2">{text}</p>
      </li>)}
    </ul>
    <p className="mt-4 text-[11.5px] text-muted">Standardsymbole werden im Symboleditor bearbeitet (Filter „System“), Artikel im Datenbereich.</p>
  </div>
}
