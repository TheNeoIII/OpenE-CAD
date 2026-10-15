// SPDX-License-Identifier: MPL-2.0

slint::slint! {
    component TabButton inherits Rectangle {
        in property <string> label;
        in property <bool> selected;
        callback clicked;
        height: 32px;
        width: 108px;
        background: selected ? #123b46 : transparent;
        border-radius: 3px;
        Text {
            text: root.label;
            color: selected ? #37c5e3 : #b8c0c5;
            font-size: 13px;
            horizontal-alignment: center;
            vertical-alignment: center;
        }
        TouchArea { clicked => { root.clicked(); } }
    }

    component SmallButton inherits Rectangle {
        in property <string> label;
        in property <bool> primary: false;
        callback clicked;
        height: 28px;
        min-width: 72px;
        background: primary ? #177f9b : #25292c;
        border-color: primary ? #2cc0df : #41474b;
        border-width: 1px;
        border-radius: 3px;
        Text {
            text: root.label;
            color: primary ? white : #d3d9dc;
            font-size: 11px;
            horizontal-alignment: center;
            vertical-alignment: center;
        }
        TouchArea { clicked => { root.clicked(); } }
    }

    component MetricBox inherits Rectangle {
        in property <string> label;
        in property <string> value;
        height: 58px;
        background: #1d2022;
        border-color: #343a3e;
        border-width: 1px;
        Text { x: 10px; y: 8px; text: root.label; color: #8e999f; font-size: 10px; }
        Text { x: 10px; y: 27px; text: root.value; color: #e2e7e9; font-size: 16px; }
    }

    component Finding inherits Rectangle {
        in property <string> title;
        in property <string> subtitle;
        in property <color> dot-color: #e2524d;
        height: 48px;
        background: transparent;
        Rectangle { x: 2px; y: 11px; width: 7px; height: 7px; border-radius: 4px; background: root.dot-color; }
        Text { x: 17px; y: 5px; text: root.title; color: #e2e7e9; font-size: 11px; }
        Text { x: 17px; y: 23px; text: root.subtitle; color: #818b91; font-size: 9px; }
    }

    export component MainWindow inherits Window {
        title: "OpenE-CAD S3 Slint Shell";
        width: 1600px;
        height: 1000px;
        background: #17191b;

        in-out property <int> workspace: 0;
        in-out property <int> display-mode: 1; // 0 light, 1 dark UI + paper, 2 full dark
        in-out property <bool> palette-open: false;

        // top application bar
        Rectangle {
            x: 0; y: 0; width: parent.width; height: 42px;
            background: root.display-mode == 0 ? #f5f6f7 : #1a1d1f;
            border-color: root.display-mode == 0 ? #d8dde0 : #303539;
            border-width: 1px;
            Text { x: 12px; y: 5px; text: "⚡  Lindenstraße 12"; color: root.display-mode == 0 ? #202428 : #e7ecee; font-size: 14px; font-weight: 700; }
            Text { x: 28px; y: 23px; text: "+UV2 · Rev. B"; color: #7f8a90; font-size: 9px; }

            TabButton { x: 165px; y: 5px; label: "Projekt"; selected: root.workspace == 0; clicked => { root.workspace = 0; } }
            TabButton { x: 274px; y: 5px; label: "Stromlaufplan"; selected: root.workspace == 1; clicked => { root.workspace = 1; } }
            TabButton { x: 383px; y: 5px; label: "Aufbau"; selected: root.workspace == 2; clicked => { root.workspace = 2; } }
            TabButton { x: 492px; y: 5px; label: "Daten"; selected: root.workspace == 3; clicked => { root.workspace = 3; } }
            TabButton { x: 601px; y: 5px; label: "Dokumentation"; selected: root.workspace == 4; clicked => { root.workspace = 4; } }

            Rectangle {
                x: parent.width / 2 - 205px; y: 7px; width: 410px; height: 28px;
                background: root.display-mode == 0 ? #eceff1 : #222629;
                border-color: root.display-mode == 0 ? #d1d6da : #343a3e;
                border-width: 1px; border-radius: 4px;
                Text { x: 12px; y: 6px; text: "⌕  Gerät, Artikel, Seite, Befehl …"; color: #929da3; font-size: 11px; }
                Text { x: 358px; y: 6px; text: "Ctrl K"; color: #737d82; font-size: 9px; }
                TouchArea { clicked => { root.palette-open = !root.palette-open; } }
            }
            Text { x: parent.width - 235px; y: 13px; text: "UX-Konzept"; color: #7e898f; font-size: 10px; }
            Rectangle {
                x: parent.width - 155px; y: 7px; width: 104px; height: 28px;
                background: #25292c; border-color: #3a4145; border-width: 1px; border-radius: 3px;
                Text { text: root.display-mode == 0 ? "Hell" : root.display-mode == 1 ? "Dunkel + Papier" : "Dunkler Plan"; color: #d8dde0; font-size: 9px; horizontal-alignment: center; vertical-alignment: center; }
                TouchArea { clicked => { root.display-mode = (root.display-mode + 1) % 3; } }
            }
            Text { x: parent.width - 38px; y: 13px; text: "MK"; color: #38c1df; font-size: 11px; }
        }

        // PROJECT WORKSPACE
        if root.workspace == 0: Rectangle {
            x: 0; y: 42px; width: parent.width; height: parent.height - 66px;
            background: root.display-mode == 0 ? #f2f4f5 : #17191b;

            Rectangle {
                x: 0; y: 0; width: 305px; height: parent.height;
                background: root.display-mode == 0 ? #f7f8f9 : #1b1e20;
                border-color: root.display-mode == 0 ? #d9dde0 : #303539; border-width: 1px;
                Text { x: 10px; y: 10px; text: "PROJEKTE"; color: #818d93; font-size: 9px; }
                Rectangle { x: 9px; y: 31px; width: 287px; height: 30px; background: root.display-mode == 0 ? #ffffff : #222629; border-color: #343a3e; border-width: 1px; border-radius: 3px; Text { x: 9px; y: 7px; text: "⌕  Projekte durchsuchen"; color: #7f898f; font-size: 10px; } }
                Rectangle { x: 7px; y: 72px; width: 291px; height: 60px; background: #123641; border-radius: 3px; Text { x: 10px; y: 8px; text: "Lindenstraße 12 · Wohn- und Geschäftshaus"; color: #e4eaec; font-size: 11px; font-weight: 700; } Text { x: 10px; y: 28px; text: "UV2 · Rev. B · 10 Seiten"; color: #71a9b6; font-size: 9px; } Text { x: 238px; y: 28px; text: "vor 4 min"; color: #718087; font-size: 8px; } }
                Text { x: 17px; y: 148px; text: "Halle 3 · Lüftungssteuerung"; color: root.display-mode == 0 ? #30363a : #d0d6d9; font-size: 11px; }
                Text { x: 17px; y: 168px; text: "SV1 · Rev. D · 34 Seiten                      gestern"; color: #768187; font-size: 9px; }
                Text { x: 17px; y: 201px; text: "Praxis Dr. Seidel · Zählerschrank"; color: root.display-mode == 0 ? #30363a : #d0d6d9; font-size: 11px; }
                Text { x: 17px; y: 221px; text: "ZS1 · Rev. A · 8 Seiten                     12.10.2026"; color: #768187; font-size: 9px; }
                Text { x: 17px; y: 254px; text: "EFH Brandt · Hausverteiler"; color: root.display-mode == 0 ? #30363a : #d0d6d9; font-size: 11px; }
                Text { x: 17px; y: 274px; text: "HV · Rev. C · 6 Seiten                      08.10.2026"; color: #768187; font-size: 9px; }
                Text { x: 17px; y: 307px; text: "Werkstatt Kühn · Maschinen-UV"; color: root.display-mode == 0 ? #30363a : #d0d6d9; font-size: 11px; }
                Text { x: 17px; y: 327px; text: "UV1 · Rev. A · 14 Seiten                    01.10.2026"; color: #768187; font-size: 9px; }
                Rectangle { x: 0; y: parent.height - 150px; width: parent.width; height: 1px; background: #343a3e; }
                Text { x: 10px; y: parent.height - 135px; text: "NEU AUS VORLAGE"; color: #7f8a90; font-size: 9px; }
                Text { x: 16px; y: parent.height - 108px; text: "▱  Wohnungsverteiler"; color: #d2d8db; font-size: 10px; }
                Text { x: 16px; y: parent.height - 78px; text: "▱  Gewerbe-Unterverteilung"; color: #d2d8db; font-size: 10px; }
                Text { x: 16px; y: parent.height - 48px; text: "▱  Steuerung mit SPS"; color: #d2d8db; font-size: 10px; }
            }

            Rectangle {
                x: 305px; y: 0; width: parent.width - 645px; height: parent.height;
                background: root.display-mode == 0 ? #ffffff : #181b1d;
                Text { x: 22px; y: 18px; text: "=ANL · +UV2 · Rev. B · zuletzt bearbeitet vor 4 min von M. Krüger"; color: #7e8a90; font-size: 9px; }
                Text { x: 22px; y: 43px; text: "Lindenstraße 12 · Wohn- und Geschäftshaus"; color: root.display-mode == 0 ? #20262a : #e4e9eb; font-size: 20px; font-weight: 700; }
                Text { x: 22px; y: 73px; text: "Unterverteilung EG Gewerbe · 400/230 V TN-S · Referenzhersteller Eaton"; color: #7d898f; font-size: 10px; }
                SmallButton { x: 22px; y: 103px; width: 175px; label: "Weiterarbeiten · Seite 3 →"; primary: true; clicked => { root.workspace = 1; } }
                SmallButton { x: 205px; y: 103px; width: 120px; label: "▦ Aufbau +UV2"; clicked => { root.workspace = 2; } }
                SmallButton { x: 333px; y: 103px; width: 118px; label: "▤ Datenmanager"; clicked => { root.workspace = 3; } }
                SmallButton { x: 459px; y: 103px; width: 104px; label: "⌕ Suchen"; clicked => { root.palette-open = true; } }

                MetricBox { x: 22px; y: 150px; width: (parent.width - 58px) / 4; label: "Seiten"; value: "10"; }
                MetricBox { x: 28px + (parent.width - 58px) / 4; y: 150px; width: (parent.width - 58px) / 4; label: "Betriebsmittel"; value: "77"; }
                MetricBox { x: 34px + (parent.width - 58px) / 2; y: 150px; width: (parent.width - 58px) / 4; label: "Klemmen"; value: "10"; }
                MetricBox { x: 40px + 3 * (parent.width - 58px) / 4; y: 150px; width: (parent.width - 58px) / 4 - 18px; label: "Prüfung"; value: "3 Fehler · 6 Warn."; }

                Text { x: 22px; y: 235px; text: "SEITEN"; color: #839097; font-size: 9px; }
                for page[i] in ["1   Deckblatt", "2   Einspeisung HAK → UV2", "3   Verteilung +UV2 · Abgänge EG", "4   Verteilung +UV2 · Abgänge OG", "5   Steuerung Lüftung 24 V DC                ●", "6   easyE4 · Ein-/Ausgänge                    ●", "7   Abgänge Büro", "8   Abgänge Lager / Außen", "20  Aufbauplan +UV2                           ●", "21  Klemmenplan -X1"] : Rectangle {
                    x: 22px; y: 258px + i * 38px; width: parent.width - 44px; height: 34px;
                    background: root.display-mode == 0 ? #f9fafb : #1b1f21; border-color: root.display-mode == 0 ? #e2e5e7 : #30363a; border-width: 1px; border-radius: 2px;
                    Text { x: 10px; y: 8px; text: page; color: root.display-mode == 0 ? #30363a : #d7dde0; font-size: 10px; }
                }
            }

            Rectangle {
                x: parent.width - 340px; y: 0; width: 340px; height: parent.height;
                background: root.display-mode == 0 ? #f7f8f9 : #1b1e20; border-color: #303539; border-width: 1px;
                Text { x: 12px; y: 12px; text: "OFFENE PUNKTE"; color: #849097; font-size: 9px; }
                Text { x: 12px; y: 40px; text: "FEHLER 3"; color: #a9b2b7; font-size: 9px; font-weight: 700; }
                Finding { x: 12px; y: 58px; width: parent.width - 24px; title: "Reihe 3: 39 / 36 TE"; subtitle: "Aufbau · Verteilerreihe +UV2 überbelegt um 3 TE"; }
                Finding { x: 12px; y: 108px; width: parent.width - 24px; title: "BMK doppelt: -F30"; subtitle: "Kennzeichnung · Licht Büro / Steckdosen Büro"; }
                Finding { x: 12px; y: 158px; width: parent.width - 24px; title: "Potentialkonflikt Seite 6.4"; subtitle: "24 V DC direkt mit N verbunden"; }
                Text { x: 12px; y: 220px; text: "WARNUNGEN 6"; color: #a9b2b7; font-size: 9px; font-weight: 700; }
                Finding { x: 12px; y: 238px; width: parent.width - 24px; dot-color: #e4aa38; title: "Artikel fehlt: -E1"; subtitle: "Artikel · Leuchte Werkstatt"; }
                Finding { x: 12px; y: 288px; width: parent.width - 24px; dot-color: #e4aa38; title: "Nicht in Frontansicht platziert: -K9"; subtitle: "Aufbau · Schütz Torantrieb"; }
                Finding { x: 12px; y: 338px; width: parent.width - 24px; dot-color: #e4aa38; title: "Gerätebreite fehlt: -F60"; subtitle: "Aufbau · TE erforderlich"; }
                Text { x: 12px; y: parent.height - 145px; text: "SCHNELLSTART"; color: #849097; font-size: 9px; }
                Text { x: 12px; y: parent.height - 115px; text: "Suchen / Befehl                             Ctrl K"; color: #aeb7bc; font-size: 9px; }
                Text { x: 12px; y: parent.height - 90px; text: "Einfügen                                             I"; color: #aeb7bc; font-size: 9px; }
                Text { x: 12px; y: parent.height - 65px; text: "Leitung                                              W"; color: #aeb7bc; font-size: 9px; }
                Text { x: 12px; y: parent.height - 40px; text: "Rückgängig                                     Ctrl Z"; color: #aeb7bc; font-size: 9px; }
            }
        }

        // Shared engineering workspace for schematic / cabinet / data / docs
        if root.workspace != 0: Rectangle {
            x: 0; y: 42px; width: parent.width; height: parent.height - 66px;
            background: root.display-mode == 0 ? #e4e7e9 : #111315;

            Rectangle {
                x: 0; y: 0; width: parent.width; height: 34px; background: root.display-mode == 0 ? #f8f9fa : #1a1d1f; border-color: #303539; border-width: 1px;
                Text { x: 10px; y: 9px; text: "▣    ↖    ⌁    T     Symbol, Makro, Artikel …      ↶   ↷"; color: root.display-mode == 0 ? #4b555a : #aeb8bd; font-size: 10px; }
                Text { x: parent.width - 240px; y: 9px; text: "-K1 Schütz Motor Lüftung    Seite 3 / 10"; color: #35bddc; font-size: 10px; }
            }

            if root.workspace == 1: Rectangle {
                x: 0; y: 34px; width: parent.width; height: parent.height - 34px;
                Rectangle {
                    x: 0; y: 0; width: 250px; height: parent.height; background: root.display-mode == 0 ? #f7f8f9 : #1b1e20; border-color: #303539; border-width: 1px;
                    Text { x: 8px; y: 8px; text: "Seiten   Betriebsmittel   Klemmen   Kabel   SPS"; color: #aeb8bd; font-size: 9px; }
                    Rectangle { x: 8px; y: 34px; width: 234px; height: 29px; background: root.display-mode == 0 ? white : #222629; border-color: #343a3e; border-width: 1px; Text { x: 8px; y: 7px; text: "⌕ Seiten filtern"; color: #7f898f; font-size: 9px; } }
                    Text { x: 12px; y: 76px; text: "⌄ =ANL Lindenstraße 12"; color: #c9d0d3; font-size: 10px; }
                    Text { x: 24px; y: 98px; text: "⌄ +UV2 Unterverteilung EG"; color: #c9d0d3; font-size: 10px; }
                    for p[i] in ["1 Deckblatt", "2 Einspeisung HAK → UV2", "3 Verteilung +UV2 · Abgänge EG", "4 Verteilung +UV2 · Abgänge OG", "5 Steuerung Lüftung 24 V DC   ●", "6 easyE4 · Ein-/Ausgänge       ●", "7 Abgänge Büro", "8 Abgänge Lager / Außen", "20 Aufbauplan +UV2            ●", "21 Klemmenplan -X1"] : Text { x: 38px; y: 128px + i * 29px; text: p; color: i == 2 ? #36c0df : #c9d0d3; font-size: 9px; }
                }

                Rectangle {
                    x: 250px; y: 0; width: parent.width - 560px; height: parent.height;
                    background: root.display-mode == 0 ? #dce0e3 : #0f1113;
                    Rectangle {
                        x: 22px; y: 22px; width: parent.width - 44px; height: parent.height - 44px;
                        background: root.display-mode == 2 ? #202427 : #fbfcfd;
                        border-color: #69747a; border-width: 1px;
                        for gx in 39: Rectangle { x: gx * parent.width / 39; y: 0; width: 1px; height: parent.height; background: root.display-mode == 2 ? #343a3e : #e9edef; }
                        for gy in 25: Rectangle { x: 0; y: gy * parent.height / 25; width: parent.width; height: 1px; background: root.display-mode == 2 ? #343a3e : #e9edef; }
                        Rectangle { x: 40px; y: 75px; width: parent.width - 80px; height: 1px; background: root.display-mode == 2 ? #e9edef : #252b2f; }
                        Rectangle { x: 40px; y: 95px; width: parent.width - 80px; height: 1px; background: root.display-mode == 2 ? #e9edef : #252b2f; }
                        Rectangle { x: 40px; y: 115px; width: parent.width - 80px; height: 1px; background: root.display-mode == 2 ? #e9edef : #252b2f; }
                        Rectangle { x: 40px; y: 135px; width: parent.width - 80px; height: 1px; background: #238edc; }
                        Rectangle { x: 230px; y: 75px; width: 1px; height: 330px; background: root.display-mode == 2 ? #e9edef : #252b2f; }
                        Rectangle { x: 420px; y: 75px; width: 1px; height: 330px; background: root.display-mode == 2 ? #e9edef : #252b2f; }
                        Rectangle { x: 610px; y: 75px; width: 1px; height: 330px; background: root.display-mode == 2 ? #e9edef : #252b2f; }
                        Rectangle { x: parent.width * .67; y: 135px; width: 1px; height: 190px; background: #238edc; }
                        Rectangle { x: parent.width * .67; y: 325px; width: 80px; height: 1px; background: #d95257; }
                        Rectangle { x: 40px; y: parent.height - 80px; width: parent.width - 80px; height: 1px; background: #299b59; }
                        Text { x: 38px; y: 48px; text: "/2.8"; color: #ec7e1f; font-size: 9px; }
                        Text { x: parent.width - 65px; y: 48px; text: "/4.1"; color: #ec7e1f; font-size: 9px; }
                        Text { x: parent.width * .67 - 24px; y: 300px; text: "-K1"; color: root.display-mode == 2 ? #e5eaec : #252b2f; font-size: 10px; }
                        Text { x: parent.width * .67 - 30px; y: 350px; text: "Schütz Motor Lüftung"; color: root.display-mode == 2 ? #e5eaec : #252b2f; font-size: 9px; }
                    }
                }

                Rectangle {
                    x: parent.width - 310px; y: 0; width: 310px; height: parent.height; background: root.display-mode == 0 ? #f7f8f9 : #1b1e20; border-color: #303539; border-width: 1px;
                    Text { x: 10px; y: 9px; text: "Eigenschaften      Prüfung  10"; color: #43c4e1; font-size: 10px; }
                    Text { x: 10px; y: 42px; text: "-K1"; color: root.display-mode == 0 ? #242a2e : #e3e8ea; font-size: 18px; font-weight: 700; }
                    Text { x: 10px; y: 67px; text: "Schütz Motor Lüftung"; color: #aab3b7; font-size: 10px; }
                    Text { x: 10px; y: 86px; text: "=ANL+UV2-K1 · Leistungsschütz 3S+1S"; color: #707a80; font-size: 8px; }
                    Text { x: 10px; y: 132px; text: "⌄ KENNZEICHNUNG"; color: #818c92; font-size: 9px; }
                    Text { x: 13px; y: 160px; text: "BMK                         -K1\nFunktion                    Schütz Motor Lüftung\nEinbauort                   +UV2\nVerteiler                   UV2\nReihe                       2"; color: #c9d0d3; font-size: 9px; line-height: 1.8; }
                    Text { x: 10px; y: 280px; text: "⌄ ARTIKEL"; color: #818c92; font-size: 9px; }
                    Text { x: 13px; y: 308px; text: "Hersteller                  Eaton\nArtikelnr.                   DILM17-10(230V50HZ)\nTyp                          Leistungsschütz 3S+1S"; color: #c9d0d3; font-size: 9px; line-height: 1.8; }
                    Text { x: 10px; y: 390px; text: "⌄ ELEKTRISCHE DATEN"; color: #818c92; font-size: 9px; }
                    Text { x: 13px; y: 418px; text: "Bemessungsstrom             18 A\nLeistung AC-3                7,5 kW\nSpulenspannung               230 V AC\nHilfskontakte                1 S (13–14)"; color: #c9d0d3; font-size: 9px; line-height: 1.8; }
                }
            }

            if root.workspace == 2: Rectangle {
                x: 0; y: 34px; width: parent.width; height: parent.height - 34px;
                Text { x: 18px; y: 16px; text: "AUFBAU +UV2     Verteiler · 4 Reihen · 36 TE"; color: #dbe1e4; font-size: 12px; }
                Rectangle { x: 250px; y: 50px; width: parent.width - 560px; height: parent.height - 90px; background: root.display-mode == 0 ? white : #202426; border-color: #4c555a; border-width: 1px;
                    for ri in 4: Rectangle { x: 45px; y: 65px + ri * 165px; width: parent.width - 90px; height: 115px; background: transparent; border-color: ri == 2 ? #e2524d : #7b858a; border-width: 1px;
                        for te in 36: Rectangle { x: te * parent.width / 36; y: 0; width: 1px; height: parent.height; background: #3b4246; }
                        for di in 6: Rectangle { x: 12px + di * 90px; y: 14px; width: di % 2 == 0 ? 42px : 62px; height: 82px; background: transparent; border-color: #25b9da; border-width: 1px; }
                    }
                }
                Text { x: 18px; y: 65px; text: "Reihe 1   21 / 36 TE\n\nReihe 2   24 / 36 TE\n\nReihe 3   39 / 36 TE  ●\n\nReihe 4   30 / 36 TE"; color: #cad1d4; font-size: 10px; line-height: 2.4; }
                Text { x: parent.width - 285px; y: 65px; text: "EIGENSCHAFTEN\n\n-F13\nLeitungsschutz Büro\n\nHersteller       Eaton\nBreite           1 TE\nReihe            3\nPosition         17 TE\n\nPRÜFUNG\n● Reihe 3 überbelegt: 39 / 36 TE\n● 2 Geräte noch nicht platziert"; color: #cad1d4; font-size: 9px; line-height: 1.7; }
            }

            if root.workspace == 3: Rectangle {
                x: 0; y: 34px; width: parent.width; height: parent.height - 34px; background: root.display-mode == 0 ? #fafbfc : #181b1d;
                Text { x: 12px; y: 12px; text: "Betriebsmittel   Klemmen   Verbindungen   Kabel   SPS / I/O   Material   Potentiale   Texte"; color: #36c0df; font-size: 10px; }
                Text { x: 12px; y: 46px; text: "☐ Nur mit Befunden     Spalten     Suchen und Ersetzen     Mehrfachänderung"; color: #aeb7bc; font-size: 10px; }
                Text { x: 12px; y: 86px; text: "BMK            Funktion                                  Ort             Hersteller               Artikel                         Status"; color: #869198; font-size: 9px; }
                for dr in 22: Rectangle { x: 8px; y: 110px + dr * 30px; width: parent.width - 330px; height: 28px; background: dr == 0 ? #173b46 : transparent; border-color: #2d3336; border-width: 1px; Text { x: 8px; y: 7px; text: "-K" + (dr + 1) + "            Funktion " + (dr + 1) + "                         +UV2            Eaton                    ART-0000" + (dr + 1) + "                  ✓ OK"; color: dr == 0 ? #e7edef : #c3cbcf; font-size: 8px; } }
                Rectangle { x: parent.width - 310px; y: 0; width: 310px; height: parent.height; background: root.display-mode == 0 ? #f5f7f8 : #1b1e20; border-color: #303539; border-width: 1px; Text { x: 12px; y: 12px; text: "PROJEKTPRÜFUNG\n\n3 Fehler · 6 Warnungen\n\n● BMK doppelt: -F30\n\n● Potentialkonflikt Seite 6.4\n\n● Artikel fehlt: -E1\n\n● Reihe 3 überbelegt"; color: #cbd2d5; font-size: 10px; line-height: 1.6; } }
            }

            if root.workspace == 4: Rectangle {
                x: 0; y: 34px; width: parent.width; height: parent.height - 34px; background: root.display-mode == 0 ? #f5f7f8 : #181b1d;
                Rectangle { x: 0; y: 0; width: 250px; height: parent.height; background: root.display-mode == 0 ? white : #1b1e20; border-color: #303539; border-width: 1px; Text { x: 12px; y: 12px; text: "DOKUMENTSTRUKTUR\n\nDeckblatt\n\nInhaltsverzeichnis\n\nAufbauplan\n\nStromlaufpläne\n\nStückliste\n\nKlemmenplan\n\nKabelliste"; color: #cbd2d5; font-size: 10px; line-height: 1.5; } }
                Text { x: 285px; y: 28px; text: "Vorschau · Stückliste"; color: #dce2e4; font-size: 16px; }
                Rectangle { x: 285px; y: 62px; width: parent.width - 645px; height: parent.height - 115px; background: root.display-mode == 0 ? white : #222629; border-color: #40474b; border-width: 1px; Text { x: 20px; y: 20px; text: "A3 quer · Titelblock · Revision B\n\nPos.   BMK          Hersteller          Artikel\n────────────────────────────────────────────\n1      -K1          Eaton               DILM17-10\n2      -Q1          Eaton               PKE32\n3      -S0          Eaton               M22-PV\n4      -S1          Eaton               M22-D-G"; color: root.display-mode == 0 ? #30363a : #cbd2d5; font-size: 10px; line-height: 1.8; } }
                Rectangle { x: parent.width - 310px; y: 0; width: 310px; height: parent.height; background: root.display-mode == 0 ? white : #1b1e20; border-color: #303539; border-width: 1px; Text { x: 12px; y: 12px; text: "EXPORTEINSTELLUNGEN\n\nFormat          PDF\nPapier          A3 quer\nFarben          Farbig\nTitelblock      Standard IEC\nRevision        B"; color: #cbd2d5; font-size: 10px; line-height: 1.8; } SmallButton { x: 12px; y: 210px; width: 130px; label: "PDF erzeugen"; primary: true; } }
            }
        }

        Rectangle {
            x: 0; y: parent.height - 24px; width: parent.width; height: 24px;
            background: root.display-mode == 0 ? #eef1f3 : #181b1d; border-color: #303539; border-width: 1px;
            Text { x: 8px; y: 6px; text: "✓ gespeichert    X 1470 · Y 1010 mm    Raster 5 mm · Fang an"; color: #55c384; font-size: 9px; }
            Text { x: parent.width - 185px; y: 6px; text: "● 3   ● 6    de-DE · IEC 81346"; color: #d1d7da; font-size: 9px; }
        }

        if root.palette-open: Rectangle {
            x: parent.width / 2 - 310px; y: 72px; width: 620px; height: 285px;
            background: root.display-mode == 0 ? white : #202426; border-color: #4a5358; border-width: 1px; border-radius: 6px;
            Rectangle { x: 12px; y: 12px; width: parent.width - 24px; height: 34px; background: root.display-mode == 0 ? #f4f6f7 : #292e31; border-color: #3e464a; border-width: 1px; border-radius: 3px; Text { x: 10px; y: 9px; text: "Gerät, Artikel, Seite oder Befehl …"; color: #89949a; font-size: 10px; } }
            Text { x: 18px; y: 62px; text: "-K1\nBetriebsmittel · Schütz Motor Lüftung\n\nDILM17\nArtikel · Eaton DILM17\n\nSeite 23\nSeite öffnen\n\nFrontansicht\nAufbau öffnen"; color: root.display-mode == 0 ? #30363a : #d2d9dc; font-size: 10px; line-height: 1.35; }
            Rectangle { x: parent.width - 34px; y: 12px; width: 22px; height: 22px; background: transparent; Text { text: "×"; color: #cbd2d5; horizontal-alignment: center; vertical-alignment: center; } TouchArea { clicked => { root.palette-open = false; } } }
        }
    }
}

fn main() -> Result<(), slint::PlatformError> {
    MainWindow::new()?.run()
}
