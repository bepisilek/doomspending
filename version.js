// ============================================
// MUNKAÓRA PRO - VERSION CONFIG
// ============================================
// 
// ⚠️  FONTOS: Csak ezt az egy számot kell frissíteni! ⚠️
// 
// Amikor frissítesz:
// 1. Változtasd meg az alábbi VERSION értéket
// 2. Git push → Automatikus deploy
// 3. Profit! 🎉
//
// ============================================

const VERSION = 'v2.5';

// ============================================
// Automatic exports (ne módosítsd!)
// ============================================

// ServiceWorker számára (cache név)
const CACHE_VERSION = `munkaora-${VERSION}.0`;

// Export - ES6 module formátumban
export { VERSION, CACHE_VERSION };

// Export - CommonJS/Legacy kompatibilitás
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VERSION, CACHE_VERSION };
}

// Export - Globális változó (fallback régi böngészőknek)
if (typeof window !== 'undefined') {
  window.APP_VERSION = VERSION;
  window.CACHE_VERSION = CACHE_VERSION;
}

console.log(`📦 Version module loaded: ${VERSION}`);
