# OpenE-CAD Produkt-/Plattform-Roadmap

Status: Zielarchitektur für die fertige Web- und Desktop-Anwendung. Diese Datei ergänzt die Editor-/Wiring-Roadmap und legt die spätere Mandanten-, Sharing-, Team-, Default-Daten- und Offline-Desktop-Architektur fest. Editor-Meilensteine wie W4 laufen davon getrennt weiter.

## 1. Produktvarianten

OpenE-CAD soll langfristig zwei klar getrennte Betriebsarten besitzen:

1. **OpenE-CAD Web**
   - serverbasierte Mehrbenutzer-Anwendung
   - öffentliche Registrierung
   - E-Mail-Verifikation vor produktiver Nutzung
   - Benutzer-, Team- und Systemressourcen
   - Rust API + MariaDB/MySQL + private Asset-Ablage außerhalb des Webroots
   - Authentifizierung, Rechte, Quotas, Audit und Sharing serverseitig autoritativ

2. **OpenE-CAD Desktop / Offline**
   - vollständig eigenständige lokale Anwendung
   - kein Login erforderlich
   - keine Abhängigkeit vom Websystem für den Betrieb
   - Projekte werden aus dem lokalen Dateisystem geöffnet und dort gespeichert
   - lokale Bibliotheken und Default-Daten funktionieren offline
   - kein automatischer Cloud-Sync in der ersten Desktop-Ausbaustufe

Web und Desktop verwenden soweit sinnvoll denselben Drawing-/Editor-Core und dasselbe portable `.oecad`-Dateiformat, aber unterschiedliche Backend-Adapter und Persistenzwege.

## 2. Web: Registrierung und Account-Lifecycle

### Ziel

Jeder Benutzer darf sich selbst registrieren. Nach erfolgreicher Verifikation der angegebenen E-Mail-Adresse wird der Account aktiviert und der Benutzer kann OpenE-CAD verwenden.

### Mindestablauf

1. Benutzer registriert sich mit E-Mail-Adresse, Benutzername/Anzeigename und Passwort.
2. Account wird zunächst `pending_verification`.
3. Server versendet einen einmalig verwendbaren Verifikationslink.
4. Verifikationstoken:
   - kryptografisch zufällig
   - serverseitig nur gehasht speichern
   - zeitlich begrenzt
   - nach Verwendung ungültig
   - erneuter Versand möglich
5. Erst nach Verifikation wird der Account `active`.
6. Danach normaler Login; bestehende Planung für TOTP, Passkeys, Session-Cookies, CSRF, Lockout und Audit bleibt bestehen.

Keine öffentliche Registrierung darf serverseitige Admin-Rechte vergeben.

## 3. Mandanten- und Ownership-Modell

Produktive Ressourcen dürfen nicht einfach global sichtbar sein. Jede Ressource benötigt einen eindeutigen Owner-Scope.

Empfohlenes Modell:

```text
OwnerScope
- system
- user:<userId>
- team:<teamId>
```

Eine Ressource besitzt genau einen primären Owner-Scope. Zusätzlicher Zugriff wird über Shares/Grants vergeben.

### Ressourcen, die dieses Modell verwenden sollen

Mindestens:

- Projekte
- benutzerdefinierte Symbole/Bausteine
- Artikeldatenbanken / Produktkataloge
- Kabel-/Leitungskataloge
- Klemmen-/Terminalkataloge
- Vorlagen
- später weitere gemeinsam nutzbare Bibliotheksobjekte

### Sichtbarkeit im normalen Anwendungsbereich

Ein normaler Benutzer sieht ausschließlich:

- eigene Ressourcen
- explizit mit ihm geteilte Ressourcen
- Ressourcen seiner Teams, für die er berechtigt ist
- freigegebene System-/Default-Ressourcen

Nicht sichtbar:

- private Ressourcen anderer Benutzer
- Ressourcen fremder Teams
- administrative globale Verzeichnisse

Diese Filterung muss serverseitig erfolgen. UI-Filter allein sind keine Sicherheitsgrenze.

