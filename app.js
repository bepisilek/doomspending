// ============================================
// MUNKAÓRA PRO v10.1 - GOALS & ONBOARDING + LOGIN FIX + SIDEBAR ENHANCEMENTS
// ============================================

// Google Analytics
function track(name, params = {}) {
  if (window.gtag) window.gtag('event', name, params);
}

// ============================================
// SUPABASE SETUP
// ============================================

const SUPABASE_URL = 'https://twdauagksibhuafvdctw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3ZGF1YWdrc2liaHVhZnZkY3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NjcyMzQsImV4cCI6MjA3ODU0MzIzNH0.nK-REIO-yP6mfcHSwHgVCZvzLUq4Q96Bpm-WnlUgoL0';

let supabase = null;
let currentUser = null;
let hasMarketingConsent = false;

function ensureSupabaseReady(statusElement){
  if (supabase) return true;

  const fallbackMessage = 'Az azonosítási szolgáltatás jelenleg nem érhető el. Kérlek frissítsd az oldalt, majd próbáld újra.';
  if (statusElement) {
    updateAuthStatus(statusElement, `❌ ${fallbackMessage}`, 'error');
  } else {
    alert(fallbackMessage);
  }

  console.warn('Supabase kliens nem érhető el.');
  return false;
}

function initSupabase() {
  try {
    if (window.supabase && window.supabase.createClient) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Supabase client inicializálva');
      
      // Auth state change listener
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('[AUTH] Event:', event, 'Session:', !!session);
        currentUser = session?.user || null;
        
        if (event === 'SIGNED_IN') {
          handleAuthSuccess();
        } else if (event === 'SIGNED_OUT') {
          handleSignout();
        }
      });
      
    } else {
      console.error('❌ Supabase könyvtár nem tölthető be. Ellenőrizd a CDN elérhetőségét.');
    }
  } catch (error) {
    console.error('❌ Supabase init hiba:', error);
  }
}

async function checkSession() {
  if (!supabase) {
    console.warn('⚠️ Supabase kliens nem elérhető session ellenőrzéshez.');
    showAuthScreen();
    return;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    if (session) {
      currentUser = session.user;
      console.log('✅ Aktív session:', currentUser.email);
      await loadMarketingConsent();
      handleAuthSuccess();
    } else {
      console.log('⚠️ Nincs aktív session');
      showAuthScreen();
    }
  } catch (error) {
    console.error('❌ Session check hiba:', error);
    showAuthScreen();
  }
}

async function loadMarketingConsent() {
  if (!currentUser || !supabase) {
    return false;
  }
  
  try {
    const { data, error } = await supabase
      .from('marketing_consents')
      .select('has_consent')
      .eq('user_id', currentUser.id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Marketing consent load error:', error);
      return false;
    }
    
    hasMarketingConsent = data?.has_consent || false;
    console.log('✅ Marketing consent:', hasMarketingConsent);
    return hasMarketingConsent;
  } catch (error) {
    console.error('❌ Marketing consent hiba:', error);
    return false;
  }
}

// ============================================
// AUTH FUNCTIONS
// ============================================

function switchAuthTab(tab) {
  const signupTab = document.getElementById('tabSignup');
  const loginTab = document.getElementById('tabLogin');
  const signupForm = document.getElementById('signupForm');
  const loginForm = document.getElementById('loginForm');
  
  if (tab === 'signup') {
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  } else {
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
  }
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

async function handleSignup() {
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
  const marketingConsent = document.getElementById('marketingConsent').checked;
  const statusEl = document.getElementById('signupStatus');
  
  if (!email || !password) {
    updateAuthStatus(statusEl, '❌ Email és jelszó megadása kötelező!', 'error');
    return;
  }
  
  if (!validateEmail(email)) {
    updateAuthStatus(statusEl, '❌ Érvénytelen email cím formátum!', 'error');
    return;
  }
  
  if (password.length < 6) {
    updateAuthStatus(statusEl, '❌ A jelszónak legalább 6 karakter hosszúnak kell lennie!', 'error');
    return;
  }
  
  if (password !== passwordConfirm) {
    updateAuthStatus(statusEl, '❌ A jelszavak nem egyeznek!', 'error');
    return;
  }

  if (!ensureSupabaseReady(statusEl)) {
    return;
  }

  updateAuthStatus(statusEl, '⏳ Regisztráció folyamatban...', 'info');
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      }
    });
    
    if (error) throw error;
    
    hasMarketingConsent = marketingConsent;
    if (data.user) {
      await saveMarketingConsent(data.user.id, marketingConsent);
    }
    
    updateAuthStatus(statusEl, '✅ Regisztráció sikeres! Ellenőrizd az email fiókodat a megerősítéshez.', 'success');
    track('signup_success', { marketing_consent: marketingConsent });
    
    document.getElementById('signupEmail').value = '';
    document.getElementById('signupPassword').value = '';
    document.getElementById('signupPasswordConfirm').value = '';
    document.getElementById('marketingConsent').checked = false;
    
  } catch (error) {
    console.error('Signup error:', error);
    updateAuthStatus(statusEl, `❌ Hiba: ${error.message}`, 'error');
    track('signup_error');
  }
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const statusEl = document.getElementById('loginStatus');
  
  if (!email || !password) {
    updateAuthStatus(statusEl, '❌ Email és jelszó megadása kötelező!', 'error');
    return;
  }
  
  if (!validateEmail(email)) {
    updateAuthStatus(statusEl, '❌ Érvénytelen email cím formátum!', 'error');
    return;
  }

  if (!ensureSupabaseReady(statusEl)) {
    return;
  }

  updateAuthStatus(statusEl, '⏳ Bejelentkezés...', 'info');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    currentUser = data.user;
    await loadMarketingConsent();
    
    updateAuthStatus(statusEl, '✅ Bejelentkezés sikeres!', 'success');
    track('login_success');
    
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    
    handleAuthSuccess();
    
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error.message.includes('Invalid login credentials') 
                        ? 'Hibás e-mail cím vagy jelszó.' 
                        : `Hiba: ${error.message}`;
                        
    updateAuthStatus(statusEl, `❌ ${errorMessage}`, 'error');
    track('login_error');
  }
}

