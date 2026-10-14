# Technische Core-Entscheidungen vor dem Rust-Spike

Stand: 14.10.2026  
Status: **beschlossen für den ersten technischen Spike**

Dieses Dokument schließt zwei offene Grundlagenfragen: stabile IDs und persistente CAD-Koordinaten.

---

# 1. Persistente Objekt-IDs: UUIDv7

OpenE-CAD verwendet für neu erzeugte persistente Domänenobjekte standardmäßig:

```text
UUID Version 7
```

UUIDv7 ist in RFC 9562 standardisiert und kombiniert einen zeitgeordneten Unix-Epoch-Anteil mit Zufallsanteilen.

## Warum UUIDv7

- offener Standard
- 128 Bit
- keine zentrale Vergabestelle erforderlich
- sehr geringe Kollisionswahrscheinlichkeit
- zeitliche Ordnung verbessert Datenbank-/Indexlokalität
- breit verständliches UUID-Format
- einfacher Austausch mit anderen Systemen
- keine projektspezifische proprietäre ID-Syntax

## Darstellung

Persistiert als kanonischer UUID-String:

```text
xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
```

Intern darf die Rust-Implementierung einen nativen 128-Bit-/UUID-Typ verwenden.

---

# 2. Keine Semantik aus UUID ableiten

Der Zeitanteil ist technisches Merkmal, keine fachliche Eigenschaft.

Unzulässig:

```text
ältere UUID => fachlich ältere Revision
```

Fachliche Zeitstempel und Revisionen bleiben eigene Felder.

---

# 3. Externe öffentliche Tokens

UUIDv7 ist die Objekt-ID im Projekt.

Für später öffentlich teilbare Links/Tokens können separate zufällige Tokens verwendet werden, damit interne Objekt-IDs nicht als Zugriffsgeheimnis missverstanden werden.

```text
object_id != authentication token
```

---

# 4. Import alter/externer IDs

Importer dürfen externe IDs zusätzlich speichern:

```text
external_ids{}
```

OpenE-CAD erzeugt trotzdem eine eigene stabile UUIDv7, sofern kein vertrauenswürdiger nativer OpenE-CAD-Identifier importiert wird.

---

# 5. CAD-Koordinaten: Fixed Point in µm

Persistente 2D-Geometrie verwendet eine ganzzahlige Basiseinheit:

```text
1 interne Coordinate Unit = 1 µm = 0,001 mm
```

Datentyp:

```text
i64
```

Beispiele:

```text
2,5 mm  → 2_500
5 mm    → 5_000
210 mm  → 210_000
1189 mm → 1_189_000
```

---

# 6. Warum keine persistierten f32-Pixelkoordinaten

Pixel hängen ab von:

- Zoom
- DPI
- Bildschirm
- Renderer

Sie sind daher ungeeignet als Projektdaten.

`f32`/`f64` als dauerhafte CAD-Wahrheit kann zudem bei wiederholten Operationen/Serialisierungen Rundungsartefakte erzeugen.

Fixed Point liefert:

- deterministische Werte
- exakte Rasterpunkte
- stabile JSON-Diffs
- reproduzierbare Geometrie
- einfache mm-Konvertierung

---

# 7. Semantische Koordinatentypen

Obwohl beide dieselbe Basiseinheit verwenden, sollen Rust-Typen verschiedene Räume unterscheiden.

Beispiel:

```text
PaperCoord
ModelCoord
ScreenCoord
```

## PaperCoord

Für:

- Stromlaufplan
- Titelblock
- Symbole
- Dokumentgrafik

Einheit: µm auf dem Dokument/Papiermodell.

## ModelCoord

Für:

- reale Verteiler-/Schrankabmessungen
- mechanische Gerätegeometrie
- Montageflächen

Einheit: reale µm.

## ScreenCoord

Nur UI/Renderer:

- logische Pixel
- physische Pixel

Nicht persistent im Projektmodell.

---

# 8. Keine implizite Vermischung von Paper und Model Space

Ein Aufbauplan kann reale Geometrie mit Maßstab auf Papier darstellen.

```text
Model Space
   ↓ scale/transform
Paper Space
   ↓ viewport transform
Screen Space
```

Diese Transformationen werden explizit modelliert.

Ein `ModelCoord` darf nicht versehentlich direkt als `PaperCoord` verwendet werden.

Rust-Newtypes sollen dies möglichst bereits typseitig verhindern.

---

# 9. Point / Size / Rect

Konzeptionell:

```text
Point2<T> { x, y }
Size2<T>  { width, height }
Rect<T>   { origin, size }
```

mit typisiertem Koordinatenraum.

---

# 10. Raster

Rasterwerte werden ebenfalls exakt in µm gespeichert.

