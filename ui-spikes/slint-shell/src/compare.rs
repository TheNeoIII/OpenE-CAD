// SPDX-License-Identifier: MPL-2.0

slint::slint! {
    component NavTab inherits Rectangle {
        in property <string> label;
        in property <bool> active;
        callback clicked;
        width: 112px;
        height: 32px;
        background: active ? rgb(18, 59, 70) : transparent;
        border-radius: 3px;
        Text {
            text: root.label;
            color: active ? rgb(55, 197, 227) : rgb(184, 192, 197);
            font-size: 13px;
            horizontal-alignment: center;
            vertical-alignment: center;
        }
        TouchArea { clicked => { root.clicked(); } }
    }

    component ActionButton inherits Rectangle {
        in property <string> label;
        in property <bool> primary: false;
        callback clicked;
        height: 29px;
        background: primary ? rgb(23, 127, 155) : rgb(37, 41, 44);
        border-color: primary ? rgb(44, 192, 223) : rgb(65, 71, 75);
        border-width: 1px;
        border-radius: 3px;
        Text {
            text: root.label;
            color: primary ? white : rgb(211, 217, 220);
            font-size: 10px;
            horizontal-alignment: center;
            vertical-alignment: center;
        }
        TouchArea { clicked => { root.clicked(); } }
    }

    component MetricCard inherits Rectangle {
        in property <string> heading;
        in property <string> value;
        background: rgb(29, 32, 34);
        border-color: rgb(52, 58, 62);
        border-width: 1px;
        Text { x: 10px; y: 8px; text: root.heading; color: rgb(142, 153, 159); font-size: 9px; }
        Text { x: 10px; y: 26px; text: root.value; color: rgb(226, 231, 233); font-size: 16px; }
    }

    component FindingRow inherits Rectangle {
        in property <string> heading;
        in property <string> detail;
        in property <color> marker: rgb(226, 82, 77);
        background: transparent;
        Rectangle { x: 2px; y: 13px; width: 7px; height: 7px; border-radius: 4px; background: root.marker; }
        Text { x: 18px; y: 6px; text: root.heading; color: rgb(226, 231, 233); font-size: 10px; }
        Text { x: 18px; y: 24px; text: root.detail; color: rgb(126, 137, 143); font-size: 8px; }
    }

    export component MainWindow inherits Window {
        title: "OpenE-CAD S3 Slint Shell";
        width: 1600px;
        height: 1000px;
        background: rgb(23, 25, 27);

        in-out property <int> workspace: 0;
        in-out property <int> display-mode: 1; // 0 light / 1 dark+paper / 2 dark canvas
        in-out property <bool> command-open: false;

        Rectangle {
            x: 0; y: 0; width: parent.width; height: 42px;
            background: root.display-mode == 0 ? rgb(245, 246, 247) : rgb(26, 29, 31);
            border-color: root.display-mode == 0 ? rgb(216, 221, 224) : rgb(48, 53, 57);
            border-width: 1px;

            Text { x: 12px; y: 6px; text: "⚡  Lindenstraße 12"; color: root.display-mode == 0 ? rgb(32, 36, 40) : rgb(231, 236, 238); font-size: 14px; font-weight: 700; }
            Text { x: 28px; y: 24px; text: "+UV2 · Rev. B"; color: rgb(127, 138, 144); font-size: 8px; }

            NavTab { x: 165px; y: 5px; label: "Projekt"; active: root.workspace == 0; clicked => { root.workspace = 0; } }
            NavTab { x: 278px; y: 5px; label: "Stromlaufplan"; active: root.workspace == 1; clicked => { root.workspace = 1; } }
            NavTab { x: 391px; y: 5px; label: "Aufbau"; active: root.workspace == 2; clicked => { root.workspace = 2; } }
            NavTab { x: 504px; y: 5px; label: "Daten"; active: root.workspace == 3; clicked => { root.workspace = 3; } }
            NavTab { x: 617px; y: 5px; label: "Dokumentation"; active: root.workspace == 4; clicked => { root.workspace = 4; } }

            Rectangle {
                x: parent.width / 2 - 205px; y: 7px; width: 410px; height: 28px;
                background: root.display-mode == 0 ? rgb(236, 239, 241) : rgb(34, 38, 41);
                border-color: root.display-mode == 0 ? rgb(209, 214, 218) : rgb(52, 58, 62);
                border-width: 1px; border-radius: 4px;
                Text { x: 12px; y: 6px; text: "⌕  Gerät, Artikel, Seite, Befehl …"; color: rgb(146, 157, 163); font-size: 10px; }
                Text { x: 360px; y: 7px; text: "Ctrl K"; color: rgb(115, 125, 130); font-size: 8px; }
                TouchArea { clicked => { root.command-open = true; } }
            }

            Text { x: parent.width - 255px; y: 14px; text: "UX-Konzept"; color: rgb(126, 137, 143); font-size: 9px; }
            Rectangle {
                x: parent.width - 165px; y: 7px; width: 118px; height: 28px;
                background: rgb(37, 41, 44); border-color: rgb(58, 65, 69); border-width: 1px; border-radius: 3px;
                Text { text: root.display-mode == 0 ? "Hell" : root.display-mode == 1 ? "Dunkel + Papier" : "Dunkler Plan"; color: rgb(216, 221, 224); font-size: 8px; horizontal-alignment: center; vertical-alignment: center; }
                TouchArea { clicked => { root.display-mode = root.display-mode == 2 ? 0 : root.display-mode + 1; } }
            }
            Text { x: parent.width - 36px; y: 14px; text: "MK"; color: rgb(56, 193, 223); font-size: 10px; }
        }

        if root.workspace == 0: Rectangle {
            x: 0; y: 42px; width: parent.width; height: parent.height - 66px;
            background: root.display-mode == 0 ? rgb(242, 244, 245) : rgb(23, 25, 27);

            Rectangle {
                x: 0; y: 0; width: 305px; height: parent.height;
                background: root.display-mode == 0 ? rgb(247, 248, 249) : rgb(27, 30, 32);
                border-color: rgb(48, 53, 57); border-width: 1px;
                Text { x: 10px; y: 10px; text: "PROJEKTE"; color: rgb(129, 141, 147); font-size: 9px; }
                Rectangle { x: 9px; y: 31px; width: 287px; height: 30px; background: root.display-mode == 0 ? white : rgb(34, 38, 41); border-color: rgb(52, 58, 62); border-width: 1px; border-radius: 3px; Text { x: 9px; y: 7px; text: "⌕  Projekte durchsuchen"; color: rgb(127, 137, 143); font-size: 9px; } }
                Rectangle { x: 7px; y: 72px; width: 291px; height: 60px; background: rgb(18, 54, 65); border-radius: 3px; Text { x: 10px; y: 8px; text: "Lindenstraße 12 · Wohn- und Geschäftshaus"; color: rgb(228, 234, 236); font-size: 10px; font-weight: 700; } Text { x: 10px; y: 29px; text: "UV2 · Rev. B · 10 Seiten"; color: rgb(113, 169, 182); font-size: 8px; } Text { x: 238px; y: 29px; text: "vor 4 min"; color: rgb(113, 128, 135); font-size: 8px; } }
                Text { x: 17px; y: 150px; text: "Halle 3 · Lüftungssteuerung"; color: root.display-mode == 0 ? rgb(48, 54, 58) : rgb(208, 214, 217); font-size: 10px; }
                Text { x: 17px; y: 170px; text: "SV1 · Rev. D · 34 Seiten                         gestern"; color: rgb(118, 129, 135); font-size: 8px; }
                Text { x: 17px; y: 205px; text: "Praxis Dr. Seidel · Zählerschrank"; color: root.display-mode == 0 ? rgb(48, 54, 58) : rgb(208, 214, 217); font-size: 10px; }
                Text { x: 17px; y: 225px; text: "ZS1 · Rev. A · 8 Seiten                        12.10.2026"; color: rgb(118, 129, 135); font-size: 8px; }
                Text { x: 17px; y: 260px; text: "EFH Brandt · Hausverteiler"; color: root.display-mode == 0 ? rgb(48, 54, 58) : rgb(208, 214, 217); font-size: 10px; }
                Text { x: 17px; y: 280px; text: "HV · Rev. C · 6 Seiten                         08.10.2026"; color: rgb(118, 129, 135); font-size: 8px; }
                Text { x: 17px; y: 315px; text: "Werkstatt Kühn · Maschinen-UV"; color: root.display-mode == 0 ? rgb(48, 54, 58) : rgb(208, 214, 217); font-size: 10px; }
                Text { x: 17px; y: 335px; text: "UV1 · Rev. A · 14 Seiten                       01.10.2026"; color: rgb(118, 129, 135); font-size: 8px; }
                Rectangle { x: 0; y: parent.height - 150px; width: parent.width; height: 1px; background: rgb(52, 58, 62); }
                Text { x: 10px; y: parent.height - 134px; text: "NEU AUS VORLAGE"; color: rgb(127, 138, 144); font-size: 8px; }
                Text { x: 16px; y: parent.height - 106px; text: "▱  Wohnungsverteiler"; color: rgb(210, 216, 219); font-size: 9px; }
                Text { x: 16px; y: parent.height - 76px; text: "▱  Gewerbe-Unterverteilung"; color: rgb(210, 216, 219); font-size: 9px; }
                Text { x: 16px; y: parent.height - 46px; text: "▱  Steuerung mit SPS"; color: rgb(210, 216, 219); font-size: 9px; }
            }

            Rectangle {
                x: 305px; y: 0; width: parent.width - 645px; height: parent.height;
                background: root.display-mode == 0 ? white : rgb(24, 27, 29);
                Text { x: 22px; y: 18px; text: "=ANL · +UV2 · Rev. B · zuletzt bearbeitet vor 4 min von M. Krüger"; color: rgb(126, 138, 144); font-size: 8px; }
                Text { x: 22px; y: 43px; text: "Lindenstraße 12 · Wohn- und Geschäftshaus"; color: root.display-mode == 0 ? rgb(32, 38, 42) : rgb(228, 233, 235); font-size: 20px; font-weight: 700; }
                Text { x: 22px; y: 73px; text: "Unterverteilung EG Gewerbe · 400/230 V TN-S · Referenzhersteller Eaton"; color: rgb(125, 137, 143); font-size: 9px; }
                ActionButton { x: 22px; y: 103px; width: 175px; label: "Weiterarbeiten · Seite 3 →"; primary: true; clicked => { root.workspace = 1; } }
                ActionButton { x: 205px; y: 103px; width: 120px; label: "▦ Aufbau +UV2"; clicked => { root.workspace = 2; } }
                ActionButton { x: 333px; y: 103px; width: 118px; label: "▤ Datenmanager"; clicked => { root.workspace = 3; } }
                ActionButton { x: 459px; y: 103px; width: 104px; label: "⌕ Suchen"; clicked => { root.command-open = true; } }

                MetricCard { x: 22px; y: 150px; width: (parent.width - 58px) / 4; height: 58px; heading: "Seiten"; value: "10"; }
                MetricCard { x: 28px + (parent.width - 58px) / 4; y: 150px; width: (parent.width - 58px) / 4; height: 58px; heading: "Betriebsmittel"; value: "77"; }
                MetricCard { x: 34px + (parent.width - 58px) / 2; y: 150px; width: (parent.width - 58px) / 4; height: 58px; heading: "Klemmen"; value: "10"; }
                MetricCard { x: 40px + 3 * (parent.width - 58px) / 4; y: 150px; width: (parent.width - 58px) / 4 - 18px; height: 58px; heading: "Prüfung"; value: "3 Fehler · 6 Warn."; }

                Text { x: 22px; y: 235px; text: "SEITEN"; color: rgb(131, 144, 151); font-size: 8px; }
                Rectangle { x: 22px; y: 258px; width: parent.width - 44px; height: 34px; background: rgb(27, 31, 33); border-color: rgb(48, 54, 58); border-width: 1px; Text { x: 10px; y: 8px; text: "1   Deckblatt"; color: rgb(215, 221, 224); font-size: 9px; } }
                Rectangle { x: 22px; y: 296px; width: parent.width - 44px; height: 34px; background: rgb(27, 31, 33); border-color: rgb(48, 54, 58); border-width: 1px; Text { x: 10px; y: 8px; text: "2   Einspeisung HAK → UV2"; color: rgb(215, 221, 224); font-size: 9px; } }
                Rectangle { x: 22px; y: 334px; width: parent.width - 44px; height: 34px; background: rgb(27, 31, 33); border-color: rgb(48, 54, 58); border-width: 1px; Text { x: 10px; y: 8px; text: "3   Verteilung +UV2 · Abgänge EG"; color: rgb(215, 221, 224); font-size: 9px; } }
                Rectangle { x: 22px; y: 372px; width: parent.width - 44px; height: 34px; background: rgb(27, 31, 33); border-color: rgb(48, 54, 58); border-width: 1px; Text { x: 10px; y: 8px; text: "5   Steuerung Lüftung 24 V DC                                  ●"; color: rgb(215, 221, 224); font-size: 9px; } }
                Rectangle { x: 22px; y: 410px; width: parent.width - 44px; height: 34px; background: rgb(27, 31, 33); border-color: rgb(48, 54, 58); border-width: 1px; Text { x: 10px; y: 8px; text: "20  Aufbauplan +UV2                                              ●"; color: rgb(215, 221, 224); font-size: 9px; } }
                Rectangle { x: 22px; y: 448px; width: parent.width - 44px; height: 34px; background: rgb(27, 31, 33); border-color: rgb(48, 54, 58); border-width: 1px; Text { x: 10px; y: 8px; text: "21  Klemmenplan -X1"; color: rgb(215, 221, 224); font-size: 9px; } }
            }

            Rectangle {
                x: parent.width - 340px; y: 0; width: 340px; height: parent.height;
                background: root.display-mode == 0 ? rgb(247, 248, 249) : rgb(27, 30, 32);
                border-color: rgb(48, 53, 57); border-width: 1px;
                Text { x: 12px; y: 12px; text: "OFFENE PUNKTE"; color: rgb(132, 144, 151); font-size: 8px; }
                Text { x: 12px; y: 40px; text: "FEHLER 3"; color: rgb(169, 178, 183); font-size: 8px; font-weight: 700; }
                FindingRow { x: 12px; y: 58px; width: parent.width - 24px; height: 48px; heading: "Reihe 3: 39 / 36 TE"; detail: "Aufbau · Verteilerreihe +UV2 überbelegt um 3 TE"; }
                FindingRow { x: 12px; y: 108px; width: parent.width - 24px; height: 48px; heading: "BMK doppelt: -F30"; detail: "Kennzeichnung · Licht Büro / Steckdosen Büro"; }
                FindingRow { x: 12px; y: 158px; width: parent.width - 24px; height: 48px; heading: "Potentialkonflikt Seite 6.4"; detail: "24 V DC direkt mit N verbunden"; }
                Text { x: 12px; y: 220px; text: "WARNUNGEN 6"; color: rgb(169, 178, 183); font-size: 8px; font-weight: 700; }
                FindingRow { x: 12px; y: 238px; width: parent.width - 24px; height: 48px; marker: rgb(228, 170, 56); heading: "Artikel fehlt: -E1"; detail: "Artikel · Leuchte Werkstatt"; }
                FindingRow { x: 12px; y: 288px; width: parent.width - 24px; height: 48px; marker: rgb(228, 170, 56); heading: "Nicht in Frontansicht platziert: -K9"; detail: "Aufbau · Schütz Torantrieb"; }
                Text { x: 12px; y: parent.height - 140px; text: "SCHNELLSTART"; color: rgb(132, 144, 151); font-size: 8px; }
                Text { x: 12px; y: parent.height - 110px; text: "Suchen / Befehl                            Ctrl K"; color: rgb(174, 183, 188); font-size: 8px; }
                Text { x: 12px; y: parent.height - 83px; text: "Einfügen                                            I"; color: rgb(174, 183, 188); font-size: 8px; }
                Text { x: 12px; y: parent.height - 56px; text: "Leitung                                             W"; color: rgb(174, 183, 188); font-size: 8px; }
                Text { x: 12px; y: parent.height - 29px; text: "Rückgängig                                    Ctrl Z"; color: rgb(174, 183, 188); font-size: 8px; }
            }
        }

        if root.workspace != 0: Rectangle {
            x: 0; y: 42px; width: parent.width; height: parent.height - 66px;
            background: root.display-mode == 0 ? rgb(228, 231, 233) : rgb(17, 19, 21);

            Rectangle {
                x: 0; y: 0; width: parent.width; height: 34px;
                background: root.display-mode == 0 ? rgb(248, 249, 250) : rgb(26, 29, 31);
                border-color: rgb(48, 53, 57); border-width: 1px;
                Text { x: 10px; y: 9px; text: "▣    ↖    ⌁    T      Symbol, Makro, Artikel …      ↶   ↷"; color: root.display-mode == 0 ? rgb(75, 85, 90) : rgb(174, 184, 189); font-size: 9px; }
                Text { x: parent.width - 250px; y: 9px; text: "-K1 Schütz Motor Lüftung      Seite 3 / 10"; color: rgb(53, 189, 220); font-size: 9px; }
            }

            if root.workspace == 1: Rectangle {
                x: 0; y: 34px; width: parent.width; height: parent.height - 34px;

                Rectangle {
                    x: 0; y: 0; width: 250px; height: parent.height;
                    background: root.display-mode == 0 ? rgb(247, 248, 249) : rgb(27, 30, 32);
                    border-color: rgb(48, 53, 57); border-width: 1px;
                    Text { x: 8px; y: 8px; text: "Seiten   Betriebsmittel   Klemmen   Kabel   SPS"; color: rgb(174, 184, 189); font-size: 8px; }
                    Rectangle { x: 8px; y: 34px; width: 234px; height: 29px; background: root.display-mode == 0 ? white : rgb(34, 38, 41); border-color: rgb(52, 58, 62); border-width: 1px; Text { x: 8px; y: 7px; text: "⌕ Seiten filtern"; color: rgb(127, 137, 143); font-size: 8px; } }
                    Text { x: 12px; y: 76px; text: "⌄ =ANL Lindenstraße 12"; color: rgb(201, 208, 211); font-size: 9px; }
                    Text { x: 24px; y: 99px; text: "⌄ +UV2 Unterverteilung EG"; color: rgb(201, 208, 211); font-size: 9px; }
                    Text { x: 39px; y: 130px; text: "1  Deckblatt\n\n2  Einspeisung HAK → UV2\n\n3  Verteilung +UV2 · Abgänge EG\n\n4  Verteilung +UV2 · Abgänge OG\n\n5  Steuerung Lüftung 24 V DC   ●\n\n6  easyE4 · Ein-/Ausgänge       ●\n\n7  Abgänge Büro\n\n8  Abgänge Lager / Außen\n\n20 Aufbauplan +UV2              ●\n\n21 Klemmenplan -X1"; color: rgb(201, 208, 211); font-size: 8px; }
                }

                Rectangle {
                    x: 250px; y: 0; width: parent.width - 560px; height: parent.height;
                    background: root.display-mode == 0 ? rgb(220, 224, 227) : rgb(15, 17, 19);
                    Rectangle {
                        x: 22px; y: 22px; width: parent.width - 44px; height: parent.height - 44px;
                        background: root.display-mode == 2 ? rgb(32, 36, 39) : rgb(251, 252, 253);
                        border-color: rgb(105, 116, 122); border-width: 1px;
                        Rectangle { x: 40px; y: 75px; width: parent.width - 80px; height: 1px; background: root.display-mode == 2 ? rgb(233, 237, 239) : rgb(37, 43, 47); }
                        Rectangle { x: 40px; y: 95px; width: parent.width - 80px; height: 1px; background: root.display-mode == 2 ? rgb(233, 237, 239) : rgb(37, 43, 47); }
                        Rectangle { x: 40px; y: 115px; width: parent.width - 80px; height: 1px; background: root.display-mode == 2 ? rgb(233, 237, 239) : rgb(37, 43, 47); }
                        Rectangle { x: 40px; y: 135px; width: parent.width - 80px; height: 1px; background: rgb(35, 142, 220); }
                        Rectangle { x: 230px; y: 75px; width: 1px; height: 330px; background: root.display-mode == 2 ? rgb(233, 237, 239) : rgb(37, 43, 47); }
                        Rectangle { x: 420px; y: 75px; width: 1px; height: 330px; background: root.display-mode == 2 ? rgb(233, 237, 239) : rgb(37, 43, 47); }
                        Rectangle { x: 610px; y: 75px; width: 1px; height: 330px; background: root.display-mode == 2 ? rgb(233, 237, 239) : rgb(37, 43, 47); }
                        Rectangle { x: parent.width * 0.67; y: 135px; width: 1px; height: 190px; background: rgb(35, 142, 220); }
                        Rectangle { x: parent.width * 0.67; y: 325px; width: 80px; height: 1px; background: rgb(217, 82, 87); }
                        Rectangle { x: 40px; y: parent.height - 80px; width: parent.width - 80px; height: 1px; background: rgb(41, 155, 89); }
                        Text { x: 38px; y: 48px; text: "/2.8"; color: rgb(236, 126, 31); font-size: 9px; }
                        Text { x: parent.width - 66px; y: 48px; text: "/4.1"; color: rgb(236, 126, 31); font-size: 9px; }
                        Text { x: parent.width * 0.67 - 24px; y: 300px; text: "-K1"; color: root.display-mode == 2 ? rgb(229, 234, 236) : rgb(37, 43, 47); font-size: 9px; }
                        Text { x: parent.width * 0.67 - 30px; y: 350px; text: "Schütz Motor Lüftung"; color: root.display-mode == 2 ? rgb(229, 234, 236) : rgb(37, 43, 47); font-size: 8px; }
                    }
                }

                Rectangle {
                    x: parent.width - 310px; y: 0; width: 310px; height: parent.height;
                    background: root.display-mode == 0 ? rgb(247, 248, 249) : rgb(27, 30, 32);
                    border-color: rgb(48, 53, 57); border-width: 1px;
                    Text { x: 10px; y: 9px; text: "Eigenschaften      Prüfung 10"; color: rgb(67, 196, 225); font-size: 9px; }
                    Text { x: 10px; y: 42px; text: "-K1"; color: root.display-mode == 0 ? rgb(36, 42, 46) : rgb(227, 232, 234); font-size: 18px; font-weight: 700; }
                    Text { x: 10px; y: 68px; text: "Schütz Motor Lüftung"; color: rgb(170, 179, 183); font-size: 9px; }
                    Text { x: 10px; y: 87px; text: "=ANL+UV2-K1 · Leistungsschütz 3S+1S"; color: rgb(112, 122, 128); font-size: 8px; }
                    Text { x: 10px; y: 130px; text: "⌄ KENNZEICHNUNG"; color: rgb(129, 140, 146); font-size: 8px; }
                    Text { x: 13px; y: 156px; text: "BMK                         -K1\nFunktion                    Schütz Motor Lüftung\nEinbauort                   +UV2\nVerteiler                   UV2\nReihe                       2"; color: rgb(201, 208, 211); font-size: 8px; }
                    Text { x: 10px; y: 270px; text: "⌄ ARTIKEL"; color: rgb(129, 140, 146); font-size: 8px; }
                    Text { x: 13px; y: 296px; text: "Hersteller                  Eaton\nArtikelnr.                   DILM17-10(230V50HZ)\nTyp                          Leistungsschütz 3S+1S"; color: rgb(201, 208, 211); font-size: 8px; }
                    Text { x: 10px; y: 378px; text: "⌄ ELEKTRISCHE DATEN"; color: rgb(129, 140, 146); font-size: 8px; }
                    Text { x: 13px; y: 404px; text: "Bemessungsstrom             18 A\nLeistung AC-3                7,5 kW\nSpulenspannung               230 V AC\nHilfskontakte                1 S (13–14)"; color: rgb(201, 208, 211); font-size: 8px; }
                }
            }

            if root.workspace == 2: Rectangle {
                x: 0; y: 34px; width: parent.width; height: parent.height - 34px;
                Text { x: 18px; y: 16px; text: "AUFBAU +UV2   ·   Verteiler · 4 Reihen · 36 TE"; color: rgb(219, 225, 228); font-size: 11px; }
                Rectangle { x: 250px; y: 50px; width: parent.width - 560px; height: parent.height - 90px; background: root.display-mode == 0 ? white : rgb(32, 36, 38); border-color: rgb(76, 85, 90); border-width: 1px;
                    Rectangle { x: 45px; y: 65px; width: parent.width - 90px; height: 115px; background: transparent; border-color: rgb(123, 133, 138); border-width: 1px; }
                    Rectangle { x: 45px; y: 230px; width: parent.width - 90px; height: 115px; background: transparent; border-color: rgb(123, 133, 138); border-width: 1px; }
                    Rectangle { x: 45px; y: 395px; width: parent.width - 90px; height: 115px; background: transparent; border-color: rgb(226, 82, 77); border-width: 1px; }
                    Rectangle { x: 45px; y: 560px; width: parent.width - 90px; height: 115px; background: transparent; border-color: rgb(123, 133, 138); border-width: 1px; }
                    Rectangle { x: 75px; y: 78px; width: 62px; height: 88px; background: transparent; border-color: rgb(37, 185, 218); border-width: 1px; }
                    Rectangle { x: 160px; y: 78px; width: 42px; height: 88px; background: transparent; border-color: rgb(37, 185, 218); border-width: 1px; }
                    Rectangle { x: 75px; y: 408px; width: 84px; height: 88px; background: transparent; border-color: rgb(37, 185, 218); border-width: 1px; }
                }
                Text { x: 18px; y: 65px; text: "Reihe 1   21 / 36 TE\n\n\nReihe 2   24 / 36 TE\n\n\nReihe 3   39 / 36 TE  ●\n\n\nReihe 4   30 / 36 TE"; color: rgb(202, 209, 212); font-size: 9px; }
                Text { x: parent.width - 285px; y: 65px; text: "EIGENSCHAFTEN\n\n-F13\nLeitungsschutz Büro\n\nHersteller       Eaton\nBreite           1 TE\nReihe            3\nPosition         17 TE\n\nPRÜFUNG\n● Reihe 3 überbelegt: 39 / 36 TE\n● 2 Geräte noch nicht platziert"; color: rgb(202, 209, 212); font-size: 8px; }
            }

            if root.workspace == 3: Rectangle {
                x: 0; y: 34px; width: parent.width; height: parent.height - 34px;
                background: root.display-mode == 0 ? rgb(250, 251, 252) : rgb(24, 27, 29);
                Text { x: 12px; y: 12px; text: "Betriebsmittel   Klemmen   Verbindungen   Kabel   SPS / I/O   Material   Potentiale   Texte"; color: rgb(54, 192, 223); font-size: 9px; }
                Text { x: 12px; y: 46px; text: "☐ Nur mit Befunden     Spalten     Suchen und Ersetzen     Mehrfachänderung"; color: rgb(174, 183, 188); font-size: 9px; }
                Text { x: 12px; y: 86px; text: "BMK            Funktion                                  Ort             Hersteller               Artikel                         Status"; color: rgb(134, 145, 152); font-size: 8px; }
                Text { x: 12px; y: 118px; text: "-K1            Motor Lüftung                             +UV2            Eaton                    DILM17-10                     ✓ OK\n\n-K2            Steuerung                                 +UV2            Eaton                    EASY-E4                       ✓ OK\n\n-F30           Licht Büro                                +UV2            Eaton                    FAZ-B16                       ● Befund\n\n-X1            Klemmenleiste                             +UV2            —                        —                             ✓ OK\n\n-W1            Motorleitung                              +F1             —                        4G2,5                         ✓ OK"; color: rgb(195, 203, 207); font-size: 8px; }
                Rectangle { x: parent.width - 310px; y: 0; width: 310px; height: parent.height; background: root.display-mode == 0 ? rgb(245, 247, 248) : rgb(27, 30, 32); border-color: rgb(48, 53, 57); border-width: 1px; Text { x: 12px; y: 12px; text: "PROJEKTPRÜFUNG\n\n3 Fehler · 6 Warnungen\n\n● BMK doppelt: -F30\n\n● Potentialkonflikt Seite 6.4\n\n● Artikel fehlt: -E1\n\n● Reihe 3 überbelegt"; color: rgb(203, 210, 213); font-size: 9px; } }
            }

            if root.workspace == 4: Rectangle {
                x: 0; y: 34px; width: parent.width; height: parent.height - 34px;
                background: root.display-mode == 0 ? rgb(245, 247, 248) : rgb(24, 27, 29);
                Rectangle { x: 0; y: 0; width: 250px; height: parent.height; background: root.display-mode == 0 ? white : rgb(27, 30, 32); border-color: rgb(48, 53, 57); border-width: 1px; Text { x: 12px; y: 12px; text: "DOKUMENTSTRUKTUR\n\nDeckblatt\n\nInhaltsverzeichnis\n\nAufbauplan\n\nStromlaufpläne\n\nStückliste\n\nKlemmenplan\n\nKabelliste"; color: rgb(203, 210, 213); font-size: 9px; } }
                Text { x: 285px; y: 28px; text: "Vorschau · Stückliste"; color: rgb(220, 226, 228); font-size: 15px; }
                Rectangle { x: 285px; y: 62px; width: parent.width - 645px; height: parent.height - 115px; background: root.display-mode == 0 ? white : rgb(34, 38, 41); border-color: rgb(64, 71, 75); border-width: 1px; Text { x: 20px; y: 20px; text: "A3 quer · Titelblock · Revision B\n\nPos.   BMK          Hersteller          Artikel\n────────────────────────────────────────────\n1      -K1          Eaton               DILM17-10\n2      -Q1          Eaton               PKE32\n3      -S0          Eaton               M22-PV\n4      -S1          Eaton               M22-D-G"; color: root.display-mode == 0 ? rgb(48, 54, 58) : rgb(203, 210, 213); font-size: 9px; } }
                Rectangle { x: parent.width - 310px; y: 0; width: 310px; height: parent.height; background: root.display-mode == 0 ? white : rgb(27, 30, 32); border-color: rgb(48, 53, 57); border-width: 1px; Text { x: 12px; y: 12px; text: "EXPORTEINSTELLUNGEN\n\nFormat          PDF\nPapier          A3 quer\nFarben          Farbig\nTitelblock      Standard IEC\nRevision        B"; color: rgb(203, 210, 213); font-size: 9px; } ActionButton { x: 12px; y: 205px; width: 130px; label: "PDF erzeugen"; primary: true; } }
            }
        }

        Rectangle {
            x: 0; y: parent.height - 24px; width: parent.width; height: 24px;
            background: root.display-mode == 0 ? rgb(238, 241, 243) : rgb(24, 27, 29);
            border-color: rgb(48, 53, 57); border-width: 1px;
            Text { x: 8px; y: 6px; text: "✓ gespeichert    X 1470 · Y 1010 mm    Raster 5 mm · Fang an"; color: rgb(85, 195, 132); font-size: 8px; }
            Text { x: parent.width - 185px; y: 6px; text: "● 3   ● 6    de-DE · IEC 81346"; color: rgb(209, 215, 218); font-size: 8px; }
        }

        if root.command-open: Rectangle {
            x: parent.width / 2 - 310px; y: 72px; width: 620px; height: 280px;
            background: root.display-mode == 0 ? white : rgb(32, 36, 38);
            border-color: rgb(74, 83, 88); border-width: 1px; border-radius: 6px;
            Rectangle { x: 12px; y: 12px; width: parent.width - 24px; height: 34px; background: root.display-mode == 0 ? rgb(244, 246, 247) : rgb(41, 46, 49); border-color: rgb(62, 70, 74); border-width: 1px; border-radius: 3px; Text { x: 10px; y: 9px; text: "Gerät, Artikel, Seite oder Befehl …"; color: rgb(137, 148, 154); font-size: 9px; } }
            Text { x: 18px; y: 62px; text: "-K1\nBetriebsmittel · Schütz Motor Lüftung\n\nDILM17\nArtikel · Eaton DILM17\n\nSeite 23\nSeite öffnen\n\nFrontansicht\nAufbau öffnen"; color: root.display-mode == 0 ? rgb(48, 54, 58) : rgb(210, 217, 220); font-size: 9px; }
            Rectangle { x: parent.width - 34px; y: 12px; width: 22px; height: 22px; background: transparent; Text { text: "×"; color: rgb(203, 210, 213); horizontal-alignment: center; vertical-alignment: center; } TouchArea { clicked => { root.command-open = false; } } }
        }
    }
}

fn main() -> Result<(), slint::PlatformError> {
    MainWindow::new()?.run()
}
