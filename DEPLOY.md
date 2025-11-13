# 🚀 DEPLOYMENT ÚTMUTATÓ

## Meglévő GitHub Repo Frissítése

```bash
# 1. Clone
git clone https://github.com/USERNAME/doomspending.git
cd doomspending

# 2. Backup (opcionális)
git checkout -b backup-old
git push origin backup-old
git checkout main

# 3. Töröld a régi fájlokat
rm -rf *.html *.css *.js *.json icons/

# 4. Másold be az új fájlokat (ezt a mappát)
# Drag & drop vagy:
cp -r /path/to/new/files/* .

# 5. Commit és push
git add .
git commit -m "Refactor: PWA v2.5"
git push

# Vercel automatikusan deploy-ol!
```

## Új GitHub Repo

```bash
# 1. GitHub-on hozz létre új repo-t

# 2. Inicializálás
git init
git add .
git commit -m "Initial commit"
git branch -M main

# 3. Remote
git remote add origin https://github.com/USERNAME/munkaora-pwa.git
git push -u origin main

# 4. Vercel
# https://vercel.com/new → Import repo → Deploy
```

## Vercel Beállítások

Minden automatikus! A `vercel.json` beállítja:
- ✅ Service Worker headers
- ✅ Cache policies
- ✅ Security headers

## Ellenőrzés

1. Site megnyitható? ✅
2. PWA installálható? ✅
3. F12 → Service Worker: "activated"? ✅
4. Offline működik? ✅

## Verzió Frissítés

3 fájl módosítása:
- `sw.js` → CACHE_VERSION
- `app.js` → CURRENT_VERSION  
- `index.html` → build-badge

Aztán `git push` és kész!
