# onform-programs

On Form Physiotherapy — D2C Online Rehabilitation Programs

Built on React + Vite, deployed to Vercel, backed by the PhysioScript Supabase project.

---

## Security notes

- Uses **anon key only** — no service role key ever in this repo
- All data access gated by Supabase RLS policies
- Consumers can only read published programs and their own purchase/progress data
- No access to clinic, practitioner, or client data

---

## Setup

```bash
npm install
cp .env.example .env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_FUNCTIONS_URL, VITE_APP_URL
npm run dev
```

---

## Routes

| Route | Description |
|---|---|
| `/programs` | Public storefront — all published programs |
| `/programs/:slug` | Individual program detail + Buy Now |
| `/programs/success` | Post-purchase confirmation |
| `/programs/:slug/access` | Consumer dashboard (requires auth) |

---

## Deployment (Vercel)

1. Create new Vercel project from this repo
2. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_FUNCTIONS_URL`
   - `VITE_APP_URL`
3. Set custom domain or path routing from `onformphysio.com.au/programs`

---

## Supabase magic link redirect

In Supabase dashboard → Auth → URL Configuration, add:
```
https://www.onformphysio.com.au/programs/*
```
to the **Redirect URLs** allowlist.
