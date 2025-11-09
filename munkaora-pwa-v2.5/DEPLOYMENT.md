# 🚀 Vercel Deployment Útmutató

## 📋 Előkészületek

### 1. Ikonok Generálása (KÖTELEZŐ!)

**Nyisd meg helyben böngészőben:**
```
icons/generate-icons.html
```

**Töltsd le mind a két PNG-t:**
- ✅ icon-192.png
- ✅ icon-512.png

**Helyezd el az `icons/` mappába!**

> ⚠️ **FONTOS:** Vercel nem tud PNG-ket generálni, ezért előre kell!

---

## 🌐 GitHub + Vercel Deployment

### Módszer 1: Vercel Dashboard (Ajánlott)

1. **Push GitHub-ra:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Munkaóra PWA v2.5"
   git branch -M main
   git remote add origin https://github.com/USERNAME/munkaora-pwa.git
   git push -u origin main
   ```

2. **Vercel Dashboard:**
   - Menj: https://vercel.com/new
   - Import GitHub repository
   - Válaszd ki a repo-t
   - Deploy! 🚀

3. **Automatikus:**
   - Minden push = auto deploy
   - Preview minden PR-nél
   - Production deploy main branch-ből

---

### Módszer 2: Vercel CLI

```bash
# Telepítés
npm install -g vercel

# Bejelentkezés
vercel login

# Deploy
vercel

# Production deploy
vercel --prod
```

---

## ⚙️ Vercel Konfiguráció

A `vercel.json` fájl beállítja:

✅ **Service Worker headers**
- `Cache-Control: public, max-age=0, must-revalidate`
- `Service-Worker-Allowed: /`

✅ **Biztonsági headers**
- X-Content-Type-Options
- X-Frame-Options  
- X-XSS-Protection

---

## 🔄 Frissítés és Cache Kezelés

### Új Verzió Kiadása:

1. **Növeld a verziókat:**
   ```javascript
   // sw.js
   const CACHE_VERSION = 'munkaora-v2.6.0'; // ← Változtasd!
   
   // app.js
   const CURRENT_VERSION = 'v2.6'; // ← Változtasd!
   
   // index.html
   <div id="build-badge">v2.6 PWA</div> // ← Változtasd!
   ```

2. **Commit és push:**
   ```bash
   git add .
   git commit -m "Release v2.6"
   git push
   ```

3. **Vercel auto-deploy:**
   - Észleli a push-t
   - Build készül
   - Deploy történik
   - Felhasználók kapnak update bannert!

### Cache Működése:

```
Felhasználó látogatása
↓
Service Worker észleli új verziót
↓
Banner megjelenik: "🎉 Új verzió elérhető!"
↓
Kattintás: "Frissítés most"
↓
Régi cache törlődik
↓
Új verzió betöltődik
↓
Kész! ✅
```

---

## 🔗 Domain Beállítások

### Custom Domain:

1. Vercel Dashboard → Settings → Domains
2. Add domain (pl. munkaora.app)
3. Configure DNS records:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
4. Wait for DNS propagation (~1 óra)
5. Kész! HTTPS automatikus 🔒

---

## 📊 Ellenőrzések Deploy Után

### 1. PWA Audit (Chrome DevTools)
```
F12 → Lighthouse → Progressive Web App
Cél: 100% 🎯
```

### 2. Service Worker
```
F12 → Application → Service Workers
Status: "activated and is running" ✅
```

### 3. Manifest
```
F12 → Application → Manifest
Minden mező kitöltve ✅
Ikonok megjelennek ✅
```

### 4. Offline Teszt
```
F12 → Network → Offline
App működik ✅
```

### 5. Install Test (Mobile)
```
Chrome → Menü → "Install app"
Vagy
Safari → Share → "Add to Home Screen"
```

---

## 🐛 Hibaelhárítás

### Service Worker nem regisztrálódik:
```bash
# Ellenőrzés:
1. HTTPS van? (Vercel auto HTTPS-t ad)
2. sw.js elérhető a gyökérből?
3. Console error van?
```

### Cache nem frissül:
```bash
# Megoldás:
1. Növeld CACHE_VERSION-t sw.js-ben
2. Git push
3. Vercel újra deploy-ol
4. Hard refresh: Ctrl+Shift+R
```

### Ikonok nem jelennek meg:
```bash
# Ellenőrzés:
1. PNG fájlok léteznek icons/ mappában?
2. Helyes méret? (192x192 és 512x512)
3. manifest.json helyes útvonal?
```

---

## 🎯 Production Checklist

Deployment előtt:
- [ ] Ikonok generálva és commitolva
- [ ] Verziószámok frissítve
- [ ] Console.log-ok eltávolítva/kiadásra kész
- [ ] Google Analytics ID beállítva (opcionális)
- [ ] Invite kódok ellenőrizve
- [ ] README.md frissítve

Deploy után:
- [ ] Lighthouse audit: 100% PWA
- [ ] Service Worker aktiválva
- [ ] Offline működik
- [ ] Installálható mobil/desktop-on
- [ ] Update banner működik
- [ ] Megosztás funkció működik

---

## 🔐 Környezeti Változók (opcionális)

Ha API kulcsokat használsz:

Vercel Dashboard → Settings → Environment Variables

```
GA_TRACKING_ID=G-XXXXXXXXXX
API_KEY=your-secret-key
```

Használat:
```javascript
const gaId = process.env.GA_TRACKING_ID;
```

---

## 📈 Analytics és Monitoring

### Vercel Analytics (Beépített)
```
Dashboard → Analytics
- Page views
- Unique visitors
- Top pages
- Performance metrics
```

### Custom Tracking
```javascript
// app.js-ben már van Google Analytics
gtag('event', 'button_click', {
  'event_category': 'engagement',
  'event_label': 'custom_action'
});
```

---

## 🚦 Environment-ek

### Preview Deployments
- Minden branch automatikusan kap preview URL-t
- Tesztelésre ideális
- Nem hat a production-re

### Production
- Csak a main branch
- Custom domain
- Auto HTTPS
- CDN edge cache

---

## 📞 Támogatás

**Vercel Docs:** https://vercel.com/docs
**Status:** https://www.vercel-status.com/
**Community:** https://github.com/vercel/vercel/discussions

**App-specifikus:**
- README.md - Fejlesztési útmutató
- QUICK_START.md - Gyors indítás helyben
- FILE_LIST.txt - Fájlstruktúra

---

## ✨ That's it!

```bash
git push
# → Vercel auto-deploy
# → Felhasználók kapják az update-et
# → Cache automatikusan kezelve
# → Profit! 🎉
```

**Nincs cache probléma, mert:**
- ✅ Verzió alapú cache kezelés
- ✅ Service Worker skipWaiting
- ✅ Automatikus régi cache törlés
- ✅ Network-first HTML strategy
- ✅ Cache-first asset strategy