async function handleLogout() {
  if (!ensureSupabaseReady()) {
    return;
  }

  const sidebar = document.getElementById('sidebarMenu');
  if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    currentUser = null;
    hasMarketingConsent = false;
    
    track('logout');
    console.log('✅ Kijelentkezés sikeres');
    
  } catch (error) {
    console.error('Logout error:', error);
    alert('Hiba a kijelentkezés során!');
  }
}

async function handleForgotPassword() {
  const email = document.getElementById('loginEmail').value.trim();
  const statusEl = document.getElementById('loginStatus');

  if (!email) {
    alert('Add meg az email címedet az email mezőben!');
    return;
  }
  
  if (!validateEmail(email)) {
    alert('Érvénytelen email cím formátum!');
    return;
  }

  if (!ensureSupabaseReady(statusEl)) {
    return;
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    
    if (error) throw error;
    
    alert('✅ Jelszó visszaállító email elküldve! Ellenőrizd az email fiókodat.');
    track('password_reset_requested');
    
  } catch (error) {
    console.error('Password reset error:', error);
    alert(`❌ Hiba: ${error.message}`);
  }
}

function handleAuthSuccess() {
  const nav = document.getElementById('main-nav');
  if (nav) nav.classList.add('show');
  
  const userEmailEl = document.getElementById('userEmail');
  if (userEmailEl && currentUser) {
    userEmailEl.textContent = currentUser.email;
  }
  
  loadProfileData('sidebar');
  loadProfileData('onboarding');
  
  const data = loadData();
  const hasProfile = data.profile && data.profile.income && data.profile.hoursPerWeek;
  
  if (hasProfile && data.profile.income > 0 && data.profile.hoursPerWeek > 0) {
    goTo('calculator');
  } else {
    goTo('onboarding');
  }
  
  track('auth_success');
}

function handleSignout() {
  showAuthScreen();
}

function showAuthScreen() {
  const nav = document.getElementById('main-nav');
  if (nav) nav.classList.remove('show');
  
  goTo('welcome');
}

function updateAuthStatus(element, message, status = 'info') {
  if (!element) return;
  element.textContent = message;
  element.setAttribute('data-status', status);
}