## 4. Sharing zwischen Benutzern

Benutzer sollen Ressourcen direkt an andere Benutzer freigeben können.

### UX

Freigabe über Eingabe der E-Mail-Adresse des Empfängers.

Server normalisiert die Adresse und löst sie auf den Benutzeraccount auf.

Für noch nicht registrierte Adressen kann optional eine ausstehende Einladung erzeugt werden. Nach Registrierung und Verifikation derselben E-Mail-Adresse kann die Freigabe angenommen werden.

### Empfohlenes Grant-Modell

Nicht nur `shared=true`, sondern explizite Zugriffsrechte:

```text
viewer
editor
```

Owner bleibt Owner und kann Shares entfernen.

Für Bibliotheksinhalte kann die UI zunächst einfacher sein, das Datenmodell sollte jedoch `viewer/editor` bereits erlauben.

### Vererbung

Bei Artikeldatenbanken/Katalogen sollte die Freigabe standardmäßig auf Container-Ebene erfolgen:

```text
Produktkatalog
  -> Artikel 1
  -> Artikel 2
  -> Kabeltypen
  -> ...
```

Die Einträge erben den Zugriff des Katalogs. Einzelne Ausnahmen können später ergänzt werden; nicht sofort eine komplexe ACL pro Datensatz bauen.

## 5. Teams

Benutzer können Teams erstellen.

### Teamrollen

Mindestens:

```text
team_admin
team_member
```

Der Ersteller eines Teams wird erster `team_admin`.

Team-Admins dürfen:

- Mitglieder einladen
- Einladungen widerrufen
- Mitglieder entfernen
- andere Mitglieder zu Admins ernennen
- andere Admins zu Mitgliedern zurückstufen
- Teamressourcen verwalten

### Harte Invariante

Ein Team muss immer mindestens einen aktiven Team-Admin besitzen.

Der letzte Admin darf nicht:

- entfernt werden
- das Team verlassen
- deaktiviert werden
- zu `team_member` zurückgestuft werden

bevor ein anderer aktiver Admin vorhanden ist.

Diese Regel muss serverseitig transaktional erzwungen werden.

### Team-Einladungen

Einladung per E-Mail-Adresse.

Fall A: Account existiert
→ Einladung im Account anzeigen und optional Mail senden.

Fall B: Account existiert noch nicht
→ Pending Invite für die normalisierte E-Mail-Adresse speichern.
→ Nach Registrierung/Verifikation kann die Einladung angenommen werden.

Einladungstoken wie Verifikationstoken einmalig, gehasht und zeitlich begrenzt.

## 6. Team-Ressourcen

Langfristig sollten Ressourcen nicht nur geteilt, sondern auch einem Team gehören können.

Beispiele:

```text
Team "Planungsbüro A"
  Projekte
  Symbole
  Produktkataloge
  Kabelkataloge
  Vorlagen
```

Empfehlung:

- persönliche Ressource kann später explizit in ein Team übertragen/dupliziert werden
- Teamressource gehört dem Team, nicht dem Ersteller
- Ausscheiden des ursprünglichen Erstellers zerstört daher keine Teamdaten
- Team-Admins verwalten Ownership und Freigaben

Keine automatische Eigentumsübertragung nur durch Mitgliedschaft.

## 7. App-Admin / Superadmin

Separat von Teamrollen existiert die globale Anwendungsebene:

```text
app_admin
```

App-Admins können verwalten:

- alle Benutzer
- Verifikations-/Accountstatus
- Teams und Teamrollen
- Einladungen
- Quotas / Speicherverbrauch
- Ressourceneigentümer
- Ressourcestatus
- System-/Default-Bibliotheken
- Audit-/Systemstatus

### Privacy-by-default für fremde Projekte

App-Admin darf fremde Projekte im normalen Adminbereich **nicht öffnen oder zeichnerisch einsehen**.

Anzeigbare Metadaten z. B.:

