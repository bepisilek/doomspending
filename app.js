// ============================================
// MUNKAÓRA PRO - PWA
// ============================================

// Google Analytics
function track(name, params = {}) {
  if (window.gtag) window.gtag('event', name, params);
}

// ============================================
// SUPABASE ANALYTICS
// ============================================

const SUPABASE_URL = 'https://twdauagksibhuafvdctw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3ZGF1YWdrc2liaHVhZnZkY3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NjcyMzQsImV4cCI6MjA3ODU0MzIzNH0.nK-REIO-yP6mfcHSwHgVCZvzLUq4Q96Bpm-WnlUgoL0';

let supabase = null;

// Supabase client inicializálása
function initSupabase() {
  try {
    if (window.supabase && window.supabase.createClient) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Supabase client inicializálva');
    } else {
      console.warn('⚠️ Supabase library nem elérhető');
    }
  } catch (error) {
    console.error('❌ Supabase init hiba:', error);
  }
}

// User ID generálása vagy betöltése
function getUserId() {
  const USER_ID_KEY = 'munkaora_user_id';
  let userId = localStorage.getItem(USER_ID_KEY);
  
  if (!userId) {
    // Generálunk egy egyedi UUID-t
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(USER_ID_KEY, userId);
    console.log('🆕 Új user ID generálva:', userId);
  }
  
  return userId;
}

// Profil adatok küldése Supabase-be
async function sendProfileToSupabase(profileData) {
  if (!supabase) {
    console.warn('⚠️ Supabase nem elérhető, profil nem került elküldésre');
    return;
  }
  
  try {
    const userId = getUserId();
    
    // Név NEM kerül bele!
    const analyticsData = {
      user_id: userId,
      age: profileData.age || null,
      city: profileData.city || null,
      income: profileData.income || null,
      hours_per_week: profileData.hoursPerWeek || null,
      updated_at: new Date().toISOString()
    };
    
    // Upsert (insert or update)
    const { data, error } = await supabase
      .from('analytics_profiles')
      .upsert(analyticsData, { onConflict: 'user_id' });
    
    if (error) {
      console.error('❌ Supabase profil hiba:', error);
    } else {
      console.log('✅ Profil elküldve Supabase-be');
    }
  } catch (error) {
    console.error('❌ Supabase profil exception:', error);
  }
}