async function saveMarketingConsent(userId, consent) {
  if (!supabase) {
    return;
  }

  try {
    const { error } = await supabase
      .from('marketing_consents')
      .upsert({
        user_id: userId,
        has_consent: consent,
        consented_at: consent ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    
    if (error) throw error;
    
    console.log('✅ Marketing consent mentve:', consent);
  } catch (error) {
    console.error('❌ Marketing consent mentés hiba:', error);
  }
}

// ============================================
// ANALYTICS
// ============================================

async function sendProfileToSupabase(profileData) {
  if (!supabase || !currentUser || !hasMarketingConsent) {
    console.log('⚠️ Profil analytics nem küldve (nincs consent vagy user)');
    return;
  }

  try {
    const safeProfile = {
      age: toFiniteNumber(profileData?.age, null),
      city: sanitizeTextInput(profileData?.city || '', { maxLength: MAX_CITY_LENGTH }) || null,
      income: toFiniteNumber(profileData?.income, null),
      hoursPerWeek: toFiniteNumber(profileData?.hoursPerWeek, null)
    };

    const analyticsData = {
      user_id: currentUser.id,
      age: safeProfile.age,
      city: safeProfile.city,
      income: safeProfile.income,
      hours_per_week: safeProfile.hoursPerWeek,
      updated_at: new Date().toISOString()
    };
    
    await supabase
      .from('analytics_profiles')
      .upsert(analyticsData, { onConflict: 'user_id' });
    
    console.log('✅ Profil analytics elküldve');
  } catch (error) {
    console.error('❌ Supabase profil hiba:', error);
  }
}

async function sendDecisionToSupabase(decisionData) {
  if (!supabase || !currentUser) {
    console.log('⚠️ Döntés analytics nem küldve (nincs user)');
    return;
  }

  try {
    if (!ALLOWED_DECISIONS.has(decisionData.decision)) {
      console.warn('⚠️ Ismeretlen döntés típus, analytics küldés kihagyva.');
      return;
    }

    const safeProduct = sanitizeTextInput(decisionData.product || '', { maxLength: MAX_PRODUCT_LENGTH }) || 'Ismeretlen tétel';
    const safePrice = toFiniteNumber(decisionData.price, 0);
    const safeHours = toFiniteNumber(decisionData.hours, 0);

    const analyticsData = {
      user_id: currentUser.id,
      product: safeProduct,
      price: safePrice,
      hours: safeHours,
      decision: decisionData.decision,
      category: DEFAULT_CATEGORY,
      created_at: new Date().toISOString()
    };
    
    await supabase
      .from('analytics_decisions')
      .insert([analyticsData]);
    
    console.log('✅ Döntés analytics elküldve');
  } catch (error) {
    console.error('❌ Supabase döntés hiba:', error);
  }
}

// ============================================
// CONSTANTS
// ============================================

const VERSION_KEY = 'munkaora_version';
const STORE_KEY = 'munkaora_data';
const SHARE_WIDGET_KEY = 'munkaora_share_widget_dismissed';
const APP_URL = 'https://doomspending.vercel.app/';
const SHARE_MESSAGE = 'Ez az app lefordítja az árakat időre. Nézd meg!';

const ALLOWED_DECISIONS = new Set(['megsporolom', 'megveszem']);
const DEFAULT_CATEGORY = 'other';
const MAX_PRODUCT_LENGTH = 80;
const MAX_CITY_LENGTH = 80;
const MAX_GOAL_NAME_LENGTH = 40;

let memoryStore = {};

let currentProduct = null;
let currentPrice = 0;
let currentHours = 0;

const achievements = [
  {id:'first',title:'Első lépés',desc:'Első kalkuláció',icon:'🎯',condition:d=>d.history.length>=1},
  {id:'five',title:'Szorgalmas',desc:'5 döntés',icon:'💪',condition:d=>d.history.length>=5},
  {id:'saver',title:'Takarékos',desc:'5 spórolás',icon:'💰',condition:d=>d.history.filter(i=>i.decision==='megsporolom').length>=5},
  {id:'week',title:'Hét hős',desc:'7 napos sorozat',icon:'🔥',condition:d=>calcStreak(d)>=7},
  {id:'ten',title:'Veterán',desc:'10 döntés',icon:'🏆',condition:d=>d.history.length>=10},
  {id:'ratio',title:'Mester',desc:'70% spórolás',icon:'⭐',condition:d=>{const s=d.history.filter(i=>i.decision==='megsporolom').length;return d.history.length?s/d.history.length>=0.7:false;}}
];

const quotes = [
  'A spórolt időd a jövőbeni lehetőségeid tőkéje.',
  'Minden halasztott vásárlás tisztább gondolkodást épít.',
  'A pénzügyi fegyelem lassan nő, aztán egyszer csak látszik.',
  'A tudatos döntések csendesek, de később hangosan megtérülnek.',
  'A szabadság ott kezdődik, ahol a kényszerköltekezés véget ér.',
  'A jó döntéseket nem ünnepli senki, de a jövő meghálálja.',
  'A költekezés pillanatnyi öröm, a spórolás hosszú távú önbizalom.',
  'A jövőd szempontjából a kis megtartott döntések számítanak igazán.',
  'Minden el nem költött forint egy kicsivel kevesebb stressz.',
  'A türelem a leggazdagabb döntés.',
  'A pénzügyi béke következetességgel épül, nem sebességgel.',
  'A felelős döntések nem tiltások, hanem lehetőségek későbbre.'
];

// ============================================
// DATA MANAGEMENT
// ============================================

function createEmptyStore(){
  return { profile: {}, history: [], goals: [] };
}

function cloneStore(data){
  return JSON.parse(JSON.stringify(data || createEmptyStore()));
}

function getStoreKeyForUser(userId){
  if (!userId || typeof userId !== 'string') {
    return STORE_KEY;
  }
  return `${STORE_KEY}_${userId}`;
}

function getActiveStoreKey(){
  return getStoreKeyForUser(currentUser?.id);
}

function toFiniteNumber(value, fallback = 0){
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback; 
}

function sanitizeTextInput(value, { maxLength = 120, allowBasicPunctuation = true } = {}){
  if (value === undefined || value === null) return '';

  let sanitized = String(value);
  if (sanitized.normalize) {
    sanitized = sanitized.normalize('NFKC');
  }

  sanitized = sanitized.replace(/[\u0000-\u001F\u007F]/g, '');
  sanitized = sanitized.replace(/[<>]/g, '');
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  if (!allowBasicPunctuation) {
    sanitized = sanitized.replace(/[^\p{L}\p{N}\s-]/gu, '');
  }

  if (maxLength > 0) {
    sanitized = sanitized.slice(0, maxLength);
  }

  return sanitized;
}

function sanitizeHistoryEntry(entry = {}){
  const normalizedEntry = entry && typeof entry === 'object' ? entry : {};
  const safeDecision = ALLOWED_DECISIONS.has(normalizedEntry.decision) ? normalizedEntry.decision : 'megveszem';

  return {
    product: sanitizeTextInput(normalizedEntry.product || '', { maxLength: MAX_PRODUCT_LENGTH }),
    price: toFiniteNumber(normalizedEntry.price, 0),
    hours: toFiniteNumber(normalizedEntry.hours, 0),
    decision: safeDecision,
    category: DEFAULT_CATEGORY,
    ts: Number.isFinite(Number(normalizedEntry.ts)) ? Number(normalizedEntry.ts) : Date.now()
  };
}

function sanitizeGoalEntry(entry = {}){
  const normalizedEntry = entry && typeof entry === 'object' ? entry : {};
  return {
    id: normalizedEntry.id || crypto.randomUUID(),
    name: sanitizeTextInput(normalizedEntry.name || '', { maxLength: MAX_GOAL_NAME_LENGTH }),
    cost: toFiniteNumber(normalizedEntry.cost, 0),
    created: Number.isFinite(Number(normalizedEntry.created)) ? Number(normalizedEntry.created) : Date.now()
  };
}


function getValidHistoryEntries(data){
  if (!data || !Array.isArray(data.history)) {
    return [];
  }
  return data.history.filter(item => item && typeof item === 'object' && ALLOWED_DECISIONS.has(item.decision));
}

function getValidGoalEntries(data){
  if (!data || !Array.isArray(data.goals)) {
    return [];
  }
  return data.goals.map(sanitizeGoalEntry).filter(goal => goal.name && goal.cost > 0);
}

function setupNumericInputs(){
  const numericInputs = document.querySelectorAll('input[data-numeric]');
  
  numericInputs.forEach(input => {
    const allowFloat = input.dataset.numeric === 'float';
    
    input.addEventListener('keydown', (e) => {
      const key = e.key;
      
      if (
        key === 'Backspace' || 
        key === 'Delete' || 
        key === 'Tab' || 
        key === 'ArrowLeft' || 
        key === 'ArrowRight' ||
        key === 'Home' ||
        key === 'End' ||
        (e.ctrlKey && (key === 'a' || key === 'c' || key === 'v' || key === 'x')) ||
        (e.metaKey && (key === 'a' || key === 'c' || key === 'v' || key === 'x'))
      ) {
        return;
      }
      
      if (key >= '0' && key <= '9') {
        return;
      }
      
      if (allowFloat && (key === '.' || key === ',')) {
        const currentValue = input.value;
        if (!currentValue.includes('.') && !currentValue.includes(',')) {
          return;
        }
      }
      
      e.preventDefault();
    });
    
    input.addEventListener('input', (e) => {
      let value = e.target.value;
      
      if (allowFloat) {
        value = value.replace(',', '.');
        value = value.replace(/[^0-9.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) {
          value = parts[0] + '.' + parts.slice(1).join('');
        }
      } else {
        value = value.replace(/[^0-9]/g, '');
      }
      
      e.target.value = value;
    });
    
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      let pastedText = (e.clipboardData || window.clipboardData).getData('text');
      
      if (allowFloat) {
        pastedText = pastedText.replace(',', '.');
        pastedText = pastedText.replace(/[^0-9.]/g, '');
        const parts = pastedText.split('.');
        if (parts.length > 2) {
          pastedText = parts[0] + '.' + parts.slice(1).join('');
        }
      } else {
        pastedText = pastedText.replace(/[^0-9]/g, '');
      }
      
      document.execCommand('insertText', false, pastedText);
    });
  });
  
  console.log(`✅ ${numericInputs.length} numerikus input védve`);
}

function loadData(){
  const storeKey = getActiveStoreKey();
  const isUserSpecific = storeKey !== STORE_KEY;

  try {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage unavailable');
    }

    let raw = localStorage.getItem(storeKey);

    if (!raw && isUserSpecific) {
      const fallbackRaw = localStorage.getItem(STORE_KEY);
      if (fallbackRaw) {
        console.log('ℹ️ Felhasználóhoz kötött adat kulcs inicializálása.');
        raw = fallbackRaw;
        localStorage.setItem(storeKey, fallbackRaw);
      }
    }

    if (!raw) {
      memoryStore[storeKey] = createEmptyStore();
      return cloneStore(memoryStore[storeKey]);
    }

    const parsed = JSON.parse(raw);
    const normalized = {
      profile: typeof parsed?.profile === 'object' && parsed.profile !== null ? parsed.profile : {},
      history: Array.isArray(parsed?.history) ? parsed.history.map(sanitizeHistoryEntry) : [],
      goals: Array.isArray(parsed?.goals) ? parsed.goals.map(sanitizeGoalEntry) : []
    };

    memoryStore[storeKey] = normalized;
    return cloneStore(normalized);
  } catch (error) {
    if (error?.message !== 'localStorage unavailable') {
      console.warn('⚠️ LocalStorage betöltési hiba, memória tárolóra esünk vissza.', error);
    }

    if (!memoryStore[storeKey]) {
      memoryStore[storeKey] = createEmptyStore();
    }

    return cloneStore(memoryStore[storeKey]);
  }
}

