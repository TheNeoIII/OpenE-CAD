# Fortschritt

## 14.10.2026 – Fachliche Kernmodelle weitgehend spezifiziert

### Neu abgeschlossen

- [x] Symbol-/Funktions-/Anschlussmodell: `docs/SYMBOL_FUNCTION_MODEL.md`
- [x] FunctionTemplates, ConnectionTemplates und stabile PortBindings definiert
- [x] Artikelwechsel als kontrollierte Funktionsmigration statt simples `article_id`-Setzen definiert
- [x] SymbolDefinition strikt von Device/Function getrennt
- [x] Makros als Platzierungs-/Schaltungsrezepte statt dauerhafte Sonderobjekte definiert
- [x] mechanische Frontdarstellung vom Stromlaufplansymbol getrennt
- [x] Bibliotheksversionierung und Projekt-Snapshots vorgesehen

- [x] Referenzkennzeichen-/BMK-/Strukturmodell: `docs/REFERENCE_DESIGNATION_MODEL.md`
- [x] stabile IDs von sichtbaren BMK getrennt
- [x] IEC-81346-orientiertes, aber profilbasiertes Aspektmodell vorgesehen
- [x] Seitenkontext, Strukturvererbung und explizite Overrides definiert
- [x] automatische und manuelle BMK unterschieden
- [x] Nummerierungssequenzen, Reservierungen und Renummerierungs-Preview definiert
- [x] Klemmen-, Kabel- und SPS-Kennzeichnungen von ihren Unterobjekten/Adressen getrennt

- [x] Verteiler-/Reihen-/Auto-Layout-Modell: `docs/CABINET_LAYOUT_MODEL.md`
- [x] Enclosure, MountingSurface, RailRow und CabinetPlacement spezifiziert
- [x] TE und mm konsequent getrennt
- [x] `unplaced / auto / manual / locked` als Platzierungszustände definiert
- [x] deterministische Auto-Layout-Pipeline mit First-Fit-Basisstrategie beschrieben
- [x] bestehende gültige Positionen sollen möglichst stabil bleiben
- [x] Reservefelder, Türflächen, Mehrfachauswahl und Layoutgruppen vorgesehen
- [x] Auto-Layout als Preview + atomare Undo-Transaktion definiert

- [x] Klemmen-/Kabelmodell: `docs/TERMINAL_CABLE_MODEL.md`
- [x] TerminalStrip, Terminal, TerminalLevel und TerminalBridge definiert
- [x] Mehrstock-, PE-, Trenn- und Durchgangsklemmen vorbereitet
- [x] Cable, CableCore und CableShield definiert
- [x] Reserveadern und Aderzuweisungen spezifiziert
- [x] Klemmenplan, Kabelliste und Verdrahtungsliste als Projektionen des gemeinsamen Graphen festgelegt

- [x] Undo/Redo-/Command-/Transaktionsmodell: `docs/UNDO_TRANSACTION_MODEL.md`
- [x] GUI darf Domain State nicht direkt mutieren
- [x] Commands, atomare Transactions, Preview-Commands und Composite Commands definiert
- [x] Drag/Text-Edits sollen zu sinnvollen Undo-Schritten zusammengefasst werden
- [x] Delete ImpactReport, Auto-Layout-Undo und Renummerierungs-Undo spezifiziert
- [x] Project State von Workspace State getrennt
- [x] Autosave/Recovery und atomisches Speichern vorbereitet

- [x] `.oecad`-Container: `docs/PROJECT_FORMAT.md`
- [x] ZIP-kompatibler Container + JSON als Arbeitshypothese festgelegt
- [x] `manifest.json`, Domänenmodelle, Sheet-Dateien, Profile, Assets und Bibliothekssnapshots strukturiert
- [x] `format_version` und `schema_version` getrennt
- [x] stabile ID-Referenzen statt BMK-Strings festgelegt
- [x] Migrationen, Feature Flags, Validierungsstufen und Read-only-Verhalten für zu neue Dateien vorgesehen
- [x] Atomic Save, Recovery Sidecar, Projektlock und optionaler entpackter Git-/CLI-Modus beschrieben

