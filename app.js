/* =======================================================================
   APP VERSION & CONFIG
   ======================================================================= */
const APP_VERSION = "2.7.0";

// SUPABASE CONFIG - KONFIGURÁLVA!
const SUPABASE_URL = "https://twdauagksibhuafvdctw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3ZGF1YWdrc2liaHVhZnZkY3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NjcyMzQsImV4cCI6MjA3ODU0MzIzNH0.nK-REIO-yP6mfcHSwHgVCZvzLUq4Q96Bpm-WnlUgoL0";

/* =======================================================================
   TINY HELPERS
   ======================================================================= */
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const esc=s=>(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const fmtFt=v=>new Intl.NumberFormat("hu-HU",{style:"currency",currency:"HUF",maximumFractionDigits:0}).format(Number(v||0));
const now=()=>Date.now();
const MONTHS=["01","02","03","04","05","06","07","08","09","10","11","12"];

/* =======================================================================
   SUPABASE CLIENT - ANONIMIZÁLT (NÉV NÉLKÜL!)
   ======================================================================= */
const Supabase = (() => {
  let client = null;
  let userId = null;
  let syncEnabled = false;

  const updateSyncStatus = (status) => {
    const indicator = $("#syncStatus");
    if (!indicator) return;
    
    indicator.classList.remove("syncing", "synced", "error");
    
    if (status === "syncing") {
      indicator.innerHTML = "⏳ Szinkronizálás...";
      indicator.classList.add("syncing");
    } else if (status === "synced") {
      indicator.innerHTML = "✅ Szinkronizálva";
      indicator.classList.add("synced");
      setTimeout(() => {
        indicator.innerHTML = "☁️ Cloud";
        indicator.classList.remove("synced");
      }, 2000);
    } else if (status === "error") {
      indicator.innerHTML = "⚠️ Hiba";
      indicator.classList.add("error");
    } else {
      indicator.innerHTML = "☁️ Offline";
    }
  };

  const init = async () => {
    try {
      if (typeof window.supabase === "undefined") {
        await loadSupabaseLib();
      }

      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      const { data: { session } } = await client.auth.getSession();
      
      if (session) {
        userId = session.user.id;
        syncEnabled = true;
        updateSyncStatus("synced");
        console.log("[Supabase] Connected, userId:", userId);
        return true;
      } else {
        const { data, error } = await client.auth.signInAnonymously();
        if (error) throw error;
        
        userId = data.user.id;
        syncEnabled = true;
        updateSyncStatus("synced");
        console.log("[Supabase] Anonymous user created:", userId);
        return true;
      }
    } catch (error) {
      console.error("[Supabase] Init error:", error);
      updateSyncStatus("error");
      return false;
    }
  };

  const loadSupabaseLib = () => {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  // Anonimizált adat előkészítése - NÉV NÉLKÜL!
  const anonymizeData = (data) => {
    const anonymized = {
      __schema: data.__schema,
      profile: {
        // CSAK anonimizált adatok - NÉV NINCS BENNE!
        age: data.profile?.age || null,
        salary: data.profile?.salary || null,
        hours: data.profile?.hours || null
      },
      saved: (data.saved || []).map(item => ({
        name: item.name, // Termék/szolgáltatás neve
        price: item.price,
        hours: item.hours,
        at: item.at,
        type: item.type
      })),
      spent: (data.spent || []).map(item => ({
        name: item.name,
        price: item.price,
        hours: item.hours,
        at: item.at,
        type: item.type
      })),
      goals: data.goals || { monthlyCap: 0, savingGoal: 0 },
      theme: data.theme || "light",
      synced_at: new Date().toISOString()
    };
    
    console.log("[Supabase] Anonymized data (no personal name):", anonymized);
    return anonymized;
  };

  const syncData = async (data) => {
    if (!syncEnabled || !client || !userId) {
      console.log("[Supabase] Sync disabled or not initialized");
      return false;
    }

    try {
      updateSyncStatus("syncing");
      
      // Anonimizáljuk az adatot - NÉV NÉLKÜL!
      const anonymizedData = anonymizeData(data);
      
      const syncPayload = {
        user_id: userId,
        data: anonymizedData,
        updated_at: new Date().toISOString()
      };

      const { error } = await client
        .from("user_data")
        .upsert(syncPayload, { onConflict: "user_id" });

      if (error) throw error;
      
      updateSyncStatus("synced");
      console.log("[Supabase] Data synced successfully (anonymized, no name)");
      return true;
    } catch (error) {
      console.error("[Supabase] Sync error:", error);
      updateSyncStatus("error");
      return false;
    }
  };

  const loadData = async () => {
    if (!syncEnabled || !client || !userId) {
      console.log("[Supabase] Load disabled or not initialized");
      return null;
    }

    try {
      updateSyncStatus("syncing");
      
      const { data, error } = await client
        .from("user_data")
        .select("data")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      updateSyncStatus("synced");
      return data?.data || null;
    } catch (error) {
      console.error("[Supabase] Load error:", error);
      updateSyncStatus("error");
      return null;
    }
  };

  return {
    init,
    syncData,
    loadData,
    isEnabled: () => syncEnabled,
    getUserId: () => userId
  };
})();

/* =======================================================================
   VERSION CHECK
   ======================================================================= */
const VersionManager = (() => {
  const STORAGE_KEY = "app_version";
  const CHECK_INTERVAL = 300000;
  let checkTimer = null;

  const getCurrentVersion = () => {
    return document.documentElement.getAttribute("data-app-version") || APP_VERSION;
  };

  const getStoredVersion = () => {
    return localStorage.getItem(STORAGE_KEY);
  };

  const setStoredVersion = (version) => {
    localStorage.setItem(STORAGE_KEY, version);
  };

  const showUpdateBanner = () => {
    const banner = $("#updateBanner");
    if (!banner) return;
    
    banner.classList.add("show");
    
    const updateBtn = $("#updateNow");
    const dismissBtn = $("#dismissUpdate");
    
    if(updateBtn) {
      updateBtn.addEventListener("click", () => {
        window.location.reload(true);
      }, { once: true });
    }
    
    if(dismissBtn) {
      dismissBtn.addEventListener("click", () => {
        banner.classList.remove("show");
        setStoredVersion(getCurrentVersion());
      }, { once: true });
    }
  };

  const checkVersion = () => {
    const currentVersion = getCurrentVersion();
    const storedVersion = getStoredVersion();
    
    console.log("[Version] Current:", currentVersion, "Stored:", storedVersion);
    
    if (!storedVersion) {
      setStoredVersion(currentVersion);
      return;
    }
    
    if (currentVersion !== storedVersion) {
      console.log("[Version] New version detected!");
      showUpdateBanner();
    }
  };

  const init = () => {
    checkVersion();
    checkTimer = setInterval(() => {
      checkVersion();
    }, CHECK_INTERVAL);
    
    const versionEl = $("#appVersion");
    if (versionEl) {
      versionEl.textContent = getCurrentVersion();
    }
  };

  const cleanup = () => {
    if (checkTimer) {
      clearInterval(checkTimer);
      checkTimer = null;
    }
  };

  return { init, cleanup, getCurrentVersion };
})();

/* =======================================================================
   DATA LAYER + MIGRATION
   ======================================================================= */
const schemaVersion=2;
const Data={
  get:(k)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch(e){return null}},
  set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}},
  del:(k)=>localStorage.removeItem(k),
  migrate(){
    const v=Data.get("__schema")||1;
    if(v<2){
      ["saved","spent"].forEach(key=>{
        const arr=Data.get(key)||[];
        arr.forEach(it=>{
          if(!it.at) it.at=now();
          if(it.name && typeof it.name!=="string") it.name=String(it.name);
          if(!it.type) it.type=key;
          if(typeof it.price!=="number") it.price=Number(it.price)||0;
          if(typeof it.hours!=="number") it.hours=Number(it.hours)||0;
        });
        Data.set(key,arr);
      });
      Data.set("__schema",2);
    }
  }
};

