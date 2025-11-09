# 🕐 Munkaóra Pro - PWA

> Számold ki, mennyi munkaórádba kerül egy vásárlás!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/USERNAME/munkaora-pwa)

## ✨ Funkciók

- 💰 **Órabér kalkulátor** - Fordítsd át az árakat munkaórákra
- 📊 **Statisztikák** - Kövesd nyomon spórolásaidat
- 📜 **Történet** - Tekintsd meg döntéseidet
- 🏆 **Eredmények** - Nyiss fel achievement-eket
- 🌙 **Dark mode** - Sötét téma támogatás
- 📱 **PWA** - Telepíthető app, offline működés
- 🔄 **Auto update** - Automatikus frissítés észlelés
- 🚀 **Megosztás** - Hívd meg barátaidat

## 🚀 Gyors Start

### Online (Vercel)

A legegyszerűbb - csak nyisd meg:
```
https://doomspending.vercel.app/
```

### Helyi Fejlesztés

1. **Clone repository:**
   ```bash
   git clone https://github.com/USERNAME/munkaora-pwa.git
   cd munkaora-pwa
   ```

2. **Ikonok generálása (FONTOS!):**
   - Nyisd meg: `icons/generate-icons.html`
   - Töltsd le: `icon-192.png` és `icon-512.png`
   - Helyezd az `icons/` mappába

3. **Webszerver indítása:**
   ```bash
   # Python
   python3 -m http.server 8000
   
   # Node.js
   npx serve
   ```

4. **Böngésző:**
   ```
   http://localhost:8000
   ```

## 📁 Fájl Struktúra

```
munkaora-pwa/
├── index.html              # Fő HTML
├── styles.css              # Összes CSS
├── app.js                  # JavaScript + PWA
├── sw.js                   # Service Worker
├── manifest.json           # PWA konfig
├── vercel.json             # Vercel konfig
├── package.json            # NPM konfig
├── .gitignore              # Git ignore
├── icons/
│   ├── generate-icons.html # Ikon generáló
│   ├── icon-192.png        # 192x192 ikon
│   ├── icon-512.png        # 512x512 ikon
│   └── icon.svg            # SVG forrás
└── .github/
    └── workflows/
        └── vercel-deploy.yml  # Auto deploy
```

## 🌐 Vercel Deployment

### One-Click Deploy

Kattints a gombra:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/USERNAME/munkaora-pwa)

### Manuális Deploy

1. **Push GitHub-ra:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Vercel Dashboard:**
   - Import repository
   - Deploy! 🚀

3. **Automatikus:**
   - Minden push = deploy
   - Preview minden PR-hez

### GitHub Actions (Auto)

Az Actions automatikusan:
- ✅ Ellenőrzi az ikonokat
- ✅ Deploy-ol Vercel-re
- ✅ Kommentel a PR-ekbe

**Setup:**
1. Vercel Dashboard → Settings → Tokens → Create
2. GitHub repo → Settings → Secrets → New secret
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

## 🔄 Verzió Frissítés

### 1. Verziószámok Növelése

**sw.js:**
```javascript
const CACHE_VERSION = 'munkaora-v2.6.0'; // ← Változtasd!
```

**app.js:**
```javascript
const CURRENT_VERSION = 'v2.6'; // ← Változtasd!
```

**index.html:**
```html
<div id="build-badge">v2.6 PWA</div> <!-- Változtasd! -->
```

### 2. Commit és Push

```bash
git add .
git commit -m "Release v2.6"
git push
```

### 3. Automatikus Deploy

Vercel automatikusan:
- 🔨 Build-el
- 🚀 Deploy-ol
- ✅ Felhasználók kapnak update bannert

### 4. Cache Kezelés

A Service Worker automatikusan:
- 🔍 Észleli az új verziót
- 🔔 Bannert mutat: "Új verzió elérhető!"
- 🗑️ Törli a régi cache-t
- ⬇️ Tölti az új fájlokat
- ✨ Frissít egy kattintással

**Nincs cache probléma!** 🎉

## 📱 PWA Telepítés

### Chrome (Desktop/Android)
1. Menü → "Install Munkaóra"
2. Vagy URL bar → Install ikon

### Safari (iOS)
1. Share → "Add to Home Screen"
2. App megjelenik a főképernyőn

### Edge (Desktop)
1. Menü → Apps → "Install Munkaóra"

## 🛠️ Fejlesztés

### CSS Módosítás
```bash
# Szerkeszd: styles.css
# Növeld: verziókat
git push  # → Auto deploy
```

### JavaScript Módosítás
```bash
# Szerkeszd: app.js
# Növeld: verziókat
git push  # → Auto deploy
```

### HTML Módosítás
```bash
# Szerkeszd: index.html
# Növeld: verziókat
git push  # → Auto deploy
```

## 🔐 Biztonság

- ✅ HTTPS only (Vercel auto)
- ✅ Security headers (vercel.json)
- ✅ No external CDN dependencies
- ✅ CSP ready
- ✅ XSS protection
- ✅ Service Worker scope limited

## 📊 Tesztelés

### PWA Audit (Lighthouse)
```bash
# Chrome DevTools
F12 → Lighthouse → PWA
Target: 100% 🎯
```

### Checklist
- [ ] Service Worker aktív
- [ ] Manifest valid
- [ ] Ikonok megjelennek
- [ ] Offline működik
- [ ] Installálható
- [ ] Update banner működik
- [ ] Megosztás funkció működik

## 🐛 Hibaelhárítás

### Service Worker nem regisztrálódik
```bash
# Ellenőrzés:
1. HTTPS van? (Vercel auto HTTPS)
2. sw.js elérhető?
3. Console error?
```

### Cache nem frissül
```bash
# Megoldás:
1. Növeld CACHE_VERSION-t
2. Hard refresh: Ctrl+Shift+R
3. DevTools → Application → Clear storage
```

### Ikonok hiányoznak
```bash
# Ellenőrzés:
1. PNG fájlok léteznek icons/ mappában?
2. Helyes méret? (192x192, 512x512)
3. Git-be commitolva?
```

## 📖 Dokumentáció

- **DEPLOYMENT.md** - Részletes Vercel útmutató
- **QUICK_START.md** - Gyors helyi indítás
- **FILE_LIST.txt** - Fájl struktúra
- **START_HERE.html** - Vizuális útmutató

## 🤝 Közreműködés

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📄 Licensz

MIT License - Szabadon használható és módosítható

## 👨‍💻 Szerző

Made with ❤️ by [Your Name]

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=USERNAME/munkaora-pwa&type=Date)](https://star-history.com/#USERNAME/munkaora-pwa&Date)

---

**Live Demo:** https://doomspending.vercel.app/

**Issues:** https://github.com/USERNAME/munkaora-pwa/issues

**Discussions:** https://github.com/USERNAME/munkaora-pwa/discussions
