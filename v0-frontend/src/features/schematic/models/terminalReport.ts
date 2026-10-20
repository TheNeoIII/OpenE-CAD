import type { CadDocument } from '@/types/cad'

export function terminalReportRows(doc: CadDocument): string[][] {
  return doc.pages.filter((p) => p.kind === 'schematic').flatMap((p) =>
    p.symbols.filter((s) => s.kind === 'terminal').map((s) => {
      const dev = doc.devices.find((d) => d.id === s.deviceId)
      return [dev?.bmk ?? '—', s.terminalNo ?? '?', dev?.function ?? '', dev?.articleNo || '—', `/${p.number}`]
    }),
  ).sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1], undefined, { numeric: true }))
}