const API={
  profile:()=>Data.get("profile"),
  saveProfile:(p)=>{
    Data.set("profile",p);
    API.syncToCloud();
  },
  deleteProfile:()=>{
    ["profile","saved","spent","goals"].forEach(Data.del);
    API.syncToCloud();
  },
  list:(type)=>{
    const list=Data.get(type)||[];
    return list.map(it=>({...it,type:it.type||type}));
  },
  add:(type,item)=>{
    const list=Data.get(type)||[];
    const normalized={
      name:item.name||"",
      price:Number(item.price)||0,
      hours:Number(item.hours)||0,
      at:now(),
      type
    };
    list.unshift(normalized);
    Data.set(type,list);
    API.syncToCloud();
  },
  setList:(type,list)=>{
    const normalized=list.map(it=>({
      ...it,
      type:it.type||type,
      price:Number(it.price)||0,
      hours:Number(it.hours)||0
    }));
    Data.set(type,normalized);
    API.syncToCloud();
  },
  clearLists:()=>{
    Data.set("saved",[]);
    Data.set("spent",[]);
    API.syncToCloud();
  },
  theme:()=>{
    const savedTheme=localStorage.getItem("theme");
    if(savedTheme==="dark"||savedTheme==="light") return savedTheme;
    if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    return "light";
  },
  setTheme:(t)=>{
    const next=t==="dark"?"dark":"light";
    localStorage.setItem("theme",next);
    return next;
  },
  goals:()=>Data.get("goals")||{monthlyCap:0,savingGoal:0},
  saveGoals:(g)=>{
    Data.set("goals",g);
    API.syncToCloud();
  },
  exportAll:()=>({
    __schema:schemaVersion,
    profile:API.profile(),
    saved:API.list("saved"),
    spent:API.list("spent"),
    goals:API.goals(),
    theme:API.theme()
  }),
  importAll:(obj)=>{
    if(!obj||typeof obj!=="object") throw new Error("Érvénytelen JSON");
    if(obj.__schema && obj.__schema>schemaVersion) throw new Error("Újabb sémájú adat – frissítsd az appot!");
    if(obj.profile) Data.set("profile",obj.profile);
    if(Array.isArray(obj.saved)) Data.set("saved",obj.saved);
    if(Array.isArray(obj.spent)) Data.set("spent",obj.spent);
    if(obj.goals) Data.set("goals",obj.goals);
    if(obj.theme) API.setTheme(obj.theme);
    Data.set("__schema",schemaVersion);
    API.syncToCloud();
  },
  syncToCloud:()=>{
    if(Supabase.isEnabled()){
      const data=API.exportAll();
      Supabase.syncData(data);
    }
  },
  loadFromCloud:async()=>{
    if(!Supabase.isEnabled()) return false;
    
    const cloudData=await Supabase.loadData();
    if(cloudData){
      console.log("[API] Loading data from cloud (without name)");
      try {
        // Megtartjuk a LOCAL nevet, mert az NEM jön vissza a cloud-ból
        const localProfile = API.profile();
        const localName = localProfile?.name || "";
        
        // Betöltjük a cloud adatokat
        if(cloudData.profile) {
          // Hozzáadjuk a local nevet
          const mergedProfile = {
            ...cloudData.profile,
            name: localName // Local név megmarad!
          };
          Data.set("profile", mergedProfile);
        }
        
        if(Array.isArray(cloudData.saved)) Data.set("saved",cloudData.saved);
        if(Array.isArray(cloudData.spent)) Data.set("spent",cloudData.spent);
        if(cloudData.goals) Data.set("goals",cloudData.goals);
        if(cloudData.theme) API.setTheme(cloudData.theme);
        
        return true;
      } catch(error) {
        console.error("[API] Failed to import cloud data:", error);
        return false;
      }
    }
    return false;
  }
};

