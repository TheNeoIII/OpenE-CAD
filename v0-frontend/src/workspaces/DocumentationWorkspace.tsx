import { useRef } from 'react'
import { useDocumentStore } from '@/stores/documentStore'
import { PAGE_FORMATS } from '@/types/cad'
import { sortedGroups, sortedPages } from '@/utils/pages'
import { SheetDrawing } from '@/features/schematic/components/SchematicCanvas'

export function DocumentationWorkspace() {
  const doc = useDocumentStore(s => s.document)
  const nodes = useRef(new Map<string, HTMLElement>())
  if (!doc) return null
  const pages = sortedPages(doc)
  const jump = (id: string) => nodes.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return (
    <div className="flex min-h-0 flex-1">
      <nav aria-label="Dokumentationsseiten" className="w-60 shrink-0 overflow-y-auto border-r border-line bg-panel p-3">
        <h2 className="mb-3 text-sm font-semibold">Dokumentation · {pages.length} Blätter</h2>
        {sortedGroups(doc).map(g => <section key={g.id} className="mb-4">
          <button className="mb-1 text-xs font-semibold text-muted" onClick={() => { const first = pages.find(p => p.functionGroup === g.id); if (first) jump(first.id) }}>{g.no} · {g.label}</button>
          {pages.filter(p => p.functionGroup === g.id).map(p => <button key={p.id} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-hover" onClick={() => jump(p.id)}>{p.number} · {p.title}</button>)}
        </section>)}
      </nav>
      <main aria-label="Fertiger Plan" className="min-w-0 flex-1 overflow-auto bg-[var(--sheet-desk)] p-6">
        <p className="mx-auto mb-4 max-w-5xl text-xs text-muted">Alle Blätter in Editor-Reihenfolge · identischer Blattrenderer, ohne Bearbeitungshilfen</p>
        {pages.map(p => {
          const f = PAGE_FORMATS[p.format]
          return <article key={p.id} ref={el => { if (el) nodes.current.set(p.id, el); else nodes.current.delete(p.id) }} aria-label={`${p.number} ${p.title}`} className="mx-auto mb-8 max-w-5xl scroll-mt-4">
            <h3 className="mb-2 text-xs text-muted">{p.number} · {p.title}</h3>
            <svg viewBox={`0 0 ${f.width} ${f.height}`} className="block w-full shadow-lg" style={{ fontFamily: 'var(--font-sans)' }}><SheetDrawing page={p} clean /></svg>
          </article>
        })}
      </main>
    </div>
  )
}
