// ============================================
// MUNKAÓRA PRO - v2.5 PWA
// ============================================

// Google Analytics
function track(name, params = {}) {
  if (window.gtag) window.gtag('event', name, params);
}

// ============================================
// CONSTANTS & DATA
// ============================================

const CURRENT_VERSION = 'v2.5';
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
    `Ez ${Math.round(hours/8)} munkanap! 📅`,
    `Ennyi idő alatt ${Math.round(hours*60/90)} filmet nézhetnél! 🎬`,
    `Vagy ${Math.round(hours)} óra olvasás könyvekkel! 📚`,
    `${Math.round(hours*60/30)} Netflix epizód! 📺`
  ];
  
  document.getElementById('result-box').style.display = 'block';
  document.getElementById('hoursResult').innerText = hours;
  document.getElementById('comparison').innerText = comparisons[Math.floor(Math.random()*comparisons.length)];
  currentProduct = product;
  currentPrice = price;
  currentHours = hours;
  track('calculation_done', { product, price, category: selectedCategory });
}

function saveDecision(type){
  if(!currentProduct){ alert('Előbb számoljunk!'); return; }
  const data = loadData();
  data.history.push({
    id: Date.now(),
    product: currentProduct,
    price: currentPrice,
    hours: currentHours,
    decision: type,
    category: selectedCategory,
    ts: new Date().toISOString()
  });
  saveData(data);
  track('decision_click', { decision: type, product: currentProduct, price: currentPrice });
  document.getElementById('result-box').style.display = 'none';
  document.getElementById('product').value = '';
  document.getElementById('price').value = '';
  selectedCategory = 'other';
  goTo('history');
}

// ============================================
// HISTORY
// ============================================

function loadHistory(){
  const list = document.getElementById('history-list');
  list.innerHTML = '';
  const data = loadData();
  if(data.history.length === 0){
    list.innerHTML = '<div class="card" style="text-align:center;"><p>📭 Még nincs adatod.</p><button class="btn-secondary" onclick="goTo(\'calculator\')">🚀 Indíts kalkulációt</button></div>';
    track('history_empty_view');
    return;
  }
  [...data.history].reverse().forEach(item=>{
    const el = document.createElement('div');
    el.className = 'history-item ' + (item.decision === 'megsporolom' ? 'green' : 'red');
    el.innerHTML =
      '<strong>' + escapeHtml(item.product) + '</strong>' +
      '<span>' + Number(item.price).toLocaleString('hu-HU') + ' Ft</span><br>' +
      '<small>' + item.hours + ' óra • ' + new Date(item.ts).toLocaleDateString('hu-HU') + '</small>';
    list.appendChild(el);
  });
  track('history_loaded', { count: data.history.length });
}

// ============================================
// STATS
// ============================================

function calcStreak(data){
  if(!data.history.length)return 0;
  const sorted = [...data.history].sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  let streak=1;
  for(let i=1;i<sorted.length;i++){
    const d1=new Date(sorted[i-1].ts).toDateString();
    const d2=new Date(sorted[i].ts).toDateString();
    const diff = (new Date(d1)-new Date(d2))/(1000*60*60*24);
    if(diff<=1)streak++;
    else break;
  }
  return streak;
}

function loadStats(){
  const data = loadData();
  const saved = data.history.filter(i => i.decision === 'megsporolom');
  const spent = data.history.filter(i => i.decision === 'megveszem');
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

function exportData(){
  const data = loadData();
  if(!data.history.length){
    alert('Nincs exportálható adat!');
    return;
  }
  let csv = 'Dátum,Termék,Ár,Óra,Döntés,Kategória\n';
  data.history.forEach(i => {
    csv += `${new Date(i.ts).toLocaleString('hu-HU')},"${i.product}",${i.price},${i.hours},${i.decision},${i.category}\n`;
  });
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `munkaora_export_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  track('data_exported');
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
    if(lastVersion && lastVersion !== CURRENT_VERSION){
      document.getElementById('version-banner').classList.remove('hidden');
      track('new_version_available', { from: lastVersion, to: CURRENT_VERSION });
    } else if(!lastVersion){
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    }
  }catch(e){
    console.error('Version check failed:', e);
  }
}

function reloadApp(){
  localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
  track('version_updated', { version: CURRENT_VERSION });
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
  
  initInviteGate();
  initShareWidget();
  checkVersion();
  initServiceWorker();
  
  console.log('🚀 Munkaóra PWA betöltve - ' + CURRENT_VERSION);
})();
