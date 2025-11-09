# 🚀 GYORS INDÍTÁS

## 1️⃣ Ikonok Generálása (FONTOS!)

**Nyisd meg böngészőben:**
```
icons/generate-icons.html
```

**Kattints a gombokra:**
- 📥 Letöltés: icon-192.png
- 📥 Letöltés: icon-512.png

**Mentsd el őket az `icons/` mappába!**

## 2️⃣ Webszerver Indítása

### Python módszer (ajánlott):
```bash
cd pwa_folder
python3 -m http.server 8000
```

### Node.js módszer:
```bash
npx serve
```

### VS Code módszer:
- Telepítsd a "Live Server" extension-t
- Jobb klikk `index.html` → "Open with Live Server"

## 3️⃣ Böngésző

Nyisd meg: `http://localhost:8000`

## ✅ Ellenőrzés

Chrome DevTools (F12):
1. **Application tab** → Manifest ✓
2. **Application tab** → Service Workers → "active" ✓
3. **Network tab** → "Offline" bekapcsolva → app működik ✓

## 🔄 Frissítés Gomb Használata

Ha új verziót adsz ki:

1. **Verzió növelés:**
   - `sw.js`: `CACHE_VERSION = 'munkaora-v2.6.0'`
   - `app.js`: `CURRENT_VERSION = 'v2.6'`
   - `index.html`: `<div id="build-badge">v2.6 PWA</div>`

2. **Automatic:**
   - Service Worker észleli az új verziót
   - Felhasználó kap egy bannert: "🎉 Új verzió elérhető!"
   - Kattint: "Frissítés most"
   - App újratöltődik friss cache-sel

## 🛠️ Cache Probléma?

### Hard Refresh:
- **Windows:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`

### Vagy DevTools:
1. F12 → Application → Service Workers
2. "Unregister" → Reload

## 📱 Telepítés Mobilra

### Android:
1. Chrome → Menü → "Hozzáadás a kezdőképernyőhöz"

### iOS:
1. Safari → Megosztás → "Hozzáadás a kezdőképernyőhöz"

## 🎯 Kész!

Az app mostantól:
- ✅ Offline működik
- ✅ Gyorsan tölt
- ✅ Auto frissül
- ✅ Telepíthető
- ✅ Nincs cache probléma!

---

📖 Részletes dokumentáció: **README.md**
