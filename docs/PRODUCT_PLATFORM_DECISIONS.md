# OpenE-CAD Produktentscheidungen

Status: Verbindlicher Entscheidungsstand zur Zielarchitektur in `PRODUCT_PLATFORM_ROADMAP.md`. Diese Datei löst die dort als offen markierten Entscheidungen 1–8 auf und ergänzt den Vertrag für den optionalen Desktop-Updater.

## Bestätigte Entscheidungen 1–8

1. **Direkte Shares:** `viewer` und `editor` sind für den ersten produktiven Stand ausreichend. Kein zusätzliches `manager`-Recht in der ersten Stufe.
2. **Projekte:** Projekte dürfen zusätzlich zu Teamprojekten direkt per E-Mail-Adresse mit einzelnen Benutzern geteilt werden.
3. **Team-Projekte:** Normale Teammitglieder dürfen Teamprojekte anlegen. Team-Admins verwalten Mitglieder, Rollen und Ownership.
4. **Team-Austritt / persönliche Ressourcen:** Persönliche Ressourcen bleiben persönliches Eigentum. Ein Share an ein Team ändert den Owner nicht und endet nicht automatisch durch eine implizite Eigentumsübertragung.
5. **App-Admin / Projektinhalt:** App-Admins sehen fremde Projekte standardmäßig nur administrativ über Metadaten. Es gibt keinen impliziten Zugriff auf den Zeichnungsinhalt. Ein möglicher späterer Support-/Notfallzugriff wäre eine getrennte, explizite und auditierte Berechtigung.
6. **Bibliotheks-Sharing:** Kataloge/Bibliotheken werden primär als Container geteilt. Symbole dürfen zusätzlich einzeln geteilt werden. Eine komplexe ACL pro Artikeldatensatz ist zunächst nicht vorgesehen.
7. **Team-Bibliotheken:** Teammitglieder sehen Teamressourcen. Schreibrechte werden über die vorgesehene Team-/Resource-Grant-Regel gesteuert; sie sind nicht automatisch aus der bloßen Mitgliedschaft abzuleiten.
8. **Desktop-Bibliothek:** Die Offline-Desktop-Anwendung pflegt eigene lokale Bibliotheken dauerhaft, voraussichtlich in SQLite.

Zusätzlich gilt weiterhin: Ein Team muss immer mindestens einen aktiven Team-Admin besitzen; diese Invariante wird später serverseitig transaktional erzwungen.

## Desktop-Updater – bestätigte Produktentscheidung

Die Desktop-/Offline-Anwendung bleibt ohne Login, ohne Cloud-Abhängigkeit und ohne automatische Projektsynchronisierung vollständig offline nutzbar. Als bewusst begrenzte Netzwerkfunktion erhält sie jedoch einen **optionalen automatischen Update-Checker**.

### Zielverhalten

- Die Anwendung darf selbständig prüfen, ob auf dem offiziellen OpenE-CAD-Updateserver eine neuere Desktop-Version verfügbar ist.
- Die Update-Prüfung darf den normalen Offline-Betrieb niemals blockieren.
- Kein Internet / Timeout / Serverfehler bedeutet ausschließlich: Update-Status derzeit unbekannt. Die Anwendung startet und arbeitet normal weiter.
- Wird eine neuere Version gefunden, zeigt die Anwendung einen klaren Hinweis mit mindestens aktueller Version und verfügbarer Version.
- Optional zusätzlich anzeigen: Release Notes, Downloadgröße und Hinweis auf sicherheitsrelevante Änderungen.
- Der Benutzer entscheidet bei jedem angebotenen Update selbst zwischen mindestens:
  - **Update herunterladen und installieren**
  - **Später / Abbrechen**
- Es gibt **kein erzwungenes Update** im normalen Produktbetrieb.
- Ein abgebrochenes Update darf bei einer späteren Prüfung erneut angeboten werden.
- Zusätzlich soll es eine manuelle Funktion **„Nach Updates suchen“** geben.

### Empfohlene Prüffrequenz

