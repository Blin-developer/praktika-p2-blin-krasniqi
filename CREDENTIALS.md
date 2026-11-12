# Tastio – Llogaritë Demo për Testim

Ky skedar përmban kredencialet e llogarive të para-krijuara për testim dhe demonstrim të platformës Tastio.

> **Shënim:** Këto llogari ekzistojnë vetëm në mjedisin e zhvillimit (development). Mos i përdor në prodhim (production).

---

## Llogaritë e Disponueshme

### Super Administrator
- **Email:** `admin@tastio.com`
- **Fjalëkalimi:** `password123`
- **Aksesi:** Paneli i plotë Admin (`/admin`) — menaxhim i të gjithë platformës

---

### Pronar Restoranti
- **Email:** `owner.tartine@tastio.com`
- **Fjalëkalimi:** `password123`
- **Aksesi:** Paneli Admin (`/admin`) — menaxhim i restorantit dhe degëve

---

### Menaxher Dege
- **Email:** `manager.center@tastio.com`
- **Fjalëkalimi:** `password123`
- **Aksesi:** Paneli Admin (`/admin`) — menaxhim i degës Tartine Qendër

---

### Staf Kuzhine (KDS)
- **Email:** `kitchen.grill@tastio.com`
- **Fjalëkalimi:** `password123`
- **Aksesi:** Sistemi i Kuzhines KDS (`/kds`) — sheh dhe menaxhon porositë aktive

---

### Klient
- **Email:** `customer.blin@tastio.com`
- **Fjalëkalimi:** `password123`
- **Aksesi:** Porosisin nga restorantet (`/restorante`) — ndjek porositë e veta

---

## Si të Kyçeni

1. Hapni aplikacionin dhe shkoni te [/kyqja](http://localhost:5173/kyqja)
2. Vendosni **email-in** dhe **fjalëkalimin** nga tabela më lart
3. Klikoni **Kyçu** — sistemi do t'ju ridrejtojë automatikisht sipas rolit

---

## Rolet dhe Lejet

| Roli | Email | Paneli |
|---|---|---|
| `super_admin` | admin@tastio.com | /admin |
| `owner` | owner.tartine@tastio.com | /admin |
| `branch_manager` | manager.center@tastio.com | /admin |
| `kitchen_staff` | kitchen.grill@tastio.com | /kds |
| `customer` | customer.blin@tastio.com | /restorante |

---

*Praktika P2 – Blin Krasniqi | Tastio Platform*