function saveData(data){
  const storeKey = getActiveStoreKey();
  const normalized = {
    profile: typeof data?.profile === 'object' && data.profile !== null ? data.profile : {},
    history: Array.isArray(data?.history) ? data.history.map(sanitizeHistoryEntry) : [],
    goals: Array.isArray(data?.goals) ? data.goals.map(sanitizeGoalEntry) : []
  };

  memoryStore[storeKey] = normalized;

  try {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage unavailable');
    }

    localStorage.setItem(storeKey, JSON.stringify(normalized));
  } catch (error) {
    console.warn('⚠️ LocalStorage írási hiba, adatok csak memóriában elérhetőek.', error);
  }
}

function loadProfileData(location = 'sidebar'){
  const d = loadData();
  const p = d.profile || {};
  
  const ageEl = document.getElementById('age');
  const cityEl = document.getElementById('city');
  const incomeEl = document.getElementById('income');
  const hoursEl = document.getElementById('hours');
  
  const onboardingAgeEl = document.getElementById('onboardingAge');
  const onboardingCityEl = document.getElementById('onboardingCity');
  const onboardingIncomeEl = document.getElementById('onboardingIncome');
  const onboardingHoursEl = document.getElementById('onboardingHours');

  if (ageEl) ageEl.value = p.age || '';
  if (cityEl) cityEl.value = p.city || '';
  if (incomeEl) incomeEl.value = p.income || '';
  if (hoursEl) hoursEl.value = p.hoursPerWeek || '';
  
  if (onboardingAgeEl) onboardingAgeEl.value = p.age || '';
  if (onboardingCityEl) onboardingCityEl.value = p.city || '';
  if (onboardingIncomeEl) onboardingIncomeEl.value = p.income || '';
  if (onboardingHoursEl) onboardingHoursEl.value = p.hoursPerWeek || '';
}

