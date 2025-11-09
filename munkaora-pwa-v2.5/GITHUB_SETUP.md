# 🚀 GitHub + Vercel Setup - Lépésről Lépésre

## 📋 Előfeltételek

- [ ] GitHub fiók: https://github.com/signup
- [ ] Vercel fiók: https://vercel.com/signup
- [ ] Git telepítve: `git --version`
- [ ] Ikonok generálva (lásd alább)

---

## 1️⃣ Ikonok Generálása (KRITIKUS!)

**Mielőtt bármit push-olsz:**

```bash
# Nyisd meg böngészőben:
icons/generate-icons.html

# Töltsd le:
- icon-192.png → Mentsd: icons/icon-192.png
- icon-512.png → Mentsd: icons/icon-512.png
```

**Ellenőrzés:**
```bash
ls -la icons/
# Kell látszódjon:
# icon-192.png
# icon-512.png
```

⚠️ **FONTOS:** Vercel nem tud PNG-ket generálni, ezért manuálisan kell!

---

## 2️⃣ GitHub Repository Létrehozása

### A) GitHub Webes Felületen

1. **GitHub.com → Új Repository:**
   - Name: `munkaora-pwa`
   - Description: "Munkaóra Pro - PWA app"
   - Public vagy Private
   - ❌ NE add hozzá a README/gitignore/license (már van!)

2. **Repository URL másolása:**
   ```
   https://github.com/USERNAME/munkaora-pwa.git
   ```

### B) Helyi Git Inicializálás

```bash
# Ha még nincs git:
git init

# Add hozzá a fájlokat:
git add .

# Első commit:
git commit -m "Initial commit - Munkaóra PWA v2.5"

# Main branch:
git branch -M main

# Remote hozzáadása:
git remote add origin https://github.com/USERNAME/munkaora-pwa.git

# Push:
git push -u origin main
```

**Ellenőrzés:**
- Refresh GitHub repo oldalt
- Látszanak a fájlok? ✅

---

## 3️⃣ Vercel Deployment

### A) Vercel Dashboard Módszer (Legegyszerűbb)

1. **Vercel.com → New Project:**
   - Click: "Import Project"

2. **Import Git Repository:**
   - Choose: GitHub
   - Select: `munkaora-pwa`

3. **Configure Project:**
   - Framework Preset: `Other`
   - Root Directory: `./`
   - Build Command: (üres hagyni)
   - Output Directory: (üres hagyni)
   - Install Command: (üres hagyni)

4. **Deploy:**
   - Click: "Deploy"
   - Várj 30-60 másodpercet
   - Kész! 🎉

5. **Domain:**
   - Auto kapsz: `munkaora-pwa-xxx.vercel.app`
   - Custom domain: Settings → Domains

### B) Vercel CLI Módszer

```bash
# Telepítés:
npm install -g vercel

# Bejelentkezés:
vercel login

# Link projekt:
vercel link

# Deploy preview:
vercel

# Deploy production:
vercel --prod
```

---

## 4️⃣ Automatikus Deployment Beállítása

### A) GitHub Secrets (opcionális)

Ha GitHub Actions-t használsz:

1. **Vercel Tokens:**
   - Vercel Dashboard → Settings → Tokens
   - Create Token → Copy

2. **GitHub Secrets:**
   - Repo → Settings → Secrets → Actions
   - New secret:
     - `VERCEL_TOKEN`
     - `VERCEL_ORG_ID` (Dashboard → Settings → General)
     - `VERCEL_PROJECT_ID` (Project Settings → General)

3. **Push:**
   ```bash
   git push
   # → Actions automatikusan fut
   # → Deploy történik
   ```

### B) Vercel Git Integration (Automatikus)

Vercel automatikusan:
- ✅ Deploy minden push-nál (main branch)
- ✅ Preview deploy minden PR-nél
- ✅ Comment a PR-ekbe
- ✅ Rollback support

**Nincs setup szükséges!** Csak push-olj:
```bash
git push origin main
# → Auto deploy
```

---

## 5️⃣ Custom Domain (Opcionális)

