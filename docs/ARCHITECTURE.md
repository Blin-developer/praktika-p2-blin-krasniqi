# Arkitektura e Sistemit & Rrjedha e të Dhënave (System Architecture)

## 1. Përmbledhje Arkitekturore

Platforma **GourmetExpress** është ndërtuar sipas modelit të ndarë (*Decoupled Monorepo*), ku pjesa ballore (Frontend) ekzekutohet si një Single Page Application (SPA) në **React (Vite)** dhe pjesa prapavijë (Backend) si një **Laravel 11 RESTful API** e lidhur me bazën e të dhënave relacionale **MySQL 8.0**.

### Parimet Kryesore Teknike:
1. **Autoriteti Matematikor në Backend:** Asnjë llogaritje apo shumë e dërguar nga klienti nuk pranohet si e mirëqenë. Çmimet bazë, modifikuesit, taksat dhe zbritjet llogariten ekskluzivisht në server.
2. **Ndërlidhje e Rreptë me MySQL:** Përdorimi i motorit InnoDB me çelësa të huaj kaskadë dhe mbështetje të transaksioneve atomike (ACID).
3. **Mbrojtje e Integritetit të Gjendjes:** Makina e gjendjes së porosisë (`pending` → `confirmed` → `in_preparation` → `ready_for_pickup` → `completed`) regjistron çdo ndryshim në mënyrë të pandryshueshme në `order_status_history`.
4. **Verifikim Digjital me Kod QR:** Çdo porosi gjeneron një çelës unik kriptografik SHA-256 që shfaqet si kod QR dhe kod 6-shifror për marrje të sigurt në sportel pa rrezik mashtrimi.

---

## 2. Diagrami i Shtresave të Sistemit

```
+------------------------------------------------------------------------+
|                     REACT SPA FRONTEND (Vite)                          |
|  - AuthContext (Sanctum Tokens)      - CartContext (Kufizim Dege)      |
|  - Storefront / Zbulimi Restorantit  - Modali i Modifikuesve           |
|  - Sistemi i Kuzhinës (KDS)          - Pass-i Digjital me QR           |
+-----------------------------------^------------------------------------+
                                    |  JSON REST API (Bearer Token)
                                    v
+------------------------------------------------------------------------+
|                      LARAVEL 11 RESTFUL BACKEND                        |
|  - Routing & Middleware (RBAC: Klient, Kuzhinë, Menaxher, Pronar, Admin)|
|  - AuthController & Shërbimet e Biznesit                               |
|  - OrderCalculationService (Llogaritje Çmimesh në Server)             |
|  - OrderStateMachineService (Tranzicionet e Gjendjes)                  |
|  - KDS Dispatcher & Shërbimi i Verifikimit QR                          |
+-----------------------------------^------------------------------------+
                                    |  PDO / Eloquent ORM
                                    v
+------------------------------------------------------------------------+
|                      MYSQL DATABASE (InnoDB Engine)                    |
|  - 21 Entitete të Normalizuara (3NF)                                   |
|  - Transaksione ACID & Kyçje Rreshti për Dritaret e Marrjes            |
|  - Indekse të Plota për Performancë të Lartë                           |
+------------------------------------------------------------------------+
```

---

## 3. Matrica e Roleve dhe Lejeve (RBAC)

Platforma mbështet 5 role të përdoruesve me leje të ndara:

| Roli | Përshkrimi | Qasja në Module |
|---|---|---|
| **Klient (`customer`)** | Përdoruesi fundor që porosit ushqim | Zbulimi i restoranteve, shporta, porositë e mia, QR pass |
| **Staf Kuzhine (`kitchen_staff`)** | Kuzhinierët dhe përgatitësit | Paneli KDS, avancimi i artikujve, shënimi i porosisë si gati |
| **Menaxher Dege (`branch_manager`)** | Menaxhimi operativ i degës | KDS, menaxhimi i stafit të degës, oraret javore, verifikimi QR |
| **Pronar Restoranti (`owner`)** | Pronari i brendit | Menaxhimi i degëve, menytë, artikujt, grupet e modifikuesve |
| **Super Admin (`super_admin`)** | Administratori i platformës | Kategoritë globale të biznesit, auditimi, të gjitha restorantet, statistikat |