- Projekt-ID
- Projektname
- Projekttyp
- Owner (Benutzer/Team)
- Erstellungs-/Änderungsdatum
- Dokument-/Asset-Speicherbedarf
- Anzahl Seiten/Assets optional als technische Metadaten
- Status (aktiv/archiviert/gelöscht)

Der Admin kann administrative Aktionen durchführen, ohne den Inhalt des Projektdokuments zu laden.

Beispiele:

- Owner ändern
- Projekt deaktivieren/soft-deleten/wiederherstellen
- Speicher-/Quota-Probleme untersuchen
- Ressourcen einem Account/Team zuordnen

Ein späterer Support-/Notfallzugriff auf Inhalte darf, falls überhaupt gewünscht, nur als separate explizite Funktion mit Audit und zusätzlicher Berechtigung umgesetzt werden; nicht implizit durch `app_admin`.

## 8. System-/Default-Bibliotheken

Vor öffentlicher Freigabe soll OpenE-CAD einen brauchbaren Grundbestand besitzen.

### Default-Inhalte

Mindestens vorbereiten:

- allgemeine elektrische Symbole
- Wiring-/Blockdiagramm-Basissymbole
- typische Netzwerk-/IT-Symbole
- Sicherheitstechnik-Basisobjekte
- Zutrittskontroll-Basisobjekte
- allgemeine Klemmen/Terminals
- Standard-Kabel-/Leitungstypen
- neutrale Artikel-/Produktbeispiele
- Plan-/Seitentemplates
- Verbindungstypen und Darstellungs-Presets

### Datenherkunft

Keine fremden Herstellerdaten ungeprüft in die Default-Datenbank übernehmen.

Zulässige Quellen:

- selbst erstellte generische Datensätze
- offen lizenzierte Datensätze
- Herstellerdaten mit klarer Erlaubnis/Lizenz
- Importpakete, die der Benutzer selbst bereitstellt

Lizenz-/Quellenmetadaten für Default-Pakete vorsehen.

### Versionierung

Systempakete benötigen stabile IDs und Versionen.

Updates dürfen Nutzeranpassungen nicht unkontrolliert überschreiben.

Empfohlen:

```text
system_catalog
catalog_version
system_symbol
symbol_version
```

User-/Team-Kopien werden zu eigenen Ressourcen und bleiben von späteren Systemupdates unabhängig, sofern kein bewusstes Update-Modell implementiert wird.

## 9. Bibliotheksstruktur

Statt alle Artikeldaten global in einer einzigen Tabelle als sichtbare Einheit zu behandeln, soll die UI mit Bibliotheken/Katalogen arbeiten.

Beispiele:

```text
System
  OpenE-CAD Standardartikel
  Standardkabel
  Standardklemmen
  Standardsymbole

Meine Bibliotheken
  Eigene Artikel
  Eigene Symbole

Teams
  Feuerwehr
    Artikel
    Symbole
    Kabel
```

Das erleichtert Ownership, Sharing, Import/Export und Berechtigungen.

## 10. Empfohlenes serverseitiges Datenmodell

Die spätere Rust-/MariaDB-Implementierung sollte mindestens folgende Konzepte enthalten.

### Identity

- users
- email_verification_tokens
- sessions
- passkeys
- totp/recovery data
- audit_events

### Teams

- teams
- team_members
- team_invites

`team_members` mit Rolle `admin|member`.

### Ressourcenzugriff

Bevorzugt gemeinsames Grant-Modell:

```text
resource_grants
- resource_type
- resource_id
- principal_type   user | team
- principal_id
- permission       viewer | editor
```

Owner steht direkt an der Ressource:

```text
owner_type  system | user | team
owner_id    nullable for system
```

Server prüft bei jedem Read/Write:

1. app-admin administrative Sonderrechte
2. Owner
3. Teammitgliedschaft/Rolle
4. explizite Grants
5. System-Sichtbarkeit

### Ressourcen

Phasenweise:

- projects/project_documents/project_assets
- symbols/symbol_versions
- catalogs
- articles/products
- cable_types
- terminal_types
- templates

