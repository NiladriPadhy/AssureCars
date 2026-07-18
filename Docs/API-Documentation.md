# AssureCars — API Documentation

**Product:** AssureCars — Premium Certified Used-Car Reseller Platform  
**API Version:** v1  
**Base URL:** `https://{dealer-domain}/api/v1`  
**Status:** Draft — aligned with Solution Design Document v3.1  
**Last Updated:** 2026-07-18

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Identity & Profile](#3-identity--profile)
4. [Cars & Discovery (Public)](#4-cars--discovery-public)
5. [Interest & Leads](#5-interest--leads)
6. [Test Drive Booking](#6-test-drive-booking)
7. [Reservations](#7-reservations)
8. [Inspection Reports (Buyer)](#8-inspection-reports-buyer)
9. [Inspection Services — Sell & PDI (Phase 2)](#9-inspection-services--sell--pdi-phase-2)
10. [Employee APIs](#10-employee-apis)
11. [Admin APIs](#11-admin-apis)
12. [Inspection App Integration (Webhook)](#12-inspection-app-integration-webhook)
13. [Media](#13-media)
14. [Reviews (Phase 2)](#14-reviews-phase-2)
15. [Reference Data & CMS](#15-reference-data--cms)
16. [Common Schemas](#16-common-schemas)
17. [Error Responses](#17-error-responses)

---

## 1. Overview

### 1.1 Conventions

| Item | Convention |
|------|------------|
| Format | REST + JSON (`Content-Type: application/json`) |
| Versioning | URI prefix `/v1` |
| Auth | `Authorization: Bearer <access_token>` + `X-Client-Id: UserApp|Website|EmployeeApp|AdminPortal|InspectionApp` |
| Idempotency | `Idempotency-Key: <uuid>` on state-changing POSTs |
| Optimistic lock | `If-Match: "<rowVersion>"` on PATCH |
| Tracing | `traceparent` header propagated |
| Timestamps | ISO-8601 UTC (`2026-07-11T14:30:00Z`) |
| Money | Stored as paise internally; API exposes `amountPaise` + human `display` |
| Pagination (lists) | Cursor: `?cursor=abc&limit=20` or page: `?page=1&size=20` |

### 1.2 Response Envelope

**Single resource**

```json
{
  "data": { /* resource */ },
  "traceId": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
}
```

**List resource**

```json
{
  "data": [ /* items */ ],
  "meta": {
    "total": 128,
    "nextCursor": "eyJpZCI6ImMxIn0",
    "facets": {
      "fuelType": { "Petrol": 42, "Diesel": 86 },
      "bodyStyle": { "SUV": 55, "Sedan": 38 }
    }
  },
  "traceId": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
}
```

### 1.3 Login Types, Roles & Client Access

AssureCars has **three login types** plus a **hub-scoped role hierarchy**. Each login issues JWTs scoped to specific client applications; staff tokens are further scoped to hub(s) via `hubIds`. The API gateway rejects a token if the request's `X-Client-Id` is not in the token's `allowedClients`, and the service layer enforces hub scoping.

| Login type | Auth method | Roles | Client apps | API groups allowed |
|------------|-------------|-------|-------------|-------------------|
| **User Login** | OTP (phone) | `user` | `UserApp`, `Website` | Public APIs + User APIs (`/v1/me`, interest, test drives, inspection requests). **No reservation endpoints** |
| **Employee Login** | Password (+ MFA if enabled) | `hub_employee` | `EmployeeApp`, `InspectionApp` | Public APIs + Employee APIs (`/v1/employee/*`, test-drive execution), **hub-scoped** |
| **Admin Login** | Password + MFA (required) | `super_admin`, `hub_admin` | `AdminPortal` | Public + Admin APIs (`/v1/admin/*`); `hub_admin` **hub-scoped**, `super_admin` global |

**Admin is dashboard-only:** `super_admin`/`hub_admin` tokens grant **Admin Portal only** — never Employee App or Inspection App.

**Inspection App:** Uses **Employee Login (`hub_employee`)** tokens only. The existing Inspection App login screen will be updated separately to authenticate against AssureCars IdP. **User Login and Admin tokens are never accepted.**

**Guest (no login):** Public read-only APIs only — browse cars (incl. hub name/city + distance), CMS banners.

#### API Access Matrix

| API group | Guest | User Login | Employee Login (`hub_employee`) | Admin Login (`super_admin`/`hub_admin`) |
|-----------|-------|------------|----------------|-------------|
| `GET /v1/cars`, car detail, CMS | ✓ | ✓ | ✓ | ✓ |
| `POST /v1/cars/{id}/interest`, `/v1/test-drives` | ✗ | ✓ | ✗ | ✗ |
| `/v1/admin/reservations` | ✗ | ✗ | ✗ | ✓ |
| `GET/PUT /v1/me`, `/v1/me/*` | ✗ | ✓ | ✓ | ✓ |
| `/v1/employee/*` (hub-scoped) | ✗ | ✗ | ✓ | ✗ |
| `/v1/admin/*` (hub-scoped for hub_admin) | ✗ | ✗ | ✗ | ✓ |
| Inspection App (capture UI) | ✗ | ✗ | ✓ | ✗ |
| `POST /v1/integrations/inspection/reports` | HMAC | HMAC | HMAC | HMAC |

#### JWT Claims (all login types)

```json
{
  "sub": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "accountType": "User",
  "clientId": "UserApp",
  "allowedClients": ["UserApp", "Website"],
  "roles": ["user"],
  "hubIds": [],
  "permissions": ["cars:read", "interest:create", "test-drives:create"],
  "exp": 1720700000,
  "iat": 1720699100
}
```

| Claim | Values |
|-------|--------|
| `accountType` | `User`, `Employee`, `Admin` |
| `clientId` | Client that initiated login |
| `allowedClients` | Clients permitted to use this token |
| `roles` | RBAC roles: `user`, `hub_employee`, `hub_admin`, `super_admin` |
| `hubIds` | Hubs this staff token is scoped to (empty/absent ⇒ global `super_admin`; irrelevant for `user`) |
| `permissions` | Fine-grained permission codes |

### 1.4 Health Check

```http
GET /health
```

**Response `200 OK`**

```json
{
  "status": "Healthy",
  "version": "1.0.0",
  "checks": {
    "database": "Healthy",
    "redis": "Healthy",
    "storage": "Healthy"
  }
}
```

---

## 2. Authentication

All authenticated requests require:
- `Authorization: Bearer <access_token>`
- `X-Client-Id: UserApp | Website | EmployeeApp | AdminPortal | InspectionApp`

The gateway validates that `X-Client-Id` is present in the token's `allowedClients` claim.

---

### 2.1 User Login — Request OTP

For **User App** and **Website** only. Issues tokens with `accountType: User`.

```http
POST /v1/auth/user/otp/request
X-Client-Id: UserApp
```

**Request**

```json
{
  "phone": "+919876543210",
  "channel": "sms"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | Yes | E.164 format |
| `channel` | string | No | `sms` (default) or `email` |

| Header | Required value |
|--------|----------------|
| `X-Client-Id` | `UserApp` or `Website` |

**Response `202 Accepted`**

```json
{
  "data": {
    "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "expiresInSeconds": 300,
    "maskedPhone": "+91*****3210"
  },
  "traceId": "00-..."
}
```

**Errors:** `429` (rate limit), `400` (invalid phone), `403` (wrong `X-Client-Id` — e.g. EmployeeApp not allowed)

---

### 2.2 User Login — Verify OTP

```http
POST /v1/auth/user/otp/verify
X-Client-Id: UserApp
```

**Request**

```json
{
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "phone": "+919876543210",
  "otp": "482910"
}
```

**Response `200 OK`**

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
    "expiresInSeconds": 900,
    "tokenClaims": {
      "accountType": "User",
      "clientId": "UserApp",
      "allowedClients": ["UserApp", "Website"]
    },
    "user": {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "phone": "+919876543210",
      "fullName": "Rahul Sharma",
      "email": null,
      "accountType": "User",
      "roles": ["user"]
    }
  },
  "traceId": "00-..."
}
```

> This token works in **User App** and **Website** only. It is rejected by Employee App, Admin Portal, and Inspection App.

**Errors:** `401 Unauthorized` (invalid/expired OTP)

---

### 2.3 Employee Login

For **Employee App** and **Inspection App**. Issues tokens with `accountType: Employee`.

```http
POST /v1/auth/employee/login
X-Client-Id: EmployeeApp
```

**Request**

```json
{
  "username": "priya.menon",
  "password": "********"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | Employee username or employee code |
| `password` | string | Yes | Staff password |

| Header | Required value |
|--------|----------------|
| `X-Client-Id` | `EmployeeApp` or `InspectionApp` |

**Response `200 OK` — MFA not required**

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
    "expiresInSeconds": 900,
    "tokenClaims": {
      "accountType": "Employee",
      "clientId": "EmployeeApp",
      "allowedClients": ["EmployeeApp", "InspectionApp"],
      "roles": ["hub_employee"],
      "hubIds": ["h1a2b3c4-d5e6-7890-abcd-ef1234567890"],
      "permissions": ["leads:read", "leads:update", "test-drives:execute", "inspections:perform"]
    },
    "user": {
      "id": "u1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "fullName": "Priya Menon",
      "accountType": "Employee",
      "employeeCode": "EMP-042",
      "roles": ["hub_employee"],
      "hubIds": ["h1a2b3c4-d5e6-7890-abcd-ef1234567890"]
    }
  },
  "traceId": "00-..."
}
```

**Response `200 OK` — MFA required**

```json
{
  "data": {
    "mfaRequired": true,
    "mfaSessionId": "mfa-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "expiresInSeconds": 300
  },
  "traceId": "00-..."
}
```

**Errors:** `401` (invalid credentials), `423` (account locked), `403` (UserApp/Website/AdminPortal client ID)

---

### 2.4 Employee Login — Verify MFA

```http
POST /v1/auth/employee/mfa/verify
X-Client-Id: EmployeeApp
```

**Request**

```json
{
  "mfaSessionId": "mfa-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "totp": "482910"
}
```

**Response `200 OK`** — same token shape as §2.3 (without MFA challenge)

---

### 2.5 Admin Login

For the **Admin Portal only** (dashboard). Issues tokens with `accountType: Admin` and role `super_admin` or `hub_admin`. MFA is **always required**. Admin tokens do **not** grant Employee App or Inspection App access.

```http
POST /v1/auth/admin/login
X-Client-Id: AdminPortal
```

**Request**

```json
{
  "username": "admin",
  "password": "********"
}
```

| Header | Allowed values |
|--------|----------------|
| `X-Client-Id` | `AdminPortal` |

**Response `200 OK` — MFA challenge (always)**

```json
{
  "data": {
    "mfaRequired": true,
    "mfaSessionId": "mfa-b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "expiresInSeconds": 300
  },
  "traceId": "00-..."
}
```

---

### 2.6 Admin Login — Verify MFA

```http
POST /v1/auth/admin/mfa/verify
X-Client-Id: AdminPortal
```

**Request**

```json
{
  "mfaSessionId": "mfa-b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "totp": "739281"
}
```

**Response `200 OK`**

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
    "expiresInSeconds": 900,
    "tokenClaims": {
      "accountType": "Admin",
      "clientId": "AdminPortal",
      "allowedClients": ["AdminPortal"],
      "roles": ["super_admin"],
      "hubIds": [],
      "permissions": ["admin:*", "leads:*", "cars:*"]
    },
    "user": {
      "id": "u2b3c4d5-e6f7-8901-bcde-f12345678902",
      "fullName": "Admin User",
      "accountType": "Admin",
      "roles": ["super_admin"],
      "hubIds": []
    }
  },
  "traceId": "00-..."
}
```

> Admin tokens grant **Admin Portal APIs only** (dashboard). A `super_admin` has `hubIds: []` (global); a `hub_admin` carries its assigned `hubIds` and every `/v1/admin/*` call is filtered to those hubs. Admin tokens are **rejected** by the Employee App and Inspection App.

---

### 2.7 Refresh Token

```http
POST /v1/auth/refresh
X-Client-Id: UserApp
```

**Request**

```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

**Response `200 OK`**

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "bmV3IHJlZnJlc2ggdG9rZW4...",
    "expiresInSeconds": 900,
    "tokenClaims": {
      "accountType": "User",
      "allowedClients": ["UserApp", "Website"]
    }
  },
  "traceId": "00-..."
}
```

**Errors:** `403` if `X-Client-Id` not in original token's `allowedClients`

---

### 2.8 Logout

```http
POST /v1/auth/logout
Authorization: Bearer <access_token>
X-Client-Id: UserApp
```

**Request**

```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

**Response `204 No Content`**

---

### 2.9 Inspection App Authentication (External)

The **Inspection Mobile App already exists**. Its login screen will be updated (outside AssureCars) to call:

1. `POST /v1/auth/employee/login` with `X-Client-Id: InspectionApp` — for hub employees / technicians

The returned JWT is stored and sent on subsequent API calls. AssureCars WebAPI validates:
- Token signature and expiry
- `X-Client-Id: InspectionApp` ∈ `allowedClients`
- `accountType` is `Employee` (never `User` or `Admin`)

**Report ingestion webhook** (`POST /v1/integrations/inspection/reports`) uses **HMAC service authentication**, not user JWT — see §12.

---

## 3. Identity & Profile

### 3.1 Get My Profile

```http
GET /v1/me
Authorization: Bearer <access_token>
```

**Response `200 OK`**

```json
{
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "phone": "+919876543210",
    "phoneVerified": true,
    "email": "rahul@example.com",
    "emailVerified": false,
    "fullName": "Rahul Sharma",
    "accountType": "User",
    "roles": ["user"],
    "createdAt": "2026-06-01T08:00:00Z"
  },
  "traceId": "00-..."
}
```

---

### 3.2 Update My Profile

```http
PUT /v1/me
Authorization: Bearer <access_token>
```

**Request**

```json
{
  "fullName": "Rahul Sharma",
  "email": "rahul@example.com"
}
```

**Response `200 OK`** — same shape as GET `/v1/me`

---

### 3.3 My Test Drives

```http
GET /v1/me/test-drives?status=Confirmed&limit=10
Authorization: Bearer <access_token>
```

**Response `200 OK`**

```json
{
  "data": [
    {
      "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
      "bookingNumber": "TD-2026-004521",
      "status": "Confirmed",
      "mode": "AtHub",
      "car": {
        "id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "title": "Toyota Fortuner 2.8 4x4 AT",
        "thumbnailUrl": "https://cdn.dealer.example/cars/c1/primary.jpg"
      },
      "slot": {
        "startUtc": "2026-07-19T09:20:00Z",
        "endUtc": "2026-07-19T09:40:00Z",
        "hubName": "Whitefield Hub"
      },
      "createdAt": "2026-07-11T10:00:00Z"
    }
  ],
  "meta": { "total": 1, "nextCursor": null },
  "traceId": "00-..."
}
```

---

### 3.4 My Reservations — **Removed**

> **Reservations are staff-only (Hub Admin).** Users cannot self-reserve, so there is no user-facing reservation list. A buyer is informed of a hold via notification (WhatsApp/SMS). Reservation management lives under Admin APIs — see §11.16.

---

## 4. Cars & Discovery (Public)

### 4.1 Search & Browse Cars

```http
GET /v1/cars?city=Bengaluru&make=Toyota&fuelType=Diesel&maxPricePaise=400000000&sort=price_asc&page=1&size=20
```

| Query param | Type | Description |
|-------------|------|-------------|
| `q` | string | Free-text search |
| `city` | string | Filter by hub city |
| `make` | string | Make name |
| `model` | string | Model name |
| `bodyStyle` | string | `SUV`, `Sedan`, etc. |
| `fuelType` | string | `Petrol`, `Diesel`, etc. |
| `transmission` | string | `Automatic`, `Manual`, etc. |
| `minYear` / `maxYear` | int | Registration year range |
| `maxOdometerKm` | int | Max kilometers |
| `minPricePaise` / `maxPricePaise` | long | Price range in paise |
| `hubId` | uuid | Specific hub |
| `sort` | string | `relevance`, `price_asc`, `price_desc`, `newest`, `low_km`, `distance` |
| `lat` / `lng` / `radiusKm` | float | Geo filter |
| `page` / `size` | int | Pagination |

**Response `200 OK`**

```json
{
  "data": [
    {
      "id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "title": "Toyota Fortuner 2.8 4x4 AT · Legender",
      "year": 2022,
      "odometerKm": 38400,
      "fuelType": "Diesel",
      "transmission": "Automatic",
      "color": "Pearl White",
      "listPrice": {
        "amountPaise": 387500000,
        "display": "₹38.75 L"
      },
      "emiFrom": {
        "amountPaise": 7210000,
        "display": "₹72,100/mo"
      },
      "certification": {
        "grade": "A",
        "overallScore": 96,
        "badge": "Certified"
      },
      "hub": {
        "id": "h1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "name": "Whitefield Hub",
        "city": "Bengaluru"
      },
      "primaryImageUrl": "https://cdn.dealer.example/cars/c1/primary.jpg",
      "status": "Live"
    }
  ],
  "meta": {
    "total": 142,
    "nextCursor": null,
    "facets": {
      "fuelType": { "Diesel": 86, "Petrol": 42, "Hybrid": 14 },
      "bodyStyle": { "SUV": 55, "Sedan": 38, "Hatchback": 49 }
    }
  },
  "traceId": "00-..."
}
```

---

### 4.2 Get Car Detail

```http
GET /v1/cars/{carId}
```

**Response `200 OK`**

```json
{
  "data": {
    "id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "vin": "MA3EYD81S00123456",
    "registrationNumber": "KA01AB1234",
    "title": "Toyota Fortuner 2.8 4x4 AT · Legender",
    "make": "Toyota",
    "model": "Fortuner",
    "variant": "2.8 4x4 AT · Legender",
    "year": 2022,
    "odometerKm": 38400,
    "fuelType": "Diesel",
    "transmission": "Automatic",
    "bodyStyle": "SUV",
    "color": "Pearl White",
    "numberOfOwners": 1,
    "listPrice": {
      "amountPaise": 387500000,
      "display": "₹38.75 L"
    },
    "emiFrom": {
      "amountPaise": 7210000,
      "display": "₹72,100/mo"
    },
    "certification": {
      "grade": "A",
      "overallScore": 96,
      "conditionBand": "Excellent",
      "badge": "Certified",
      "inspectionReportId": "3542dba1-0bce-4135-8b31-4b417c0a5a4a"
    },
    "hub": {
      "id": "h1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "name": "Whitefield Hub",
      "address": "ITPL Main Road, Whitefield",
      "city": "Bengaluru",
      "phone": "+918012345678"
    },
    "features": ["Sunroof", "Ventilated seats", "360° camera", "6 airbags"],
    "media": [
      {
        "id": "m1",
        "type": "Photo",
        "url": "https://cdn.dealer.example/cars/c1/1.jpg",
        "isPrimary": true
      }
    ],
    "status": "Live",
    "publishedAt": "2026-07-01T12:00:00Z"
  },
  "traceId": "00-..."
}
```

**Errors:** `404` (not found or not Live)

> **EMI is indicative only.** `emiFrom` is a **display estimate** to aid discovery; the MVP is non-financial — there is **no financing/EMI application flow**.

---

## 5. Interest & Leads

### 5.1 Express Interest (Buyer)

Creates or merges into an open lead for the car.

```http
POST /v1/cars/{carId}/interest
Authorization: Bearer <access_token>
Idempotency-Key: 7c9e6679-7425-40de-944b-e07fc1f90ae7
```

**Request**

```json
{
  "preferredContact": "phone",
  "preferredTimeWindow": "evening",
  "message": "Interested in financing options",
  "budgetPaise": 400000000
}
```

**Response `201 Created`**

```json
{
  "data": {
    "leadId": "l1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "status": "New",
    "message": "Thank you! A sales executive will contact you shortly.",
    "assignedExecutive": null,
    "slaDueAt": "2026-07-11T10:30:00Z"
  },
  "traceId": "00-..."
}
```

**Notes:** Duplicate interest by same user on same car returns `200` with existing open lead.

---

## 6. Test Drive Booking

### 6.1 Get Available Slots

```http
GET /v1/cars/{carId}/test-drive/slots?date=2026-07-19&mode=AtHub
```

| Query | Description |
|-------|-------------|
| `date` | Local date `YYYY-MM-DD` |
| `mode` | `AtHub` or `Doorstep` |

**Response `200 OK`**

```json
{
  "data": {
    "carId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "date": "2026-07-19",
    "mode": "AtHub",
    "hub": {
      "id": "h1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "name": "Whitefield Hub"
    },
    "slots": [
      {
        "slotId": "s1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "startUtc": "2026-07-19T09:00:00Z",
        "endUtc": "2026-07-19T09:20:00Z",
        "startLocal": "14:30",
        "capacity": 3,
        "available": 2,
        "label": "2 slots left"
      },
      {
        "slotId": "s2a2b3c4-d5e6-7890-abcd-ef1234567891",
        "startUtc": "2026-07-19T09:20:00Z",
        "endUtc": "2026-07-19T09:40:00Z",
        "startLocal": "14:50",
        "capacity": 3,
        "available": 3,
        "label": "3 slots left"
      }
    ]
  },
  "traceId": "00-..."
}
```

---

### 6.2 Book Test Drive

```http
POST /v1/test-drives
Authorization: Bearer <access_token>
Idempotency-Key: 7c9e6679-7425-40de-944b-e07fc1f90ae7
```

**Request — At Hub**

```json
{
  "carId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "slotId": "s1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "mode": "AtHub"
}
```

**Request — Doorstep**

```json
{
  "carId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "slotId": "s3a2b3c4-d5e6-7890-abcd-ef1234567892",
  "mode": "Doorstep",
  "doorstepAddress": {
    "line1": "42, 3rd Cross, HSR Layout",
    "city": "Bengaluru",
    "pincode": "560102",
    "latitude": 12.9116,
    "longitude": 77.6388
  }
}
```

**Response `201 Created`**

```json
{
  "data": {
    "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
    "bookingNumber": "TD-2026-004521",
    "status": "Confirmed",
    "mode": "AtHub",
    "carId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "slot": {
      "slotId": "s1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "startUtc": "2026-07-19T09:20:00Z",
      "endUtc": "2026-07-19T09:40:00Z"
    },
    "otpHint": "OTP sent to +91*****3210",
    "calendarLinks": {
      "google": "https://calendar.google.com/...",
      "ics": "https://api.dealer.example/v1/test-drives/b1c2.../calendar.ics"
    }
  },
  "traceId": "00-..."
}
```

**Errors:** `409 Conflict` (slot full — includes `alternates` in extensions)

---

### 6.3 Get Test Drive Booking

```http
GET /v1/test-drives/{bookingId}
Authorization: Bearer <access_token>
```

**Response `200 OK`**

```json
{
  "data": {
    "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
    "bookingNumber": "TD-2026-004521",
    "status": "Confirmed",
    "mode": "AtHub",
    "car": {
      "id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "title": "Toyota Fortuner 2.8 4x4 AT"
    },
    "slot": {
      "startUtc": "2026-07-19T09:20:00Z",
      "endUtc": "2026-07-19T09:40:00Z",
      "hubName": "Whitefield Hub"
    },
    "assignedAgent": null,
    "rowVersion": 1,
    "createdAt": "2026-07-11T10:00:00Z"
  },
  "traceId": "00-..."
}
```

---

### 6.4 Cancel Test Drive

```http
POST /v1/test-drives/{bookingId}/cancel
Authorization: Bearer <access_token>
```

**Request**

```json
{
  "reason": "Schedule conflict"
}
```

**Response `200 OK`**

```json
{
  "data": {
    "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
    "status": "Cancelled",
    "message": "Booking cancelled. Slot capacity restored."
  },
  "traceId": "00-..."
}
```

---

### 6.5 Reschedule Test Drive

```http
POST /v1/test-drives/{bookingId}/reschedule
Authorization: Bearer <access_token>
Idempotency-Key: 8d0f7780-8536-51ef-a55c-f18gd2g01bf8
```

**Request**

```json
{
  "newSlotId": "s2a2b3c4-d5e6-7890-abcd-ef1234567891"
}
```

**Response `200 OK`**

```json
{
  "data": {
    "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
    "status": "Confirmed",
    "previousSlotId": "s1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "slot": {
      "slotId": "s2a2b3c4-d5e6-7890-abcd-ef1234567891",
      "startUtc": "2026-07-19T10:00:00Z",
      "endUtc": "2026-07-19T10:20:00Z"
    }
  },
  "traceId": "00-..."
}
```

---

## 7. Reservations — **Staff-Only (Hub Admin)**

> **Reservations are created and managed only by a Hub Admin** (Super Admin superset), **after an offline token payment**. There is **no user-facing reservation endpoint** — the reserve action has been removed from the User App and Website. A **reserved car is fully locked** (its `interest`, `test-drive`, and `reservation` endpoints reject with `409`/`422` until it is Sold or released). See **§11.16 Reservations (Admin)** for the full contract:
>
> - `POST /v1/admin/reservations` — reserve a car against an existing matching lead after offline token collection
> - `GET /v1/admin/reservations?status=&overdue=` — **Reserved Vehicles** worklist with `daysPending`
> - `GET /v1/admin/reservations/{id}` — reservation detail
> - `PATCH /v1/admin/reservations/{id}` — mark `Sold` / `Released` / notes
> - `POST /v1/admin/reservations/{id}/notify-employee` — notify assigned Hub Employee to follow up

---

## 8. Inspection Reports (Buyer)

> The buyer-facing endpoint returns a **curated summary** (score, grade, category ratings, PDF). The **complete** inspection data — full checklist, per-photo images, annotations, AI findings, and damage assessments — is captured in the DB (migration `002`) and exposed to staff via the admin endpoint §11.9.1.

### 8.1 Get Car Inspection Report Summary

```http
GET /v1/cars/{carId}/inspection-report
```

**Response `200 OK`**

```json
{
  "data": {
    "reportId": "3542dba1-0bce-4135-8b31-4b417c0a5a4a",
    "inspectionId": "2348fa87-acf5-45c9-ba34-dd709e88f5b9",
    "context": "RESALE",
    "status": "Pass",
    "inspectedAt": "2026-07-11T14:30:00Z",
    "vehicle": {
      "make": "Tata Nexon",
      "model": "Advanture plus",
      "year": 2025,
      "color": "white",
      "registrationNumber": "KSK",
      "odometerKm": 35000
    },
    "valuation": {
      "overallScore": 80,
      "derivedGrade": "B",
      "conditionBand": "Good",
      "benchmarkScore": 70,
      "deltaVsTypical": 10,
      "marketPosition": "Above typical",
      "verdict": "Good condition — a sound purchase with only minor negotiation room.",
      "priceGuidance": "Condition supports pricing at or slightly above the typical asking price.",
      "damageCount": 0
    },
    "categoryRatings": [
      { "category": "Exterior", "rating": 5 },
      { "category": "Interior", "rating": 4 },
      { "category": "Engine", "rating": 4 },
      { "category": "Electrical", "rating": 4 },
      { "category": "Tyres", "rating": 4 },
      { "category": "Suspension", "rating": 4 },
      { "category": "Safety", "rating": 4 },
      { "category": "Documentation", "rating": 4 }
    ],
    "finalAssessment": {
      "recommendation": "NO_REPAIR",
      "remarks": "good"
    },
    "pdf": {
      "available": true,
      "downloadUrl": "https://api.dealer.example/v1/cars/c1.../inspection-report/pdf",
      "expiresAt": "2026-07-11T15:30:00Z"
    }
  },
  "traceId": "00-..."
}
```

---

### 8.2 Download Inspection PDF

Returns a short-lived redirect to pre-signed object storage URL.

```http
GET /v1/cars/{carId}/inspection-report/pdf
Authorization: Bearer <access_token>  (optional for Live cars)
```

**Response `302 Found`**

```http
Location: https://storage.dealer.example/inspection-reports/3542dba1....pdf?X-Amz-Signature=...
```

---

## 9. Inspection Services — Sell & PDI (Phase 2)

### 9.1 Submit Inspection Request

```http
POST /v1/inspection-requests
Authorization: Bearer <access_token>
Idempotency-Key: a2h9902-a758-73gh-c77e-h30if4i23dh0
```

**Request — Sell**

```json
{
  "type": "Sell",
  "vehicle": {
    "make": "Hyundai",
    "model": "Creta",
    "variant": "1.5 SX(O) Turbo",
    "year": 2020,
    "registrationNumber": "KA05CD9876",
    "odometerKm": 45000
  },
  "location": {
    "addressLine": "HSR Layout, Bengaluru",
    "city": "Bengaluru",
    "pincode": "560102",
    "latitude": 12.9116,
    "longitude": 77.6389
  },
  "preferredDate": "2026-07-19"
}
```

> Provide `latitude`/`longitude` (preferred) or at least `pincode` — the server routes the request to the customer's **nearest active hub within 40 km** and returns it as `assignedHub` (name/area/city + distance). If no hub is within 40 km, `assignedHub` is `null` and the request awaits manual assignment by a Super Admin.
>
> **Sell money is offline (non-financial):** any `indicativeQuote` / `finalOffer` returned on a Sell request are **display-only reference values** — the platform performs no payment, payout, or settlement.

**Request — PDI**

```json
{
  "type": "PDI",
  "pdiSubtype": "UsedCarOtherDealer",
  "vehicle": {
    "make": "Maruti",
    "model": "Baleno",
    "year": 2024,
    "registrationNumber": "KA03EF4567"
  },
  "location": {
    "addressLine": "MG Road showroom vicinity",
    "city": "Bengaluru"
  },
  "preferredDate": "2026-07-20"
}
```

**Response `201 Created`**

```json
{
  "data": {
    "id": "ir1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "requestNumber": "INSP-2026-001234",
    "type": "Sell",
    "status": "Requested",
    "vehicle": {
      "make": "Hyundai",
      "model": "Creta",
      "registrationNumber": "KA05CD9876"
    },
    "message": "Request received. Pick an inspection slot to continue.",
    "nextAction": "schedule",
    "assignedHub": { "name": "HSR Hub", "area": "HSR Layout", "city": "Bengaluru", "distanceKm": 3.4 }
  },
  "traceId": "00-..."
}
```

> `assignedHub` includes the hub **name/area/city + distance**. If no hub is within **40 km**, `assignedHub` is `null` and the request awaits manual assignment by a Super Admin.

---

### 9.2 Get Inspection Request

```http
GET /v1/inspection-requests/{requestId}
Authorization: Bearer <access_token>
```

**Response `200 OK` — Report Ready**

```json
{
  "data": {
    "id": "ir1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "requestNumber": "INSP-2026-001234",
    "type": "PDI",
    "pdiSubtype": "UsedCarOtherDealer",
    "status": "ReportReady",
    "appointment": {
      "scheduledStart": "2026-07-20T06:00:00Z",
      "address": "MG Road showroom vicinity, Bengaluru"
    },
    "inspectionReport": {
      "reportId": "3542dba1-0bce-4135-8b31-4b417c0a5a4a",
      "overallScore": 80,
      "derivedGrade": "B",
      "pdfDownloadUrl": "https://api.dealer.example/v1/inspection-requests/ir1.../report/pdf"
    }
  },
  "traceId": "00-..."
}
```

---

### 9.3 List My Inspection Requests

```http
GET /v1/me/inspection-requests
Authorization: Bearer <access_token>
```

**Response `200 OK`**

```json
{
  "data": [
    {
      "id": "ir1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "requestNumber": "INSP-2026-001234",
      "type": "Sell",
      "status": "Scheduled",
      "vehicleSummary": "Hyundai Creta · KA05CD9876",
      "createdAt": "2026-07-11T09:00:00Z"
    }
  ],
  "meta": { "total": 1 },
  "traceId": "00-..."
}
```

---

## 10. Employee APIs

> Requires the **Hub Employee** role (`hub_employee`), **hub-scoped**: a Hub Employee sees leads/schedule/reservations only for their assigned hub(s).

### 10.1 List My Leads

```http
GET /v1/employee/leads?status=New&sort=score_desc&page=1&size=20
Authorization: Bearer <access_token>
```

**Response `200 OK`**

```json
{
  "data": [
    {
      "id": "l1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "status": "New",
      "score": 85,
      "slaDueAt": "2026-07-11T10:30:00Z",
      "slaBreached": false,
      "buyer": {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "fullName": "Rahul Sharma",
        "phone": "+919876543210"
      },
      "car": {
        "id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "title": "Toyota Fortuner 2.8 4x4 AT",
        "listPrice": { "amountPaise": 387500000, "display": "₹38.75 L" }
      },
      "source": "Interest",
      "createdAt": "2026-07-11T10:00:00Z",
      "rowVersion": 2
    }
  ],
  "meta": { "total": 12 },
  "traceId": "00-..."
}
```

---

### 10.2 Update Lead

```http
PATCH /v1/employee/leads/{leadId}
Authorization: Bearer <access_token>
If-Match: "2"
```

**Request**

```json
{
  "status": "Contacted",
  "nextAction": "Schedule test drive",
  "nextActionAt": "2026-07-12T11:00:00Z"
}
```

**Response `200 OK`**

```json
{
  "data": {
    "id": "l1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "status": "Contacted",
    "rowVersion": 3,
    "updatedAt": "2026-07-11T10:15:00Z"
  },
  "traceId": "00-..."
}
```

---

### 10.3 Add Lead Note

```http
POST /v1/employee/leads/{leadId}/notes
Authorization: Bearer <access_token>
```

**Request**

```json
{
  "note": "Called buyer — interested in weekend test drive",
  "disposition": "positive"
}
```

**Response `201 Created`**

```json
{
  "data": {
    "id": "n1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "leadId": "l1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "note": "Called buyer — interested in weekend test drive",
    "disposition": "positive",
    "authorName": "Priya Menon",
    "createdAt": "2026-07-11T10:16:00Z"
  },
  "traceId": "00-..."
}
```

---

### 10.4 Today's Schedule

```http
GET /v1/employee/schedule?date=2026-07-19
Authorization: Bearer <access_token>
```

**Response `200 OK`**

```json
{
  "data": {
    "date": "2026-07-19",
    "bookings": [
      {
        "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
        "bookingNumber": "TD-2026-004521",
        "status": "Confirmed",
        "mode": "Doorstep",
        "startUtc": "2026-07-19T09:20:00Z",
        "buyer": {
          "fullName": "Rahul Sharma",
          "phone": "+919876543210"
        },
        "car": { "title": "Toyota Fortuner 2.8 4x4 AT" },
        "doorstepAddress": "42, 3rd Cross, HSR Layout, Bengaluru"
      }
    ]
  },
  "traceId": "00-..."
}
```

---

### 10.5 Update Test Drive Status (En Route)

```http
PATCH /v1/test-drives/{bookingId}
Authorization: Bearer <access_token>
If-Match: "1"
```

**Request**

```json
{
  "status": "EnRoute"
}
```

**Response `200 OK`**

```json
{
  "data": {
    "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
    "status": "EnRoute",
    "rowVersion": 2
  },
  "traceId": "00-..."
}
```

---

### 10.6 Check In (OTP Verify)

```http
POST /v1/test-drives/{bookingId}/checkin
Authorization: Bearer <access_token>
```

**Request**

```json
{
  "otp": "482910"
}
```

**Response `200 OK`**

```json
{
  "data": {
    "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
    "status": "CheckedIn",
    "checkedInAt": "2026-07-19T09:22:00Z"
  },
  "traceId": "00-..."
}
```

---

### 10.7 Complete Test Drive

```http
POST /v1/test-drives/{bookingId}/complete
Authorization: Bearer <access_token>
```

**Request**

```json
{
  "feedbackRating": 5,
  "feedbackText": "Buyer very interested, wants to reserve",
  "buyerInterestLevel": "high",
  "odometerKm": 38412
}
```

**Response `200 OK`**

```json
{
  "data": {
    "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
    "status": "Completed",
    "completedAt": "2026-07-19T09:45:00Z"
  },
  "traceId": "00-..."
}
```

---

### 10.8 Reservation Follow-Up (Hub Employee)

> **Hub Employees do not create or close reservations** (that is **Hub Admin-only** — see §11.16). When a Hub Admin taps **"Notify Employee App"** on the Reserved Vehicles screen, the assigned Hub Employee receives a **follow-up task** for the final deal. Employees can view the reservation and log lead notes, but `Sold`/`Released` transitions are performed by the Hub Admin.

```http
GET /v1/employee/reservations?status=Reserved
Authorization: Bearer <access_token>
```

**Response `200 OK`** — read-only worklist of reservations the employee has been asked to follow up (hub-scoped)

```json
{
  "data": [
    {
      "id": "r1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "reservationNumber": "RSV-2026-000892",
      "status": "Reserved",
      "holdExpiresAt": "2026-07-26T10:00:00Z",
      "daysPending": 3,
      "buyer": { "fullName": "Rahul Sharma", "phone": "+919876543210" },
      "car": { "title": "Toyota Fortuner", "vin": "MA3EYD81S00123456" },
      "followUpRequestedAt": "2026-07-13T09:00:00Z"
    }
  ],
  "meta": { "total": 4 },
  "traceId": "00-..."
}
```

---

## 11. Admin APIs

> Requires an **Admin Login** — role `hub_admin` (hub-scoped) or `super_admin` (global). Admin Portal only.

### 11.1 List Cars (Admin)

```http
GET /v1/admin/cars?hubId=h1a2b3c4-...&status=Live&listingSource=Owned&q=fortuner&page=1&size=20
Authorization: Bearer <access_token>
```

> **Hub scoping:** a `hub_admin` is automatically limited to their assigned hub(s) — an out-of-scope `hubId` returns `403`. A `super_admin` may pass any `hubId` or omit it to list across all hubs. `q` matches VIN/title. (Hub *scoping* controls staff access; hub **name/city is shown to buyers** on public car APIs.)

**Response `200 OK`**

```json
{
  "data": [
    {
      "id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "vin": "MA3EYD81S00123456",
      "title": "Toyota Fortuner 2.8 4x4 AT",
      "listingSource": "Owned",
      "status": "Live",
      "listPrice": { "amountPaise": 387500000, "display": "₹38.75 L" },
      "certification": { "grade": "A", "overallScore": 96 },
      "hub": { "name": "Whitefield Hub" },
      "publishedAt": "2026-07-01T12:00:00Z",
      "rowVersion": 5
    }
  ],
  "meta": { "total": 142 },
  "traceId": "00-..."
}
```

---

### 11.2 Create Car (Draft)

```http
POST /v1/admin/cars
Authorization: Bearer <access_token>
```

> **VIN auto-mapping.** `vin` is **required**. On creation the Catalog service runs `link_inspection_reports_by_vin(carId, vin)`: any `RESALE` inspection report already ingested for that VIN (including reports parked in the unmatched queue) is linked to the new car, its unmatched-queue entry is resolved, and `cars.current_inspection_report_id` is pointed at the latest report. Matching is **case-insensitive**. If a linked report is passing, the car becomes eligible for `Certified`. If no report exists yet, the car stays `Draft` and links automatically when the inspection is later ingested for that VIN. Changing `vin` via `PATCH /v1/admin/cars/{id}` re-runs the same reconciliation.

**Request — Owned**

```json
{
  "vin": "MA3EYD81S00123456",
  "registrationNumber": "KA01AB1234",
  "listingSource": "Owned",
  "makeId": "m1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "modelId": "md1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "hubId": "h1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "year": 2022,
  "odometerKm": 38400,
  "fuelType": "Diesel",
  "transmission": "Automatic",
  "color": "Pearl White",
  "numberOfOwners": 1
}
```

**Request — Consigned**

```json
{
  "vin": "MA3EYD81S00234567",
  "listingSource": "ConsignedIndividual",
  "consignorId": "cn1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "makeId": "m2...",
  "modelId": "md2...",
  "hubId": "h1...",
  "year": 2021,
  "odometerKm": 52600
}
```

> `hubId` is **required** for all cars. For consigned cars it **must equal the consignor's hub** (`422` otherwise). A `hub_admin` may only create cars in their assigned hub(s).

**Response `201 Created`** — no inspection yet for this VIN

```json
{
  "data": {
    "id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "vin": "MA3EYD81S00123456",
    "status": "Draft",
    "listingSource": "Owned",
    "autoLinkedReports": 0,
    "currentInspectionReportId": null,
    "rowVersion": 0,
    "createdAt": "2026-07-11T10:00:00Z"
  },
  "traceId": "00-..."
}
```

**Response `201 Created`** — inspection already ingested for this VIN (auto-mapped)

```json
{
  "data": {
    "id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "vin": "MA3EYD81S00123456",
    "status": "Draft",
    "listingSource": "Owned",
    "autoLinkedReports": 1,
    "currentInspectionReportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "autoLinkedReport": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "externalReportId": "3542dba1-0bce-4135-8b31-4b417c0a5a4a",
      "status": "Pass",
      "derivedGrade": "B",
      "overallScore": 80,
      "wasUnmatched": true
    },
    "rowVersion": 0,
    "createdAt": "2026-07-11T10:00:00Z"
  },
  "traceId": "00-..."
}
```

---

### 11.3 Update Car

```http
PATCH /v1/admin/cars/{carId}
Authorization: Bearer <access_token>
If-Match: "5"
```

**Request**

```json
{
  "listPricePaise": 387500000,
  "emiFromPaise": 7210000,
  "features": ["Sunroof", "Ventilated seats", "360° camera"],
  "odometerKm": 38400
}
```

**Response `200 OK`**

```json
{
  "data": {
    "id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "status": "Certified",
    "listPrice": { "amountPaise": 387500000, "display": "₹38.75 L" },
    "rowVersion": 6
  },
  "traceId": "00-..."
}
```

---

### 11.4 Publish Car

Validates passing inspection report + price before going Live.

```http
POST /v1/admin/cars/{carId}/publish
Authorization: Bearer <access_token>
If-Match: "6"
```

**Response `200 OK`**

```json
{
  "data": {
    "id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "status": "Live",
    "publishedAt": "2026-07-11T10:30:00Z",
    "rowVersion": 7
  },
  "traceId": "00-..."
}
```

**Errors:** `422 Unprocessable Entity`

```json
{
  "type": "https://api.dealer.example/problems/publish-gate-failed",
  "title": "Cannot publish car",
  "status": 422,
  "detail": "Publish gate failed.",
  "traceId": "00-...",
  "violations": [
    { "code": "MISSING_INSPECTION_REPORT", "message": "No passing inspection report ingested" },
    { "code": "MISSING_PRICE", "message": "List price is not set" }
  ]
}
```

---

### 11.5 Delist Car

```http
POST /v1/admin/cars/{carId}/delist
Authorization: Bearer <access_token>
If-Match: "7"
```

**Request**

```json
{
  "reason": "Sent for refurbishment"
}
```

**Response `200 OK`**

```json
{
  "data": {
    "id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "status": "Delisted",
    "rowVersion": 8
  },
  "traceId": "00-..."
}
```

---

### 11.6 Consignors

**List**

```http
GET /v1/admin/consignors?hubId=h1a2b3c4-...&type=Individual&page=1&size=20
Authorization: Bearer <access_token>
```

**Response `200 OK`**

```json
{
  "data": [
    {
      "id": "cn1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "type": "Individual",
      "name": "Anita Desai",
      "phone": "+919988776655",
      "email": "anita@example.com",
      "company": null,
      "hubId": "h1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "commissionPct": 4.50,
      "activeCarsCount": 2
    }
  ],
  "meta": { "total": 18 },
  "traceId": "00-..."
}
```

**Create**

```http
POST /v1/admin/consignors
Authorization: Bearer <access_token>
```

**Request**

```json
{
  "hubId": "h1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "type": "Vendor",
  "name": "AutoTrade Partners",
  "phone": "+918012345678",
  "email": "ops@autotrade.example",
  "company": "AutoTrade Partners Pvt Ltd",
  "address": "Peenya Industrial Area, Bengaluru",
  "commissionPct": 6.00
}
```

> `hubId` is **required** — a consignor is onboarded **for exactly one hub**. A `hub_admin` may only pass a hub they are assigned to; a `super_admin` may pass any hub. A consigned car linked to this consignor must be assigned to the same hub.
>
> `commissionPct` is the **agreed commission rate (percent, 0–100)** captured at onboarding for **both** `Vendor` and `Individual` consignors. It is **optional** and stored as **reference/display data only** — AssureCars does **not** calculate payouts or settle commissions (offline).

**Response `201 Created`**

```json
{
  "data": {
    "id": "cn2a2b3c4-d5e6-7890-abcd-ef1234567891",
    "hubId": "h1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "type": "Vendor",
    "name": "AutoTrade Partners",
    "commissionPct": 6.00,
    "createdAt": "2026-07-11T10:00:00Z"
  },
  "traceId": "00-..."
}
```

**Update**

```http
PATCH /v1/admin/consignors/{consignorId}
Authorization: Bearer <access_token>
```

Accepts the same fields as create (e.g., `commissionPct`, `phone`, `address`). Updating `commissionPct` applies going forward for display; historical deals close offline. Hub-scoped: a `hub_admin` may only manage consignors of their assigned hub(s).

---

### 11.7 Hubs

> **`POST /v1/admin/hubs` is `super_admin` only.** `hub_admin` may read hubs they are assigned to. (Hub name/address/city **is shown to buyers**; hub *scoping* restricts which staff can act on a hub.)

```http
GET /v1/admin/hubs
Authorization: Bearer <access_token>
```

```http
POST /v1/admin/hubs
Authorization: Bearer <access_token>
```

**Create Request**

```json
{
  "code": "WF-01",
  "name": "Whitefield Hub",
  "addressLine": "ITPL Main Road, Whitefield",
  "city": "Bengaluru",
  "state": "Karnataka",
  "pincode": "560066",
  "latitude": 12.9698,
  "longitude": 77.7500,
  "phone": "+918012345678"
}
```

**Response `201 Created`**

```json
{
  "data": {
    "id": "h1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "code": "WF-01",
    "name": "Whitefield Hub",
    "city": "Bengaluru",
    "isActive": true
  },
  "traceId": "00-..."
}
```

---

### 11.8 Slot Templates

```http
GET /v1/admin/hubs/{hubId}/slot-templates
Authorization: Bearer <access_token>
```

```http
PUT /v1/admin/hubs/{hubId}/slot-templates/{templateId}
Authorization: Bearer <access_token>
```

**Request**

```json
{
  "name": "Default",
  "operatingDays": [1, 2, 3, 4, 5, 6],
  "openTimeLocal": "09:00",
  "closeTimeLocal": "19:00",
  "testDriveDurationMin": 20,
  "bufferMin": 0,
  "defaultCapacity": 3,
  "timezone": "Asia/Kolkata"
}
```

**Response `200 OK`**

```json
{
  "data": {
    "id": "st1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "hubId": "h1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "defaultCapacity": 3,
    "testDriveDurationMin": 20,
    "updatedAt": "2026-07-11T10:00:00Z"
  },
  "traceId": "00-..."
}
```

---

### 11.9 Inspection Reports (Admin)

```http
GET /v1/admin/inspection/reports?status=Unmatched&page=1&size=20
Authorization: Bearer <access_token>
```

**Response `200 OK`**

```json
{
  "data": [
    {
      "id": "3542dba1-0bce-4135-8b31-4b417c0a5a4a",
      "externalReportId": "3542dba1-0bce-4135-8b31-4b417c0a5a4a",
      "context": "RESALE",
      "status": "Unmatched",
      "vin": "MA3EYD81S00123456",
      "vehicleSummary": "Tata Nexon · KA01AB1234",
      "overallScore": 80,
      "linkedCarId": null,
      "ingestedAt": "2026-07-11T14:35:00Z"
    }
  ],
  "meta": { "total": 1 },
  "traceId": "00-..."
}
```

> `status` filter accepts `Ingested | Pass | Fail | Superseded | Unmatched`. `vin` is surfaced so admins can spot the VIN a report is waiting on before listing the matching car.

---

### 11.9.1 Get Full Inspection Report (Admin)

Returns the **complete** captured inspection data assembled from the migration `002` tables — everything the Inspection App sent, queryable without touching `raw_payload`.

```http
GET /v1/admin/inspection/reports/{reportId}
Authorization: Bearer <access_token>
```

**Response `200 OK`**

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "externalReportId": "3542dba1-0bce-4135-8b31-4b417c0a5a4a",
    "externalInspectionId": "2348fa87-acf5-45c9-ba34-dd709e88f5b9",
    "context": "RESALE",
    "status": "Pass",
    "linkedCarId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "inspectedAt": "2026-07-11T14:30:00Z",
    "ingestedAt": "2026-07-11T14:35:00Z",
    "vehicle": { "vin": "MA3EYD81S00123456", "make": "Tata Nexon", "model": "Adventure Plus", "year": 2025, "odometerKm": 35000, "registrationNumber": "KA01AB1234" },
    "details": {
      "inspector": { "id": "insp-uuid", "displayName": "R. Kumar" },
      "device": { "model": "Pixel 7", "osVersion": "Android 15", "appVersion": "0.1.0" },
      "gps": { "lat": 12.9716, "lng": 77.5946 },
      "inspectionTime": { "createdAt": "2026-07-11T14:10:00Z", "completedAt": "2026-07-11T14:30:00Z" },
      "scores": { "exterior": 90, "interior": 85, "safety": 88, "cosmetic": 82, "confidence": 95 },
      "damageSummary": { "totalDamageCount": 1, "bySeverity": { "low": 1, "medium": 0, "high": 0, "critical": 0 } },
      "integrity": { "potentialFraud": false, "missingImages": [], "duplicateImages": [], "lowQualityImages": [], "suspiciousImages": [] },
      "overallCondition": "GOOD",
      "inspectorNotes": "Minor scuff on front bumper.",
      "finalRecommendation": "NO_REPAIR",
      "inspectionStatus": "COMPLETED"
    },
    "checklist": [
      { "sectionId": "exterior", "title": "Exterior",
        "items": [ { "itemId": "front_bumper", "label": "Front Bumper", "status": "MINOR_SCRATCHES", "rating": 4, "damageTypes": ["SCRATCH"], "imageIds": ["img-2"] } ] }
    ],
    "images": [
      { "imageId": "img-1", "section": "EXTERIOR", "position": "front", "captureState": "CAPTURED",
        "imageUrl": "https://api.dealer.example/v1/admin/inspection/reports/a1b2.../images/img-1",
        "metadata": { "width": 4032, "height": 3024, "sizeBytes": 2450000, "quality": "HIGH" },
        "annotations": [ { "shape": "RECT", "damageType": "SCRATCH", "severity": "LOW", "comment": "surface scratch" } ],
        "aiFindings": [ { "damageType": "SCRATCH", "confidence": 0.87, "severity": "LOW", "boundingBox": { "x": 0.1, "y": 0.2, "w": 0.1, "h": 0.05 }, "reviewRequired": false, "source": "AI" } ] }
    ],
    "damageAssessment": [
      { "imageId": "img-1", "source": "AI", "damageType": "SCRATCH", "severity": "LOW", "component": "Front Bumper", "repairRequired": true, "estimatedCost": 1500.0, "manualVerified": false }
    ],
    "finalAssessment": { "categoryRatings": { "Exterior": 5, "Interior": 4 }, "recommendation": "NO_REPAIR", "remarks": "good" },
    "valuation": { "overallScore": 80, "derivedGrade": "B", "conditionBand": "Good" },
    "pdf": { "available": true, "downloadUrl": "https://api.dealer.example/v1/admin/inspection/reports/a1b2.../pdf" }
  },
  "traceId": "00-..."
}
```

---

### 11.10 Resolve Unmatched Inspection

```http
POST /v1/admin/inspection/unmatched/{queueId}/resolve
Authorization: Bearer <access_token>
```

**Request — Link to car**

```json
{
  "carId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890"
}
```

**Request — Link to inspection request**

```json
{
  "inspectionRequestId": "ir1a2b3c4-d5e6-7890-abcd-ef1234567890"
}
```

**Response `200 OK`**

```json
{
  "data": {
    "reportId": "3542dba1-0bce-4135-8b31-4b417c0a5a4a",
    "status": "Pass",
    "linkedCarId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "carStatus": "Certified"
  },
  "traceId": "00-..."
}
```

---

### 11.11 Manual Inspection Upload (Fallback)

```http
POST /v1/admin/inspection/reports/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form fields:** `payload` (JSON string), `pdf` (file)

**Response `201 Created`** — same shape as webhook success (§12.1)

---

### 11.12 Ops Dashboard

```http
GET /v1/admin/dashboard/ops
Authorization: Bearer <access_token>
```

**Response `200 OK`**

```json
{
  "data": {
    "asOf": "2026-07-11T10:00:00Z",
    "inventory": {
      "live": 128,
      "reserved": 9,
      "certified": 3,
      "inInspection": 5,
      "draft": 7
    },
    "today": {
      "testDrivesScheduled": 24,
      "testDrivesCompleted": 8,
      "noShows": 2,
      "activeReservations": 9
    },
    "leads": {
      "new": 15,
      "slaBreached": 3,
      "unassigned": 1
    },
    "inspections": {
      "unmatched": 1,
      "pendingPublish": 5
    }
  },
  "traceId": "00-..."
}
```

---

### 11.13 Users, Roles & Staff Onboarding

Staff logins are created here. Roles are `super_admin`, `hub_admin`, `hub_employee`.

**Who can create whom**

| Caller | Can create | Hub assignment |
|--------|-----------|----------------|
| `super_admin` | `hub_admin`, `hub_employee` (and hubs via §11.7) | Any hub(s) |
| `hub_admin` | `hub_employee` only | Only hub(s) the caller is assigned to |

- Creating or elevating to `super_admin` / `hub_admin` requires the caller to be `super_admin`.
- A `hub_admin` passing a `hubId` outside their own assignment gets `403`.

```http
GET /v1/admin/users?role=hub_employee&hubId=h1a2b3c4-...
Authorization: Bearer <access_token>
```

```http
POST /v1/admin/users
Authorization: Bearer <access_token>
```

**Request — create a Hub Employee (by a Hub Admin or Super Admin)**

```json
{
  "phone": "+919123456789",
  "fullName": "Priya Menon",
  "email": "priya@dealer.example",
  "roles": ["hub_employee"],
  "hubIds": ["h1a2b3c4-d5e6-7890-abcd-ef1234567890"],
  "employee": {
    "employeeCode": "EMP-042",
    "designation": "Sales Executive",
    "isFieldAgent": false
  }
}
```

**Request — create a Hub Admin (Super Admin only)**

```json
{
  "phone": "+919111122223",
  "fullName": "Ravi Kumar",
  "email": "ravi@dealer.example",
  "roles": ["hub_admin"],
  "hubIds": ["h1a2b3c4-...", "h2b3c4d5-..."]
}
```

**Response `201 Created`**

```json
{
  "data": {
    "userId": "u1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "fullName": "Priya Menon",
    "accountType": "Employee",
    "roles": ["hub_employee"],
    "hubIds": ["h1a2b3c4-d5e6-7890-abcd-ef1234567890"],
    "employeeId": "e1a2b3c4-d5e6-7890-abcd-ef1234567890"
  },
  "traceId": "00-..."
}
```

> `accountType` is derived from the role: `hub_employee` → `Employee` (Employee App + Inspection App); `hub_admin`/`super_admin` → `Admin` (Admin Portal only). `hubIds` scope every hub-owned resource the user can see/act on.

---

### 11.14 Dealer Settings

```http
GET /v1/admin/settings
Authorization: Bearer <access_token>
```

```http
PATCH /v1/admin/settings
Authorization: Bearer <access_token>
```

**Request**

```json
{
  "dealerName": "AssureCars Bengaluru",
  "reservationHoldDays": 15,
  "minPublishScore": 70,
  "gradeThresholds": {
    "A": 95,
    "B": 80,
    "C": 70
  }
}
```

`reservationHoldDays` and `minPublishScore` are Super Admin-only settings. `reservationHoldHours` is a legacy database field and is not part of the active API contract.

---

### 11.15 Feature Flags

```http
GET /v1/admin/feature-flags
Authorization: Bearer <access_token>
```

```http
PATCH /v1/admin/feature-flags/{code}
Authorization: Bearer <access_token>
```

**Request**

```json
{
  "enabled": true
}
```

---

### 11.16 Reservations (Admin — Hub Admin only)

> **Hub Admin-only** (Super Admin superset). A reservation is placed **against an existing open lead** after an offline token payment. The lead must belong to the same car and hub. A **reserved car is fully locked** — its `interest`, `test-drive`, and reservation endpoints reject until Sold/released, and already confirmed future test drives must not proceed unless the reservation is released. Hold defaults to **15 days** (`dealer_settings.reservation_hold_days`) and is configured by **Super Admin only**; if not marked `Sold` in time it is **auto-released**. All money is **offline** — `tokenAmountPaise` and any remaining balance are display-only references (no ledger).

**Create Reservation**

```http
POST /v1/admin/reservations
Authorization: Bearer <access_token>
Idempotency-Key: 9e1g8891-9647-62fg-b66d-g29he3h12cg9
```

**Request**

```json
{
  "carId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "leadId": "l1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "tokenReceived": true,
  "tokenAmountPaise": 2500000,
  "notes": "Token collected at Whitefield Hub"
}
```

**Response `201 Created`**

```json
{
  "data": {
    "id": "r1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "reservationNumber": "RSV-2026-000892",
    "status": "Reserved",
    "carId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "leadId": "l1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "holdExpiresAt": "2026-07-26T10:00:00Z",
    "holdDays": 15,
    "tokenReceived": true,
    "carStatus": "Reserved"
  },
  "traceId": "00-..."
}
```

**Errors:** `409 Conflict` (car already reserved/sold), `422` (`leadId` missing, lead not open, lead does not match the same car/hub, or `tokenReceived=false` / token amount missing).

**Reserved Vehicles worklist**

```http
GET /v1/admin/reservations?status=Reserved&overdue=false&hubId=h1a2b3c4-...
Authorization: Bearer <access_token>
```

> Hub-scoped for `hub_admin`; `super_admin` sees all. `overdue=true` filters holds past their window pending release.

**Response `200 OK`**

```json
{
  "data": [
    {
      "id": "r1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "reservationNumber": "RSV-2026-000892",
      "status": "Reserved",
      "lead": { "id": "l1a2b3c4-d5e6-7890-abcd-ef1234567890", "buyerName": "Rahul Sharma", "phone": "+919876543210" },
      "car": { "title": "Toyota Fortuner", "vin": "MA3EYD81S00123456" },
      "holdExpiresAt": "2026-07-26T10:00:00Z",
      "daysPending": 3,
      "remainingAmountPaise": 362500000,
      "notifiedEmployee": null,
      "rowVersion": 1
    }
  ],
  "meta": { "total": 9 },
  "traceId": "00-..."
}
```

**Update Reservation (mark Sold / Release)**

```http
PATCH /v1/admin/reservations/{reservationId}
Authorization: Bearer <access_token>
If-Match: "1"
```

**Request — Mark Sold**

```json
{
  "status": "Sold",
  "notes": "Deal closed offline at Whitefield Hub"
}
```

Before confirming `Sold`, clients SHOULD display the remaining offline amount due: `car.listPricePaise - tokenAmountPaise`. This is a staff reminder only; no payment collection or ledger entry is created.

**Response `200 OK`**

```json
{
  "data": {
    "id": "r1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "status": "Sold",
    "carStatus": "Sold",
    "closedAt": "2026-07-20T16:00:00Z",
    "rowVersion": 2
  },
  "traceId": "00-..."
}
```

**Notify Employee App (follow up on final deal)**

```http
POST /v1/admin/reservations/{reservationId}/notify-employee
Authorization: Bearer <access_token>
```

**Request** *(optional; defaults to the lead's assigned Hub Employee, fallback hub pool)*

```json
{
  "employeeId": "e1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "message": "Please close the deal — token already collected."
}
```

**Response `200 OK`**

```json
{
  "data": {
    "reservationId": "r1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "notifiedEmployeeId": "e1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "notifiedAt": "2026-07-13T09:00:00Z"
  },
  "traceId": "00-..."
}
```

---

## 12. Inspection App Integration (Webhook)

> Called by the **external Inspection Mobile App**. Authenticated via HMAC signature, not user JWT.

### 12.1 Ingest Inspection Report (Webhook)

```http
POST /v1/integrations/inspection/reports
X-Inspection-Signature: sha256=abc123...
Content-Type: application/json
```

**Request — complete inspection payload**

The Inspection App sends the **complete** inspection graph (matching its `ReportModels.kt` contract), not just the summary blocks. AssureCars persists **every** section: summary tables (migration `001`) plus the complete-data tables (migration `002` — `inspection_report_details`, `inspection_checklist_items`, `inspection_report_images` + `inspection_image_annotations` / `inspection_image_ai_findings`, `inspection_damage_assessments`). The untouched body is also archived in `inspection_reports.raw_payload`.

`vehicle.vin` is the **inventory correlation key** — used to auto-map the report to a listed car by VIN (see §11.2, §11.10).

```json
{
  "reportId": "3542dba1-0bce-4135-8b31-4b417c0a5a4a",
  "inspectionId": "2348fa87-acf5-45c9-ba34-dd709e88f5b9",
  "context": "RESALE",
  "inspectionRequestId": null,
  "inspectedAt": "2026-07-11T14:30:00Z",
  "vehicle": {
    "vin": "MA3EYD81S00123456",
    "category": "OLD",
    "numberOfOwnerships": 1,
    "numberOfKeys": 2,
    "year": 2025,
    "manufacturer": "Tata Motors",
    "make": "Tata Nexon",
    "model": "Adventure Plus",
    "variant": null,
    "trim": null,
    "bodyStyle": "SUV",
    "fuelType": "Petrol",
    "transmission": "Manual",
    "color": "white",
    "registrationNumber": "KA01AB1234",
    "engineNumber": null,
    "chassisNumber": null,
    "odometerKm": 35000
  },
  "inspector": { "id": "insp-uuid", "displayName": "R. Kumar" },
  "inspectionTime": { "createdAt": 1752243000000, "completedAt": 1752246600000 },
  "gps": { "lat": 12.9716, "lng": 77.5946 },
  "device": { "model": "Pixel 7", "osVersion": "Android 15", "appVersion": "0.1.0" },
  "scores": { "exterior": 90, "interior": 85, "safety": 88, "cosmetic": 82, "confidence": 95 },
  "damageSummary": {
    "totalDamageCount": 1,
    "bySeverity": { "low": 1, "medium": 0, "high": 0, "critical": 0 }
  },
  "integrity": {
    "missingImages": [],
    "duplicateImages": [],
    "lowQualityImages": [],
    "suspiciousImages": [],
    "potentialFraud": false
  },
  "overallCondition": "GOOD",
  "inspectorNotes": "Minor scuff on front bumper.",
  "finalRecommendation": "NO_REPAIR",
  "inspectionStatus": "COMPLETED",
  "checklist": [
    {
      "sectionId": "exterior",
      "title": "Exterior",
      "items": [
        {
          "itemId": "front_bumper",
          "label": "Front Bumper",
          "status": "MINOR_SCRATCHES",
          "rating": 4,
          "numericValue": null,
          "unit": null,
          "textValue": null,
          "damageTypes": ["SCRATCH"],
          "images": [
            { "imageId": "img-2", "section": "EXTERIOR", "position": "front_bumper",
              "checklistItemId": "front_bumper", "captureState": "CAPTURED",
              "imageUrl": "https://inspection-app.example/img/img-2.jpg",
              "metadata": { "width": 4032, "height": 3024, "sizeBytes": 2100000,
                            "capturedAt": 1752243600000, "orientation": 0, "quality": "HIGH" },
              "annotations": [], "aiFindings": [] }
          ]
        }
      ]
    }
  ],
  "images": [
    {
      "imageId": "img-1",
      "section": "EXTERIOR",
      "position": "front",
      "checklistSectionId": null,
      "checklistItemId": null,
      "checklistItem": null,
      "documentType": null,
      "captureState": "CAPTURED",
      "skipReason": null,
      "thumbnailUrl": "https://inspection-app.example/img/img-1-thumb.jpg",
      "imageUrl": "https://inspection-app.example/img/img-1.jpg",
      "metadata": { "width": 4032, "height": 3024, "sizeBytes": 2450000,
                    "capturedAt": 1752243300000, "orientation": 0, "quality": "HIGH" },
      "annotations": [
        { "shape": "RECT", "geometry": "{\"x\":0.1,\"y\":0.2,\"w\":0.1,\"h\":0.05}",
          "damageType": "SCRATCH", "severity": "LOW", "comment": "surface scratch" }
      ],
      "aiFindings": [
        { "damageType": "SCRATCH", "confidence": 0.87, "severity": "LOW",
          "boundingBox": { "x": 0.1, "y": 0.2, "w": 0.1, "h": 0.05 },
          "repairRecommendation": "MINOR_REPAIR", "reviewRequired": false, "source": "AI" }
      ]
    }
  ],
  "damageAssessment": [
    { "imageId": "img-1", "section": "EXTERIOR", "position": "front",
      "checklistItemId": "front_bumper", "checklistItem": "Front Bumper",
      "source": "AI", "damageType": "SCRATCH", "severity": "LOW",
      "component": "Front Bumper", "vehicleSide": "FRONT", "estimatedSize": "small",
      "confidence": 0.87, "repairRequired": true, "estimatedCost": 1500.0,
      "manualVerified": false }
  ],
  "finalAssessment": {
    "categoryRatings": {
      "Exterior": 5, "Interior": 4, "Engine": 4, "Electrical": 4,
      "Tyres": 4, "Suspension": 4, "Safety": 4, "Documentation": 4
    },
    "overallCondition": null,
    "recommendation": "NO_REPAIR",
    "remarks": "good"
  },
  "valuation": {
    "overallScore": 80,
    "conditionBand": "Good",
    "benchmarkScore": 70,
    "deltaVsTypical": 10,
    "marketPosition": "Above typical",
    "verdict": "Good condition — a sound purchase with only minor negotiation room.",
    "priceGuidance": "Condition supports pricing at or slightly above the typical asking price.",
    "damageCount": 0
  },
  "pdfUrl": "https://inspection-app.example/reports/3542dba1.pdf"
}
```

**Payload sections → storage**

| Payload section | Persisted to |
|-----------------|--------------|
| `reportId`, `inspectionId`, `context`, `inspectedAt` | `inspection_reports` |
| `vehicle` | `inspection_report_vehicles` (VIN = correlation key) |
| `inspector`, `device`, `gps`, `inspectionTime`, `scores`, `damageSummary`, `integrity`, `overallCondition`, `inspectorNotes`, `finalRecommendation`, `inspectionStatus` | `inspection_report_details` |
| `checklist[]` | `inspection_checklist_items` |
| `images[]` + `checklist[].items[].images[]` | `inspection_report_images` (+ binaries in object storage) |
| `images[].annotations[]` | `inspection_image_annotations` |
| `images[].aiFindings[]` | `inspection_image_ai_findings` |
| `damageAssessment[]` | `inspection_damage_assessments` |
| `finalAssessment` | `inspection_final_assessments` + `inspection_category_ratings` |
| `valuation` | `inspection_valuations` |
| PDF (via `pdfUrl` / follow-up upload) | `inspection_report_files` + object storage |
| *(entire body)* | `inspection_reports.raw_payload` |

**Response `200 OK` — Matched to inventory car**

```json
{
  "data": {
    "assureCarsReportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "externalReportId": "3542dba1-0bce-4135-8b31-4b417c0a5a4a",
    "status": "Pass",
    "derivedGrade": "B",
    "linkedCarId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "carStatus": "Certified",
    "pdfStored": true
  },
  "traceId": "00-..."
}
```

**Response `200 OK` — Idempotent duplicate**

```json
{
  "data": {
    "assureCarsReportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "externalReportId": "3542dba1-0bce-4135-8b31-4b417c0a5a4a",
    "status": "Pass",
    "message": "Report already ingested"
  },
  "traceId": "00-..."
}
```

**Response `202 Accepted` — Unmatched (parked for admin)**

```json
{
  "data": {
    "assureCarsReportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "externalReportId": "3542dba1-0bce-4135-8b31-4b417c0a5a4a",
    "status": "Unmatched",
    "queueId": "q1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "message": "Report stored; awaiting manual correlation"
  },
  "traceId": "00-..."
}
```

---

### 12.2 Upload PDF (Follow-Up)

When PDF is not sent inline or via `pdfUrl`.

```http
POST /v1/integrations/inspection/reports/{assureCarsReportId}/pdf
X-Inspection-Signature: sha256=abc123...
Content-Type: multipart/form-data
```

**Form:** `file` = PDF binary

**Response `200 OK`**

```json
{
  "data": {
    "assureCarsReportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "pdfStored": true,
    "fileSizeBytes": 2457600,
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "traceId": "00-..."
}
```

---

## 13. Media

### 13.1 Pre-Signed Upload URL

Used by admin (car photos) and employee app (test-drive photos).

```http
POST /v1/media/presign
Authorization: Bearer <access_token>
```

**Request**

```json
{
  "purpose": "Listing",
  "mediaType": "Photo",
  "fileName": "front-angle.jpg",
  "contentType": "image/jpeg",
  "carId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890"
}
```

**Response `200 OK`**

```json
{
  "data": {
    "uploadUrl": "https://storage.dealer.example/uploads/...?X-Amz-Signature=...",
    "storageKey": "cars/c1/front-angle.jpg",
    "expiresAt": "2026-07-11T11:00:00Z",
    "headers": {
      "Content-Type": "image/jpeg"
    }
  },
  "traceId": "00-..."
}
```

---

### 13.2 Confirm Media Upload (Admin)

```http
POST /v1/admin/cars/{carId}/media
Authorization: Bearer <access_token>
```

**Request**

```json
{
  "storageKey": "cars/c1/front-angle.jpg",
  "mediaType": "Photo",
  "purpose": "Listing",
  "isPrimary": true,
  "sortOrder": 0
}
```

**Response `201 Created`**

```json
{
  "data": {
    "id": "m1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "url": "https://cdn.dealer.example/cars/c1/front-angle.jpg",
    "isPrimary": true
  },
  "traceId": "00-..."
}
```

---

## 14. Reviews (Phase 2)

### 14.1 Submit Review

```http
POST /v1/reviews
Authorization: Bearer <access_token>
Idempotency-Key: b3i0013-b869-84hi-d88f-i41jg5j34ei1
```

**Request**

```json
{
  "testDriveBookingId": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
  "ratingOverall": 5,
  "ratingCondition": 5,
  "ratingStaff": 4,
  "comment": "Car matched the inspection report. Smooth test drive."
}
```

**Response `201 Created`**

```json
{
  "data": {
    "id": "rv1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "isVerified": true,
    "createdAt": "2026-07-19T10:00:00Z"
  },
  "traceId": "00-..."
}
```

---

### 14.2 List Car Reviews

```http
GET /v1/cars/{carId}/reviews?page=1&size=10
```

**Response `200 OK`**

```json
{
  "data": [
    {
      "id": "rv1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "ratingOverall": 5,
      "comment": "Car matched the inspection report.",
      "authorInitials": "R.S.",
      "createdAt": "2026-07-19T10:00:00Z"
    }
  ],
  "meta": {
    "total": 12,
    "averageOverall": 4.6
  },
  "traceId": "00-..."
}
```

---

## 15. Reference Data & CMS

### 15.1 List Hubs (Public)

```http
GET /v1/hubs?city=Bengaluru
```

**Response `200 OK`**

```json
{
  "data": [
    {
      "id": "h1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "name": "Whitefield Hub",
      "address": "ITPL Main Road, Whitefield",
      "city": "Bengaluru",
      "latitude": 12.9698,
      "longitude": 77.7500,
      "phone": "+918012345678"
    }
  ],
  "traceId": "00-..."
}
```

---

### 15.2 Makes & Models

```http
GET /v1/makes
GET /v1/makes/{makeId}/models
```

**Response `200 OK`**

```json
{
  "data": [
    { "id": "m1...", "name": "Toyota" },
    { "id": "m2...", "name": "Hyundai" }
  ],
  "traceId": "00-..."
}
```

---

### 15.3 CMS Banners

```http
GET /v1/cms/banners
```

**Response `200 OK`**

```json
{
  "data": [
    {
      "id": "bn1...",
      "title": "Certified. Inspected. Assured.",
      "subtitle": "Every car passes a 200-point inspection",
      "imageUrl": "https://cdn.dealer.example/banners/hero.jpg",
      "linkUrl": "/search"
    }
  ],
  "traceId": "00-..."
}
```

---

## 16. Common Schemas

### 16.1 Money

```json
{
  "amountPaise": 387500000,
  "display": "₹38.75 L"
}
```

### 16.2 Certification Badge

```json
{
  "grade": "A",
  "overallScore": 96,
  "conditionBand": "Excellent",
  "badge": "Certified",
  "inspectionReportId": "3542dba1-0bce-4135-8b31-4b417c0a5a4a"
}
```

### 16.3 Car Summary (embedded)

```json
{
  "id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "title": "Toyota Fortuner 2.8 4x4 AT",
  "thumbnailUrl": "https://cdn.dealer.example/cars/c1/primary.jpg",
  "listPrice": { "amountPaise": 387500000, "display": "₹38.75 L" }
}
```

### 16.4 Address

```json
{
  "line1": "42, 3rd Cross, HSR Layout",
  "city": "Bengaluru",
  "state": "Karnataka",
  "pincode": "560102",
  "latitude": 12.9116,
  "longitude": 77.6388
}
```

---

## 17. Error Responses

All errors follow [RFC 7807](https://datatracker.ietf.org/doc/html/rfc7807) `application/problem+json`.

### 17.1 Standard Error Shape

```json
{
  "type": "https://api.dealer.example/problems/validation-error",
  "title": "Validation failed",
  "status": 400,
  "detail": "One or more fields are invalid.",
  "traceId": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
  "errors": [
    { "field": "phone", "message": "Invalid E.164 phone number" }
  ]
}
```

### 17.2 HTTP Status Reference

| Status | When |
|--------|------|
| `400` | Validation error, malformed request |
| `401` | Missing/invalid token, bad OTP, bad password |
| `403` | Insufficient permissions, wrong login type for API, or `X-Client-Id` not in token `allowedClients` |
| `404` | Resource not found |
| `409` | Concurrency conflict, slot full, car reserved |
| `422` | Business rule violation (publish gate) |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error |

### 17.3 Wrong Client or Login Type

```json
{
  "type": "https://api.dealer.example/problems/forbidden-client",
  "title": "Token not valid for this client",
  "status": 403,
  "detail": "User Login tokens cannot access Employee APIs. Use an Employee Login (hub_employee) token.",
  "traceId": "00-...",
  "accountType": "User",
  "clientId": "EmployeeApp",
  "allowedClients": ["UserApp", "Website"]
}
```

### 17.4 Concurrency Conflict

```json
{
  "type": "https://api.dealer.example/problems/concurrency-conflict",
  "title": "Resource was modified",
  "status": 409,
  "detail": "Submit the latest rowVersion and retry.",
  "traceId": "00-...",
  "currentRowVersion": 8
}
```

---

## Appendix A — Endpoint Index

**Auth column values:** `Guest` · `User` (User Login) · `Employee` (Employee Login = `hub_employee`, hub-scoped) · `Admin` (Admin Login = `super_admin`/`hub_admin`, Admin Portal only; `hub_admin` hub-scoped) · `HMAC` (service webhook)

| Method | Path | Auth | Phase |
|--------|------|------|-------|
| GET | `/health` | Guest | MVP |
| POST | `/v1/auth/user/otp/request` | Guest | MVP |
| POST | `/v1/auth/user/otp/verify` | Guest | MVP |
| POST | `/v1/auth/employee/login` | Guest | MVP |
| POST | `/v1/auth/employee/mfa/verify` | Guest | MVP |
| POST | `/v1/auth/admin/login` | Guest | MVP |
| POST | `/v1/auth/admin/mfa/verify` | Guest | MVP |
| POST | `/v1/auth/refresh` | Guest | MVP |
| POST | `/v1/auth/logout` | User / Employee / Admin | MVP |
| GET/PUT | `/v1/me` | User / Employee / Admin | MVP |
| GET | `/v1/me/test-drives` | User | MVP |
| GET | `/v1/me/inspection-requests` | User | Phase 2 |
| GET | `/v1/cars` | Guest | MVP |
| GET | `/v1/cars/{id}` | Guest | MVP |
| GET | `/v1/cars/{id}/inspection-report` | Guest | MVP |
| GET | `/v1/cars/{id}/inspection-report/pdf` | Guest / User | MVP |
| GET | `/v1/cars/{id}/test-drive/slots` | Guest | MVP |
| GET | `/v1/cars/{id}/reviews` | Guest | Phase 2 |
| POST | `/v1/cars/{id}/interest` | User | MVP |
| POST | `/v1/test-drives` | User | MVP |
| GET | `/v1/test-drives/{id}` | User / Employee | MVP |
| PATCH | `/v1/test-drives/{id}` | Employee | MVP |
| POST | `/v1/test-drives/{id}/cancel` | User | MVP |
| POST | `/v1/test-drives/{id}/reschedule` | User | MVP |
| POST | `/v1/test-drives/{id}/checkin` | Employee | MVP |
| POST | `/v1/test-drives/{id}/complete` | Employee | MVP |
| POST | `/v1/inspection-requests` | User | Phase 2 |
| GET | `/v1/inspection-requests/{id}` | User | Phase 2 |
| POST | `/v1/reviews` | User | Phase 2 |
| GET | `/v1/makes`, `/v1/makes/{id}/models` | Guest | MVP |
| GET | `/v1/cms/banners` | Guest | MVP |
| POST | `/v1/media/presign` | Employee / Admin | MVP |
| GET | `/v1/employee/leads` | Employee | MVP |
| PATCH | `/v1/employee/leads/{id}` | Employee | MVP |
| POST | `/v1/employee/leads/{id}/notes` | Employee | MVP |
| GET | `/v1/employee/schedule` | Employee | MVP |
| GET | `/v1/employee/reservations` | Employee (read-only follow-up) | MVP |
| PATCH | `/v1/employee/inspection-requests/{id}` | Employee | Phase 2 |
| GET/POST | `/v1/admin/cars` | Admin | MVP |
| PATCH | `/v1/admin/cars/{id}` | Admin | MVP |
| POST | `/v1/admin/cars/{id}/publish` | Admin | MVP |
| POST | `/v1/admin/cars/{id}/delist` | Admin | MVP |
| POST | `/v1/admin/cars/{id}/media` | Admin | MVP |
| GET/POST | `/v1/admin/consignors` | Admin (hub-scoped) | MVP |
| PATCH | `/v1/admin/consignors/{id}` | Admin (hub-scoped) | MVP |
| GET | `/v1/admin/hubs` | Admin | MVP |
| POST | `/v1/admin/hubs` | Admin (`super_admin` only) | MVP |
| GET/PUT | `/v1/admin/hubs/{id}/slot-templates` | Admin (hub-scoped) | MVP |
| GET | `/v1/admin/inspection/reports` | Admin | MVP |
| GET | `/v1/admin/inspection/reports/{id}` | Admin | MVP |
| POST | `/v1/admin/inspection/unmatched/{id}/resolve` | Admin | MVP |
| POST | `/v1/admin/inspection/reports/upload` | Admin | MVP |
| GET | `/v1/admin/dashboard/ops` | Admin | MVP |
| PATCH | `/v1/admin/inspection-requests/{id}/assign` | Admin (`super_admin`) | Phase 2 |
| GET/POST | `/v1/admin/users` | Admin (`super_admin`; `hub_admin` for `hub_employee` on own hub[s]) | MVP |
| GET/PATCH | `/v1/admin/settings` | Admin (`super_admin` only) | MVP |
| GET/PATCH | `/v1/admin/feature-flags` | Admin (`super_admin` only) | MVP |
| POST | `/v1/admin/reservations` | Admin (`hub_admin`, hub-scoped) | MVP |
| GET | `/v1/admin/reservations` | Admin (hub-scoped) | MVP |
| GET | `/v1/admin/reservations/{id}` | Admin (hub-scoped) | MVP |
| PATCH | `/v1/admin/reservations/{id}` | Admin (`hub_admin`) | MVP |
| POST | `/v1/admin/reservations/{id}/notify-employee` | Admin (`hub_admin`) | MVP |
| POST | `/v1/integrations/inspection/reports` | HMAC | MVP |
| POST | `/v1/integrations/inspection/reports/{id}/pdf` | HMAC | MVP |

---

*Related documents: [Solution-Design-Document.md](./Solution-Design-Document.md) · [database/migrations/001_initial_schema.sql](./database/migrations/001_initial_schema.sql)*