/* =======================================================================
   COACH BUBBLE CONTEXTUAL MESSAGES
   ======================================================================= */
const COACH_CONTEXTS={
  startup:[
    "Szia Lajos! Nézzük, mennyi időt dolgoztál a vágyaidért. ⏳",
    "Üdv újra, Lajos! Készen állsz egy kis pénzügyi matekra? 📈",
    "Szia Lajos! Mutasd, mire gyűjtöttél mostanában. 💼"
  ],
  save:[
    "Szépen spórolsz, Lajos! 💰",
    "Ez igen, újabb munkaóra megmentve! 🙌",
    "Szuper döntés, Lajos – így épül a tartalék. 🛡️",
    "Most tényleg közelebb kerültél a célodhoz! 🏁"
  ],
  spend:[
    "Hát ez most elment, de legalább hasznos volt. 😉",
    "Megérte? Gondold át legközelebb! 💸",
    "Egy kis öröm most, több munkaórád ment el. ⏱️",
    "Oké, Lajos, de holnap spórolós nap jön! 😅"
  ],
  results:[
    "Itt az eredmény, Lajos! 📊",
    "Nézd meg, mennyit haladtál! 🚀",
    "A számok nem hazudnak – ez a mérleged most. ⚖️",
    "Ez a teljesítményed összefoglalva. 📘"
  ]
};

const positiveMessages=[
  "Szia Lajos, most épp egy lépéssel közelebb vagy a szabadsághoz.",
  "Okos döntés, Lajos – még pár ilyen, és lesz nyaralásod is.",
  "Spórolni nem menő, csak hasznos – és te most hasznos vagy.",
  "A jövőbeli Lajos koccint rád egy ásványvízzel.",
  "A bankszámlád hálás, még ha nem is tud beszélni.",
  "Na látod, működik az önuralom, nem csak legenda.",
  "Lassan, de biztosan, Lajos – a türelem forintot terem.",
  "Egy kicsit most gazdagabb vagy, még ha csak lélekben is.",
  "Szia Lajos, ez volt a felnőtt élet első jele.",
  "Ha minden nap így döntesz, egyszer te leszel a motivációs poszt."
];