Nicht sofort alles in einer Migration implementieren; Schema jedoch konsistent mit Owner/Grant-Modell planen.

## 11. App-Admin und Inhaltszugriff trennen

Administrative Metadaten-Endpunkte sollten von Inhalts-Endpunkten getrennt sein.

Beispiel:

```text
GET /admin/projects
```

liefert Metadaten, nicht `CadDocument`.

Normale Inhaltsroute:

```text
GET /projects/:id/document
```

prüft normale Ressourcenberechtigung und darf nicht nur deshalb freigeschaltet werden, weil der Benutzer `app_admin` ist, sofern kein expliziter Support-Inhaltszugriff beschlossen wurde.

Damit ist die gewünschte Datenschutzgrenze technisch nachvollziehbar.

## 12. Audit

Audit erweitern um:

- registration.created
- registration.emailVerified
- registration.verificationResent
- team.created
- team.inviteCreated
- team.inviteAccepted
- team.memberRemoved
- team.roleChanged
- share.created
- share.changed
- share.revoked
- resource.ownerChanged
- catalog.imported
- admin.resourceDisabled
- quota.changed

Keine Inhalte von Projekten, Passwörter, Tokens oder komplette Bibliotheksdatensätze in Audit-Metadaten schreiben.

## 13. Desktop-/Offline-Variante

### Grundsatz

Die Desktop-Anwendung ist **kein Offline-Cache des Websystems**.

Sie ist eine eigenständige lokale Anwendung.

Kein Login.
Kein Benutzerkonto erforderlich.
Kein automatischer Web-Sync.

### Projektworkflow

Desktop:

```text
Datei öffnen
→ .oecad vom lokalen Dateisystem
→ bearbeiten
→ Speichern / Speichern unter
```

Web → Desktop:

```text
Webprojekt exportieren/herunterladen
→ .oecad
→ lokal öffnen
```

Desktop → Web:

```text
lokale .oecad-Datei
→ im Web explizit importieren/hochladen
```

Keine versteckte Synchronisierung oder Merge-Logik in der ersten Version.

## 14. Portables `.oecad`-Format

Das `.oecad`-Format wird die Austauschgrenze zwischen Web und Desktop.

Langfristig sollte es neben dem CadDocument auch benötigte projektlokale Assets transportieren können.

Empfehlung:

```text
project.oecad
  manifest.json
  document.json
  assets/
  embedded-library/   optional
```

Die genaue Containertechnik wird separat festgelegt; wichtig ist die fachliche Portabilität.

Eine Web-Asset-ID darf in einer exportierten Datei nicht die einzige Referenz auf ein benötigtes Bild/Asset bleiben. Export muss die benötigten Dateien einbetten und Import neue lokale/serverseitige IDs erzeugen können.

## 15. Desktop-Persistenz

Projekte bleiben dateibasiert.

Für lokale Desktop-Bibliotheken empfiehlt sich getrennt davon eine lokale Datenbank, voraussichtlich SQLite:

- Default-Symbole
- lokale benutzerdefinierte Symbole
- Artikel-/Produktkataloge
- Kabel
- Klemmen
- Templates

Damit bleibt das Projektformat portabel, während Bibliotheken effizient durchsuchbar sind.

Keine MariaDB-Abhängigkeit in der Offline-Desktop-Anwendung.

## 16. Desktop-Technik

Die bestehende Architektur sieht Tauri als späteres Desktop-Ziel vor. Diese Richtung bleibt sinnvoll, sofern die spätere Evaluierung keinen konkreten Blocker ergibt.

Ziel:

```text
Shared React/Drawing/Editor Core
        |
        +-- Web Backend Adapter
        |     Rust HTTP API
        |
        +-- Desktop Backend Adapter
              Tauri/local filesystem
              SQLite/local assets
```

Keine Authentifizierungslogik aus dem Web in den Offline-Modus erzwingen.

## 17. Entwicklungsphasen

### Phase A – Editor-Kern fertigstellen

Aktueller Schwerpunkt.

