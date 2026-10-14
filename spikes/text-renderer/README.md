# S2 Technical Text Renderer Spike

Ziel dieses Spikes ist die technische Textdarstellung für den späteren OpenE-CAD-Canvas unabhängig vom Desktop-UI-Framework zu prüfen.

## Kandidat

```text
glyphon 0.12.0
cosmic-text 0.19
wgpu 30.x
```

`glyphon` wird nur für den experimentellen Renderer-Spike verwendet. Eine endgültige Produktentscheidung wird erst nach visueller und technischer Prüfung getroffen.

## Zu prüfende Inhalte

Der Preview zeigt typische ECAD-Texte:

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

## Bedienung

| Taste | Funktion |
|---|---|
| `1` | Light |
| `2` | Dark |
| `R` | neu zeichnen |
| `Esc` | schließen |

## Abnahmekriterien

- kleine BMK-/Anschlusstexte bleiben klar und ruhig lesbar
- keine sichtbaren Glyphenfehler bei deutschen Sonderzeichen und technischen Zeichen
- Light/Dark besitzen vergleichbare Lesbarkeit
- Windows und Linux kompilieren mit derselben Abhängigkeitslinie
- die Lösung lässt sich später in den unabhängigen wgpu-CAD-Renderer integrieren

## Noch nicht Teil dieses Spikes

- Text in echten Welt-/Papierkoordinaten
- Rotation 90/180/270°
- vertikaler Text
- automatische BMK-Platzierung
- Kollisionserkennung
- PDF-/SVG-Font-Embedding
- endgültige Auswahl einer mitlieferbaren Open-Source-Schriftart