const negativeMessages=[
  "Megvetted? Szép. A pénztárcád sír, de legalább te boldog vagy.",
  "Szia Lajos, most megint eladtad a jövőd egy kávéért.",
  "Gratulálok, a célod most épp hátrébb lépett kettőt.",
  "Nem baj, legalább gazdagabb lettél tapasztalatban.",
  "A spórolás várhat – mondta még senki, aki elérte a célját.",
  "Lajos, a költekezés öröm – rövid távon.",
  "Még egy ilyen döntés, és a célod már csak mese lesz.",
  "Ha a pénz beszél, most épp azt mondta: viszlát.",
  "Jó választás lenne… egy másik univerzumban.",
  "Szia Lajos, a jövőbeli éned most épp kikapcsolta a Wi-Fit, hogy ne lássa ezt."
];

const UI={
  snackTimer:null,
  coachTimer:null,
  coachDelayTimer:null,
  actionMessageTimer:null,
  setTheme(theme){
    document.documentElement.setAttribute("data-theme",theme);
    const toggle=$("#themeToggle");
    if(toggle) toggle.checked=(theme==="dark");
    API.setTheme(theme);
  },
  snack(msg,withUndo,undoFn){
    const s=$("#snack");
    if(this.snackTimer){clearTimeout(this.snackTimer); this.snackTimer=null;}
    s.classList.remove("hidden"); s.innerHTML="";
    const t=document.createElement("span"); t.textContent=msg; s.appendChild(t);
    if(withUndo){
      const b=document.createElement("button");
      b.textContent="Visszavonás";
      b.addEventListener("click",()=>{
        if(undoFn) undoFn();
        s.classList.add("hidden");
        if(this.snackTimer){clearTimeout(this.snackTimer); this.snackTimer=null;}
      });
      s.appendChild(b);
    }
    this.snackTimer=setTimeout(()=>{
      s.classList.add("hidden");
      this.snackTimer=null;
    },3500);
  },
  coach(context,opts={}){
    const pool=COACH_CONTEXTS[context];
    if(!pool||!pool.length) return;
    const delay=Math.max(0,Number(opts.delay)||0);
    const duration=Math.max(1200,Number(opts.duration)||2800);
    const run=()=>{
      const b=$("#coach");
      if(!b) return;
      if(this.coachTimer){clearTimeout(this.coachTimer); this.coachTimer=null;}
      b.classList.remove("show");
      void b.offsetWidth;
      b.textContent=pool[Math.floor(Math.random()*pool.length)];
      b.classList.add("show");
      this.coachTimer=setTimeout(()=>{
        b.classList.remove("show");
        this.coachTimer=null;
      },duration);
    };
    if(this.coachDelayTimer){clearTimeout(this.coachDelayTimer); this.coachDelayTimer=null;}
    if(delay>0){
      this.coachDelayTimer=setTimeout(()=>{run(); this.coachDelayTimer=null;},delay);
    }else{
      run();
    }
  },
  showActionMessage(type){
    const target=$("#funnyThreat");
    if(!target) return;
    const messages=type==="positive"?positiveMessages:negativeMessages;
    const message=messages[Math.floor(Math.random()*messages.length)];
    if(this.actionMessageTimer){
      clearTimeout(this.actionMessageTimer);
      this.actionMessageTimer=null;
    }
    target.classList.remove("show");
    void target.offsetWidth;
    target.textContent=message;
    target.classList.add("show");
    this.actionMessageTimer=setTimeout(()=>{
      target.classList.remove("show");
      this.actionMessageTimer=null;
    },2800);
  }
};