// Döntés adatok küldése Supabase-be
async function sendDecisionToSupabase(decisionData) {
  if (!supabase) {
    console.warn('⚠️ Supabase nem elérhető, döntés nem került elküldésre');
    return;
  }
  
  try {
    const userId = getUserId();
    
    const analyticsData = {
      user_id: userId,
      product: decisionData.product,
      price: decisionData.price,
      hours: decisionData.hours,
      decision: decisionData.decision,
      category: decisionData.category || 'other',
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('analytics_decisions')
      .insert([analyticsData]);
    
    if (error) {
      console.error('❌ Supabase döntés hiba:', error);
    } else {
      console.log('✅ Döntés elküldve Supabase-be');
    }
  } catch (error) {
    console.error('❌ Supabase döntés exception:', error);
  }
}

// ============================================
// CONSTANTS & DATA
// ============================================

// APP_VERSION betöltve a version.js-ből
const VERSION_KEY = 'munkaora_version';
const STORE_KEY = 'munkaora_data';
const INVITE_QUEUE_KEY = 'munkaora_invite_queue';
const INVITE_VALID_KEY = 'munkaora_invite_valid';
const SHARE_WIDGET_KEY = 'munkaora_share_widget_dismissed';
const APP_URL = 'https://doomspending.vercel.app/';
const SHARE_MESSAGE = 'Ez az app lefordítja az árakat időre. Nézd meg!';

let selectedCategory = 'other';
let inviteQueue = [];
let inviteValidated = false;
let currentProduct = null;
let currentPrice = 0;
let currentHours = 0;

const INVITE_CODES = [
  '1843-5092-JKLP','9320-1748-MQAE','4076-9921-BTCR','8512-3167-ZWUY','6940-2583-PXEV','7234-8119-HRLT','5802-4671-YQMN','9375-1204-VKAD','4129-7350-NBUE','6583-2901-GCFW',
  '1726-8450-RMZH','3608-5942-WTLQ','9481-6023-EXHP','5307-1849-UJNC','7824-9631-DBSO','6159-2478-FLQA','8046-5312-SKNY','2973-6581-QGJR','4510-9824-VMPC','6791-3405-LHEA',
  '5804-7912-CYTK','1639-4275-NZUF','7102-3698-XQBL','9258-6047-WTRD','3479-8516-MPAH','6903-2781-HQYE','8541-3902-JDUT','4068-1579-RWKC','7135-9804-LZMV','2486-5319-VQEA',
  '9721-3408-XGTF','1840-5726-BKUL','5603-1987-YQPR','3981-6205-MHFC','7092-4186-ZRTA','8460-2351-NPLW','6217-5093-TRXE','9748-6310-DMWQ','5039-2186-GYKH','7825-4691-QALV',
  '6358-9702-XRBD','2914-5803-VKQE','8042-7365-TLJM','1679-2058-RSHP','9380-6147-BFWN','4723-5981-HQCT','6598-3402-YZUR','3251-4790-MWJE','5906-8217-KDPL','7439-1062-XBVR'
];

const achievements = [
  {id:'first',title:'Első lépés',desc:'Első kalkuláció',icon:'🎯',condition:d=>d.history.length>=1},
  {id:'five',title:'Szorgalmas',desc:'5 döntés',icon:'💪',condition:d=>d.history.length>=5},
  {id:'saver',title:'Takarékos',desc:'5 spórolás',icon:'💰',condition:d=>d.history.filter(i=>i.decision==='megsporolom').length>=5},
  {id:'week',title:'Hét hős',desc:'7 napos sorozat',icon:'🔥',condition:d=>calcStreak(d)>=7},
  {id:'ten',title:'Veterán',desc:'10 döntés',icon:'🏆',condition:d=>d.history.length>=10},
  {id:'ratio',title:'Mester',desc:'70% spórolás',icon:'⭐',condition:d=>{const s=d.history.filter(i=>i.decision==='megsporolom').length;return d.history.length?s/d.history.length>=0.7:false;}}
];

const quotes = [
  'Minden megspórolt óra egy lépés a pénzügyi szabadság felé! 💪',
  'A legjobb befektetés: az, amit nem költöttél el! 🎯',
  'Kis lépések, nagy eredmények! 🚀',
  'Te irányítod a pénzedet, ne fordítva! 💰',
  'A tudatos vásárlás a jövőd kulcsa! 🔑',
  'Gondolkozz hosszú távon, élj boldogan! ✨'
];

// ============================================
// DATA MANAGEMENT
// ============================================

function loadData(){
  try{ return JSON.parse(localStorage.getItem(STORE_KEY)) || { profile:{}, history:[] }; }
  catch(e){ return { profile:{}, history:[] }; }
}

function saveData(data){ 
  localStorage.setItem(STORE_KEY, JSON.stringify(data)); 
}

function escapeHtml(str){
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

// ============================================
// INVITE SYSTEM
// ============================================

function normalizeInviteCode(value){
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function loadInviteQueue(){
  try{
    const stored = JSON.parse(localStorage.getItem(INVITE_QUEUE_KEY));
    if(Array.isArray(stored)){
      const sanitized = stored.filter(code => INVITE_CODES.includes(code));
      const missing = INVITE_CODES.filter(code => !sanitized.includes(code));
      return sanitized.concat(missing);
    }
  }catch(e){ }
  return [...INVITE_CODES];
}

function persistInviteQueue(){
  localStorage.setItem(INVITE_QUEUE_KEY, JSON.stringify(inviteQueue));
}

function updateInviteStatus(message, status = 'info'){
  const statusEl = document.getElementById('inviteStatus');
  if(!statusEl) return;
  statusEl.textContent = message;
  statusEl.setAttribute('data-status', status);
}

function showStartCard(){
  document.getElementById('inviteCard').classList.add('hidden');
  document.getElementById('startCard').classList.remove('hidden');
}

function hideStartCard(){
  document.getElementById('inviteCard').classList.remove('hidden');
  document.getElementById('startCard').classList.add('hidden');
}

function initInviteGate(){
  inviteQueue = loadInviteQueue();
  inviteValidated = localStorage.getItem(INVITE_VALID_KEY) === 'true';
  const input = document.getElementById('inviteCodeInput');
  if(input){
    input.addEventListener('keydown', (event) => {
      if(event.key === 'Enter'){
        event.preventDefault();
        validateInvite();
      }
    });
  }
  if(inviteValidated){
    showStartCard();
  } else {
    hideStartCard();
    updateInviteStatus('Add meg az invite kódodat a kezdéshez.', 'info');
  }
}

function validateInvite(){
  const input = document.getElementById('inviteCodeInput');
  if(!input) return;
  const code = normalizeInviteCode(input.value);
  if(!code){
    updateInviteStatus('Írj be egy meghívó kódot!', 'error');
    inviteValidated = false;
    localStorage.removeItem(INVITE_VALID_KEY);
    hideStartCard();
    return;
  }
  const index = inviteQueue.findIndex(item => normalizeInviteCode(item) === code);
  if(index === -1){
    updateInviteStatus('❌ Ez a meghívó kód nem érvényes.', 'error');
    inviteValidated = false;
    localStorage.removeItem(INVITE_VALID_KEY);
    hideStartCard();
    return;
  }
  const [matched] = inviteQueue.splice(index, 1);
  inviteQueue.push(matched);
  persistInviteQueue();
  inviteValidated = true;
  localStorage.setItem(INVITE_VALID_KEY, 'true');
  input.value = '';
  showStartCard();
  track('invite_validated');
}

function startApp(){
  if(!inviteValidated){
    updateInviteStatus('Add meg az érvényes meghívó kódot a kezdéshez.', 'error');
    hideStartCard();
    return;
  }
  track('start_click');
  goTo('profile');
}

// ============================================
// NAVIGATION
// ============================================

function toggleTheme(){
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  html.setAttribute('data-theme', current === 'dark' ? '' : 'dark');
  track('theme_toggle', {theme: current === 'dark' ? 'light' : 'dark'});
}

function goTo(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${screen}`).classList.add('active');
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  const nb = document.getElementById(`nav-${screen}`);
  if (nb) nb.classList.add('active');
  
  const nav = document.getElementById('main-nav');
  if(screen === 'welcome'){
    nav.classList.remove('show');
  } else {
    nav.classList.add('show');
  }
  
  track('view_' + screen);
  if (screen === 'history') loadHistory();
  if (screen === 'stats') loadStats();
}

// ============================================
// PROFILE
// ============================================

function saveProfile(){
  const data = loadData();
  data.profile = {
    name: document.getElementById('name').value,
    age: +document.getElementById('age').value,
    city: document.getElementById('city').value,
    income: +document.getElementById('income').value,
    hoursPerWeek: +document.getElementById('hours').value
  };
  saveData(data);
  
  // Küldjük Supabase-be (név NÉLKÜL!)
  sendProfileToSupabase(data.profile);
  
  track('profile_saved');
  goTo('calculator');
}

// ============================================
// CALCULATOR
// ============================================

function calculate(){
  const data = loadData();
  const p = data.profile;
  if(!p.income || !p.hoursPerWeek){
    alert('Előbb add meg a profilod adataid!');
    goTo('profile');
    return;
  }
  const product = document.getElementById('product').value.trim();
  const price = +document.getElementById('price').value;
  if(!product || !price){
    alert('Add meg a termék nevét és árát!');
    return;
  }
  
  const hourly = p.income / (p.hoursPerWeek * 4);
  const hours = (price / hourly).toFixed(1);
  
  const comparisons = [
    {val:0.5,text:'fél óra munka'},
    {val:1,text:'1 óra munka'},
    {val:2,text:'2 óra munka'},
    {val:4,text:'4 óra (fél munkanap)'},
    {val:8,text:'8 óra (teljes munkanap)'},
    {val:16,text:'2 munkanap'},
    {val:40,text:'1 heti munka'},
    {val:80,text:'2 heti munka'},
    {val:160,text:'1 havi munka'}
  ];
  
  let closestComp = comparisons[0];
  let minDiff = Math.abs(hours - closestComp.val);
  
  for(let c of comparisons){
    const diff = Math.abs(hours - c.val);
    if(diff < minDiff){
      minDiff = diff;
      closestComp = c;
    }
  }
  
  document.getElementById('result-box').style.display = 'block';
  document.getElementById('hoursResult').innerText = hours;
  document.getElementById('comparison').innerText = `Ez kb. ${closestComp.text}`;
  
  currentProduct = product;
  currentPrice = price;
  currentHours = hours;
  
  track('calculate', { product, price, hours });
}

function saveDecision(decision){
  if(!currentProduct){
    alert('Előbb végezz el egy kalkulációt!');
    return;
  }
  
  const data = loadData();
  const decisionData = {
    product: currentProduct,
    price: currentPrice,
    hours: currentHours,
    decision,
    category: selectedCategory,
    ts: Date.now()
  };
  
  data.history.push(decisionData);
  saveData(data);
  
  // Küldjük Supabase-be
  sendDecisionToSupabase(decisionData);
  
  document.getElementById('product').value = '';
  document.getElementById('price').value = '';
  document.getElementById('result-box').style.display = 'none';
  
  currentProduct = null;
  currentPrice = 0;
  currentHours = 0;
  
  alert(decision === 'megsporolom' ? '💪 Szép munka!' : '🛒 Vásárlás rögzítve!');
  track('decision_saved', { decision });
}

// ============================================
// HISTORY
// ============================================

function loadHistory(){
  const data = loadData();
  const list = document.getElementById('history-list');
  
  if(!data.history.length){
    list.innerHTML = '<div class="card"><p>Még nincs előzmény. Készíts egy kalkulációt!</p></div>';
    return;
  }
  
  const sorted = [...data.history].reverse();
  list.innerHTML = sorted.map(item => {
    const icon = item.decision === 'megsporolom' ? '💚' : '💸';
    const cls = item.decision === 'megsporolom' ? 'saved' : 'spent';
    const date = new Date(item.ts).toLocaleDateString('hu-HU');
    return `
      <div class="card history-item ${cls}">
        <div class="history-icon">${icon}</div>
        <div class="history-content">
          <h3>${escapeHtml(item.product)}</h3>
          <p>${item.price.toLocaleString('hu-HU')} Ft • ${item.hours} óra • ${date}</p>
        </div>
      </div>
    `;
  }).join('');
  
  track('history_loaded', { count: data.history.length });
}

// ============================================
// STATS
// ============================================

function calcStreak(data){
  if(!data.history.length) return 0;
  const sorted = [...data.history].sort((a,b)=> b.ts - a.ts);
  const today = new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();
  
  const latest = new Date(sorted[0].ts).toDateString();
  if(latest !== today && latest !== yesterdayStr) return 0;
  
  let streak = 0;
  let checkDate = new Date();
  
  for(let i = 0; i < 365; i++){
    const dateStr = checkDate.toDateString();
    const hasEntry = sorted.some(item => new Date(item.ts).toDateString() === dateStr);
    if(!hasEntry) break;
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  
  return streak;
}

function loadStats(){
  const data = loadData();
  
  const saved = data.history.filter(i=> i.decision === 'megsporolom');
  const spent = data.history.filter(i=> i.decision === 'megveszem');
  const total = data.history.length;
  const ratio = total ? Math.round((saved.length / total) * 100) : 0;
  
  const ratioEl = document.getElementById('ratio');
  ratioEl.innerText = ratio + '%';
  ratioEl.classList.remove('pulse'); 
  void ratioEl.offsetWidth; 
  ratioEl.classList.add('pulse');
  
  const ratioCircle = document.getElementById('ratioCircle');
  if(ratioCircle){ ratioCircle.style.setProperty('--progress', (ratio * 3.6) + 'deg'); }
  
  const savedHours = saved.reduce((sum,i)=> sum + Number(i.hours), 0);
  const spentHours = spent.reduce((sum,i)=> sum + Number(i.hours), 0);
  const streak = calcStreak(data);
  
  document.getElementById('savedHours').innerText = savedHours.toFixed(1);
  document.getElementById('spentHours').innerText = spentHours.toFixed(1);
  document.getElementById('totalDecisions').innerText = total;
  document.getElementById('streak').innerText = streak;
  document.getElementById('dailyQuote').innerText = quotes[Math.floor(Math.random()*quotes.length)];
  
  const weeklyChart = document.getElementById('weeklyChart');
  weeklyChart.innerHTML = '';
  const days = ['H','K','Sze','Cs','P','Szo','V'];
  const now = new Date();
  const dayCounts = [];
  
  for(let i=6;i>=0;i--){
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = d.toDateString();
    const count = data.history.filter(item => new Date(item.ts).toDateString() === dayStr).length;
    dayCounts.push(count);
  }
  
  const maxCount = Math.max(...dayCounts, 1);
  dayCounts.forEach((count, idx) => {
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${(count / maxCount) * 100}%`;
    bar.innerHTML = `<div class="chart-label">${days[idx]}</div>`;
    bar.title = `${count} döntés`;
    weeklyChart.appendChild(bar);
  });

  const grid = document.getElementById('achievementsGrid');
  grid.innerHTML = '';
  achievements.forEach(ach => {
    const unlocked = ach.condition(data);
    const div = document.createElement('div');
    div.className = `achievement ${unlocked ? 'unlocked' : 'locked'}`;
    div.innerHTML = `
      <div class="achievement-icon">${ach.icon}</div>
      <div class="achievement-title">${ach.title}</div>
      <div class="achievement-desc">${ach.desc}</div>
    `;
    grid.appendChild(div);
  });
  
  track('stats_loaded', { total, ratio, savedHours, spentHours, streak });
}

// ============================================
// SHARE WIDGET
// ============================================

function initShareWidget(){
  const dismissed = sessionStorage.getItem(SHARE_WIDGET_KEY);
  if(!dismissed && inviteValidated){
    setTimeout(() => {
      const widget = document.getElementById('shareWidget');
      if(widget && !sessionStorage.getItem(SHARE_WIDGET_KEY)){
        widget.classList.add('show');
        track('share_widget_shown');
      }
    }, 15000);
  }
}

function closeShareWidget(event){
  event.stopPropagation();
  const widget = document.getElementById('shareWidget');
  if(widget){
    widget.classList.remove('show');
    sessionStorage.setItem(SHARE_WIDGET_KEY, 'true');
    track('share_widget_dismissed');
  }
}

async function handleShare(){
  const shareText = `${SHARE_MESSAGE}\n\n${APP_URL}`;
  
  try {
    await navigator.clipboard.writeText(shareText);
    track('share_clipboard_success');
    
    const bubble = document.querySelector('.share-bubble');
    const originalText = bubble.innerHTML;
    bubble.innerHTML = `
      <div class="share-icon">✅</div>
      <div class="share-text">
        Link másolva!
        <small>Illeszd be bárhova</small>
      </div>
    `;
    
    setTimeout(() => {
      bubble.innerHTML = originalText;
    }, 2000);
  } catch(err) {
    console.error('Clipboard error:', err);
  }

  if(navigator.share){
    try {
      await navigator.share({
        title: 'Munkaóra App',
        text: SHARE_MESSAGE,
        url: APP_URL
      });
      track('share_native_success');
    } catch(err) {
      if(err.name !== 'AbortError'){
        console.error('Share error:', err);
      }
    }
  }
}

// ============================================
// VERSION CHECK
// ============================================

function checkVersion(){
  try{
    const lastVersion = localStorage.getItem(VERSION_KEY);
    if(lastVersion && lastVersion !== APP_VERSION){
      document.getElementById('version-banner').classList.remove('hidden');
      track('new_version_available', { from: lastVersion, to: APP_VERSION });
    } else if(!lastVersion){
      localStorage.setItem(VERSION_KEY, APP_VERSION);
    }
  }catch(e){
    console.error('Version check failed:', e);
  }
}

function reloadApp(){
  localStorage.setItem(VERSION_KEY, APP_VERSION);
  track('version_updated', { version: APP_VERSION });
  window.location.reload();
}

// ============================================
// PWA SERVICE WORKER
// ============================================

let registration;
let newWorker;

function initServiceWorker(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        registration = reg;
        console.log('✅ Service Worker regisztrálva');
        
        // Ellenőrizzük van-e új verzió
        reg.addEventListener('updatefound', () => {
          newWorker = reg.installing;
          console.log('🔄 Új Service Worker települ...');
          
          newWorker.addEventListener('statechange', () => {
            if(newWorker.state === 'installed' && navigator.serviceWorker.controller){
              // Van új verzió!
              showUpdateBanner();
            }
          });
        });
        
        // Periodikus update check (óránként)
        setInterval(() => {
          reg.update();
        }, 60 * 60 * 1000);
      })
      .catch(err => {
        console.error('❌ Service Worker hiba:', err);
      });
      
    // Figyelés controller változására
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
}

function showUpdateBanner(){
  const banner = document.getElementById('update-banner');
  if(banner){
    banner.classList.remove('hidden');
    track('pwa_update_available');
  }
}

function updateApp(){
  if(newWorker){
    newWorker.postMessage({ type: 'SKIP_WAITING' });
    track('pwa_update_accepted');
  }
}

// ============================================
// INITIALIZATION
// ============================================

(function init(){
  const d = loadData();
  if(d.profile){
    document.getElementById('name').value = d.profile.name || '';
    document.getElementById('age').value = d.profile.age || '';
    document.getElementById('city').value = d.profile.city || '';
    document.getElementById('income').value = d.profile.income || '';
    document.getElementById('hours').value = d.profile.hoursPerWeek || '';
  }
  
  initSupabase();
  initInviteGate();
  initShareWidget();
  checkVersion();
  initServiceWorker();
  
  console.log('🚀 Munkaóra PWA betöltve - v' + APP_VERSION);
  console.log('👤 User ID:', getUserId());
})();
