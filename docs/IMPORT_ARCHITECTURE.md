# Importarchitektur

Status: Vorbereitung, **kein** ELCAD-/EPLAN-Parser. ELCAD-Beispiel folgt später; für EPLAN fehlt ebenfalls eine reale Datei. Proprietäre Dateiformate nicht erraten oder ohne reale Dateien/verifizierte Spezifikationen als unterstützt deklarieren. `.oecad` ist das vorgesehene native Austauschformat, kein bereits fertiger Importer.

Pipeline: Upload → Format Detection → Parser / Adapter → Staging Model → Validation → Mapping Preview → User Confirmation → OpenE-CAD Domain Model. Rust übernimmt Analyse, Limits, Validierung und finalen transaktionalen Import; React kommuniziert nur über OpenEcadBackend. Die aktuelle schlanke Dialog-UI wählt Dateien aus/akzeptiert Drop, nennt den Endungs-Kandidaten und den fehlenden Parser. Sie lädt nichts hoch, führt keine Analyse durch und aktiviert keine Bestätigung.

Vorgesehene logische Rust-Struktur (erst bei Implementierung anlegen):

```text
import/
├─ common/   # Diagnostik, Limits, Staging, Mapping-Verträge
├─ oecad/    # versionierter nativer Adapter
├─ elcad/    # erst nach verifizierter Datei/Spezifikation
└─ eplan/    # erst nach verifizierter Datei/Spezifikation
```

## Reproduzierbarkeit und Diagnostik

Jeder Import liefert Gesamtstatus und objektbezogene Ergebnisse mit Status `imported`, `partially imported`, `skipped`, `unsupported`, `unknown` oder `error`. Je Diagnose: stabiler Code, verständliche Meldung, Schweregrad (info/warning/error), Quelle, soweit vorhanden Zeile/Objekt-ID, Mapping-Hinweis. Nicht interpretierte Elemente werden nie stillschweigend als erfolgreich gemeldet.

Originaldatei unverändert unter privatem STORAGE_PATH archivieren, SHA-256, Adapter-/Formatversion, Optionen, Mapping-Entscheidungen und Quellreferenzen erfassen. Dieselbe Quelle/Version/Optionen ergeben dieselben Staging-Ergebnisse; neue UUIDv7-Domain-IDs beim bestätigten Import deterministisch über gespeicherte Quellzuordnung nachvollziehbar machen (keine Garantie identischer neu erzeugter UUIDs bei getrennten Importen).

Staging ist besitzergebunden, zeitlich begrenzt und noch kein Projekt. Vorschau zeigt übernehmbare Objekte, ungelöste Zuordnungen, Warnungen und Fehler; erst ausdrückliche Bestätigung mit Staging-Version/Checksumme übernimmt Daten. Idempotente Bestätigung und transaktionale Domainübernahme verhindern Doppelimport. Analyseabbruch verändert kein Projekt; Fehler behalten reproduzierbare Diagnostik.

## Sicherheitsgrenzen

Authentifizierung, CSRF, Besitzer-/Projektprüfung, Größen-/Zeit-/Speicherlimits, entpackte Maximalgröße und Datei-Anzahl begrenzen. Archive gegen Traversal, Symlinks und Zip-Bombs prüfen. Format anhand Inhalt/Spezifikation statt bloßer Endung erkennen. Kein Code aus Importen ausführen; eingebettetes SVG/HTML und Fremdreferenzen sicher behandeln. Storagepfade servergeneriert, Downloads kontrolliert, keine direkten öffentlichen Dateipfade. Vor Backend-Implementierung Upload-/Staging-/Mapping-/Confirm-DTOs und Abbruch-/Cleanup-Vertrag festlegen; POST /api/import ist nur vorgesehener Einstieg, noch keine implementierte API.
