# Projektlebenszyklus, Revisionen, Audit und Undo

Status: Frontend-Vertrag und Mock-Backend umgesetzt. Der Rust-Server muss alle hier beschriebenen Regeln **serverseitig** durchsetzen; die UI blendet Aktionen nur aus.

## Status

| Status | Bedeutung | Erlaubte Übergänge |
|---|---|---|
| `active` | Normal bearbeitbar | → `archived` (Archivieren), → `deleted` (Papierkorb) |
| `archived` | Nur lesbar, nicht speicherbar | → `active` (Reaktivieren), → `deleted` |
| `deleted` | Papierkorb, `deletedAt` gesetzt | → `active` (Wiederherstellen, nur Admin), endgültig löschen (nur Admin) |

- Nur `active`-Projekte dürfen gespeichert werden; sonst lehnt der Server ab.
- Archivieren eines Projekts im Papierkorb ist unzulässig.
- Endgültiges Löschen ist nur aus dem Papierkorb möglich und unumkehrbar.
- Duplikate starten immer als `active` mit `stateRevision = 0`.
- Die Projektliste filtert nach Aktiv / Archiv / Papierkorb / Alle.

## Revisionen und Konflikte

- Jedes Projekt trägt eine monotone `stateRevision` (Ganzzahl), unabhängig vom fachlichen Revisionskennzeichen (`revision`, z. B. „B“) im Schriftfeld.
- Der Client merkt sich die beim Öffnen geladene Revision und sendet sie beim Speichern als `expectedRevision`.
- Stimmt sie nicht mit dem Server überein, antwortet der Server mit **409** und `error.code = PROJECT_REVISION_CONFLICT` (optional `currentRevision`). Kein Teilschreiben.
- Der Client wiederholt das Speichern **nie automatisch**. Er zeigt einen Konfliktdialog: Server-Stand neu laden (lokale Änderungen verwerfen) oder abbrechen und weiterarbeiten. Ein Zusammenführen ist nicht vorgesehen.
- Nach erfolgreichem Speichern liefert der Server die neue `stateRevision`; der Client übernimmt sie.
- Development-only: Im Mock-Backend kann ein Konflikt simuliert werden (fremde Änderung durch einen anderen Mock-Benutzer).

## Audit-Ereignisse

Der Server schreibt pro Aktion einen unveränderlichen Eintrag (Akteur, Zeitpunkt, Projekt-ID, Details):

| Ereignis | Details |
|---|---|
| `project.created` | — |
| `project.saved` | `stateRevision` |
| `project.archived` / `project.unarchived` | — |
| `project.trashed` | `from` (vorheriger Status) |
| `project.restored` | `from: deleted` |
| `project.deleted` | `permanent: true` |

Audit-Einträge enthalten keine Dokumentinhalte und keine Geheimnisse. Sie bleiben auch nach endgültigem Löschen des Projekts erhalten.

## Undo / Redo

- Undo/Redo ist rein clientseitig und gilt pro geöffnetem Projekt innerhalb der Sitzung (siehe [UNDO_TRANSACTION_MODEL.md](UNDO_TRANSACTION_MODEL.md)).
- Speichern leert den Verlauf nicht; Neuladen nach einem Konflikt oder Schließen des Projekts verwirft ihn.
- Lebenszyklusaktionen (Archivieren, Papierkorb, Wiederherstellen, Löschen) sind **nicht** per Undo umkehrbar; sie laufen sofort gegen den Server und werden auditiert.
