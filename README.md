# Tastio — Platformë Profesionale për Porositjen e Ushqimit në Restorante

[![Projekti Akademik](https://img.shields.io/badge/Projekti%20Akademik-Praktika%20Profesionale%202026%2F27-blue.svg)](#)
[![Teknologjitë](https://img.shields.io/badge/Stack-React%20%7C%20Laravel%20%7C%20MySQL%20%7C%20WebSockets-green.svg)](#)
[![Dega](https://img.shields.io/badge/Dega%20Aktive-development-orange.svg)](#)
[![Afati](https://img.shields.io/badge/Afati%20i%20Dorëzimit-6%20Dhjetor%202026-red.svg)](#)

Një platformë e nivelit komercial për porositjen e ushqimit me shumë restorante dhe shumë degë, e frymëzuar nga aplikacionet moderne të porositjes si **Wolt Kosova**, e ndërtuar me **React SPA**, **Laravel 11 RESTful API** dhe një bazë të dhënash të rreptë relacionale **MySQL**.

---

## 📌 Informacione mbi Projektin

- **Projekti:** Praktika Profesionale 2026/27 — Projekti 02
- **Zhvilluesi:** Blin Krasniqi
- **Repozitoriumi:** `praktika-p2-blin-krasniqi`
- **Dega e Zhvillimit:** `development` (Rregull i rreptë: dega `main` mbetet e paprekur deri në dorëzimin përfundimtar)
- **Plani i Zhvillimit:** 20 Ditë (10 Nëntor 2026 — 6 Dhjetor 2026, 23:59 Evropë/Prishtinë)

---

## 🚀 Karakteristikat Kryesore të Platformës

1. **Arkitekturë me Shumë Restorante (Multi-Tenant):** Menaxhim i pavarur i restoranteve me degë të veçanta, gjeolokacion në Prishtinë dhe orare pune javore.
2. **Kontroll i Qasjes me Role (RBAC):** 5 role të dallueshme (Klient, Staf Kuzhine, Menaxher Dege, Pronar Restoranti, Super Administrator).
3. **Motori Dinamik i Modifikuesve:** Grupe opsionesh (Zgjedhje e vetme/shumëfishtë, kufizime min/max, shtesa çmimesh në kohë reale).
4. **Dritare Kohore për Marrje (Pickup Slots):** Rezervim i dritares kohore të marrjes me kapacitet maksimal për çdo 15 minuta (`max_orders_per_slot`).
5. **Llogaritje e Sigurt e Çmimeve në Server:** Vërtetim 100% matematikor në backend i çmimeve bazë dhe të gjithë modifikuesve.
6. **Makina e Gjendjes së Porosisë (State Machine):** Kalime atomike: `pending` → `confirmed` → `in_preparation` → `ready_for_pickup` → `completed` (ose `cancelled`).
7. **Sistemi i Shfaqjes në Kuzhinë (KDS):** Rutim i porosive sipas stacioneve (Grill, Sallatë, Pije, Paketim) me kohëmatës përgatitjeje.
8. **Pass Digjital me Kod QR:** Çelësa kriptografikë të sigurt të shfaqur si kod QR për verifikim të shpejtë në sportel gjatë marrjes.
9. **Pagesë në Sportel (Pay-at-Pickup):** Pagesë me para në dorë ose me kartelë në terminalin POS gjatë marrjes së porosisë.
10. **Sinkronizim në Kohë Reale:** Përditësime të menjëhershme të statusit të porosive me WebSockets pa rifreskuar faqen.

---

## 📁 Struktura e Repozitoriumit

```
praktika-p2-blin-krasniqi/
├── backend/            # Aplikacioni Laravel 11 RESTful API
│   ├── app/            # Modelet, Kontrollorët, Shërbimet, Rregullat, Middleware
│   ├── config/         # Konfigurimet e Aplikacionit, Autentifikimit dhe MySQL
│   ├── database/       # Migrimet (23 tabela), Seeder-at dhe Fabrikat
│   ├── routes/         # api.php, web.php, channels.php
│   └── tests/          # Suita e Testeve Automatike (PHPUnit)
├── frontend/           # Aplikacioni React SPA (Vite)
│   ├── src/
│   │   ├── components/ # Komponentët e ripërdorshëm UI dhe lexuesi QR
│   │   ├── contexts/   # AuthContext dhe CartContext
│   │   ├── pages/      # Ballina, Restorantet, Menytë, KDS, Porositë, Paneli Admin
│   │   ├── routes/     # ProtectedRoute me mburoja sipas roleve
│   │   └── services/   # Klienti Axios me interceptorë Bearer Token
│   └── package.json
├── docs/               # Dokumentacioni Inxhinierik i Sistemit
│   ├── PROJECT_OVERVIEW.md     # Kërkesat e detajuara dhe specifikimi i moduleve
│   ├── ARCHITECTURE.md         # Arkitektura e sistemit, rrjedha e të dhënave dhe API
│   ├── DATABASE_DESIGN.md      # Skema relacionale me 21 entitete dhe diagrami ER
│   ├── DEVELOPMENT_ROADMAP.md  # Plani 20-ditor i zhvillimit dhe synimet ditore
│   └── DAILY_PROGRESS.md       # Regjistri ditor i ecurisë së zhvillimit
├── .gitignore          # Përjashtimet e rrepta të Git (.env, vendor, node_modules)
├── .env.example        # Shablloni i konfigurimit të mjedisit (MySQL)
└── README.md           # Përmbledhja kryesore e projektit
```

---

## 🛠️ Teknologjitë e Përdorura

| Shtresa | Teknologjia | Qëllimi |
|---|---|---|
| **Frontend** | React 18 / 19, Vite | Aplikacion i shpejtë dhe reaktiv (SPA) |
| **Dizajni & Stili** | CSS Modern me variabla temash | Ndërfaqe komerciale e frymëzuar nga Wolt Kosova |
| **Backend** | Laravel 11 (PHP 8.2+) | API e pastër dhe e fuqishme RESTful me shtresë shërbimesh |
| **Autentifikimi** | Laravel Sanctum | Autentifikim me Bearer Token dhe politika sipas roleve |
| **Baza e të Dhënave** | MySQL 8.0 / MariaDB (XAMPP) | Bazë relacionale me çelësa të huaj të rreptë dhe transaksione InnoDB |
| **Kodi & Versionimi**| Git / GitHub | Rrjedhë pune me degën aktive `development` |

---

## ⚙️ Udhëzuesi i Nisjes Lokale

### 1. Parakushtet
- PHP 8.2 ose më i lartë
- Composer 2.x
- Node.js 18+ dhe npm
- Shërbimi MySQL i nisur (p.sh. përmes XAMPP në portin 3306 ose 3307)

### 2. Konfigurimi i Backend-it (Laravel)
```bash
cd backend
composer install
copy .env.example .env
php artisan key:generate
# Konfiguroni të dhënat e MySQL në skedarin .env
php artisan migrate --seed
php artisan serve
```

### 3. Konfigurimi i Frontend-it (React)
```bash
cd frontend
npm install
npm run dev
```
Hapni shfletuesin në adresën: `http://localhost:5173`
