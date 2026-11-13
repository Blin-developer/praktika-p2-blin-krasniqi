# Tastio – Llogaritë Demo dhe Sistemi i Autentifikimit (Dita 4)

Ky skedar përmban kredencialet e llogarive të para-krijuara për testim dhe demonstrim të platformës Tastio, si dhe specifikat e sistemit të roleve.

---

## 1. Llogaritë e Disponueshme për Testim

### Super Administrator (ADMIN)
- **Email:** `admin@tastio.com`
- **Fjalëkalimi:** `password123`
- **Ridrejtimi automatik:** Paneli Admin (`/admin`)
- **Të drejtat:** Menaxhim i plotë i restoranteve, kategorive, produkteve, porosive, përdoruesve dhe metrikave të sistemit.

---

### Klient i Zakonshëm (USER)
- **Email:** `customer.blin@tastio.com`
- **Fjalëkalimi:** `password123`
- **Ridrejtimi automatik:** Faqja Kryesore (`/`)
- **Të drejtat:** Shfletim i restoranteve, menaxhim i shportës, kryerje porosish, ndjekje dhe histori e porosive (`/porosite`). Nuk ka qasje në panelin administrativ.

---

### Role të Tjera Operative
| Roli | Email | Fjalëkalimi | Paneli |
|---|---|---|---|
| **Pronar Restoranti** | `owner.tartine@tastio.com` | `password123` | `/admin` |
| **Menaxher Dege** | `manager.center@tastio.com` | `password123` | `/admin` |
| **Staf Kuzhine (KDS)** | `kitchen.grill@tastio.com` | `password123` | `/kds` |

---

## 2. Siguria e Autentifikimit dhe Role-Based Access Control (RBAC)

1. **Regjistrimet Publike:**
   - Formulari publik në `/regjistrim` krijon **vetëm dhe ekskluzivisht** llogari me rolin `customer`.
   - Backend-i injoron dhe parandalon çdo përpjekje për caktim të rolit `admin` nga kërkesa e klientit.
2. **Ndarja e Qasjes:**
   - Përdoruesit me rolin `customer` nuk kanë qasje në rrugët `/admin` apo `/kds` (mbrohen përmes `ProtectedRoute` në frontend dhe middleware `role:...` në backend).
   - Tentativat e paautorizuara ridrejtohen te `/unauthorized` ose kthejnë HTTP 403 Forbidden.
3. **Hashing dhe Sesione:**
   - Fjalëkalimet ruhen në databazë të hash-uara me Bcrypt (`Hash::make`).
   - Autentifikimi kryhet përmes Laravel Sanctum me Bearer Tokens të sigurt.

---

*Praktika P2 – Blin Krasniqi | Tastio Platform (Dita 4)*
