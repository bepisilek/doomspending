// ============================================
// MUNKAÓRA PRO v10.0 - GOALS & ONBOARDING
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
      
      // Check current session
      checkSession();
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
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
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
  // Basic email validation
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

async function handleSignup() {
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
  const marketingConsent = document.getElementById('marketingConsent').checked;
  const statusEl = document.getElementById('signupStatus');
  
  // Validation
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
    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      }
    });
    
    if (error) throw error;
    
    // Save marketing consent
    hasMarketingConsent = marketingConsent;
    if (data.user) {
      await saveMarketingConsent(data.user.id, marketingConsent);
    }
    
    updateAuthStatus(statusEl, '✅ Regisztráció sikeres! Ellenőrizd az email fiókodat a megerősítéshez.', 'success');
    track('signup_success', { marketing_consent: marketingConsent });
    
    // Clear form
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
    
    // Clear form
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    
    handleAuthSuccess();
    
  } catch (error) {
    console.error('Login error:', error);
    updateAuthStatus(statusEl, `❌ Hiba: ${error.message}`, 'error');
    track('login_error');
  }
}

async function handleLogout() {
  if (!ensureSupabaseReady()) {
    return;
  }

  // Bezárjuk a sidebart, ha nyitva van
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
  // Hide auth screen, show app
  const nav = document.getElementById('main-nav');
  if (nav) nav.classList.add('show');
  
  // Update user email display in Sidebar Profile
  const userEmailEl = document.getElementById('userEmail');
  if (userEmailEl && currentUser) {
    userEmailEl.textContent = currentUser.email;
  }
  
  // Load profile data into both profile forms
  loadProfileData('sidebar');
  loadProfileData('onboarding');
  
  // Check if profile is complete
  const data = loadData();
  const hasProfile = data.profile && data.profile.income && data.profile.hoursPerWeek;
  
  // Go to calculator if profile exists, otherwise to onboarding/profile (kényszerített)
  if (hasProfile && data.profile.income > 0 && data.profile.hoursPerWeek > 0) {
    goTo('calculator');
  } else {
    // Kényszerített onboarding/profil kitöltés
    goTo('onboarding');
  }
  
  track('auth_success');
}

function handleSignout() {
  showAuthScreen();
  
  // Clear local data (optional - de a Supabase miatt bent hagyjuk)
  const data = loadData();
  data.profile = {};
  data.history = [];
  data.goals = []; // Új: Goals törlése kijelentkezéskor
  saveData(data);
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
      category: DEFAULT_CATEGORY, // Kategória manuális rögzítése kihagyva
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

let memoryStore = createEmptyStore();

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

function toFiniteNumber(value, fallback = 0){
  const num = Number(value);
  // A NaN vagy Infinity (nulla osztás) eseteket is kezeli
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
    // Alapvető írásjelek kizárása (szó, vagy kategória)
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
    category: DEFAULT_CATEGORY, // Kategória manuális rögzítése kihagyva
    ts: Number.isFinite(Number(normalizedEntry.ts)) ? Number(normalizedEntry.ts) : Date.now()
  };
}