- Automatische Prüfung standardmäßig aktiviert.
- Prüfung beim Programmstart nur dann, wenn seit der letzten erfolgreichen oder versuchten Prüfung ein sinnvolles Intervall vergangen ist, empfohlen etwa 24 Stunden.
- Die Prüfung selbst soll leichtgewichtig sein und nur ein kleines Update-Manifest abrufen.
- Eine Einstellung zum Deaktivieren der automatischen Prüfung kann vorgesehen werden; die manuelle Prüfung bleibt verfügbar.

### Sicherheitsvertrag

Der Updater darf niemals beliebigen heruntergeladenen Code installieren.

Erforderlich für den produktiven Stand:

- Update-Manifest ausschließlich über HTTPS vom offiziellen Update-Endpunkt.
- Versions-/Release-Kanal eindeutig definieren.
- Installationspakete kryptografisch signieren bzw. die vom gewählten Desktop-Framework unterstützte signierte Updatekette verwenden.
- Vor Installation Signatur und/oder einen vertrauenswürdig verankerten kryptografischen Hash verifizieren.
- Manipuliertes, unvollständiges oder nicht verifizierbares Update konsequent ablehnen.
- Updatefehler dürfen bestehende lokale Projekte und Bibliotheken nicht beschädigen.
- Projektdateien und lokale SQLite-Bibliotheken müssen migrationssicher behandelt werden; irreversible Datenmigrationen benötigen vorab eine klare Backup-/Rollback-Strategie.

### Datenschutz

Der Update-Check benötigt keinen Login und soll keine Projekt-, Bibliotheks- oder Zeichnungsdaten übertragen.

Minimaler Request-Kontext reicht aus, beispielsweise:

- aktuelle App-Version
- Plattform/Architektur, sofern für das passende Paket erforderlich
- Release-Kanal

Keine Gerätekennung oder Benutzerprofil-Daten nur für den Update-Check einführen.

### Release-Kanäle

Für den ersten öffentlichen Desktop-Stand genügt:

- `stable`

Die Architektur darf später zusätzlich erlauben:

- `beta`
- `nightly` / `dev`

Diese Kanäle sind nicht Teil des ersten produktiven Umfangs.

### Verhältnis zum Offline-Grundsatz

Der Desktop-Updater ändert die Offline-Architektur nicht:

```text
Offline-Grundbetrieb
- kein Login
- keine Cloudpflicht
- lokale Projekte
- lokale SQLite-Bibliotheken
- kein automatischer Projekt-Sync

Optionale Netzwerkfunktion
- ausschließlich Update-Prüfung / Update-Download nach Benutzerfreigabe
```

Wird die Netzwerkfunktion nie genutzt oder ist dauerhaft kein Internet vorhanden, bleibt die Desktop-Anwendung vollständig funktionsfähig.

## Umsetzung in der Roadmap

Der Update-Checker gehört in die Desktop-Phase, nachdem Editor-Core, `.oecad`-Format und lokale Persistenz stabil genug sind.

Empfohlene Ergänzung zu Phase H – Desktop Offline:

1. Desktop-Hülle / lokaler Backend-Adapter
2. Open / Save / Save As für `.oecad`
3. lokale Assets und SQLite-Bibliotheken
4. Default-Daten offline mitliefern
5. Update-Manifest und manueller Update-Check
6. automatischer Update-Check mit Benutzerbestätigung
7. signierter Download und Installationsworkflow
8. Fehler-/Rollback- und Migrationsprüfung

Der Updater wird **nicht** als Voraussetzung für das Öffnen oder Bearbeiten lokaler Dateien behandelt.

## Weiterhin noch offene Plattformentscheidungen

Die früheren Punkte 1–8 sind entschieden. Vor den jeweiligen Implementierungsphasen bleiben insbesondere noch zu entscheiden:

- konkrete E-Mail-Infrastruktur: bestehendes SMTP vs. externer Transactional-Mail-Provider; der Code bleibt providerneutral
- konkrete Quota-Werte für Benutzer und Teams; Quotas werden von Anfang an im Datenmodell vorgesehen
- Account-Löschung, Aufbewahrungsfrist und Übergabe/Transfer von Ressourcen
- konkrete Desktop-Paketierung/Signierung und Update-Endpunkt, sobald die Desktop-Technik final gewählt wird
- ob später zusätzliche Release-Kanäle neben `stable` angeboten werden
