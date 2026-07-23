# Carfinn Internal Portal — SSO Setup & Deploy Runbook

รวม 3 แอปเป็น portal เดียวแบบ Google: **login ครั้งเดียว (SSO) + ปุ่ม waffle สลับโมดูลทุกแอป**
IdP กลาง = `internal.carfinn.com` (แอปนี้) ออก JWT RS256 → cookie `cf_sso` scope `.carfinn.com`

```
                    ┌─────────────────────────────┐
   login ครั้งเดียว → │ internal.carfinn.com  (IdP) │  ออก cf_sso (.carfinn.com)
                    │  · /.well-known/jwks.json   │  + Firebase custom token
                    └──────────────┬──────────────┘
        ┌──────────────────────────┼──────────────────────────┐
        ▼ verify JWKS              ▼ verify JWKS               ▼ custom token
  admin-agent.carfinn.com    (dashboard เอง)            carprice.carfinn.com
  (Express verify)                                       (Firebase signInWithCustomToken)
```

---

## 1) สร้าง SSO keypair (ทำครั้งเดียว)

```bash
# private key (เก็บเป็นความลับ! ใส่ใน SSO_PRIVATE_KEY ของ dashboard เท่านั้น)
openssl genpkey -algorithm RSA -pkcs8 -out sso-private.pem -pkeyopt rsa_keygen_bits:2048
```

> ⚠️ ห้าม commit ไฟล์นี้ / ห้ามพิมพ์ค่าในแชต · ถ้าหลุดต้อง rotate (สร้างใหม่ + อัปเดต env)
> JWKS (public key) เผยแพร่อัตโนมัติที่ `/.well-known/jwks.json` — ไม่ต้องตั้งเอง

## 2) Environment variables

### dashboard (IdP — Cloud Run)
| env | ค่า | หมายเหตุ |
|---|---|---|
| `SSO_PRIVATE_KEY` | เนื้อ `sso-private.pem` (PEM ทั้งก้อน) | ถ้าไม่ตั้ง = gen ชั่วคราว (dev เท่านั้น) |
| `SSO_COOKIE_DOMAIN` | `.carfinn.com` | ให้ cookie ข้าม subdomain |
| `SSO_ALLOWED_RETURN_HOSTS` | (ไม่ต้อง ถ้าเป็น *.carfinn.com) | เพิ่ม host นอกเครือถ้าจำเป็น |
| `CARPRICE_SA_CLIENT_EMAIL` | client_email ของ SA project `carfinn-carprice` | ดูข้อ 3 |
| `CARPRICE_SA_PRIVATE_KEY` | private_key ของ SA เดียวกัน (PEM) | ดูข้อ 3 |
| `CARPRICE_ORIGIN` | `https://carprice.carfinn.com` | CORS ของ custom-token endpoint (default นี้อยู่แล้ว) |
| (เดิม) `GOOGLE_CLIENT_ID/SECRET`, `AUTH_SECRET`, `DASHBOARD_URL=https://internal.carfinn.com`, `ALLOWED_DOMAIN=carfinn.com` | | ต้องมีอยู่แล้ว |

### agent api (`@cf/api` — Cloud Run)
| env | ค่า |
|---|---|
| `SSO_ISSUER` | `https://internal.carfinn.com` (default ถูกแล้ว) |
| `SSO_JWKS_URL` | `https://internal.carfinn.com/.well-known/jwks.json` (default ถูกแล้ว) |

> ไม่ต้องแชร์ secret ใดๆ — agent verify ด้วย public key จาก JWKS เอง

### ราคารถ (static) — ไม่มี env (ค่าฝังใน `app.js`: `SSO_IDP=https://internal.carfinn.com`)

## 3) Service Account ของ carfinn-carprice (สำหรับ custom token)

ราคารถเป็น static อ่าน httpOnly cookie ไม่ได้ → IdP ออก **Firebase custom token** ให้แทน ต้องใช้ SA ที่มีสิทธิ์ mint:

```bash
# สร้าง SA + ให้สิทธิ์ Service Account Token Creator ใน project carfinn-carprice
gcloud iam service-accounts create carprice-sso --project carfinn-carprice
gcloud projects add-iam-policy-binding carfinn-carprice \
  --member="serviceAccount:carprice-sso@carfinn-carprice.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"
gcloud iam service-accounts keys create carprice-sa.json \
  --iam-account carprice-sso@carfinn-carprice.iam.gserviceaccount.com
```
เอา `client_email` → `CARPRICE_SA_CLIENT_EMAIL`, `private_key` → `CARPRICE_SA_PRIVATE_KEY`

> ถ้าไม่ตั้ง SA: endpoint ตอบ 503 ราคารถจะ **fallback เป็น Google login เดิม** (ไม่พัง แค่ไม่ silent)

## 4) DNS
- `internal.carfinn.com` → Cloud Run ของ dashboard (custom domain mapping)
- `admin-agent.carfinn.com`, `carprice.carfinn.com` — มีอยู่แล้ว

## 5) Deploy (ตามลำดับ)
1. **dashboard** ก่อน (IdP ต้องออนไลน์ให้ JWKS พร้อม) → ตั้ง env ข้อ 2 → deploy → เช็ค `https://internal.carfinn.com/.well-known/jwks.json` ได้ 200
2. **agent** → deploy (ตั้ง SSO_* ถ้าจะ override default)
3. **ราคารถ** → `firebase deploy` (web/) — [[account-hygiene]] เช็ค account ก่อน

## 6) ทดสอบหลัง deploy (end-to-end)
- login ที่ internal.carfinn.com → กด waffle → เข้า Agent: ต้อง **ไม่ต้อง login ซ้ำ** (silent /api/admin/sso-login)
- เข้า ราคารถ: ต้อง signInWithCustomToken เงียบ (ถ้าตั้ง SA แล้ว) — ดู Network `/api/auth/firebase-token` = 200
- เช็ค cookie `cf_sso` domain = `.carfinn.com`

## สถานะโค้ด (ยังไม่ deploy)
ทุกอย่าง typecheck ผ่าน + เทสต์ local แล้ว — launcher ครบ 3 แอป · SSO dashboard↔agent ครบ · prices bridge code-complete (รอ SA key)
