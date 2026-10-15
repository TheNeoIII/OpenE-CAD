# S3 egui – erste reale UX-Rückmeldung

Stand: 15.10.2026

## Vergleichsbasis

Verglichen wurden die erste Windows-egui-Preview und das vorhandene v0-UX-Konzept für Projektübersicht und Stromlaufplan.

## Rückmeldung

1. Die egui-Variante ist technisch ein brauchbarer Anfang, muss optisch aber deutlich näher an das v0-Design geführt werden. Betroffen sind vor allem Abstände, Akzentfarben, Flächenfarben, Toolbar-/Tab-Styling und Informationsdichte.
2. Die Projektseite wich strukturell zu stark vom v0-Konzept ab. Die erste Preview mit drei simplen Projektkarten wird verworfen.
3. Die Theme-Umschaltung benötigt drei Modi statt nur Light/Dark:
   - helle UI + helle Zeichnung,
   - dunkle UI + dunkle Zeichnung,
   - dunkle UI + helle Zeichnung.

## Konsequenzen für egui v2

- v0-nahe dunkle Farbpalette und Cyan-Akzent
- kompaktere App-Bar und kontextuelle Toolbar
- Projektansicht mit eigener Projektliste links
- zentrale Projektzusammenfassung mit Metadaten, Aktionen, Statistik und Seitenliste
- offene Punkte/Prüfung rechts mit Fehlern, Warnungen und Hinweisen
- Stromlaufplan-Navigator stärker an die v0-Seitenhierarchie angenähert
- Inspector dichter und tabellarischer aufgebaut
- drei explizite Darstellungsmodi
- bei `Dark + helle Zeichnung` bleibt die Workbench dunkel, der Dokumentbogen selbst wird hell dargestellt

## Evaluierungsregel

Die optische Nähe zu v0 ist ein relevanter S3-Bewertungspunkt, darf aber Renderer-Integration, große Tabellen/Tree-Ansichten, Tastaturbedienung und Langzeitwartbarkeit nicht überstimmen. Die Vergleichskandidaten iced und Slint sollen dieselbe visuelle Zielrichtung erhalten.
