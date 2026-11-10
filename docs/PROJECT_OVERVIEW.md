# Përmbledhja e Projektit: Platformë Profesionale për Porositjen e Ushqimit në Restorante

## 1. Përmbledhje Ekzekutive & Qëllimi

**Titulli i Projektit:** Platformë Profesionale për Porositjen e Ushqimit në Restorante (`Tastio`)  
**Lënda Akademike:** Praktika Profesionale 2026/27 — Projekti 02  
**Zhvilluesi Student:** Blin Krasniqi  
**Repozitori:** `praktika-p2-blin-krasniqi`  
**Dega Kryesore e Zhvillimit:** `development` (Rregull i rreptë i degëzimit në Git; dega `main` mbetet e paprekur deri në dorëzimin përfundimtar)  
**Afati:** 4 Javë (20 Seanca Zhvillimi: 10 Nëntor 2026 — 6 Dhjetor 2026 në 23:59 Evropë/Prishtinë)  
**Teknologjitë:** React (Vite, SPA, Arkitekturë Moderne UI), Laravel 11 (RESTful API, Sanctum, Eloquent, Queues, Broadcasting), MySQL 8 / MariaDB (Skemë relacionale e rreptë, çelësa të huaj, transaksione ACID), WebSockets (Sinkronizim në kohë reale).

---

## 2. Core Business Problem & Inspiration

Commercial food ordering platforms (inspired by platforms like **Wolt Kosovo**) provide seamless, multi-tenant digital ordering experiences for diners and restaurant operators. However, standard eCommerce systems often fail in the restaurant domain because they treat food as static inventory. Food ordering requires:
1. **Dynamic Customization:** Complex modifier trees (options, add-ons, sauces, required choices, min/max selection bounds).
2. **Multi-Location Fulfillment:** Restaurants operating multiple independent branches with distinct opening hours, physical addresses, preparation queues, and pickup capacities.
3. **Kitchen Workstations:** Segregated ticket routing (Grill, Salad, Bar, Packaging) for multi-station preparation.
4. **Scheduled Pickup Slot Capacity:** Preventing kitchen bottlenecks by throttling scheduled pickup windows.
5. **Live Transparent Tracking:** Instant customer feedback via WebSockets as an order transitions across `pending`, `confirmed`, `in_preparation`, `ready_for_pickup`, and `completed`.
6. **In-Store QR Token Verification & Payment:** Fraud-resistant order pickup validation using cryptographically secure tokens rendered as QR codes, coupled with pay-at-pickup settlement.

---

## 3. Scope & Mandatory Requirements Matrix

The platform is designed around 12 core functional domains specified in the official project requirements:

| Module / Domain | Mandatory Capabilities & Deliverables | Primary User Roles |
|---|---|---|
| **1. Identity & RBAC** | Multi-role authentication (Sanctum tokens), email verification, password security, role switching/guards. | Customer, Kitchen Staff, Branch Manager, Restaurant Owner, Super Admin |
| **2. Multi-Restaurant & Branch Management** | Tenant isolation, restaurant profiles, business logos/banners, branch geolocations, contact details, branch-specific status. | Restaurant Owner, Branch Manager, Super Admin |
| **3. Business & Menu Categories** | Global cuisine classification (Traditional, Fast Food, Italian, Bakery, etc.) and restaurant menu categorization (Appetizers, Mains, Drinks). | Super Admin (Business), Restaurant Owner (Menu) |
| **4. Products & Customizer Engine** | Product catalog, pricing, allergens, preparation base time, option groups (single/multi-select, min/max rules, incremental price deltas). | Restaurant Owner, Kitchen Staff, Customer |
| **5. Operations, Hours & Slots** | 7-day branch opening schedules, holiday overrides, time-slot pickup scheduling with configurable slot capacity limits. | Branch Manager, Customer |
| **6. Cart & Server-Side Pricing Engine** | Client-side reactive cart; 100% server-side mathematical validation of all prices, options, and taxes (tamper-proof). | Customer, Backend Core |
| **7. Order Lifecycle State Machine** | Strict transitions: `pending` → `confirmed` → `in_preparation` → `ready_for_pickup` → `completed` (or `cancelled`). | Customer, Kitchen Staff, Manager |
| **8. Kitchen Display System (KDS)** | Multi-station real-time dashboard (Grill, Fryer, Salad, Packaging), preparation tickets, order item progress tracking. | Kitchen Staff, Branch Manager |
| **9. Ready Time Engine** | Dynamic calculation of prep times based on order complexity and current active kitchen load; historical tracking. | Kitchen Staff, Customer |
| **10. QR Pickup & Pay-at-Pickup** | Secure UUID/HMAC pickup verification token, QR generation, staff token scanning, payment reconciliation at counter. | Customer, Cashier / Staff |
| **11. Real-time Synchronization** | WebSocket broadcasting on status updates, kitchen alerts, in-app notification center. | All Roles |
| **12. Analytics, Reports & Audit Log** | Revenue graphs, top-selling items, slot saturation metrics, prep time variance, tamper-proof activity audit logging. | Restaurant Owner, Super Admin |

---

## 4. User Roles & Permission Matrix

The application enforces a granular Role-Based Access Control (RBAC) architecture:

1. **Super Admin (Platform Administrator):**
   - Full visibility across all restaurants, users, branches, and platform audit logs.
   - Onboards and approves new restaurant partners and manages global business categories.
   - Monitors platform-wide performance and system health.

2. **Restaurant Owner:**
   - Full ownership of their assigned restaurant profile.
   - Manages menu categories, products, customization groups, and options.
   - Creates and manages branches under the restaurant brand.
   - Assigns staff members to specific branches with designated roles (Manager, Kitchen, Cashier).
   - Views restaurant-level financial and operational analytics.

3. **Branch Manager:**
   - Operates a specific branch location.
   - Configures weekly opening/closing hours and holiday exceptions.
   - Adjusts pickup slot intervals and capacity constraints (max concurrent orders per slot).
   - Configures kitchen stations and monitors overall order flow and ready-time history.

4. **Kitchen Staff / Station Cook:**
   - Operates the Kitchen Display System (KDS).
   - Filters tickets by station (e.g., Grill, Assembly, Packaging) or views the full branch ticket feed.
   - Advances item and order preparation states (`in_preparation`, `ready_for_pickup`).
   - Adjusts estimated prep time in case of kitchen surges.

5. **Counter Staff / Cashier:**
   - Verifies customer pickup tokens via QR code scanning or manual code entry.
   - Collects payment (Cash / POS Terminal) and marks orders as `completed` / `paid`.

6. **Customer (Public User):**
   - Discovers restaurants by cuisine, location, and branch status (Open/Closed).
   - Configures items with custom options and adds to cart.
   - Selects immediate or scheduled pickup time slot.
   - Places orders and tracks real-time progress.
   - Accesses order history and digital pickup pass (QR Code).

---

## 5. Non-Functional & Quality Standards

- **Security First:** Strict input validation, SQL injection prevention via Eloquent ORM, CSRF protection, cryptographic pickup tokens, rate-limiting on sensitive endpoints.
- **Data Integrity:** Foreign key cascading rules, database transactions around multi-table order placement and status transitions, ACID guarantees.
- **Responsive & Modern UI:** Clean, human-centric design inspired by Wolt, with full support for mobile, tablet, and desktop screens.
- **Maintainability:** Separation of concerns using Service classes, FormRequests, API Resources, and modular React feature structures.