Beispiele:

```text
2,5 mm → 2500
5 mm   → 5000
```

Snap:

```text
snapped = round(coord / grid) * grid
```

Das Ergebnis ist wieder ganzzahlig und stabil.

---

# 11. Subgrid

Zusätzliche feinere Fänge können als ganzzahlige Teiler des Basisrasters definiert werden.

Kein kumulativer Floatfehler.

---

# 12. TE-Werte

Teilungseinheiten sind keine Längeneinheit und bleiben separat typisiert.

Persistenzvorschlag:

```text
1 TE = 1000 milli-TE
```

Beispiele:

```text
0,5 TE → 500
1 TE   → 1000
2,5 TE → 2500
36 TE  → 36000
```

Datentyp beispielsweise:

```text
i32
```

UI zeigt wieder Dezimal-TE.

Damit sind TE-Werte ebenfalls ohne Floatdrift speicherbar.

---

# 13. TE ↔ mm

Keine globale feste automatische Gleichsetzung im Core.

Wenn ein Gehäuse-/Reihenprofil einen Pitch definiert:

```text
te_pitch_mm
```

kann für Darstellung umgerechnet werden.

Artikelwerte `width_te` und `width_mm` bleiben dennoch getrennte Datenfelder.

---

# 14. Rotation

Für normale ECAD-Symbole werden vorrangig diskrete Winkel verwendet:

```text
0°
90°
180°
270°
```

Freie grafische Objekte dürfen feinere Rotation besitzen.

Persistenzvorschlag:

```text
rotation_mdeg
1° = 1000 mdeg
```

Damit bleibt auch Rotation deterministisch.

---

# 15. Skalierung

Fachliche Maßstäbe sollen möglichst rational gespeichert werden:

```text
scale_numerator
scale_denominator
```

Beispiele:

```text
1:1   → 1 / 1
1:5   → 1 / 5
2:1   → 2 / 1
```

View-Zoom bleibt dagegen normale UI-Fließkommazahl und wird nicht als CAD-Geometrie interpretiert.

---

# 16. Renderer

Der Renderer darf Fixed-Point-Geometrie beim Aufbau der Render-Scene in `f32`/`f64` umwandeln.

```text
Domain/Persistence: i64 µm
        ↓
Scene transform: f64 falls nötig
        ↓
GPU vertices: f32
```

Die GPU-Repräsentation ist Cache, nicht Projektwahrheit.

---

# 17. Hit Testing

Hit Testing arbeitet idealerweise in Document/Model Space.

Screen Cursor:

```text
screen → inverse viewport transform → paper/model position
```

Danach erfolgt räumliche Suche gegen CAD-Geometrie.

Damit bleibt Auswahl bei verschiedenen DPI/Zoomstufen konsistent.

---

# 18. Toleranzen

Interaktive Klicktoleranz wird in Screen-Pixeln definiert und in den aktuellen Dokumentraum transformiert.

Beispiel:

```text
hit radius = 6 logical px
```

Nicht dauerhaft 1 mm Fangradius im Projektdatensatz speichern.

---

# 19. Geometrie-Indizes

Für große Seiten wird später ein räumlicher Index benötigt, z. B. R-Tree/ähnlich.

Index verwendet Bounds im entsprechenden Koordinatenraum und ist vollständig ableitbarer Cache.

---

# 20. JSON-Repräsentation

Beispiel PaperCoord:

```json
{
  "x_um": 125000,
  "y_um": 87500
}
```

Beispiel TE:

```json
{
  "position_mte": 12500,
  "width_mte": 2500
}
```

Die endgültigen Schema-Feldnamen werden beim ersten stabilen `.oecad`-Schema festgelegt.

---

# 21. Grenzen

`i64` in µm bietet für ECAD praktisch sehr große Reserven.

Trotzdem validiert der Core absurde Werte, damit beschädigte Dateien nicht zu riesigen Render-/Speicheroperationen führen.

---

# 22. Quelle UUIDv7

UUIDv7 ist im IETF-Standard RFC 9562 definiert:

- https://www.rfc-editor.org/rfc/rfc9562.html

RFC 9562 empfiehlt UUIDv7 gegenüber UUIDv1/v6 für neue Systeme, wenn möglich.

---

# 23. Ergebnis

Für den ersten Rust-Spike gelten damit:

```text
Persistent Object ID: UUIDv7
Paper/Model Geometry: signed i64, 1 unit = 1 µm
TE: integer milli-TE
Rotation: integer milli-degree where free rotation is needed
Scale: rational numerator/denominator
Screen geometry: non-persistent floating point
```

Diese Entscheidungen dürfen nur geändert werden, wenn der technische Spike einen konkreten unlösbaren Nachteil zeigt.