function escapeHtml(str){
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function parseNumberInput(value, allowFloat = false){
  if(value === undefined || value === null) return 0;
  let normalized = String(value).trim();
  normalized = normalized.replace(/\s/g, '').replace(/,/g, '.');

  if(allowFloat){
    normalized = normalized.replace(/[^0-9.]/g, '');
    const firstDot = normalized.indexOf('.');
    if(firstDot !== -1){
      normalized = normalized.slice(0, firstDot + 1) + normalized.slice(firstDot + 1).replace(/\./g, '');
    }
  } else {
    normalized = normalized.replace(/[^0-9]/g, '');
  }

  if(!normalized) return 0;

  const parsed = allowFloat ? parseFloat(normalized) : parseInt(normalized, 10);
  return toFiniteNumber(parsed, 0);
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

// ÚJ: Verzió frissítés a sidebar-ban
function updateSidebarVersion(){
  const versionEl = document.getElementById('sidebarVersion');
  if (versionEl && window.APP_VERSION) {
    versionEl.textContent = `v${window.APP_VERSION}`;
  }
}

function toggleSidebarMenu(){
  const sidebar = document.getElementById('sidebarMenu');
  if (sidebar) {
    if (sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      document.body.style.overflow = '';
      track('menu_closed');
    } else {
      loadProfileData('sidebar');
      updateSidebarVersion(); // ÚJ: Verzió frissítés
      sidebar.classList.add('open');
      track('menu_opened');
      
      const profileDetails = document.getElementById('sidebarProfileDetails');
      if (profileDetails && !profileDetails.open) {
          profileDetails.open = true;
      }
    }
  }
}

function goTo(screen) {
  const target = document.getElementById(`screen-${screen}`);
  if (!target) {
    console.error("❌ Screen not found:", screen);
    return;
  }
  
  const sidebar = document.getElementById('sidebarMenu');
  if (sidebar && sidebar.classList.contains('open')) {
      toggleSidebarMenu();
  }

  setTimeout(() => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    target.classList.add('active');

    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    const nb = document.getElementById(`nav-${screen}`);
    if (nb) nb.classList.add('active');

    const nav = document.getElementById('main-nav');
    const showNav = currentUser && screen !== 'welcome' && screen !== 'onboarding';
    if (nav) {
      if (showNav) nav.classList.add('show');
      else nav.classList.remove('show');
    } 

    track('view_' + screen);

    if (screen === 'goals') loadGoals();
    if (screen === 'history') loadHistory();
    if (screen === 'stats') loadStats();
  }, 50);
}

// ============================================
// PROFILE & ONBOARDING
// ============================================

function saveProfile(){
  const data = loadData();
  const age = parseNumberInput(document.getElementById('age').value);
  const city = sanitizeTextInput(document.getElementById('city').value, { maxLength: MAX_CITY_LENGTH });
  const income = parseNumberInput(document.getElementById('income').value);
  const hoursPerWeek = parseNumberInput(document.getElementById('hours').value, true);

  if(!income || !hoursPerWeek){
    alert('Add meg a havi nettó jövedelmedet és a heti munkaóráid számát!');
    return;
  }
  
  if(income <= 0 || hoursPerWeek <= 0){
    alert('A jövedelemnek és a munkaóráknak pozitív számnak kell lennie!');
    return;
  }

  data.profile = { age, city, income, hoursPerWeek };
  saveData(data);
  sendProfileToSupabase(data.profile);
  track('profile_saved_sidebar');
  
  alert('✅ Profil sikeresen mentve!');
  const profileDetails = document.getElementById('sidebarProfileDetails');
  if (profileDetails) profileDetails.open = false;
  
  loadProfileData('onboarding'); 
  loadStats(); 
}

function saveOnboardingProfile(){
  const data = loadData();
  const age = parseNumberInput(document.getElementById('onboardingAge').value);
  const city = sanitizeTextInput(document.getElementById('onboardingCity').value, { maxLength: MAX_CITY_LENGTH });
  const income = parseNumberInput(document.getElementById('onboardingIncome').value);
  const hoursPerWeek = parseNumberInput(document.getElementById('onboardingHours').value, true);

  if(!income || !hoursPerWeek){
    alert('Kérlek, add meg a havi nettó jövedelmedet és a heti munkaóráid számát a továbblépéshez!');
    return;
  }
  
  if(income <= 0 || hoursPerWeek <= 0){
    alert('A jövedelemnek és a munkaóráknak pozitív számnak kell lennie!');
    return;
  }

  data.profile = { age, city, income, hoursPerWeek };
  saveData(data);
  sendProfileToSupabase(data.profile);
  track('profile_saved_onboarding');
  
  loadProfileData('sidebar'); 
  
  goTo('calculator');
}

// ============================================
// CALCULATOR
// ============================================

function calculate(){
  const data = loadData();
  const p = data.profile;
  if(!p.income || !p.hoursPerWeek || p.income <= 0 || p.hoursPerWeek <= 0){
    alert('Előbb add meg helyesen a profilod adataidat a kezdéshez!');
    goTo('onboarding');
    return;
  }
  const product = sanitizeTextInput(document.getElementById('product').value, { maxLength: MAX_PRODUCT_LENGTH });
  const price = parseNumberInput(document.getElementById('price').value);
  if(!product || !price){
    alert('Add meg a termék nevét és árát!');
    return;
  }

  const hourly = p.income / (p.hoursPerWeek * 4); 
  if(!hourly || !isFinite(hourly)){
    alert('Előbb add meg helyesen a profil adataid!');
    goTo('onboarding');
    return;
  }

  const hoursValue = price / hourly;
  const roundedHours = Math.round(hoursValue * 10) / 10; 

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
  let minDiff = Math.abs(roundedHours - closestComp.val);

  for(let c of comparisons){
    const diff = Math.abs(roundedHours - c.val);
    if(diff < minDiff){
      minDiff = diff;
      closestComp = c;
    }
  }

  document.getElementById('result-box').style.display = 'block';
  document.getElementById('hoursResult').innerText = roundedHours.toFixed(1);
  document.getElementById('comparison').innerText = `Ez kb. ${closestComp.text}`;

  currentProduct = product;
  currentPrice = price;
  currentHours = roundedHours;

  track('calculate', { product, price, hours: roundedHours });
}

function saveDecision(decision){
  if(!currentProduct){
    alert('Előbb végezz el egy kalkulációt!');
    return;
  }

  if (!ALLOWED_DECISIONS.has(decision)) {
    alert('Ismeretlen döntéstípus!');
    return;
  }

  const data = loadData();
  const decisionData = {
    product: currentProduct,
    price: currentPrice,
    hours: currentHours,
    decision,
    category: DEFAULT_CATEGORY, 
    ts: Date.now()
  };
  
  data.history.push(decisionData);
  saveData(data);
  sendDecisionToSupabase(decisionData);
  
  document.getElementById('product').value = '';
  document.getElementById('price').value = '';
  document.getElementById('result-box').style.display = 'none';
  
  currentProduct = null;
  currentPrice = 0;
  currentHours = 0;
  
  alert(decision === 'megsporolom' ? '💪 Szép munka!' : '🛒 Vásárlás rögzítve!');
  track('decision_saved', { decision });
  
  if(document.getElementById('nav-stats').classList.contains('active')) {
      loadStats();
  }
}

// ============================================
// GOALS
// ============================================

function addGoal(){
  const data = loadData();
  const name = sanitizeTextInput(document.getElementById('goalName').value, { maxLength: MAX_GOAL_NAME_LENGTH });
  const cost = parseNumberInput(document.getElementById('goalCost').value);

  if(!name || !cost || cost <= 0){
    alert('Kérlek adj meg egy nevet és egy pozitív költséget a célhoz!');
    return;
  }
  
  if (data.goals.length >= 5) {
      alert('Maximum 5 aktív cél lehet. Kérlek fejezz be vagy törölj egy régebbit!');
      return;
  }

  const newGoal = sanitizeGoalEntry({
      name,
      cost,
      created: Date.now()
  });
  
  data.goals.push(newGoal);
  saveData(data);
  loadGoals();
  
  document.getElementById('goalName').value = '';
  document.getElementById('goalCost').value = '';
  
  track('goal_added', { cost });
}

function removeGoal(goalId){
  if(!confirm('Biztosan törölni szeretnéd ezt a célt?')){
    return;
  }
  
  const data = loadData();
  const initialLength = data.goals.length;
  data.goals = data.goals.filter(goal => goal.id !== goalId);
  
  if (data.goals.length < initialLength) {
      saveData(data);
      loadGoals();
      loadStats();
      track('goal_removed');
  }
}

function loadGoals(){
  const data = loadData();
  const goals = getValidGoalEntries(data);
  const list = document.getElementById('goalsList');
  const totalSavedHUF = getSavedHUF(data);
  const totalSavedHours = getSavedHours(data);
  const hourlyRate = getHourlyRate(data.profile);
  
  document.getElementById('activeGoalsCount').innerText = goals.length;
  list.innerHTML = '';

  if(!goals.length){
    list.innerHTML = '<p class="goal-empty-state">Nincs még aktív célod. Spórolj valamiért!</p>';
    return;
  }

  goals.forEach(goal => {
    const progressHUF = Math.min(goal.cost, totalSavedHUF);
    const progressPercent = Math.min(100, Math.round((progressHUF / goal.cost) * 100));
    
    const hoursNeeded = Math.round((goal.cost / hourlyRate) * 10) / 10;
    const hoursProgress = Math.min(hoursNeeded, totalSavedHours);

    const isComplete = progressPercent >= 100;
    
    list.innerHTML += `
      <div class="goal-item ${isComplete ? 'goal-complete' : ''}">
        <div class="goal-title">
          <span>${escapeHtml(goal.name)} ${isComplete ? ' (🎉 KÉSZ!)' : ''}</span>
        </div>
        
        <div class="goal-progress-bar" style="--goal-progress: ${progressPercent}%">
          <div class="goal-progress-fill"></div>
        </div>
        
        <div class="goal-details">
          <span>${progressPercent}% kész</span>
          <span>${progressHUF.toLocaleString('hu-HU')} Ft / ${goal.cost.toLocaleString('hu-HU')} Ft</span>
        </div>
        
        <div class="goal-details">
          <span></span>
          <span>kb. ${hoursProgress.toFixed(1)} óra / ${hoursNeeded.toFixed(1)} óra</span>
        </div>
        
        <div class="goal-actions">
          <button class="goal-remove-btn" onclick="removeGoal('${goal.id}')" title="Törlés">🗑️</button>
        </div>
      </div>
    `;
  });
  
  track('goals_loaded', { count: goals.length });
}

function getSavedHUF(data){
    return getValidHistoryEntries(data)
        .filter(i => i.decision === 'megsporolom')
        .reduce((sum, i) => sum + toFiniteNumber(i.price, 0), 0);
}

function getSavedHours(data){
    return getValidHistoryEntries(data)
        .filter(i => i.decision === 'megsporolom')
        .reduce((sum, i) => sum + toFiniteNumber(i.hours, 0), 0);
}

function getHourlyRate(profile){
    const income = toFiniteNumber(profile.income, 0);
    const hours = toFiniteNumber(profile.hoursPerWeek, 0);
    if (income <= 0 || hours <= 0) return 1;
    return income / (hours * 4);
}


// ============================================
// HISTORY
// ============================================

function loadHistory(){
  const data = loadData();
  const history = getValidHistoryEntries(data); 
  const list = document.getElementById('history-list');

  if(!history.length){
    list.innerHTML = '<div class="card"><p>Még nincs előzmény. Készíts egy kalkulációt!</p></div>';
    return;
  }

  const sorted = [...history].sort((a,b)=> b.ts - a.ts); 
  list.innerHTML = sorted.map(item => {
    const icon = item.decision === 'megsporolom' ? '💚' : '💸';
    const cls = item.decision === 'megsporolom' ? 'saved' : 'spent';
    const price = toFiniteNumber(item.price, 0);
    const hours = toFiniteNumber(item.hours, 0);
    const safeProduct = escapeHtml(sanitizeTextInput(item.product || '', { maxLength: MAX_PRODUCT_LENGTH }) || 'Ismeretlen tétel');
    
    let dateStr = '';
    try {
      const parsedDate = new Date(item.ts);
      dateStr = Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toLocaleDateString('hu-HU');
    } catch (e) {
      dateStr = '';
    }

    return `
      <div class="card history-item ${cls}">
        <div class="history-icon">${icon}</div>
        <div class="history-content">
          <h3>${safeProduct}</h3>
          <p>${price.toLocaleString('hu-HU')} Ft • ${hours.toFixed(1)} óra • ${dateStr}</p>
        </div>
      </div>
    `;
  }).join('');

  track('history_loaded', { count: history.length });
}

// ============================================
// STATS
// ============================================

function calcStreak(data){
  const history = getValidHistoryEntries(data);
  if(!history.length) return 0;
  
  const dates = new Set(history.map(item => new Date(item.ts).toDateString()));
  
  let streak = 0;
  let checkDate = new Date();
  
  for(let i = 0; i < 365; i++){
    const dateStr = checkDate.toDateString();
    
    if(dates.has(dateStr)){
      streak++;
      checkDate.setDate(checkDate.getDate() - 1); 
    } else {
      const latestEntryDateStr = new Date(Math.max(...history.map(h => h.ts))).toDateString();
      const todayStr = new Date().toDateString();
      
      if (latestEntryDateStr === todayStr && streak > 0) {
        return streak; 
      }
      
      if (latestEntryDateStr !== todayStr && streak > 0) {
        return streak;
      }
      
      return 0;
    }
  }
  
  return streak;
}

function loadStats(){
  const data = loadData();
  const history = getValidHistoryEntries(data);
  const goals = getValidGoalEntries(data);

  const saved = history.filter(i=> i.decision === 'megsporolom');
  const spent = history.filter(i=> i.decision === 'megveszem');
  const total = history.length;
  const ratio = total ? Math.round((saved.length / total) * 100) : 0;
  
  const ratioEl = document.getElementById('ratio');
  ratioEl.innerText = ratio + '%';
  ratioEl.classList.remove('pulse'); 
  void ratioEl.offsetWidth;
  ratioEl.classList.add('pulse');
  
  const ratioCircle = document.getElementById('ratioCircle');
  if(ratioCircle){ ratioCircle.style.setProperty('--progress', (ratio * 3.6) + 'deg'); }
  
  const savedHours = getSavedHours(data);
  const spentHours = spent.reduce((sum,i)=> sum + toFiniteNumber(i.hours, 0), 0);
  const streak = calcStreak(data);
  
  document.getElementById('savedHours').innerText = savedHours.toFixed(1);
  document.getElementById('spentHours').innerText = spentHours.toFixed(1);
  document.getElementById('totalDecisions').innerText = total;
  document.getElementById('streak').innerText = streak;
  
  const goalsCard = document.getElementById('goalsProgressCard');
  const goalsContent = document.getElementById('goalsProgressContent');
  goalsContent.innerHTML = '';
  
  if (goals.length > 0) {
    goalsCard.classList.remove('hidden');
    const totalSavedHUF = getSavedHUF(data);

    goals.forEach(goal => {
      const progressHUF = Math.min(goal.cost, totalSavedHUF);
      const progressPercent = Math.min(100, Math.round((progressHUF / goal.cost) * 100));
      const remaining = Math.max(0, goal.cost - totalSavedHUF);
      const isComplete = progressPercent >= 100;

      goalsContent.innerHTML += `
        <div class="goal-item ${isComplete ? 'goal-complete' : ''}" style="margin-bottom: 16px;">
          <div class="goal-title">
            <span>${escapeHtml(goal.name)}</span>
            <span style="font-size: 0.85rem; color: ${isComplete ? 'var(--success)' : 'var(--text)'}; font-weight: 700;">
              ${progressPercent}%
            </span>
          </div>
          <div class="goal-progress-bar" style="--goal-progress: ${progressPercent}%">
            <div class="goal-progress-fill"></div>
          </div>
          <div class="goal-details" style="margin-top: 4px;">
            <span>Összes spórolt: ${totalSavedHUF.toLocaleString('hu-HU')} Ft</span>
            <span>Hiányzik: ${remaining.toLocaleString('hu-HU')} Ft</span>
          </div>
        </div>
      `;
    });
  } else {
    goalsCard.classList.add('hidden');
  }
  
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
    const count = history.filter(item => new Date(item.ts).toDateString() === dayStr).length;
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
    div.title = unlocked ? ach.title + ': ' + ach.desc : 'Zárolva: ' + ach.desc;
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
  let dismissed = false;
  try {
    dismissed = sessionStorage.getItem(SHARE_WIDGET_KEY);
  } catch (error) {
    console.warn('⚠️ SessionStorage nem elérhető a megosztás widgethez.', error);
  }
  if(!dismissed && currentUser){ 
    setTimeout(() => {
      const widget = document.getElementById('shareWidget');
      let alreadyDismissed = false;
      try {
        alreadyDismissed = sessionStorage.getItem(SHARE_WIDGET_KEY);
      } catch (error) {
      }
      if(widget && !alreadyDismissed){
        widget.classList.add('show');
        track('share_widget_shown');
      }
    }, 15000);
  }
}

function closeShareWidget(event){
  if(event) event.stopPropagation(); 
  
  const widget = document.getElementById('shareWidget');
  if(widget){
    widget.classList.remove('show');
    try {
      sessionStorage.setItem(SHARE_WIDGET_KEY, 'true');
    } catch (error) {
      console.warn('⚠️ SessionStorage nem elérhető a megosztás widget mentéséhez.', error);
    }
    track('share_widget_dismissed');
  }
}

async function handleShare(){
  const shareText = `${SHARE_MESSAGE}\n\n${APP_URL}`;

  const bubble = document.querySelector('.share-bubble');

  if(navigator.share){
    try {
      await navigator.share({
        title: 'Munkaóra App',
        text: SHARE_MESSAGE,
        url: APP_URL
      });
      track('share_native_success');
      closeShareWidget();
      return;
    } catch(err) {
      if(err.name !== 'AbortError'){
        console.error('Share error (native):', err);
      }
    }
  }
  
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(shareText);
      track('share_clipboard_success');

      if (bubble) {
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
          closeShareWidget();
        }, 2000);
      }
    } catch(err) {
      console.error('Clipboard error:', err);
      alert('❌ Nem sikerült a linket a vágólapra másolni!');
    }
  } else {
    prompt("A megosztáshoz másold ki ezt a linket:", shareText);
    track('share_prompt_fallback');
  }
}

