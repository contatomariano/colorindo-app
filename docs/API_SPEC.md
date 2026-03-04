# API Specification - Colorindo App

This document details the Supabase Edge Functions available in the Colorindo App, their endpoints, authentication requirements, and request/response formats.

---

## 1. Engine Pipeline: `generate-book`
The core engine for character generation, cover creation, scene generation, and PDF conversion.

**Base URL:** `https://<PROJECT_ID>.supabase.co/functions/v1/generate-book`

### Endpoints & Actions

#### [POST] `action: "avatar"`
Triggers the generation of the child's character avatar.
- **Auth:** Requires `Authorization: Bearer <JWT>` or `SUPABASE_SERVICE_ROLE_KEY`.
- **Request Body:**
  ```json
  {
    "record": { "id": "ORDER_UUID" },
    "action": "avatar"
  }
  ```
- **Response:** `{ "success": true, "taskId": "KIE_TASK_ID", "processing": true }`

#### [POST] `action: "cover"`
Generates the book cover after character approval.
- **Auth:** Same as above.
- **Request Body:**
  ```json
  {
    "record": { "id": "ORDER_UUID" },
    "action": "cover"
  }
  ```

#### [POST] `action: "scenes"`
Batch generates all story scenes.
- **Auth:** Same as above.
- **Request Body:**
  ```json
  {
    "record": { "id": "ORDER_UUID" },
    "action": "scenes"
  }
  ```

#### [POST] `action: "upscale"`
Starts the 2x upscale process for cover and all scenes.
- **Auth:** Same as above.
- **Request Body:**
  ```json
  {
    "record": { "id": "ORDER_UUID" },
    "action": "upscale"
  }
  ```

#### [POST] `action: "pdf"`
Converts generated and upscaled images into final PDFs.
- **Auth:** Same as above.
- **Request Body:**
  ```json
  {
    "record": { "id": "ORDER_UUID" },
    "action": "pdf"
  }
  ```

---

## 2. Admin & User Management: `admin-manage-users`
Handles inviting users, resetting passwords, and deleting accounts.

**Base URL:** `https://<PROJECT_ID>.supabase.co/functions/v1/admin-manage-users`
- **Auth:** Requires `Authorization: Bearer <JWT>` from a user with `admin` or `manager` role.

### Actions

#### [POST] `action: "invite"`
- **Request Body:**
  ```json
  {
    "action": "invite",
    "email": "user@example.com",
    "password": "temp_password",
    "name": "User Name",
    "role": "user" | "manager" | "admin" | "viewer"
  }
  ```

#### [POST] `action: "reset_password"`
- **Request Body:**
  ```json
  {
    "action": "reset_password",
    "userId": "USER_UUID",
    "password": "new_password"
  }
  ```

#### [POST] `action: "delete"`
- **Request Body:**
  ```json
  {
    "action": "delete",
    "userId": "USER_UUID"
  }
  ```

---

## 3. LGPD Compliance: `cron-storage-cleanup`
Routine to purge child photos and PII after 15 days.

**Base URL:** `https://<PROJECT_ID>.supabase.co/functions/v1/cron-storage-cleanup`
- **Auth:** Requires `X-Supabase-Cron: true` (when called via pg_cron) OR `Authorization: Bearer <JWT>` from an `admin`.

#### [POST] Trigger Cleanup
Calculates files older than 15 days, removes them from storage, and masks the PII in the database.
- **Request Body:** `{}` (Empty)
- **Response:** `{ "success": true, "message": "..." }`

---

## 4. External Webhooks (Inbound)
Endpoints exposed for Kie.ai callbacks.

### Kie.ai Callback
**URL Pattern:** `.../generate-book?webhook=true&orderId=ID&action=ACTION&page=PAGE`
- **Current Status:** ⚠️ Unauthenticated (Security improvement pending).
- **Behavior:** Receives `SUCCESS` or `ERROR` notifications and updates the `orders` table stages.