- Wiring W4 Semantic Connections
- Editable Paths
- Group & Lock
- Assets
- Templates
- weitere Editor-/Ausgabe-Funktionen

Parallel nur Architekturverträge für Multiuser/Backend festhalten.

### Phase B – Rust Backend Foundation

Vor produktiver Multiuser-Entwicklung:

- Rust/Axum Service
- Konfiguration
- MariaDB Connection Pool
- Migration Runner
- health/readiness
- strukturierte Logs
- Fehlervertrag

### Phase C – Public Identity / Auth

- öffentliche Registrierung
- E-Mail-Verifikation
- Passwortlogin
- Session-Cookies
- CSRF
- Lockout/Rate Limits
- Password Reset
- TOTP
- Passkeys
- Audit
- App-Admin Bootstrap

### Phase D – Multi-Tenant Projects

Vor produktiver Projektmigration unbedingt Owner-Scope einführen.

- user/team/system ownership
- Projektmetadaten
- Projekt-Dokumente
- Projektassets
- serverseitige Visibility
- Quotas/Speicherbedarf
- App-Admin Metadatenansicht ohne Dokumentzugriff

### Phase E – Teams & Sharing

- Teams
- Team Admin/Member
- Last-Admin-Invariante
- Einladungen
- direkte Shares per E-Mail
- viewer/editor grants
- Team-owned resources
- Owner transfer
- Audit

### Phase F – Server-backed Libraries

- Symbols + versions
- catalogs
- articles/products
- cables
- terminals
- templates
- system/user/team ownership
- Grants
- Imports/Exports

Spätestens hier die heute dokumentgebundenen/transitional Library-Teile ablösen.

### Phase G – Default Content / Beta Readiness

Vor öffentlicher Beta:

- kuratierte Systembibliotheken
- Standardartikel
- Standardsymbole
- Kabel-/Terminalgrundbestand
- Wiring Presets
- Templates
- Quellen-/Lizenzmetadaten
- Importwerkzeuge

### Phase H – Desktop Offline

Erst wenn Dateiformat und Editor-Core ausreichend stabil sind:

- Tauri-Hülle
- local filesystem adapter
- `.oecad` Open/Save/Save As
- Asset-Packaging
- lokale SQLite-Bibliothek
- Default-Daten offline mitliefern
- keine Loginpflicht
- keine Cloudabhängigkeit

### Phase I – Web/Desktop Austausch

- Web Export als portable `.oecad`
- Desktop Import
- Desktop Export
- Web Import
- Asset-ID Remapping
- Bibliotheksreferenzen korrekt einbetten/auflösen

Expliziter Datei-Austausch, kein Auto-Sync.

## 18. Migrationsstrategie vom aktuellen Frontend

Heute existieren noch Mock-/transitional Zustände. Deshalb nicht zuerst einzelne API-Endpunkte implementieren und Ownership später ergänzen.

Vor der produktiven Rust-Persistenz verbindlich festlegen:

- User ID
- Team ID
- OwnerScope
- Grant-Modell
- Project Ownership
- Library Ownership
- System Resources

Dann API + DB gemeinsam darauf aufbauen.

Das reduziert spätere Breaking Migrations erheblich.

## 19. Sicherheitsinvarianten

- Server ist autoritativ für alle Berechtigungen.
- Niemals Daten anderer Benutzer laden und nur clientseitig verstecken.
- Öffentliche Registrierung vergibt niemals Admin-Rechte.
- E-Mail-Adressen normalisieren und eindeutig behandeln.
- Verifikations-/Invite-/Reset-Tokens nie im Klartext speichern.
- Letzter Team-Admin serverseitig/transaktional geschützt.
- App-Admin Metadatenzugriff und Projektinhaltszugriff bleiben getrennte Berechtigungen.
- Assets niemals aus fremden Owner-Scope ohne Berechtigung ausliefern.
- Share-/Team-/Owner-Änderungen auditieren.
- User-Deaktivierung löscht Ressourcen nicht automatisch.