- [x] Hersteller-/Artikel-/Katalogmodell: `docs/ARTICLE_CATALOG_MODEL.md`
- [x] Manufacturer, Article, typisierte Properties, Datenherkunft und Datenqualität definiert
- [x] Katalogschichten und lokale Katalogdatenbank vom Projektformat getrennt
- [x] Projektlokale Overrides und CatalogSnapshots vorgesehen
- [x] Zubehör-/Alternativartikelbeziehungen und BOM-Aggregation vorbereitet
- [x] Herstellerdaten-Lizenz/Redistribution als eigene Metadaten vorgesehen

- [x] Projektprüfung-/Rule-Engine-Modell: `docs/VALIDATION_MODEL.md`
- [x] ValidationRule, RuleProfile, Finding, Suppression und FixAction definiert
- [x] harte Domäneninvarianten von normalen Projektbefunden getrennt
- [x] Findings referenzieren stabile Objekt-IDs und LocationHints
- [x] `Nur mit Befunden` und Inspector-Prüfung auf dieselbe Finding-Quelle ausgerichtet
- [x] Exportpolitik, Ignorierungen und spätere inkrementelle Validierung vorbereitet

- [x] Lizenzentscheidung vorbereitet: `docs/LICENSE_STRATEGY.md`
- [x] MPL-2.0, GPL-3.0-or-later und permissive Varianten verglichen
- [x] MPL-2.0 als vorläufigen Favoriten dokumentiert
- [x] aktuelle Lizenzsituation von Slint, egui, iced und wgpu für die Frameworkwahl berücksichtigt
- [x] Katalog-/Herstellerdaten ausdrücklich von der Code-Lizenz getrennt

### Zentrale Entscheidungen

- Fachobjekte werden ausschließlich über stabile interne IDs verknüpft.
- Sichtbare BMK, Klemmenbezeichnungen, Kabelkennzeichen, SPS-Adressen und Seitenangaben sind änderbare Eigenschaften bzw. Formatierungen.
- Symbole sind Darstellungen von Functions; sie sind weder Artikel noch Device.
- Ein Artikelwechsel ist eine kontrollierte Migration der Gerätefunktionen.
- Stromlaufplan, Aufbau, Datenmanager und Dokumentation arbeiten auf derselben Device-Identität.
- Auto-Layout muss deterministisch und positionsstabil sein.
- Klemmen-/Kabelauswertungen sind Projektionen des elektrischen Graphen.
- Jede fachliche Mutation läuft über Commands/Transactions und ist grundsätzlich Undo-fähig.
- `.oecad` besitzt eine explizite Persistenz-/DTO-Schicht und ist kein Binärdump interner Rust-Structs.
- Prüfungen bewerten Projektdaten; `0 Befunde` darf nicht pauschal als elektrische/normative Sicherheit bezeichnet werden.

### P0 verbleibend

- [ ] endgültige Projektlizenz festlegen
- [ ] konkrete stabile ID-Strategie festlegen (UUIDv7/ULID o. ä.)
- [ ] interne CAD-Koordinateneinheit festlegen
- [ ] Titelblock-Expression-Sprache vertiefen
- [ ] SPS/I/O-Modell später detaillieren; für ersten Core nicht blockierend

### Nächster Schritt

**P1 – technische Evaluierung vorbereiten, noch ohne Produktivcode:**

1. Zielarchitektur für Rust Workspace
2. UI-Framework-Spike definieren
3. Canvas-/Renderer-Spike definieren
4. Persistenz-/Roundtrip-Spike definieren
5. Benchmarks und Abnahmekriterien festlegen

---

## 14.10.2026 – Seitentypen und elektrisches Modell