// ============================================
// VERSION MANAGEMENT
// ============================================

let bannerShown = false; 

function checkVersion(){
  try {
    const lastVersion = localStorage.getItem(VERSION_KEY);
    const currentVersion = window.APP_VERSION;
    
    console.log('[VERSION] 🔍 Check:', {last: lastVersion, current: currentVersion});
    
    if (!currentVersion) {
      console.error('[VERSION] ❌ APP_VERSION nem elérhető!');
      return;
    }

    if (!lastVersion) {
      localStorage.setItem(VERSION_KEY, currentVersion);
      console.log('[VERSION] ✅ Első futás, verzió mentve');
      return;
    }
    
    if (lastVersion !== currentVersion) {
      console.log('[VERSION] 🆕 Új verzió észlelve:', currentVersion);
      localStorage.setItem(VERSION_KEY, currentVersion);
      
      if (!bannerShown) {
         showUpdateBanner(); 
      }
      track('new_version_detected', { from: lastVersion, to: currentVersion });
    } else {
      console.log('[VERSION] ✅ Verzió aktuális, banner nem szükséges');
    }
  } catch (error) {
    console.error('[VERSION] ❌ Hiba a verzió ellenőrzésnél:', error);
  }
}

function showUpdateBanner(){
  if (bannerShown) {
    console.log('[VERSION] ⚠️ Banner már volt megjelenítve ebben a sessionben');
    return;
  }
  
  const banner = document.getElementById('update-banner');
  if (banner && banner.classList.contains('hidden')) {
    banner.classList.remove('hidden');
    bannerShown = true;
    console.log('[VERSION] 🎉 Banner megjelenítve');
  }
}

