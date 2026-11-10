# Dnevniku Ditor i Ecurisë së Zhvillimit (Daily Progress Log)

## Projekti: Platformë Profesionale për Porositjen e Ushqimit në Restorante (`praktika-p2-blin-krasniqi`)
**Zhvilluesi:** Blin Krasniqi  
**Dega Aktive e Zhvillimit:** `development`  
**Data e Fillimit:** 10 Nëntor 2026 (Dita 1)  
**Afati Përfundimtar:** 6 Dhjetor 2026, 23:59 (Evropë/Prishtinë)

---

### Dita 01 — 10 Nëntor 2026
**Tema:** Nisja e Projektit, Arkitektura e Sistemit, Konfigurimi i MySQL dhe Fillimi i Implementimit

#### Objektivat e Planifikuara për Ditën 1:
1. Analiza e plotë e të 12 moduleve funksionale sipas specifikimit zyrtar të projektit.
2. Përcaktimi i strategjisë strikte të Git: dega `main` mbetet e paprekur dhe e mbrojtur, puna kryhet në degën `development`.
3. Krijimi dhe lidhja e repozitoriumit zyrtar në GitHub nën llogarinë `Blin-developer` (`praktika-p2-blin-krasniqi`).
4. Përcaktimi i **MySQL** si e vetmja bazë të dhënash (heqja dhe ndalimi i SQLite), me motorin InnoDB, indekse dhe çelësa të huaj të rreptë.
5. Përcaktimi i gjuhës **Shqipe** si gjuha e vetme zyrtare e të gjithë elementeve të ndërfaqes së përdoruesit, njoftimeve dhe dokumentacionit.
6. Dizajnimi i arkitekturës së plotë relacionale (21 entitete) dhe diagramit ER në Mermaid.
7. Ndërtimi i themelit të projektit: struktura decoupled monorepo me React (Vite) dhe Laravel 11.
8. Krijimi i migrimeve fillestare, modeleve Eloquent, rregullave të roleve (RBAC), shërbimeve të autentifikimit Sanctum dhe testimit automatik.

#### Puna e Realizuar Sot (Dita 1):
- **Repozitori & Git:**
  - U verifikua mungesa fillestare e repozitoriumit në GitHub dhe u krijua me sukses në llogarinë zyrtare: `https://github.com/Blin-developer/praktika-p2-blin-krasniqi`.
  - U konfigurua lidhja me `origin` dhe u vendos rregulli që puna kryhet ekskluzivisht në degën `development`.
  - U vendos skedari `.gitignore` për të parandaluar ngarkimin e fjalëkalimeve, çelësave sekretë, skedarëve `.env`, dosjeve `vendor/` dhe `node_modules/`.
- **Konfigurimi i Baza e të Dhënave (MySQL Ekskluzivisht):**
  - U verifikua shërbimi MySQL lokal në portin 3307 (XAMPP).
  - U krijua baza e të dhënave kryesore `praktika_p2_food_ordering` dhe ajo e testimit `praktika_p2_testing`.
  - U hoq çdo konfigurim apo mbështetje për SQLite; `config/database.php` dhe `.env.example` janë konfiguruar pastër për MySQL.
  - Të gjitha 23 migrimet u ekzekutuan me sukses në MySQL (`praktika_p2_food_ordering`) me transaksione InnoDB.
  - U ekzekutua seeder-i me të dhëna reale në gjuhën shqipe (restorante, degë në Prishtinë, artikuj menysh, modifikues dhe porosi testuese).
- **Gjuha Shqipe në të Gjithë Projektin:**
  - Të gjitha ndërfaqet e përdoruesit (React SPA), ballina, menyja e navigimit, butonat, etiketat, njoftimet e gabimit, modalet, KDS, porositë dhe paneli administrativ u përshtatën plotësisht në gjuhën shqipe (me **ë** dhe **ç**).
  - Dokumentacioni inxhinierik (`README.md`, `DAILY_PROGRESS.md`) u përkthye dhe standardizua në shqip.
- **Backend & Autentifikimi (Laravel 11):**
  - U implementua `AuthController` me Sanctum për regjistrim, kyçje dhe lexim profili.
  - U implementua middleware-i `EnsureUserHasRole` për mbrojtjen e rrugëve sipas roleve (Klient, Kuzhinë, Menaxher, Pronar, Super Admin).
  - U konfigurua suita e testeve automatike me PHPUnit në MySQL (`praktika_p2_testing`), me 9 teste feature që kalojnë 100% me sukses (`OK (9 tests, 33 assertions)`).
- **Brendi & Logoja Zyrtare (Tastio):**
  - U vendos emri zyrtar **Tastio** duke zëvendësuar çdo emërtim të mëparshëm në backend, frontend dhe dokumentacion.
  - U integrua logoja zyrtare grafike e dërguar nga përdoruesi (`tastio-logo.jpg`) në shiritin e navigimit (Navbar), faqen e kyçjes, faqen e regjistrimit dhe fundfaqe (Footer).
  - U harmonizuan ngjyrat e dizajnit me logon zyrtare: e kalter elektrike (`#0066FF`), e zeze/antracit e thellë (`#18181B`) dhe prapavijat e pastra.
- **Frontend SPA (React 19 + Vite):**
  - U konfiguruan `AuthContext` dhe `CartContext`.
  - U ndërtua ndërfaqja e ballinës, zbulimi i restoranteve, menyja me modalin e modifikuesve, sistemi KDS, kalimi me kod QR për marrje dhe paneli i administrimit.
  - U krye me sukses `npm run build` me 0 gabime.

#### Skedarët e Krijuar / Modifikuar:
- `.gitignore` (Përjashtimet e Git)
- `.env.example` (Shablloni me parametra të MySQL pa kredenciale)
- `README.md` (Dokumentacioni zyrtar në shqip)
- `docs/DAILY_PROGRESS.md` (Dnevniku ditor i Ditës 1)
- `backend/config/database.php` (Konfigurim strikt vetëm për MySQL)
- `backend/phpunit.xml` & `backend/tests/run.php` (Testim në bazën MySQL `praktika_p2_testing`)
- `backend/database/migrations/*` (23 skedarë migrimi për 21 entitete)
- `backend/database/seeders/DatabaseSeeder.php` (Të dhëna në shqip për Prishtinë)
- `backend/app/Http/Controllers/Api/V1/*` (Kontrollorët API me mesazhe në shqip)
- `frontend/src/*` (Ndërfaqja e plotë në shqip)

#### Hapat e Ardhshëm (Dita 02 — 11 Nëntor 2026):
1. Rafinimi i validimeve të kërkesave në Laravel dhe shtimi i Form Request klasave për restorantet dhe degët.
2. Përmirësime në menaxhimin e orareve javore të degëve dhe llogaritjen dinamike të gjendjes Hapur/Mbyllur.
3. Krijimi i testeve shtesë të njësisë (Unit Tests) për logjikën e biznesit.
