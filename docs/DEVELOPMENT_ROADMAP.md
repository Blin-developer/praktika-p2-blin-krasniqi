# Tastio — Plani 20-Ditor i Zhvillimit të Projektit (Development Roadmap)

**Lënda:** Praktika Profesionale 2026/27 — Projekti 02: Platformë për Porositjen e Ushqimit në Restorante  
**Zhvilluesi:** Blin Krasniqi  
**Repozitori:** `praktika-p2-blin-krasniqi`  
**Periudha:** 10 Nëntor 2026 — 6 Dhjetor 2026 (23:59 Evropë/Prishtinë)  
**Ditët Gjithsej:** 20 Ditë Zhvillimi (5 ditë pune / javë)

---

## Java 1: Themelimi, Arkitektura, Baza e të Dhënave & Autentifikimi
**Qëllimi:** Ngritja e një baze të fortë arkitekturore, skema e plotë në MySQL, autentifikimi me Sanctum dhe ndërfaqet bazë me role.

- **Dita 01 (10 Nëntor 2026) — Nisja e Projektit, Arkitektura & Zbatimi Fillestar**
  - Analiza e plotë e të 12 moduleve të specifikimit.
  - Krijimi dhe lidhja e repozitoriumit zyrtar në GitHub (`Blin-developer/praktika-p2-blin-krasniqi`).
  - Zgjedhja ekskluzive e MySQL (pa SQLite) dhe konfigurimi i mjedisit.
  - Përcaktimi i gjuhës shqipe në të gjithë elementet e dukshme të aplikacionit.
  - Zbatimi i 23 migrimeve të para, modeleve dhe testit automatik.
- **Dita 02 (11 Nëntor 2026) — Validimet e Formulareve & Rafinimi i Kontrollorëve**
  - Krijimi i Form Request klasave për validim në Laravel.
  - Trajtimi i përparuar i gabimeve dhe përgjigjeve të unifikuara JSON në shqip.
- **Dita 03 (12 Nëntor 2026) — Seeder-at dhe Testimi i Integritetit të MySQL**
  - Zgjerimi i të dhënave testuese me menytë e Prishtinës dhe llogaritjeve të marrjes.
- **Dita 04 (13 Nëntor 2026) — Testimi i Thelluar i Autentifikimit & Politikat e Qasjes**
  - Shtimi i testeve të njësisë për tokenat e skaduar dhe ndërrimin e fjalëkalimit.
- **Dita 05 (14 Nëntor 2026) — Përmirësimi i Ndërfaqes së Përdoruesit në React**
  - Përshtatja e plotë e shportës reaktive dhe zbutja e tranzicioneve në UI.

---

## Java 2: Restorantet, Menytë & Motori i Personalizimit
- **Dita 06 (17 Nëntor 2026):** Menaxhimi i kategorive të biznesit dhe regjistrimi i restorantit.
- **Dita 07 (18 Nëntor 2026):** Menaxhimi i degëve, gjeolokacioni dhe oraret javore të punës.
- **Dita 08 (19 Nëntor 2026):** Menaxhimi i kategorive të menysë dhe artikujve ushqimorë.
- **Dita 09 (20 Nëntor 2026):** Motori i modifikuesve (grupet e opsioneve, kufijtë min/max).
- **Dita 10 (21 Nëntor 2026):** Menaxhimi i stafit të degës dhe stacioneve të kuzhinës.

---

## Java 3: Porositë, Kapaciteti & Sistemi i Kuzhinës (KDS)
- **Dita 11 (24 Nëntor 2026):** Shporta reaktive dhe parandalimi i konfliktit mes degëve.
- **Dita 12 (25 Nëntor 2026):** Motori i sigurt i llogaritjes së çmimeve në server (`OrderCalculationService`).
- **Dita 13 (26 Nëntor 2026):** Dritaret kohore për marrje dhe kufizimi i kapacitetit (`max_orders_per_slot`).
- **Dita 14 (27 Nëntor 2026):** Makina e gjendjes së porosisë dhe regjistri i pandryshueshëm i historikut.
- **Dita 15 (28 Nëntor 2026):** Sistemi i shfaqjes në kuzhinë (KDS) dhe menaxhimi i biletave.

---

## Java 4: Koha Reale, Kodi QR, Pagesat & Dorëzimi Përfundimtar
- **Dita 16 (1 Dhjetor 2026):** Integrimi i WebSockets për përditësimin e menjëhershëm të statusit.
- **Dita 17 (2 Dhjetor 2026):** Pass-i digjital me kod QR dhe pagesa në sportel (para në dorë / POS).
- **Dita 18 (3 Dhjetor 2026):** Paneli analitik dhe regjistri i sigurt i auditimit.
- **Dita 19 (4 Dhjetor 2026):** Suita e plotë e testeve automatike (Feature & Unit) dhe optimizimi.
- **Dita 20 (5-6 Dhjetor 2026):** Dokumentacioni përfundimtar, pastrimi i kodit dhe përgatitja për dorëzim.