const App={
  state:{view:"calc",search:"",filter:"all",sort:"date_desc",lastAction:null},
  async init(){
    console.log("[App] Initializing version", APP_VERSION);
    
    VersionManager.init();
    Data.migrate();
    
    const supabaseReady = await Supabase.init();
    
    if(supabaseReady){
      const loaded = await API.loadFromCloud();
      if(loaded){
        console.log("[App] Data loaded from cloud");
      }
    }
    
    this.bindWelcome();
    this.bindProfileSetup();
    this.bindTheme();
    this.bindTabs();
    this.bindCalculator();
    this.bindResults();
    this.bindGoals();
    this.bindProfileModal();
    this.bindShortcuts();
    
    UI.setTheme(API.theme());
    
    const p=API.profile();
    if(p){
      $("#welcomeScreen").classList.add("hidden");
      $("#appScreen").classList.remove("hidden");
      this.updateProfileIcon();
      this.syncCalcHello();
      UI.coach("startup",{delay:500});
    }
    
    this.setView("calc");
    this.renderResults();
    this.updateGoalsUI();
  },

  bindWelcome(){
    const startBtn=$("#startBtn");
    const backBtn=$("#backToWelcome");
    if(startBtn) startBtn.addEventListener("click",()=>{
      $("#welcomeScreen").classList.add("hidden");
      $("#profileSetupScreen").classList.remove("hidden");
    });
    if(backBtn) backBtn.addEventListener("click",()=>{
      $("#profileSetupScreen").classList.add("hidden");
      $("#welcomeScreen").classList.remove("hidden");
    });
  },
  
  bindProfileSetup(){
    $("#saveSetupProfile").addEventListener("click",()=>{
      const profile={
        name:$("#setupName").value.trim(),
        age:Number($("#setupAge").value),
        salary:Number($("#setupSalary").value),
        hours:Number($("#setupHours").value)
      };
      if(!profile.name||!profile.age||!profile.salary||!profile.hours){alert("Tölts ki minden mezőt!");return;}
      API.saveProfile(profile);
      $("#profileSetupScreen").classList.add("hidden");
      $("#appScreen").classList.remove("hidden");
      this.updateProfileIcon(); this.syncCalcHello();
      UI.coach("startup",{delay:520});
    });
  },

  bindTheme(){
    const toggle=$("#themeToggle");
    if(toggle){
      toggle.addEventListener("change",()=>UI.setTheme(toggle.checked?"dark":"light"));
    }
    $$('.theme-label').forEach(label=>{
      label.addEventListener('click',()=>{
        const theme=label.dataset.theme;
        UI.setTheme(theme);
      });
    });
  },

  bindTabs(){
    $$(".tab").forEach(tab=>tab.addEventListener("click",()=>this.setView(tab.dataset.view)));
    $$('[data-view="calc"]').forEach(b=>b.addEventListener("click",()=>this.setView("calc")));
  },
  
  setView(v,opts={}){
    const {coachDelay=null,suppressCoach=false}=opts||{};
    this.state.view=v;
    $$(".tab").forEach(t=>t.classList.toggle("active",t.dataset.view===v));
    $("#view-calc").classList.toggle("hidden",v!=="calc");
    $("#view-results").classList.toggle("hidden",v!=="results");
    $("#view-stats").classList.toggle("hidden",v!=="stats");
    $("#view-goals").classList.toggle("hidden",v!=="goals");
    if(v==="results"){
      this.renderResults();
      if(!suppressCoach){
        let delay;
        if(typeof coachDelay==="number"&&coachDelay>=0){
          delay=coachDelay;
        }else if(this.state.lastAction&&this.state.lastAction.timestamp&&(Date.now()-this.state.lastAction.timestamp)<2600){
          delay=3200;
        }else{
          delay=220;
        }
        UI.coach("results",{delay});
      }
    }
    if(v==="stats") this.drawStats();
    if(v==="calc") this.syncCalcHello();
    const prefersReduced=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({top:0,behavior:prefersReduced?"auto":"smooth"});
  },

  bindCalculator(){
    const calc=()=>{
      const p=API.profile(); if(!p){alert("Előbb töltsd ki a profilod!");return;}
      const name=$("#productName").value.trim(); const price=Number($("#productPrice").value);
      if(!name||!price||price<=0){alert("Add meg a termék nevét és árát!");return;}
      const hourly=p.salary/(p.hours*4); const hours=price/hourly;
      $("#workHoursText").textContent=`Kb. ${hours.toFixed(1)} munkaórádba kerülne (${fmtFt(price)}).`;
      $("#hourlyHint").textContent=`Jelenlegi órabéred ~ ${fmtFt(hourly)}/óra`;
      const r=$("#calcResult"); r.dataset.name=name; r.dataset.price=String(price); r.dataset.hours=String(hours); r.classList.remove("hidden");
    };
    $("#calculateBtn").addEventListener("click",calc);

    const commit=(type)=>{
      const r=$("#calcResult"); const name=r.dataset.name; const price=Number(r.dataset.price); const hours=Number(r.dataset.hours);
      if(!name||!price){alert("Előbb számolj!");return false;}
      API.add(type,{name,price,hours});
      const timestamp=now();
      this.state.lastAction={type,entry:{name,price,hours,at:timestamp},timestamp};
      UI.showActionMessage(type==="saved"?"positive":"negative");
      const actionContext=type==="saved"?"save":"spend";
      UI.coach(actionContext,{delay:220,duration:3000});
      $("#productName").value=""; $("#productPrice").value=""; r.classList.add("hidden");
      return true;
    };
    $("#saveBtn").addEventListener("click",()=>{
      if(commit("saved")) this.setView("results",{coachDelay:3600});
    });
    $("#buyBtn").addEventListener("click",()=>{
      if(commit("spent")) this.setView("results",{coachDelay:3600});
    });
  },
  
  syncCalcHello(){
    const p=API.profile(); const h=$("#hello");
    if(!p){ h.textContent="Szia! Töltsd ki a profilod a pontos számításhoz."; return; }
    h.innerHTML=`Szia <b>${esc(p.name)}</b>! Nézzük meg, hány órádba kerülne.`;
  },

  bindResults(){
    $("#clearAll").addEventListener("click",()=>{
      if(!confirm("Biztos üríted a listát?")) return;
      const backup={saved:API.list("saved"),spent:API.list("spent")};
      API.clearLists(); this.renderResults(); this.drawStats();
      UI.snack("Lista törölve.",true,()=>{API.setList("saved",backup.saved);API.setList("spent",backup.spent);this.renderResults();this.drawStats();});
    });
    $("#searchBox").addEventListener("input",(e)=>{this.state.search=e.target.value.trim().toLowerCase(); this.renderResults();});
    $("#filterSelect").addEventListener("change",(e)=>{this.state.filter=e.target.value; this.renderResults();});
    $("#sortSelect").addEventListener("change",(e)=>{this.state.sort=e.target.value; this.renderResults();});
  },
  
  itemsFilteredSorted(){
    const q=this.state.search; const filter=this.state.filter; const sort=this.state.sort;
    let items=[...API.list("saved"),...API.list("spent")];
    if(filter!=="all") items=items.filter(i=>i.type===filter);
    if(q) items=items.filter(i=>(i.name||"").toLowerCase().includes(q));
    items.sort((a,b)=>{
      if(sort==="date_desc") return (b.at||0)-(a.at||0);
      if(sort==="date_asc") return (a.at||0)-(b.at||0);
      if(sort==="price_desc") return (b.price||0)-(a.price||0);
      if(sort==="price_asc") return (a.price||0)-(b.price||0);
      if(sort==="name_asc") return (a.name||"").localeCompare(b.name||"");
      if(sort==="name_desc") return (b.name||"").localeCompare(a.name||"");
      return 0;
    });
    return items;
  },
  
  renderResults(){
    const saved=API.list("saved"), spent=API.list("spent");
    const totalSaved=saved.reduce((s,i)=>s+Number(i.price||0),0);
    const totalSpent=spent.reduce((s,i)=>s+Number(i.price||0),0);
    $("#totalSaved").textContent=fmtFt(totalSaved);
    $("#totalSpent").textContent=fmtFt(totalSpent);
    $("#net").textContent=fmtFt(totalSaved-totalSpent);

    const items=this.itemsFilteredSorted();
    const ul=$("#itemList"); ul.innerHTML="";
    items.forEach((it)=>{
      const li=document.createElement("li"); li.className="item";
      const meta=document.createElement("div"); meta.className="meta";
      const badge=document.createElement("span"); badge.className="badge "+(it.type==="saved"?"b-green":"b-red"); badge.textContent=(it.type==="saved"?"spórolt":"vett");
      const name=document.createElement("span"); name.innerHTML=esc(it.name);
      const price=document.createElement("span"); price.className="price"; price.textContent=fmtFt(it.price);
      meta.appendChild(badge); meta.appendChild(name); li.appendChild(meta); li.appendChild(price);
      const actions=document.createElement("div"); actions.className="actions";
      const editBtn=document.createElement("button"); editBtn.className="icon-btn secondary"; editBtn.title="Szerkesztés"; editBtn.textContent="✏️";
      const delBtn=document.createElement("button"); delBtn.className="icon-btn danger"; delBtn.title="Törlés"; delBtn.textContent="🗑️";
      actions.appendChild(editBtn); actions.appendChild(delBtn); li.appendChild(actions);
      ul.appendChild(li);
      editBtn.addEventListener("click",()=>this.editItem(it));
      delBtn.addEventListener("click",()=>this.deleteItem(it));
    });
  },
  
  editItem(item){
    const newName=prompt("Új név:",item.name||""); if(newName===null) return;
    let newPrice=prompt("Új ár (Ft):",String(item.price||0)); if(newPrice===null) return;
    newPrice=Number(newPrice); if(!newName.trim()||!newPrice||newPrice<=0){alert("Érvénytelen érték.");return;}
    const list=API.list(item.type).map(it=>{
      if(it.at===item.at && it.name===item.name && it.price===item.price){
        const ratio=(Number(it.price)>0 && Number.isFinite(Number(it.hours)))?Number(it.hours)/Number(it.price):null;
        const hours=ratio!==null?Number((ratio*newPrice).toFixed(1)):it.hours;
        return {...it,name:newName.trim(),price:newPrice,hours};
      }
      return it;
    });
    API.setList(item.type,list);
    this.renderResults(); this.drawStats();
    UI.snack("Tétel frissítve.");
  },
  
  deleteItem(item){
    const list=API.list(item.type);
    const idx=list.findIndex(it=>it.at===item.at && it.name===item.name && it.price===item.price);
    if(idx===-1) return;
    const removed=list[idx];
    const updated=list.filter((_,i)=>i!==idx);
    API.setList(item.type,updated);
    this.renderResults(); this.drawStats();
    UI.snack("Tétel törölve.",true,()=>{
      const current=API.list(item.type);
      if(current.some(it=>it.at===removed.at && it.name===removed.name && it.price===removed.price)) return;
      const restored=[...current];
      const insertAt=Math.min(idx,restored.length);
      restored.splice(insertAt,0,removed);
      API.setList(item.type,restored);
      this.renderResults();
      this.drawStats();
    });
  },

  drawStats(){
    const cvs=$("#statsCanvas"); const ctx=cvs.getContext("2d");
    ctx.clearRect(0,0,cvs.width,cvs.height);
    const monthKey=ts=>{const d=new Date(ts);return d.getFullYear()+"-"+MONTHS[d.getMonth()]};
    const map=new Map();
    API.list("saved").forEach(it=>{const k=monthKey(it.at||now()); const o=map.get(k)||{saved:0,spent:0}; o.saved+=Number(it.price)||0; map.set(k,o);});
    API.list("spent").forEach(it=>{const k=monthKey(it.at||now()); const o=map.get(k)||{saved:0,spent:0}; o.spent+=Number(it.price)||0; map.set(k,o);});
    const arr=[...map.entries()].sort((a,b)=>a[0]>b[0]?1:-1).slice(-8);
    const labels=arr.map(x=>x[0]), sData=arr.map(x=>x[1].saved), pData=arr.map(x=>x[1].spent);
    const P={l:48,r:22,t:16,b:40}, W=cvs.width-P.l-P.r, H=cvs.height-P.t-P.b;
    const style=getComputedStyle(document.documentElement);
    ctx.strokeStyle=style.getPropertyValue("--line"); ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(P.l,P.t); ctx.lineTo(P.l,P.t+H); ctx.lineTo(P.l+W,P.t+H); ctx.stroke();
    const max=Math.max(1000,...sData,...pData); const y=v=>P.t+H-(v/max)*H; const unit=W/Math.max(1,labels.length); const bar=unit/2.4;
    for(let i=0;i<labels.length;i++){
      const x0=P.l+i*unit+8;
      ctx.fillStyle=style.getPropertyValue("--green"); ctx.fillRect(x0, y(sData[i]), bar, (P.t+H)-y(sData[i]));
      ctx.fillStyle=style.getPropertyValue("--red"); ctx.fillRect(x0+bar+6, y(pData[i]), bar, (P.t+H)-y(pData[i]));
      ctx.fillStyle=style.getPropertyValue("--muted"); ctx.font="12px system-ui"; ctx.textAlign="center";
      ctx.fillText(labels[i], x0+bar/2+3, P.t+H+16);
    }
    if(pData.length>=3){
      const avg=[]; for(let i=0;i<pData.length;i++){ const a=pData.slice(Math.max(0,i-2),i+1); avg.push(a.reduce((s,v)=>s+v,0)/a.length); }
      ctx.beginPath(); ctx.lineWidth=2; ctx.strokeStyle=style.getPropertyValue("--blue");
      for(let i=0;i<avg.length;i++){ const x=P.l+i*unit+bar; const yy=y(avg[i]); if(i===0) ctx.moveTo(x,yy); else ctx.lineTo(x,yy); }
      ctx.stroke();
    }
  },

  bindGoals(){
    $("#saveGoals").addEventListener("click",()=>{
      const g={monthlyCap:Number($("#monthlyCap").value)||0, savingGoal:Number($("#savingGoal").value)||0};
      API.saveGoals(g); this.updateGoalsUI(); UI.snack("Célok mentve.");
    });
    $("#resetGoals").addEventListener("click",()=>{API.saveGoals({monthlyCap:0,savingGoal:0}); $("#monthlyCap").value=""; $("#savingGoal").value=""; this.updateGoalsUI();});
  },
  
  updateGoalsUI(){
    const g=API.goals(); $("#monthlyCap").value=g.monthlyCap||""; $("#savingGoal").value=g.savingGoal||"";
    const totalSaved=(API.list("saved").reduce((s,i)=>s+Number(i.price||0),0)); const goal=g.savingGoal||0;
    const pct=goal>0?Math.min(100,Math.round((totalSaved/goal)*100)):0;
    $("#goalProgressBar").style.width=pct+"%"; $("#goalProgressLabel").textContent=pct+"%";
  },

  bindProfileModal(){
    $("#profileIcon").addEventListener("click",()=>{
      const p=API.profile()||{name:"",age:"",salary:"",hours:""};
      $("#editName").value=p.name||""; $("#editAge").value=p.age||""; $("#editSalary").value=p.salary||""; $("#editHours").value=p.hours||"";
      $("#profileModal").classList.remove("hidden");
    });
    $("#closeModal").addEventListener("click",()=>$("#profileModal").classList.add("hidden"));
    $("#saveEditProfile").addEventListener("click",()=>{
      const p={name:$("#editName").value.trim(),age:Number($("#editAge").value),salary:Number($("#editSalary").value),hours:Number($("#editHours").value)};
      if(!p.name||!p.age||!p.salary||!p.hours){alert("Tölts ki minden mezőt!");return;}
      API.saveProfile(p); $("#profileModal").classList.add("hidden"); this.updateProfileIcon(); this.syncCalcHello(); UI.snack("Profil frissítve.");
    });
    $("#deleteProfile").addEventListener("click",()=>{
      if(!confirm("Biztos törlöd a profilodat és minden adatot?")) return;
      API.deleteProfile(); $("#profileModal").classList.add("hidden"); $("#appScreen").classList.add("hidden"); $("#welcomeScreen").classList.remove("hidden");
    });
  },
  
  updateProfileIcon(){
    const p=API.profile(); if(!p||!p.name) return;
    $("#profileIcon").textContent=(p.name[0]||"👤").toUpperCase();
  },

  bindShortcuts(){
    document.addEventListener("keydown",(e)=>{
      if(e.key==="Escape"){ $("#profileModal").classList.add("hidden"); }
      if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="k"){ e.preventDefault(); if(this.state.view!=="results") this.setView("results"); $("#searchBox").focus(); }
    });
  }
};

