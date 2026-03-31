# 🩸 Karachi Blood Bank Finder — Complete Setup Guide

---

## WHAT YOU HAVE

```
bloodbank-backend/
├── src/server.js          ← Node.js API (Express)
├── supabase_schema.sql    ← Database setup + all blood bank data
├── index.html             ← Frontend (connect to your API)
├── package.json           ← Node dependencies
├── .env.example           ← Config template
└── SETUP_GUIDE.md         ← This file
```

---

## STEP 1 — Create Supabase Database (FREE)

1. Go to **https://supabase.com** → Sign up (free)
2. Click **"New Project"** → Give it a name like `bloodbank-karachi`
3. Set a strong database password → **Save it somewhere** Blood321@#@#ysw
4. Wait ~2 minutes for project to be ready

**Run the SQL schema:**
5. In Supabase sidebar → Click **"SQL Editor"**
6. Click **"New Query"**
7. Open `supabase_schema.sql` from this folder
8. **Copy ALL the content** → Paste into the editor
9. Click **"Run"** → You should see "Success"

**Get your API keys:**
10. Supabase sidebar → **Settings** → **API** 
11. Copy:
    - **Project URL** → `https://xxxxx.supabase.co` 
    - **service_role** key (scroll down, under "Project API keys")
    - ⚠️ Use `service_role`, NOT `anon` key

---

## STEP 2 — Deploy Backend on Railway (FREE)

1. Go to **https://railway.app** → Sign up with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Push this folder to a GitHub repo first:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/bloodbank-backend.git
   git push -u origin main
   ```
4. In Railway → Select your repo → It will auto-detect Node.js

**Add Environment Variables in Railway:**
5. Railway Dashboard → Your project → **"Variables"** tab
6. Add these one by one:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Your Supabase service_role key |
| `ADMIN_SECRET` | Any random long string (your choice) |
| `FRONTEND_URL` | URL where your index.html will be hosted |
| `NODE_ENV` | `production` |

7. Railway will auto-deploy → Wait 1-2 minutes
8. Click **"Settings"** → **"Domains"** → Copy your URL
   - It looks like: `https://bloodbank-backend-production.up.railway.app`

---

## STEP 3 — Connect Frontend

1. Open `index.html` in a text editor
2. Find this line near the top:
   ```javascript
   const API_BASE = 'https://YOUR-BACKEND-URL.up.railway.app';
   ```
3. Replace with your actual Railway URL:
   ```javascript
   const API_BASE = 'https://bloodbank-backend-production.up.railway.app';
   ```
4. Save the file

**Host the frontend (free options):**
- **Netlify**: Drag and drop `index.html` at https://netlify.com → Done in 30 seconds
- **GitHub Pages**: Push to GitHub repo → Settings → Pages → Enable
- **Vercel**: Connect GitHub → Auto deploys

---

## STEP 4 — Test Everything

Open your hosted frontend URL and:
- ✅ Blood banks should load (from your Supabase database)
- ✅ Click any blood group — cards should appear
- ✅ Fill donor form → Submit → Check Supabase → `donors` table

**Test the API directly:**
```
GET  https://your-railway-url.app/api/banks
GET  https://your-railway-url.app/api/banks?tag=free
GET  https://your-railway-url.app/api/banks?tag=open24
GET  https://your-railway-url.app/api/donors/search?blood_group=B+
POST https://your-railway-url.app/api/donors
POST https://your-railway-url.app/api/contact
```

---

## ADMIN — View All Donor Data

All donor registrations go into your **Supabase database**.

**Option 1 — Supabase Dashboard:**
- Go to https://supabase.com → Your project → **Table Editor**
- Click `donors` table → See all registrations
- You can export as CSV

**Option 2 — Admin API (with your secret key):**
```
GET https://your-railway-url.app/api/admin/donors
Header: x-admin-secret: your-ADMIN_SECRET-value
```

**Option 3 — Add/Edit blood banks via API:**
```
POST https://your-railway-url.app/api/admin/banks
Header: x-admin-secret: your-ADMIN_SECRET-value
Body: { "name": "New Blood Bank", "area": "...", ... }
```

---

## ADDING MORE BLOOD BANKS LATER

In Supabase SQL Editor, just run:
```sql
INSERT INTO blood_banks (name, area, address, phone, email, timing, tags, services, note, lat, lng)
VALUES ('New Bank Name', 'Area', 'Full Address', '021-XXXXXXX', 'email@example.com',
        'Open 24 Hours', ARRAY['free','open24'], ARRAY['Service 1','Service 2'],
        'Short note about this bank.', 24.8600, 67.0100);
```

Or use the Admin API from Postman/curl.

---

## SUMMARY

| Component | Platform | Cost |
|-----------|----------|------|
| Database | Supabase | FREE (500MB) |
| Backend API | Railway | FREE (500 hrs/month) |
| Frontend | Netlify | FREE (unlimited) |

**Total monthly cost = PKR 0** 🎉

---

## NEED HELP?

If something doesn't work, check:
1. Railway logs (Railway dashboard → Deployments → View logs)
2. Supabase logs (Supabase → Logs → API)
3. Browser console (F12 → Console tab) for frontend errors