- [x] `docs/SHEET_TYPES.md`
- [x] manuelle, datengetriebene und generierte Seiten getrennt
- [x] technische Projektseite, Dokumentseite und physische PDF-Seite getrennt
- [x] Titelblock-/Rahmen-Templates und Datenbindings vorgesehen
- [x] Dokumentationssets unabhängig von Projektseitenfolge definiert
- [x] `docs/ELECTRICAL_MODEL.md`
- [x] ConnectionPoint, Net, ElectricalConnection und ConnectionPath getrennt
- [x] JunctionNodes für T-Verbindungen
- [x] Linienkreuzung verbindet standardmäßig nicht
- [x] ContinuationNodes für Seitenfortsetzungen
- [x] schaltende Funktionen trennen statische Netze
- [x] Potentialtyp, Renderfarbe und physische Leiterfarbe getrennt

---

## 14.10.2026 – Designsystem und Datenmodell v0.1

- [x] `docs/DESIGN_SYSTEM.md`
- [x] `design/design-tokens.json`
- [x] Light, Dark UI + heller Plan und Full-Dark-Canvas spezifiziert
- [x] Layout-, Typografie-, Farb- und Interaktionstokens festgelegt
- [x] `docs/DATA_MODEL.md`
- [x] `Article → Device → Function → ConnectionPoint → Net/Connection → Placement` als zentrale Fachstruktur
- [x] TE und reale mm-Abmessungen getrennt
- [x] Aufbau, Dokumentation, Revisions- und Prüfgrundmodell aufgenommen

---

## 14.10.2026 – v0 Designiteration 2

- [x] vollständigen v0-Prototyp/ZIP geprüft
- [x] 32 Ansichten ausgewertet und inventarisiert
- [x] v0 als aktuelle bevorzugte UI/UX-Designbasis übernommen
- [x] `Projekt / Stromlaufplan / Aufbau / Daten / Dokumentation` bestätigt
- [x] Ctrl+K Command Palette bestätigt
- [x] permanenter dynamischer Inspector bestätigt
- [x] Dark UI + heller Zeichenbogen als bevorzugter Dark-Standard bestätigt
- [x] Full-Dark-Canvas bleibt optional
- [x] Aufbau, Datenmanager, Dokumentation und UX-Begründungen geprüft

Der Next.js/React-Code ist weiterhin nur Designreferenz; die Produktivanwendung wird eigenständig in Rust entwickelt.

---

## 14.10.2026 – Private Referenzpläne

- [x] private ELCAD- und WSCAD-Beispiele analysiert
- [x] Original-PDFs werden nicht öffentlich gespeichert
- [x] abstrahierte Anforderungen in `docs/REFERENCE_DERIVED_REQUIREMENTS.md`
- [x] vollständige Projekt-PDF als Ziel aufgenommen
- [x] Verteilerfrontansicht mit TE-/Reihenlogik aufgenommen
- [x] N standardmäßig blau, PE grün und weitere Potential-/Verweisfarben konfigurierbar vorgesehen

---

## 13.10.2026 – Projektstart

- [x] GitHub-Projekt `TheNeoIII/OpenE-CAD` angelegt
- [x] Produktvision definiert
- [x] eigenständige Neuentwicklung statt Fork/Port beschlossen
- [x] Rust als primäre Sprache beschlossen
- [x] EPLAN, WSCAD, ELCAD und QElectroTech als Referenzen untersucht
- [x] Eaton als erster Hersteller-Referenzfall vorgesehen
- [x] fünf erste UI-Mockups erstellt
- [x] Light/Dark als gleichwertige Anforderungen aufgenommen
- [x] offene Projekt-/Bibliotheksformate als Ziel festgelegt

## Aktueller Status

**Noch kein Produktivcode.** Die fachliche Spezifikation ist inzwischen breit genug, um gezielte technische Rust-Spikes vorzubereiten, ohne die Domänenarchitektur erst während des Codings erfinden zu müssen.