const A2HS=(()=>{
  const sessionKey="a2hs-dismissed";
  let deferred=null;
  let pill=null;
  let action=null;
  let close=null;
  const isStandalone=()=>{
    return (window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||window.navigator.standalone===true;
  };
  const storage={
    mark(){try{sessionStorage.setItem(sessionKey,"1");}catch(e){}},
    dismissed(){try{return sessionStorage.getItem(sessionKey)==="1";}catch(e){return false;}}
  };
  const hide=()=>{if(pill) pill.classList.remove("show");};
  const show=()=>{if(!pill||!deferred||storage.dismissed()) return; pill.classList.add("show");};
  const bindInteractions=()=>{
    if(!pill||!action||!close) return;
    close.addEventListener("click",()=>{hide();storage.mark();});
    action.addEventListener("click",async()=>{
      hide();
      storage.mark();
      if(!deferred) return;
      deferred.prompt();
      try{await deferred.userChoice;}catch(e){}
      deferred=null;
    });
  };
  return{
    init(){
      if(isStandalone()) return;
      pill=document.querySelector("#a2hsPill");
      action=document.querySelector("#a2hsAction");
      close=document.querySelector("#a2hsClose");
      if(!pill||!action||!close) return;
      bindInteractions();
      window.addEventListener("beforeinstallprompt",(event)=>{
        event.preventDefault();
        deferred=event;
        show();
      });
      window.addEventListener("appinstalled",()=>{storage.mark();hide();});
    }
  };
})();

const registerServiceWorker=()=>{
  if(!("serviceWorker" in navigator)) {
    console.warn('[App] Service workers not supported');
    return;
  }
  
  window.addEventListener("load",()=>{
    const timestamp = new Date().getTime();
    navigator.serviceWorker
      .register(`./sw.js?v=${timestamp}`)
      .then((reg)=>{
        console.info("[App] Service worker registered:",reg.scope);
        reg.addEventListener('updatefound',()=>{
          const newWorker=reg.installing;
          console.log('[App] New service worker found, installing...');
          newWorker.addEventListener('statechange',()=>{
            if(newWorker.state==='installed' && navigator.serviceWorker.controller){
              console.log('[App] New service worker installed');
            }
          });
        });
        reg.update();
      })
      .catch((err)=>{
        console.error("[App] Service worker registration failed:",err);
      });
    
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      console.log('[App] Service worker controller changed');
    });
  });
};

App.init();
A2HS.init();
registerServiceWorker();