function sanitizeGoalEntry(entry = {}){
  const normalizedEntry = entry && typeof entry === 'object' ? entry : {};
  return {
    id: normalizedEntry.id || crypto.randomUUID(), // Egyedi azonosító
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

// Numerikus input védelem (PWA stabilitás kulcsa)
function setupNumericInputs(){
  const numericInputs = document.querySelectorAll('input[data-numeric]');
  
  numericInputs.forEach(input => {
    const allowFloat = input.dataset.numeric === 'float';
    
    // Keydown esemény - megelőzés
    input.addEventListener('keydown', (e) => {
      const key = e.key;
      
      // Engedd a navigációs billentyűket
      if (
        key === 'Backspace' || 
        key === 'Delete' || 
        key === 'Tab' || 
        key === 'ArrowLeft' || 
        key === 'ArrowRight' ||
        key === 'Home' ||
        key === 'End' ||
        (e.ctrlKey && (key === 'a' || key === 'c' || key === 'v' || key === 'x')) ||
        (e.metaKey && (key === 'a' || key === 'c' || key === 'v' || key === 'x')) // Mac OS
      ) {
        return;
      }
      
      // Engedd a számokat
      if (key >= '0' && key <= '9') {
        return;
      }
      
      // Engedd a pontot/vesszőt float esetén
      if (allowFloat && (key === '.' || key === ',')) {
        const currentValue = input.value;
        // Csak akkor engedjük, ha még nincs pont VAGY vessző
        if (!currentValue.includes('.') && !currentValue.includes(',')) {
          return;
        }
      }
      
      // Minden mást blokkoljunk
      e.preventDefault();
    });
    
    // Input esemény - tisztítás
    input.addEventListener('input', (e) => {
      let value = e.target.value;
      
      if (allowFloat) {
        value = value.replace(',', '.');
        value = value.replace(/[^0-9.]/g, '');
        const parts = value.split('.');
        // Csak az első pontot engedjük meg
        if (parts.length > 2) {
          value = parts[0] + '.' + parts.slice(1).join('');
        }
      } else {
        value = value.replace(/[^0-9]/g, '');
      }
      
      e.target.value = value;
    });
    
    // Paste esemény - tisztítás
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
  try {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage unavailable');
    }

    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      memoryStore = createEmptyStore();
      return cloneStore(memoryStore);
    }

    const parsed = JSON.parse(raw);
    const normalized = {
      profile: typeof parsed?.profile === 'object' && parsed.profile !== null ? parsed.profile : {},
      history: Array.isArray(parsed?.history) ? parsed.history.map(sanitizeHistoryEntry) : [],
      goals: Array.isArray(parsed?.goals) ? parsed.goals.map(sanitizeGoalEntry) : [] // Új: Goals betöltése
    };

    memoryStore = normalized;
    return cloneStore(normalized);
  } catch (error) {
    if (error?.message !== 'localStorage unavailable') {
      console.warn('⚠️ LocalStorage betöltési hiba, memória tárolóra esünk vissza.', error);
    }

    if (!memoryStore) {
      memoryStore = createEmptyStore();
    }

    return cloneStore(memoryStore);
  }
}

function saveData(data){
  const normalized = {
    profile: typeof data?.profile === 'object' && data.profile !== null ? data.profile : {},
    history: Array.isArray(data?.history) ? data.history.map(sanitizeHistoryEntry) : [],
    goals: Array.isArray(data?.goals) ? data.goals.map(sanitizeGoalEntry) : [] // Új: Goals mentése
  };

  memoryStore = normalized;

  try {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage unavailable');
    }

    localStorage.setItem(STORE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.warn('⚠️ LocalStorage írási hiba, adatok csak memóriában elérhetőek.', error);
  }
}

function loadProfileData(location = 'sidebar'){
  const d = loadData();
  const p = d.profile || {};
  
  // A sidebáron belül frissítjük a láthatatlan inputokat is
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
  return toFiniteNumber(parsed, 0); // Biztonsági konverzió
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

function toggleSidebarMenu(){
  const sidebar = document.getElementById('sidebarMenu');
  if (sidebar) {
    if (sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      document.body.style.overflow = ''; // Visszaállítjuk a scroll-t
      track('menu_closed');
    } else {
      loadProfileData('sidebar'); // Mindig friss adatokkal nyitjuk
      sidebar.classList.add('open');
      // Nem tiltjuk le a body scroll-t, mert a sidebár saját scroll-t használ.
      // document.body.style.overflow = 'hidden'; 
      track('menu_opened');
      
      // FIX: Ha a profil accordion nincs nyitva, nyissuk ki, amikor megnyitja a menüt.
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
  
  // Sidebar bezárása navigációkor
  const sidebar = document.getElementById('sidebarMenu');
  if (sidebar && sidebar.classList.contains('open')) {
      toggleSidebarMenu();
  }

  // FIX: Késleltetés a visual flicker minimalizálására
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
  }, 50); // 50ms késleltetés a smoothabb átmenetért
}

// ============================================
// PROFILE & ONBOARDING
// ============================================

function saveProfile(){
  // Ez a funkció a SIDEBAR-ból fut
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
  // Sikeres mentés után becsukjuk a profil accordiont
  const profileDetails = document.getElementById('sidebarProfileDetails');
  if (profileDetails) profileDetails.open = false;
  
  loadProfileData('onboarding'); 
  loadStats(); 
}

function saveOnboardingProfile(){
  // Ez a funkció az ONBOARDING képernyőből fut
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
  
  // Frissítjük a másik (sidebar) űrlapot is a friss adatokkal
  loadProfileData('sidebar'); 
  
  // Átlépünk a kalkulátorra
  goTo('calculator');
}

// ============================================
// CALCULATOR
// ============================================

function calculate(){
  const data = loadData();
  const p = data.profile;
  // A profil validálása: Megfelelő-e a kényszerített onboarding után?
  if(!p.income || !p.hoursPerWeek || p.income <= 0 || p.hoursPerWeek <= 0){
    alert('Előbb add meg helyesen a profilod adataidat a kezdéshez!');
    goTo('onboarding'); // Visszaküldjük a kényszerített kitöltésre
    return;
  }
  const product = sanitizeTextInput(document.getElementById('product').value, { maxLength: MAX_PRODUCT_LENGTH });
  const price = parseNumberInput(document.getElementById('price').value);
  if(!product || !price){
    alert('Add meg a termék nevét és árát!');
    return;
  }

  // Havi átlagos hetek száma: kb. 4.33, de a kód 4-et használ, ami a legegyszerűbb havi számítás (inkább hagyjuk a 4-et)
  const hourly = p.income / (p.hoursPerWeek * 4); 
  if(!hourly || !isFinite(hourly)){ // isFinite kell a 0 osztás elkerülésére
    alert('Előbb add meg helyesen a profil adataid!');
    goTo('onboarding'); // Visszaküldjük a kényszerített kitöltésre
    return;
  }

  const hoursValue = price / hourly;
  // Kerekítés: Egy tizedesjegyre
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
  
  // A legújabb kerül a tömb végére
  data.history.push(decisionData);
  saveData(data);
  sendDecisionToSupabase(decisionData);
  
  document.getElementById('product').value =
