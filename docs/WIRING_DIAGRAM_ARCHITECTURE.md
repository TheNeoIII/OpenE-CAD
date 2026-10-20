# Wiring-/Diagramm-Architektur

Status: W0, W1 und W1.1/W1.2 implementiert. Ein separater Wiring-Editor mit `WiringCanvas`, `WiringToolbar`, `WiringDrawing` und `WiringSheetFrame` ist vorhanden. W2 (DiagramBlock) ist der nächste Schritt; Ports, Sticky Connections und Asset-Upload sind noch nicht implementiert.

## Ziel

OpenE-CAD soll neben dem Stromlaufplan auch Verkabelungs-, Block- und Netzwerkschemata ähnlich Microsoft Visio erstellen: Sicherheitstechnik, Einbruchmeldeanlage, Zutrittskontrolle, Netzwerk, Kamerasysteme, Bus-Systeme, allgemeine Verkabelung und mechanische Skizzen.

## Gemeinsamer Drawing Core

```
Drawing Core
├─ viewport
├─ world/screen transform
├─ zoom/pan
├─ snapping
├─ selection
├─ handles
├─ clipboard
├─ hit testing
├─ transforms
├─ undo/redo integration
└─ rendering
```

Profile setzen darauf auf: `SchematicProfile` (bestehender Stromlaufplan) und `WiringProfile`. Unterschiede gehören ins Profil, nicht in wachsende `if (page.kind === 'wiring')`-Verzweigungen in `SchematicCanvas`. Die Core-Extraktion darf den Stromlaufplan (Snap, Auswahl, Zoom/Pan, Undo/Redo, Textdarstellung) nicht regressieren.

## Roadmap

| Stufe | Inhalt |
|---|---|
| W0 | Drawing Core vorbereiten/extrahieren, ohne sichtbare Verhaltensänderung. **Erledigt:** `src/features/drawing/viewport.ts` und `src/features/drawing/geometry.ts`; Schematic re-exportiert diese Helfer, Verhalten unverändert (Tests: `tests/drawing.test.mjs`). |
| W1 | `PageKind: 'wiring'`; Formate A0–A4 und Custom; Basisobjekte Rectangle, Ellipse, Polyline, Text, Image. **Erledigt:** Seitenmodell und Formate, Wiring-Werkzeugleiste (Rechteck, Ellipse, Linie, Text, Bild) mit Inspector; elektrische Auswertung (Prüfung, Klemmen-/Verbindungstabellen, Kontaktspiegel) bleibt auf `kind: 'schematic'` begrenzt (Tests: `tests/wiring.test.mjs`). |
| W1.1 | **Erledigt:** separater Canvas/Toolbar/Renderer, einfacher WiringSheetFrame, Graphic Snap, acht Resize-Handles, Multi-Point-Line. `CadImage.assetId` vorbereitet; alte Inlinebilder ausschließlich über `legacySrc`. Bildimport bis W5 deaktiviert. |
| W1.2 | **Erledigt:** Rectangle/Ellipse per Pointer-Drag; Preview-Endpunkt ist Commit-Endpunkt, ein Undo-Schritt. Escape/PointerCancel/Toolwechsel verwerfen die lokale Geste. Mindestgröße 10 World Units. Strikte PageKind-Guards, Graphic Context Menu, typgeprüfte Zwischenablage, zentrale Legacy-Migration in `normalizePages`, elektrische Reports/Ableitungen nur für Schematic, gemeinsame ViewControls und Verhaltenstests. |
| W2 NEXT | `CadDiagramBlock`: Rechteck/Block, Text/Felder, Ports, frei skalierbar, on-the-fly erzeugbar. |
| W3 | Generisches Port-System: `{id, parentObjectId, edge, offset, label, type, direction}`. Ports an Symbol, DiagramBlock, ggf. Rectangle, Container, Image. |
| W4 | `CadConnection` mit `type: cable \| network \| bus \| power \| signal \| generic`; Endpunkte `{objectId, portId}`; Sticky Connections bleiben beim Verschieben erhalten. |
| W5 | Bilder per Drag & Drop, Datei öffnen, Ctrl+V (PNG, JPEG, WebP, SVG). Produktiv: Asset-Datei außerhalb Webroot im `STORAGE_PATH`, Dokument speichert `assetId` statt Base64. SVG serverseitig bereinigen. |
| W6 | On-the-fly-Baustein: Rechteck zeichnen → beschriften → Ports setzen → verbinden. „Als Baustein speichern…“: Nur dieses Projekt / Meine Symbolbibliothek / Als Systemsymbol (nur Admin). |
| W7 | Gruppen, Container, Layer, Z-Order, Ausrichten, Verteilen, gleiche Breite/Höhe, Smart Guides, Objekt sperren. |
| W8 | Planvorlagen (Rahmen, Schriftkopf, Logo, Legendenbereich, Raster); Templates Elektro, Verkabelung, Netzwerk, Sicherheitstechnik, Zutritt, mechanische Skizze, benutzerdefiniert. |
| W9 | Bemaßungen in mm/cm/m, automatisch aus Geometrie, optionaler Text-Override. |
| W10 | Automatische Legende aus verwendeten Symbolen und Verbindungstypen. |
| W11 | Geräte-/Verbindungsintelligenz: Hersteller, Modell, Artikelnummer, IP, MAC, Standort, Anschluss, Port; automatische Verbindungs-, Kabel- und Geräteliste. |

