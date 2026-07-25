# Settings — audit of the old app + rebuild plan

The old Settings lived in one `<section id="settings">` (index.html ~2006–2760)
with **six top-level tabs**. Two of them nest further. This documents every
sub-tab, its fields, and the backend it talks to, then lays out a build order.

## Top-level tabs

| Tab | id | Audience | Backend |
|-----|----|----------|---------|
| System Config | `system-config-content` | owner | `PUT /systems/:id`, `POST /fish-tanks`, `POST /grow-beds/system/:id` |
| System Sharing | `system-sharing-content` | owner | `routes/system-sharing.js` |
| Sensor Config | `sensor-config-content` | owner | `routes/sensors.js` (+ ThingsBoard) |
| Credentials | `credentials-content` | owner | `routes/credentials.js` (ThingsBoard, AES-256) |
| Danger Zone | `danger-zone-content` | owner | `DELETE /systems/:id` |
| Admin Settings | `admin-settings-content` | **admin only** (hidden) | `routes/admin.js`, `routes/config.js` |

---

### 1. System Config  (3 inner sub-tabs)

**Overall System**
- System Name (text), System Type (aquaponics / media-bed / nft / dwc / hybrid)
- Number of Fish Tanks (drives per-tank config), Total Fish Tank Volume (L, read-only, auto-summed)
- Number of Grow Beds, Total Equivalent Grow Area (m², read-only, auto), Total Grow Bed Volume (auto)
- Save → `PUT /systems/:id`

**Fish Tanks** — per-tank editor (size, volume, fish type). Same shape as the creation wizard's tank step. → `POST /fish-tanks`.

**Grow Beds** — per-bed editor. Overlaps heavily with **Plants → Beds** (already rebuilt) and the creation wizard. → `POST /grow-beds/system/:id`.

### 2. System Sharing
- **Invite Users**: email, permission (`view` / `collaborator` / `admin`), optional message → `POST /system-sharing/invite`
- **Current Shared Users**: list + change permission (`PUT /permission`) / revoke (`DELETE /access/:share_id`) → `GET /users`
- **Pending Invitations**: `GET /invitations`
- **Access Settings**: public link toggle → `GET|PUT /public-settings`
- ⚠️ Note: `verifyOwnership` (grow-beds etc.) checks `systems.user_id` only, so shared users currently get 404 on some routes. Reconcile when this is built.

### 3. Sensor Config  (ThingsBoard integration)
- ThingsBoard connection status banner
- **Add New**: name, type, device id, telemetry key (fetched from TB), update interval, active flag; optional data-mapping (table, field, transform). Test Connection + Add. → `POST /sensors`, `POST /sensors/test`
- **Existing Sensors**: list, toggle, edit, delete → `GET /sensors/system/:systemId`, `PATCH /:id/toggle`, `PUT /:id`, `DELETE /:id`
- Depends on saved ThingsBoard credentials (tab 4).

### 4. Credentials  (ThingsBoard)
- API URL, username, password → stored AES-256-CBC encrypted (`POST /credentials`)
- Test Credentials, connection status, last-updated → `GET /credentials/thingsboard/status/:systemId`

### 5. Danger Zone
- **Delete System** — irreversible; cascades to all system data (endpoint fixed to cascade cleanly). → `DELETE /systems/:id`

### 6. Admin Settings  (admin only — `isAdmin` middleware)
Nested tabs: User Management, **SMTP Settings**, Edit Data, Crop Knowledge, Nutrient Ratios, Deficiency Images, System Stats.
- **SMTP**: host, port, username, password, from-name, from-email, reset URL; Load / Save / Send Test → `routes/config.js` (`GET|PUT /smtp`, `POST /smtp/test`)
- **User Management**: list/search users, change role/subscription, reset password, delete → `routes/admin.js`
- **System Stats**: `GET /admin/stats`

---

## Not in the old app but worth adding
- **Account/Profile**: change own name / password. The old app had no such tab; a rebuilt app should. Needs backend endpoints (may not exist yet).

## Proposed build order (self-contained + high-value first)
1. **General** — edit system name & type (`PUT /systems/:id`); the core, fully self-contained.
2. **Danger Zone** — delete system; endpoint ready and already hardened.
3. **Sharing** — collaborators; backend exists; reconcile the `verifyOwnership` gap.
4. **Account** — profile/password (new; needs backend).
5. **Integrations** — Credentials + Sensors (ThingsBoard); external dependency, likely deferred for local/staging.
6. **Admin** — SMTP + user management; admin-only.

Fish-tank / grow-bed editing from old tab 1 is intentionally **not** duplicated here — it already lives in the creation wizard and Plants → Beds. Settings links there instead.
