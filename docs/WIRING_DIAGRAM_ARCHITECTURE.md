# Wiring-/Diagramm-Architektur

Status: Zielarchitektur. Noch **kein** Wiring-Editor, kein Wiring-Canvas, keine DiagramBlock-Darstellung, keine Sticky-Connector-Engine und kein Asset-Upload implementiert.

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
| W0 | Drawing Core vorbereiten/extrahieren, ohne sichtbare Verhaltensänderung. |
| W1 | `PageKind: 'wiring'`; Formate A0–A4 und Custom; Basisobjekte Rectangle, Ellipse, Polyline, Text, Image. |
| W2 | `CadDiagramBlock`: Rechteck/Block, Text/Felder, Ports, frei skalierbar, on-the-fly erzeugbar. |
| W3 | Generisches Port-System: `{id, parentObjectId, edge, offset, label, type, direction}`. Ports an Symbol, DiagramBlock, ggf. Rectangle, Container, Image. |
| W4 | `CadConnection` mit `type: cable \| network \| bus \| power \| signal \| generic`; Endpunkte `{objectId, portId}`; Sticky Connections bleiben beim Verschieben erhalten. |
| W5 | Bilder per Drag & Drop, Datei öffnen, Ctrl+V (PNG, JPEG, WebP, SVG). Produktiv: Asset-Datei außerhalb Webroot im `STORAGE_PATH`, Dokument speichert `assetId` statt Base64. SVG serverseitig bereinigen. |
| W6 | On-the-fly-Baustein: Rechteck zeichnen → beschriften → Ports setzen → verbinden. „Als Baustein speichern…“: Nur dieses Projekt / Meine Symbolbibliothek / Als Systemsymbol (nur Admin). |
| W7 | Gruppen, Container, Layer, Z-Order, Ausrichten, Verteilen, gleiche Breite/Höhe, Smart Guides, Objekt sperren. |
| W8 | Planvorlagen (Rahmen, Schriftkopf, Logo, Legendenbereich, Raster); Templates Elektro, Verkabelung, Netzwerk, Sicherheitstechnik, Zutritt, mechanische Skizze, benutzerdefiniert. |
| W9 | Bemaßungen in mm/cm/m, automatisch aus Geometrie, optionaler Text-Override. |
| W10 | Automatische Legende aus verwendeten Symbolen und Verbindungstypen. |
| W11 | Geräte-/Verbindungsintelligenz: Hersteller, Modell, Artikelnummer, IP, MAC, Standort, Anschluss, Port; automatische Verbindungs-, Kabel- und Geräteliste. |

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

Vollständiger Rust-Server, MariaDB-Persistenz, Symbolversionshistorie, Wiring-Canvas, DiagramBlock-Rendering, Sticky-Connector-Engine, Asset-Upload-Backend, ELCAD-/EPLAN-Import, Offline-PWA, Collaboration.
