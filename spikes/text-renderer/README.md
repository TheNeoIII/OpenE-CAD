# S2 Technical Text Renderer Spike

Ziel dieses Spikes ist die technische Textdarstellung für den späteren OpenE-CAD-Canvas unabhängig vom Desktop-UI-Framework zu prüfen.

## Kandidat

```text
glyphon 0.12.0
cosmic-text 0.19
wgpu 30.x
```

`glyphon` wird zunächst im experimentellen Renderer-Spike verwendet. Nach erfolgreichem Standalone-Test wird die gleiche Textpipeline zusätzlich direkt mit dem CAD-Renderer kombiniert.

## Geprüfte Inhalte

Der Preview enthält typische ECAD-Texte:

- BMK wie `-K1`, `-F10`, `-X1:12`
- Anschlussbezeichnungen `A1`, `A2`, `13`, `14`
- Potentiale `L1`, `L2`, `L3`, `N`, `PE`
- elektrische Werte wie `230 V AC`, `24 V DC`, `18 A`, `7,5 kW`
- SPS-Adresse `%Q0.3`
- Seiten-/Querverweise wie `/4.1`
- Umlaute, `ß`, `µ`, `Ω`, `Δ`
- Sans-Serif und Monospace
- mehrere kleine technische Schriftgrößen
- Light und Dark Theme

## Reale Windows-Sichtprüfung – 15.10.2026

Der Textpreview wurde auf realer Windows-Hardware in Light und Dark geprüft.

Ergebnis:

- [x] Light Theme sauber lesbar
- [x] Dark Theme sauber lesbar
- [x] Umlaute und technische Zeichen werden korrekt dargestellt
- [x] farbige Potential-/Querverweistexte bleiben gut unterscheidbar
- [x] 9 px sind für technische Beschriftungen bereits leicht lesbar
- [!] 8 px sind noch erkennbar, erfordern aber deutlich genaueres Hinsehen

Daraus folgt für das UI-/Canvas-Design:

- **9 px gilt vorläufig als sinnvolle untere Lesbarkeitsgrenze für regulär sichtbare technische Texte auf dem getesteten Desktop.**
- 8 px wird nicht als normale Zielgröße verwendet, sondern höchstens für sekundäre Details bzw. LOD-Zustände.
- Papier-/Welttext darf beim Herauszoomen kleiner werden; unterhalb eines definierten Screen-Schwellenwerts soll er künftig über LOD ausgeblendet oder vereinfacht werden, statt unleserlich weitergerendert zu werden.
- UI-Texte sind davon getrennt und bleiben grundsätzlich in screen-space.

## Bedienung des Standalone-Spikes

| Taste | Funktion |
|---|---|
| `1` | Light |
| `2` | Dark |
| `R` | neu zeichnen |
| `Esc` | schließen |

## Abnahmekriterien

- [x] kleine BMK-/Anschlusstexte bleiben ab ca. 9 px klar und ruhig lesbar
- [x] keine sichtbaren Glyphenfehler bei deutschen Sonderzeichen und technischen Zeichen
- [x] Light/Dark besitzen vergleichbare Lesbarkeit
- [x] Windows und Linux kompilieren mit derselben Abhängigkeitslinie
- [x] Lösung lässt sich in denselben wgpu-30-Renderpfad integrieren

## Integration in den CAD-Renderer

Unter `spikes/cad-renderer/src/bin/integrated_text.rs` existiert nun ein kombinierter CAD+Text-Spike.

Er bildet technische Texte nicht mehr als feste Bildschirmtexte ab, sondern:

1. hält ihre Position in Papier-/Weltkoordinaten,
2. transformiert den Ankerpunkt über dieselbe Kamera wie die CAD-Geometrie,
3. skaliert die Glyphen entsprechend der aktuellen Pixel/mm-Skalierung,
4. verwendet eine Mindest-Screen-Größe pro Textklasse als erste LOD-Grenze,
5. behält UI-/Interaktionsmarker weiterhin separat in screen-space.

## Noch offen

- Textrotation 90/180/270°
- vertikaler Text
- Alignment-/Anchor-Modell (links/rechts/zentriert, Baseline)
- automatische BMK-Platzierung
- Text-/Symbol-Kollisionserkennung
- größere Textmengen und Culling
- PDF-/SVG-Font-Embedding
- endgültige Auswahl einer mitlieferbaren Open-Source-Schriftart