### Domain Vásárlás
- Namecheap: https://www.namecheap.com/
- Google Domains: https://domains.google/
- Cloudflare: https://www.cloudflare.com/

### Vercel Domain Setup

1. **Vercel Dashboard → Project → Settings → Domains:**
   - Add: `yourdomain.com`
   - Add: `www.yourdomain.com`

2. **DNS Konfiguráció (Domain registrar):**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

3. **Várj DNS propagációra:**
   - ~1-2 óra
   - Check: https://dnschecker.org/

4. **HTTPS:**
   - Automatikus! Vercel ad SSL cert-et
   - Pár perc és kész

---

## 6️⃣ Első Verzió Frissítés

### Új Feature Fejlesztése:

```bash
# 1. Új branch
git checkout -b feature/new-thing

# 2. Szerkesztés
# ... modify files ...

# 3. Commit
git add .
git commit -m "Add new feature"

# 4. Push
git push origin feature/new-thing

# 5. GitHub → Create Pull Request

# → Vercel auto preview deploy!
```

### Verzió Release:

```bash
# 1. Növeld verziókat:
# - sw.js: CACHE_VERSION = 'munkaora-v2.6.0'
# - app.js: CURRENT_VERSION = 'v2.6'
# - index.html: build-badge = 'v2.6 PWA'

# 2. Commit
git add .
git commit -m "Release v2.6"

# 3. Tag
git tag v2.6
git push origin v2.6

# 4. Push main
git push origin main

# → Vercel production deploy!
# → Users get update banner!
```

---

## ✅ Deployment Checklist

Mindent ellenőrizz:

### Pre-Deploy:
- [ ] Ikonok generálva és commitolva
- [ ] .gitignore beállítva
- [ ] vercel.json konfig OK
- [ ] manifest.json paths OK
- [ ] Console.log-ok eltávolítva
- [ ] Verzióok beállítva

### Deploy:
- [ ] Git push successful
- [ ] Vercel build successful
- [ ] No errors in logs

### Post-Deploy:
- [ ] Site megnyitható
- [ ] PWA installálható
- [ ] Service Worker aktív
- [ ] Offline működik
- [ ] Update banner működik
- [ ] Lighthouse: 100% PWA
- [ ] Mobile responsive
- [ ] Icons megjelennek

---

## 📊 Monitoring

### Vercel Analytics
```
Dashboard → Analytics
- Page views
- Visitors
- Countries
- Devices
```

### Service Worker Status
```javascript
// Console:
navigator.serviceWorker.getRegistrations()
```

### Cache Inspection
```
F12 → Application → Cache Storage
```

---

## 🐛 Gyakori Hibák

### "Failed to register service worker"
```bash
# Megoldás:
1. Ellenőrizd: HTTPS van? (Vercel auto HTTPS)
2. Ellenőrizd: sw.js elérhető?
3. vercel.json headers OK?
```

### "Icons not found"
```bash
# Megoldás:
1. Generáld az ikonokat!
2. icons/generate-icons.html
3. Commit és push
```

### "Build failed"
```bash
# Megoldás:
1. Check Vercel logs
2. Syntax error?
3. Vercel.json valid JSON?
```

---

## 🎯 Kész!

Most már:
- ✅ GitHub repository-d van
- ✅ Vercel automatikus deployment
- ✅ PWA live az interneten
- ✅ Minden push → auto deploy
- ✅ HTTPS és CDN ingyen
- ✅ Cache kezelés működik

**Next Steps:**
1. Share the link! 🚀
2. Add custom domain
3. Monitor analytics
4. Keep shipping updates! 🎉

---

**Hasznos Linkek:**

- Vercel Docs: https://vercel.com/docs
- GitHub Docs: https://docs.github.com/
- PWA Checklist: https://web.dev/pwa-checklist/
- Lighthouse: https://developers.google.com/web/tools/lighthouse/

**App Links:**

- Live Site: https://doomspending.vercel.app/
- GitHub: https://github.com/USERNAME/munkaora-pwa
- Vercel Dashboard: https://vercel.com/dashboard
