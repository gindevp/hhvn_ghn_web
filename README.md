# GHN — Báo giờ xe đến/đi (`ghn-vehicle-report`)

Frontend clone of CPN ops UI, stripped to **Giao Hàng Nhanh** vehicle arrival/departure reporting.

## Stack

- React + TanStack Router/Start + Vite
- Talks to **BE_ghn** REST API (JWT)

## Run (DEV)

```bash
cd FE_ghn
npm install
npm run dev
```

- App: http://localhost:7081 (see `vite.config.ts`)
- API: `VITE_API_BASE_URL` in `.env.development` → `http://localhost:7082`

Start BE_ghn on port **7082** before logging in.

## Main routes

| Path | Screen |
|------|--------|
| `/login` | GHN login |
| `/cham-xe` | Chấm xe đến/đi |
| `/tong-quan` | Tổng quan + theo xe tại VP |
| `/nhat-ky` | Nhật ký báo |
| `/master`, `/tai-khoan`, `/nhom-quyen`, `/phien-dang-nhap`, `/bao-tri` | Admin |

Post-login: **AD** → `/tong-quan`, **DH** (and others) → `/cham-xe`.

## Schedule mode

Vehicle trip schedules (`/master` → **Lịch chuyến**) follow BE `application.schedule.mode`:

| Mode | Behavior |
|------|----------|
| `INTERNAL` | Master CRUD uses `/api/vehicle-schedules`; chấm xe reads internal trips |
| `CRM` | Internal schedule master unused until mode is INTERNAL/HYBRID |
| `HYBRID` | Both internal schedules and CRM sources |

Mode badge on the tab comes from `GET /api/vehicle-schedules/mode`.

## Brand

- Primary `#FF7300`, accent `#007ED4`
- Logo: `public/logo-ghn.svg` (also `src/assets/logo-ghn.svg`)

## Build

```bash
npm run build
```