## 20. Produktinvarianten

- Eine Ressource besitzt genau einen Owner-Scope.
- Sharing ändert nicht automatisch den Owner.
- Teammitgliedschaft allein macht persönliche Ressourcen nicht zu Teamressourcen.
- Systemdaten sind für normale Benutzer les-/nutzbar, aber nur App-Admins dürfen Systemdefaults verändern.
- Desktop und Web synchronisieren nicht automatisch.
- `.oecad` bleibt die portable Austausch-/Backup-Grenze.
- Desktop funktioniert ohne Internetverbindung und ohne Account.

## 21. Offene Produktentscheidungen

Vor Umsetzung der jeweiligen Phase mit dem Product Owner klären:

1. **Direkte Shares:** Reicht `viewer/editor`, oder soll es zusätzlich `manager`/Weiterfreigabe-Recht geben?
2. **Projekte:** Sollen Projekte ebenfalls direkt per E-Mail an einzelne Benutzer geteilt werden, oder zunächst nur persönliche und Team-Projekte?
3. **Team-Projekte:** Darf jedes Teammitglied Teamprojekte anlegen, oder nur Team-Admins?
4. **Team-Austritt:** Was geschieht mit persönlichen Ressourcen, die lediglich an das Team geteilt wurden? Empfehlung: sie bleiben persönlich und der Share endet nur auf ausdrückliche Aktion.
5. **App-Admin:** Soll es jemals einen expliziten, auditierten Support-Zugriff auf fremde Projektinhalte geben? Empfehlung: standardmäßig nein.
6. **Bibliotheks-Sharing:** Freigabe primär ganzer Kataloge/Bibliotheken oder zusätzlich einzelner Artikel? Empfehlung: zunächst Container/Kataloge, einzelne Symbole separat.
7. **Team-Bibliotheken:** Dürfen normale Mitglieder Team-Bibliotheken editieren oder nur lesen, sofern ein Team-Admin keine zusätzliche Rolle vergibt?
8. **Desktop-Bibliothek:** Soll die Desktop-Anwendung eigene lokale Bibliotheken dauerhaft pflegen können? Empfehlung: ja, lokale SQLite-Bibliothek.
9. **Desktop Updates:** Darf die Offline-App optional online nach Programm-/Defaultpaket-Updates suchen, oder soll sie vollständig ohne Netzwerkfunktionen bleiben?
10. **E-Mail-Versand:** Generisches SMTP aus der vorhandenen Serverumgebung oder externer Transactional-Mail-Provider? Architektur kann providerneutral bleiben.
11. **Quotas:** Soll es pro Benutzer/Team Speicherlimits geben? Für öffentliche Registrierung dringend empfohlen.
12. **Account-Löschung:** Soft-delete/Aufbewahrungsfrist und Transfer von Team-/geteilten Ressourcen müssen vor Public Beta festgelegt werden.

## 22. Empfohlene Entscheidungen für den ersten produktiven Stand

Falls noch keine andere Entscheidung getroffen wurde, ist der pragmatische Start:

- Shares: `viewer` / `editor`
- direkte Shares für Bibliotheken **und Projekte** zulassen
- Teammitglieder dürfen Teamprojekte anlegen; Team-Admins verwalten Mitglieder/Ownership
- mindestens ein Team-Admin zwingend
- App-Admin sieht fremde Projektinhalte standardmäßig nicht
- Bibliotheksfreigabe primär auf Katalogebene; Symbole einzeln teilbar
- Teammitglieder dürfen Teamressourcen standardmäßig lesen; Editierrechte über Resource Grants bzw. Teamregel
- Quotas von Beginn an im Datenmodell vorsehen
- Desktop pflegt lokale Bibliotheken über SQLite
- Desktop darf optional nach Updates suchen, bleibt aber vollständig ohne Netz nutzbar
- SMTP-/Mail-Layer providerneutral abstrahieren

Diese Defaults sind Architekturvorschläge und können vor der jeweiligen Implementierungsphase geändert werden.
