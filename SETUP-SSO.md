# Carfinn Internal Portal — สถาปัตยกรรม & วิธีดูแล

`internal.carfinn.com` = **portal เดียว** รวม 3 โมดูล (Dashboard / Agent / ราคารถ)
เข้าเว็บเดียว URL ไม่เปลี่ยน แถบบนเดียว สลับโมดูลด้วยปุ่ม waffle · **login ครั้งเดียว** (SSO)

```
                    internal.carfinn.com  (Next.js บน Cloud Run asia-southeast1)
                    ├─ /            Dashboard (native — sidebar ของตัวเอง)
                    ├─ /agent       <iframe> admin-agent.carfinn.com
                    └─ /prices      <iframe> carprice.carfinn.com
                       ▲ แถบบนเดียว (PortalTopbar) พาดเต็มความกว้าง — โมดูลในกรอบซ่อนแถบตัวเอง
```

---

## 1. โดเมน & การ deploy

| ส่วน | อยู่ที่ | deploy ยังไง |
|---|---|---|
| **Dashboard / portal** | Cloud Run `line-ai-secretary-dashboard` (asia-southeast1, project `key-phoenix-492007-b2`) | **git push → GitHub Actions** (`.github/workflows/deploy.yml`) |
| **Agent API** | Cloud Run `carfinn-agent-api` (asia-southeast1, project `carfinn-agent`) | `gcloud run deploy carfinn-agent-api --source . --region asia-southeast1` *(ห้ามใส่ `--set-env-vars`/`--set-secrets` — จะทับ config เดิม)* |
| **Agent admin (หน้าเว็บ)** | Firebase Hosting `carfinn-agent-admin` | `npm run build --workspace @cf/admin && firebase deploy --only hosting:admin --project carfinn-agent` |
| **ราคารถ** | Firebase Hosting `carfinn-carprice` | `cd web && firebase deploy --only hosting --project carfinn-carprice` |

**โดเมน `internal.carfinn.com`** = Cloud Run **domain mapping** (ไม่ใช่ Firebase Hosting)
DNS อยู่ที่ **Cloudflare**: `internal` CNAME → `ghs.googlehosted.com` (**DNS only** เมฆเทา)

> ⚠️ **gcloud ในเครื่องต้องตั้ง Python ก่อน** (ไม่งั้นขึ้น "Python was not found"):
> `export CLOUDSDK_PYTHON="/c/Users/DEVIL/AppData/Local/Programs/Python/Python312/python.exe"`

> ⚠️ domain mapping อาจ **หลุดชั่วคราว ~5 นาทีหลัง deploy dashboard** แล้วกลับมาเอง (ข้อจำกัดของ Cloud Run domain mapping)

---

## 2. SSO (login ครั้งเดียว)

**IdP = portal** ออก JWT เซ็น RS256 ใส่ cookie **`__session`** (domain `.carfinn.com`, อายุ 8 ชม.)

> ชื่อ `__session` **ห้ามเปลี่ยน** — Firebase Hosting (agent/prices) ส่งต่อ cookie ได้ **แค่ชื่อนี้ชื่อเดียว** cookie อื่นถูกตัดทิ้ง

- public key เผยแพร่ที่ `https://internal.carfinn.com/.well-known/jwks.json`
- **Agent** verify เองผ่าน JWKS → `POST /api/admin/sso-login` แลกเป็น admin token ของตัวเอง (frontend เรียกอัตโนมัติตอนโหลด)
- **ราคารถ** — endpoint `/api/auth/firebase-token` (ออก Firebase custom token) พร้อมแล้ว แต่ **ยังไม่เปิดใช้** เพราะยังไม่ได้สร้าง service account ของ `carfinn-carprice` → ตอนนี้ราคารถใช้ Google login ของตัวเอง (ไม่พัง แค่ต้องกดครั้งเดียว)

**cookie ที่ portal ใช้**
| cookie | ใช้ทำอะไร |
|---|---|
| `cf_session` | session ของ portal เอง (HMAC, 7 วัน) |
| `__session` | SSO token ส่งให้โมดูลอื่น (RS256 JWT, 8 ชม.) |
| `cf_oauth_state` | กัน CSRF ตอน OAuth (ชั่วคราว 30 นาที) |