## Aktuelle Grenzen und Verträge

- `schematic` erlaubt elektrische Werkzeuge, `wiring` nur grafische Werkzeuge. `cover`, `report` und fehlende Seiten bekommen keine Zeichenwerkzeuge; Navigation bleibt möglich.
- Rectangle/Ellipse: PointerDown startet, PointerMove aktualisiert ausschließlich lokale Preview, PointerUp speichert diese Geometrie. Das Werkzeug bleibt aktiv. Resize verwendet denselben Graphic-Snap-Resolver; Handles bleiben screen-konstant.
- Polyline bleibt klickbasiert (Enter/Doppelklick/Rechtsklick fertig, Backspace entfernt Punkt, Escape verwirft, Shift 45°, Alt ohne Snap).
- `normalizePages` migriert altes `src` idempotent zu `legacySrc`. Neue DataURLs sind verboten; neue Bilder erhalten später `assetId` aus Rust API / `STORAGE_PATH`.
- Gemeinsame Legacy-Clipboard/Delete/Selection-Commands liegen vorläufig in Schematic Actions. Sie akzeptieren Wiring-Grafiken, filtern elektrische Objekte beim Paste und überspringen Junction-Bereinigung auf Wiring. Keine zweite Clipboard-Implementierung.
- Terminalreport, elektrische Tabellen, Kontaktspiegel, Potentialauswertung, Net Trace und XRefs beachten PageKind. Projektweite Geräteprüfungen und Inhaltsverzeichnis bleiben projektweit.

## Gemeinsame Symbolbibliothek

Keine zweite Wiring-Bibliothek. Die bestehende server-backed Shared Library und ihr Ownership-System (System / Benutzer / später projektlokal) gelten unverändert. Geplantes Symbol-Metadatum:

```
contexts: ('schematic' | 'wiring')[]   // nur schematic, nur wiring oder beide
```

Beispielkategorien: Elektro, Sicherheitstechnik, Netzwerk, Zutrittskontrolle, Allgemein.

## Rechte

| Aktion | Benutzer | Admin |
|---|---|---|
| On-the-fly-Block projektlokal / als eigenes User-Symbol speichern | ja | ja |
| Als Systemsymbol speichern | nein | ja |
| System- und Fremdsymbole verwenden, Fremdsymbole duplizieren | ja | ja |
| User-Symbol ändern | nur Owner | ja |
| Systemsymbol ändern | nein | ja (`library.manageSystem`) |

Die UI blendet nur aus; der Rust-Server autorisiert jede Schreiboperation.

## Nicht Teil dieser Stufe

Vollständiger Rust-Server, MariaDB-Persistenz, Symbolversionshistorie, DiagramBlock-Rendering, Sticky-Connector-Engine, Asset-Upload-Backend, ELCAD-/EPLAN-Import, Offline-PWA, Collaboration.
