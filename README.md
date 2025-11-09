# 🕐 Munkaóra Pro PWA

Progressive Web App - Szétbontott struktúra, cache-probléma mentes

## 🚀 Gyors Deploy (2 lépés)

### 1. GitHub Push
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/REPONAME.git
git push -u origin main
```

### 2. Vercel Deploy
- Menj: https://vercel.com/new
- Import repository
- Deploy! 🎉

**Kész!** Automatikus deploy minden push után.

## 🔄 Verzió Frissítés

Változtasd meg 3 fájlban:

```javascript
// sw.js
const CACHE_VERSION = 'munkaora-v2.6.0'; // ← Növeld

// app.js
const CURRENT_VERSION = 'v2.6'; // ← Növeld

// index.html
<div id="build-badge">v2.6 PWA</div> // ← Növeld
```

Aztán `git push` → Auto deploy → Users kapnak update bannert!

## 📁 Struktúra

```
munkaora-pwa/
├── index.html       # Fő HTML
├── styles.css       # Összes CSS
├── app.js          # JavaScript + PWA
├── sw.js           # Service Worker
├── manifest.json   # PWA config
├── vercel.json     # Vercel config
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## ✨ Funkciók

- ✅ Offline működés (Service Worker)
- ✅ Auto update banner (verzió észlelés)
- ✅ Installálható app (PWA manifest)
- ✅ Cache kezelés (verzió alapú)
- ✅ Megosztás funkció
- ✅ Dark mode
- ✅ Reszponzív design

## 🐛 Hibaelhárítás

**Service Worker nem regisztrálódik?**
- HTTPS van? (Vercel auto ad)
- sw.js elérhető a root-ból?

**Cache nem frissül?**
- Növeld a CACHE_VERSION-t
- Hard refresh: Ctrl+Shift+R

## 📖 Dokumentáció

- Vercel: https://vercel.com/docs
- PWA: https://web.dev/pwa/

## 📄 Licensz

MIT