---

## 3. จัดการผู้ใช้ + สิทธิ์ (รวมที่เดียว)

ทำที่ **portal → จัดการผู้ใช้ (`/users`)** ที่เดียวจบ ไม่ต้องเพิ่มซ้ำในแต่ละแอป

เก็บใน Firestore `users/{email}` (project `key-phoenix-492007-b2`):
```jsonc
{
  "role":  "member | super_admin",
  "perms": { "central": {v,e,d}, ... },   // สิทธิ์รายหัวข้อใน Dashboard
  "modules": {                            // สิทธิ์เข้าโมดูลอื่น
    "agent":  "admin",                    // ว่าง/ไม่มี = ไม่ให้เข้า
    "prices": "user | finance_editor | super_admin"
  }
}
```

ไหลไปยังไง — **ทางเดียว ไม่มีลัด**:
```
users/{email}.modules → resolveAccess() → cf_session + __session(claim modules) → โมดูลปลายทางเชื่อ token
```
- โค้ดสิทธิ์โมดูลรวมอยู่ที่ **`lib/modules.ts` ที่เดียว** (`ModuleAccess` / `MODULE_ROLES` / `hasModule()` / `normalizeModules()`)
- ปุ่ม waffle ซ่อนโมดูลที่ผู้ใช้ไม่มีสิทธิ์
- **เปลี่ยนสิทธิ์แล้วมีผลรอบ login ถัดไป** ของผู้ใช้คนนั้น
- Agent: มีสิทธิ์จาก portal → สร้าง record ใน `admin_users` ให้อัตโนมัติ
- ⚠️ **ราคารถยังไม่บังคับใช้ค่านี้** (ยังอ่าน user ของตัวเองใน Firestore `carfinn-carprice`) — รอทำ SA แล้ว sync

---

## 4. Environment variables

**Dashboard (Cloud Run)** — ตั้งใน `.github/workflows/deploy.yml`
| env | ค่า |
|---|---|
| `DASHBOARD_URL` | `https://internal.carfinn.com` (= issuer ของ SSO token) |
| `SSO_COOKIE_DOMAIN` | `.carfinn.com` |
| `ALLOWED_DOMAIN` | `carfinn.com` |
| `AUTH_ENABLED` | `true` |
| secrets | `SSO_PRIVATE_KEY`, `AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `DASHBOARD_API_KEY`, `GCS_*` (Secret Manager) |
| *(ยังไม่ตั้ง)* | `CARPRICE_SA_CLIENT_EMAIL`, `CARPRICE_SA_PRIVATE_KEY` — สำหรับ SSO ราคารถ |

**Agent API** — ใช้ค่า default ในโค้ด ไม่ต้องตั้งเพิ่ม
`SSO_ISSUER=https://internal.carfinn.com` · `SSO_JWKS_URL=https://internal.carfinn.com/.well-known/jwks.json`

**OAuth**: redirect URI ที่ต้องมีใน Google client → `https://internal.carfinn.com/api/auth/callback`

---

## 5. งานที่ยังเหลือ

- [ ] สร้าง SA `carprice-sso@carfinn-carprice` (+ key → Secret Manager) แล้วตั้ง `CARPRICE_SA_*` → เปิด SSO + บังคับสิทธิ์ของราคารถ
      *(ต้องทำผ่าน gcloud/Console แบบ interactive — งาน IAM บังคับ reauth)*
- [ ] **rotate secrets ของ `carfinn-agent`** ที่เคยหลุด (DB_PASS / ENCRYPTION_KEY / ADMIN_JWT_SECRET / STORAGE keys)
- [ ] ถ้า domain mapping หลุดบ่อยเกินรับได้ → ย้ายไป Load Balancer

---

## 6. เช็คสุขภาพระบบ (คำสั่งเร็ว)

```bash
curl -s https://internal.carfinn.com/.well-known/jwks.json | head -c 80   # JWKS ต้องมี key
curl -s -o /dev/null -w "%{http_code}\n" https://internal.carfinn.com/login   # ต้อง 200
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://admin-agent.carfinn.com/api/admin/sso-login  # ต้อง 401 (ไม่มี cookie)
```
