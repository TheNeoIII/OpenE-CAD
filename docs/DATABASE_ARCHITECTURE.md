# Datenbank und privater Storage

Verbindliches Produktionsziel: **MariaDB/MySQL**, InnoDB, utf8mb4 mit explizit gewählter kompatibler Collation. Konkrete Mindestversion und Rust-Treiber vor Serverimplementierung festlegen. SQLite ist nur historischer Spike bzw. mögliche spätere lokale Offline-Desktop-DB, niemals Web-Produktionsziel.

React → OpenEcadBackend → HTTP/Rust → Engineering Core → MariaDB/Storage. Keine SQL-Statements, DB-Zugriffe oder DB-Credentials in React. Domainmodell bleibt fachliche Wahrheit, Persistenzadapter mappt es; kein voreiliges endgültiges CAD-Tabellenschema.

## Verbindliche Regeln

- Versionierte, reviewte Migrationen mit Versions-/Checksummentabelle und serialisiertem Migration-Runner; angewandte Migrationen nicht nachträglich ändern. MariaDB-DDL kann implizit committen: nicht pauschal transaktionales DDL versprechen. Backups und kompatible Expand/Contract-Schritte vor destruktiven Migrationen.
- Prepared Statements / parameterisierte Queries / sichere Query-Builder für **alle** Werte. Niemals ungefilterten Input in SQL konkatenieren. ORDER BY, Tabellen-, Spalten- und Filteridentifier nur über explizite serverseitige Allowlists; Parameter können Identifier nicht absichern.
- UUIDv7 als persistente Domain-ID beibehalten, konsistente Binär-/Textabbildung im Adapter festlegen. Nicht von UUIDs auf Berechtigungen schließen.
- Zusammenhängende Änderungen in InnoDB-Transaktionen: Projekt/Metadaten, Sessionrotation, Recovery-Code-Verbrauch und Sicherheitszähler. Eindeutige Constraints/Foreign Keys, atomare Compare-and-Update-Prüfungen gegen Wiederverwendung und Races.
- Jede Anfrage anhand Session und Objektberechtigung autorisieren. Least-privilege Runtime-DB-Account ohne DDL; Migration-Account getrennt. Keine öffentlichen DB-Ports.

## Kleine konzeptionelle Auth-/Systembasis (noch keine Migration)

| Bereich | Vorgesehene Daten / Regeln |
|---|---|
| users | UUIDv7, normalisierter eindeutiger Login/E-Mail, Anzeige, Argon2id-Hash, Status, Zeitstempel; keine öffentlichen Hashfelder |
| roles / user_roles | admin/user zunächst; additive Zuordnung statt hart codierter UI-Sonderfälle |
| sessions | gehashte zufällige Session-ID, User-/Pre-Auth-Bezug, Ablauf, Widerruf, CSRF-Bindung; Rotate nach Login/Reauth |
| passkeys | Userbezug, Credential-ID eindeutig, Public Key, Counter/Backup-Metadaten, Name; mehrere pro Benutzer |
| totp configuration | verschlüsseltes Secret, Key-Version, bestätigt/aktiv, letztes verbrauchtes Zeitfenster |
| recovery codes | Userbezug, nur Hash, Verbrauchszeitpunkt; atomar einmal verwendbar |
| login attempts / security events | Konto- und IP-Begrenzung, Sperrende, Ereignis, Zeit, begrenzte datenschutzgerechte Aufbewahrung |
| schema migrations | Version, Checksumme, Ausführungsstatus/-zeit |

Argon2id-Parameter, Sessiondauer, Kontosperre, IP-Limiter, TOTP-Key-Rotation und Audit-Retention vor Produktivbetrieb festlegen. Sessions und Loginentscheidungen niemals ausschließlich im Browser abbilden. Siehe [WEB_API.md](WEB_API.md).

## Storage außerhalb des Webroots

`STORAGE_PATH` ist ein absoluter privater Pfad: Assets, Originalimporte, Staging/Temporärdateien, Exporte, Vorschaubilder, Dokumente und optionale Projektsnapshots. Kein LiteSpeed-Alias oder öffentliches Symlinkziel. Kontrollierte Backend-Downloads mit Auth/Objektberechtigung, MIME-/Content-Disposition-Policy, Größenlimits und sicherem Streaming. Benutzerdateinamen niemals als Pfad übernehmen: servergenerierte IDs, normalisierte Pfade innerhalb der Storage-Grenze, Traversal/Symlink-Angriffe verhindern.

Große Dateien standardmäßig **nicht** als DB-BLOB. DB hält IDs, Besitzer/Projekt, Beziehungen, Storage-Referenz, Prüfsumme, MIME-Type und Größe. Uploads zunächst quarantänisieren; DB+Filesystem sind keine gemeinsame Transaktion: staged write, Prüfsumme, atomarer Rename und transaktionale Metadaten mit Wiederanlauf/Orphan-Cleanup planen. Originalimporte unveränderlich halten; Quoten, Aufbewahrung und Bereinigung getrennt von Deployment. Deployment löscht niemals Storage oder DB.

## Austausch und Backup

MariaDB + Server Storage ⇄ Domain Model ⇄ `.oecad`. `.oecad` bleibt portables Import-/Export-/Archivformat und ist kein SQL-Dump. Betriebssicherung umfasst konsistente DB- und Storage-Snapshots plus getrennte sichere Schlüsselverwaltung; Restore testen. Historische Fixed-Point-, UUIDv7-, Paper-/Model-/Screen-Space-, milli-TE-, Snap-, Primitives-, Render-Layer-, Hit-Test- und Text-Spikes bleiben erhalten.