function reloadApp(){
  console.log('[VERSION] 🔄 Teljes újratöltés...');
  
  if (registration && registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  track('version_updated', { version: window.APP_VERSION });
  
  setTimeout(() => {
    window.location.reload(true);
  }, 500);
}

function manualVersionCheck(){
  console.log('[VERSION] 🔄 Manuális ellenőrzés...');
  
  if (registration) {
    registration.update();
  }
  
  const currentVersion = window.APP_VERSION;
  const lastVersion = localStorage.getItem(VERSION_KEY);
  
  if (lastVersion !== currentVersion) {
    showUpdateBanner();
  } else {
    alert(`✅ Már a legfrissebb verzión vagy!\n\nVerzió: v${currentVersion}`);
  }
  
  track('manual_version_check');
}

// ============================================
// SERVICE WORKER INIT
// ============================================

let registration;

function initServiceWorker(){
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ Service Worker nem támogatott');
    return;
  }
  
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('[SW] Üzenet érkezett:', event.data);
    
    if (event.data && event.data.type === 'NEW_VERSION') {
      const swVersion = event.data.version;
      const currentAppVersion = window.APP_VERSION;
      
      console.log('[SW] Verzió check:', {sw: swVersion, currentApp: currentAppVersion});
      
      if (swVersion !== currentAppVersion && !bannerShown) { 
        console.log('[SW] 🎉 Új verzió a SW-től:', swVersion);
        localStorage.setItem(VERSION_KEY, swVersion); 
        showUpdateBanner(); 
      } else {
        console.log('[SW] ✅ Verzió már aktuális vagy banner már megjelent');
      }
    }
  });
  
  navigator.serviceWorker.register('/sw.js', {
    updateViaCache: 'none'
  })
    .then(reg => {
      registration = reg;
      console.log('✅ Service Worker regisztrálva:', reg.scope);
      
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        console.log('🔄 Új SW települ...');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🎉 Új verzió telepítve (várakozik)!');
          }
        });
      });
      
      setInterval(() => {
        console.log('🔄 Periodikus SW update check...');
        reg.update();
      }, 5 * 60 * 1000); 
    })
    .catch(err => {
      console.error('❌ Service Worker regisztráció hiba:', err);
    });
  
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('🔄 Service Worker controller frissült!');
  });
}

// ============================================
// INITIALIZATION
// ============================================

(function init(){
  setupNumericInputs();
  
  initSupabase();
  
  initShareWidget();
  
  checkVersion();
  
  initServiceWorker();
  
  checkSession();

  const buildBadge = document.getElementById('build-badge');
  if(buildBadge && window.APP_VERSION){
    buildBadge.innerHTML = `
      v${window.APP_VERSION} PWA
      <button
        class="badge-refresh"
        onclick="manualVersionCheck()"
        title="Verzió ellenőrzés"
      >
        🔄
      </button>
    `;
  }
  
  console.log(`🚀 Munkaóra PRO v${window.APP_VERSION} betöltve`);
  console.log('🔐 Auth rendszer aktív');
})();
