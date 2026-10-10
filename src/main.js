import Phaser from 'phaser';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, deleteUser, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { getDatabase, onDisconnect, onValue, push as pushRealtime, ref as realtimeRef, set as setRealtime } from 'firebase/database';
import PizzeriaScene from './pizzeria-scene.js';
import './style.css';

const KEY = 'flame-dough-save-v1';
const LOCAL_ACCOUNTS_KEY='flame-dough-local-accounts-v1';
const LOCAL_SESSION_KEY='flame-dough-local-session-v1';
const recipes = [
  { id: 'classic', name: 'Clásica', price: 10, time: 3, ingredients: { flour: 1, cheese: 1, tomato: 1 }, icon: '🍅' },
  { id: 'pepperoni', name: 'Pepperoni', price: 18, time: 4, ingredients: { flour: 1, cheese: 1, tomato: 1, pepperoni: 1 }, icon: '🍕' },
  { id: 'veggie', name: 'Vegetariana', price: 22, time: 5, ingredients: { flour: 1, cheese: 1, tomato: 1, vegetables: 2, olives: 1 }, icon: '🥬' },
  { id: 'special', name: 'Especial', price: 50, time: 8, ingredients: { flour: 2, cheese: 2, tomato: 1, pepperoni: 1, vegetables: 1 }, icon: '⭐' },
  { id: 'bbq', name: 'BBQ', price: 34, time: 6, ingredients: { flour: 1, cheese: 1, pepperoni: 1, tomato: 1 }, icon: '🔥' },
  { id: 'hawaiian', name: 'Hawaiana', price: 30, time: 7, ingredients: { flour: 1, cheese: 1, tomato: 1, vegetables: 2 }, icon: '🍍' },
];
const ingredients = [
  { id: 'flour', name: 'Harina', icon: '🌾', price: 12 }, { id: 'cheese', name: 'Queso', icon: '🧀', price: 20 },
  { id: 'tomato', name: 'Tomate', icon: '🍅', price: 10 }, { id: 'pepperoni', name: 'Pepperoni', icon: '🥓', price: 24 },
  { id: 'vegetables', name: 'Verduras', icon: '🥬', price: 15 }, { id: 'olives', name: 'Aceitunas', icon: '🫒', price: 12 },
];
const research = [
  { id: 'oven', name: 'Horno ultra rápido', desc: 'Pizzas 50% más rápidas', cost: 3000, duration: 30 },
  { id: 'dough', name: 'Masa premium', desc: 'Cada pizza vale 30% más', cost: 2500, duration: 20 },
  { id: 'automation', name: 'Sistema automático', desc: 'Producción automática cada 8 s', cost: 5000, duration: 40 },
  { id: 'delivery', name: 'Delivery propio', desc: 'Ingresos extra por reparto', cost: 4000, duration: 30 },
  { id: 'app', name: 'App móvil', desc: 'Preórdenes con venta asegurada', cost: 6000, duration: 45 },
];
const staff = [
  { id: 'cook', name: 'Cocinero', icon: '👨‍🍳', hire: 350, salary: 30, desc: 'Acelera cada pizza' },
  { id: 'server', name: 'Mesero', icon: '🧑‍🍽️', hire: 250, salary: 22, desc: 'Atiende más clientes y mejora reputación' },
  { id: 'courier', name: 'Repartidor', icon: '🛵', hire: 400, salary: 28, desc: 'Bonificación por entregas' },
  { id: 'manager', name: 'Gerente', icon: '📋', hire: 1200, salary: 75, desc: '+10% ingresos globales' },
];
const expansions = [
  { name: 'Ampliar cocina · +1 horno y +2 cocineros', cost: 5000, icon: '🔥' }, { name: 'Más mesas · +4 mesas', cost: 8000, icon: '🪑' },
  { name: 'Patio al aire libre', cost: 15000, icon: '🌿' }, { name: 'Sucursal #2 · otro barrio', cost: 30000, icon: '🏪' },
  { name: 'Sucursal #3', cost: 50000, icon: '🏬' }, { name: 'Franquicia · múltiples ciudades', cost: 100000, icon: '🌆' },
];
const missions = [
  { id: 'sell50', text: 'Vende 50 pizzas', reward: 500, done: (s) => s.sold >= 50 }, { id: 'star4', text: 'Alcanza 4 estrellas', reward: 2000, done: (s) => s.stars >= 4 },
  { id: 'staff5', text: 'Contrata 5 empleados', reward: 1500, done: (s) => totalStaff(s) >= 5 }, { id: 'research2', text: 'Investiga 2 tecnologías', reward: 3000, done: (s) => s.researched.length >= 2 },
  { id: 'marketing5k', text: 'Gasta $5,000 en marketing', reward: 5000, done: (s) => s.marketingSpent >= 5000 },
];
const fresh = () => ({ user: null, money: 250, gems: 0, selected: 'classic', stock: { flour: 20, cheese: 20, tomato: 20, pepperoni: 10, vegetables: 12, olives: 10 }, capacity: 40, employees: { cook: [], server: [], courier: [], manager: [] }, sold: 0, revenue: 0, reputation: 0, stars: 2, streak: 0, bestStreak: 0, expansions: 0, researched: [], researchJob: null, labUnlocked: false, marketing: null, marketingSpent: 0, customers: 2, trophies: [], missionClaims: [], startedAt: Date.now(), savedAt: Date.now(), totalSeconds: 0, settings: { sound: true, volume: 60, language: 'es' }, premiumUntil: 0, boostUntil: 0, paused: false, systemDown: false, order: null, lastSalary: Date.now(), lastCustomer: Date.now(), lastFatigue: Date.now(), lastEventAt: Date.now(), event: null, eventUntil: 0, lastDay: new Date().toDateString() });
let state = load();
let scene;
let noticeTimer;
const firebaseConfig={apiKey:import.meta.env.VITE_FIREBASE_API_KEY,authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID,appId:import.meta.env.VITE_FIREBASE_APP_ID,...(import.meta.env.VITE_FIREBASE_DATABASE_URL?{databaseURL:import.meta.env.VITE_FIREBASE_DATABASE_URL}:{})};
const firebaseReady=[firebaseConfig.apiKey,firebaseConfig.authDomain,firebaseConfig.projectId,firebaseConfig.appId].every(Boolean);
const fbApp=firebaseReady?(getApps()[0]||initializeApp(firebaseConfig)):null;
const auth=fbApp?getAuth(fbApp):null;
const db=fbApp?getFirestore(fbApp):null;
const realtimeDb=fbApp&&firebaseConfig.databaseURL?getDatabase(fbApp,firebaseConfig.databaseURL):null;
const socialData={loading:false,error:'',ranking:[],friends:[],requests:[],onlinePlayers:[]};
let activeView='game';
let publicProfileSyncAt=0;
let publicProfileSyncPending=false;
let presenceConnectionListener=null;
let onlinePlayersListener=null;
let activePresenceRef=null;

function readLocalAccounts(){try{return JSON.parse(localStorage.getItem(LOCAL_ACCOUNTS_KEY)||'{}');}catch{return {};}}
function localProgressKey(uid){return `${KEY}:${uid}`;}
function load() { try { const sessionId=localStorage.getItem(LOCAL_SESSION_KEY),account=Object.values(readLocalAccounts()).find(item=>item.id===sessionId);if(account){const raw=localStorage.getItem(localProgressKey(account.id));return {...fresh(),...(raw?JSON.parse(raw):{}),user:{uid:account.id,username:account.username,email:account.email,localAccount:true},startedAt:Date.now()};}const raw = localStorage.getItem(KEY); if (raw) {const saved=JSON.parse(raw);return {...fresh(),...saved,user:saved.user?.uid? saved.user:null,startedAt:Date.now()};} } catch {} return fresh(); }
function save() { state.savedAt = Date.now();const serialized=JSON.stringify(state);if(state.user?.localAccount){localStorage.setItem(localProgressKey(state.user.uid),serialized);localStorage.setItem(LOCAL_SESSION_KEY,state.user.uid);}else localStorage.setItem(KEY,serialized);if(db&&auth?.currentUser){setDoc(doc(db,'users',auth.currentUser.uid),{username:state.user?.username,email:state.user?.email,progress:JSON.parse(JSON.stringify({...state,user:null})),updatedAt:Date.now()},{merge:true}).catch(()=>{});publishPlayerProfile();} }
function passwordDigest(password,salt){return crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']).then(key=>crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},key,256)).then(bits=>btoa(String.fromCharCode(...new Uint8Array(bits))));}
function toBase64(bytes){return btoa(String.fromCharCode(...bytes));}
function fromBase64(value){return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}
function normalizeEmail(email){return email.trim().toLowerCase();}
function normalizeUsername(username){return username.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_]/g,'');}
async function registerLocalAccount({email,password,username}){if(!crypto.subtle)throw new Error('Este navegador no permite crear cuentas locales. Abre el sitio por HTTPS.');const emailKey=normalizeEmail(email),usernameKey=normalizeUsername(username),accounts=readLocalAccounts();if(accounts[emailKey])throw new Error('Ya existe una cuenta con este correo en este dispositivo.');if(Object.values(accounts).some(account=>normalizeUsername(account.username)===usernameKey))throw new Error('Ese nombre de usuario ya está ocupado.');const id=crypto.randomUUID(),salt=crypto.getRandomValues(new Uint8Array(16)),passwordHash=await passwordDigest(password,salt);accounts[emailKey]={id,email:email.trim(),username:username.trim(),salt:toBase64(salt),passwordHash};localStorage.setItem(LOCAL_ACCOUNTS_KEY,JSON.stringify(accounts));state=fresh();state.user={uid:id,username:username.trim(),email:email.trim(),localAccount:true};save();}
async function loginLocalAccount({email,password}){const emailKey=normalizeEmail(email),account=readLocalAccounts()[emailKey];if(!account)throw new Error('No encontramos esa cuenta en este dispositivo. Elige “Crear cuenta” para registrarte.');const matches=await passwordDigest(password,fromBase64(account.salt));if(matches!==account.passwordHash)throw new Error('La contraseña no es correcta.');const raw=localStorage.getItem(localProgressKey(account.id));state={...fresh(),...(raw?JSON.parse(raw):{}),user:{uid:account.id,username:account.username,email:account.email,localAccount:true},startedAt:Date.now()};save();}
function money(n = state.money) { return '$' + Math.floor(n).toLocaleString('es-PE'); }
function totalStaff(s = state) { return Object.values(s.employees).reduce((sum, arr) => sum + arr.length, 0); }
function avgLevel(type) { const arr = state.employees[type]; return arr.length ? arr.reduce((n, e) => n + e.level * (1 - Math.min(3,e.tired||0)*.15), 0) / arr.length : 0; }
function notify(msg) { const el = document.querySelector('#toast'); if (!el) return; el.textContent = msg; el.classList.add('show'); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => el.classList.remove('show'), 2600); }
function authErrorMessage(error) {
  const messages = {
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Inicia sesión o usa otro correo.',
    'auth/invalid-email': 'El correo electrónico no tiene un formato válido.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/operation-not-allowed': 'Firebase aún no tiene habilitado el acceso con correo y contraseña.',
    'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase Authentication.',
    'auth/network-request-failed': 'No se pudo conectar con Firebase. Revisa tu conexión e inténtalo de nuevo.',
    'auth/too-many-requests': 'Hubo demasiados intentos. Espera un momento e inténtalo otra vez.',
    'auth/invalid-credential': 'El correo o la contraseña no son correctos.',
    'auth/user-not-found': 'No encontramos una cuenta con ese correo. Elige “Crear cuenta” para registrarte.',
    'auth/wrong-password': 'La contraseña no es correcta.',
    'permission-denied': 'Firebase rechazó el acceso a Firestore. Revisa las reglas de seguridad publicadas.',
    'unavailable': 'Firebase no está disponible en este momento. Inténtalo de nuevo en unos segundos.',
  };
  return messages[error?.code] || error?.message || 'No se pudo completar la solicitud. Inténtalo de nuevo.';
}
function publishPlayerProfile(force=false) {
  const player=auth?.currentUser;
  if(!db||!player||!state.user||state.user.localAccount||publicProfileSyncPending||(!force&&Date.now()-publicProfileSyncAt<30000))return;
  publicProfileSyncPending=true;
  setDoc(doc(db,'playerProfiles',player.uid),{
    uid:player.uid,username:state.user.username,usernameKey:normalizeUsername(state.user.username),
    sold:state.sold,revenue:state.revenue,reputation:state.reputation,stars:state.stars,
    playTime:state.totalSeconds,updatedAt:Date.now(),
  },{merge:true}).then(()=>{publicProfileSyncAt=Date.now();if(activePresenceRef)setRealtime(activePresenceRef,{connectedAt:Date.now()}).catch(()=>{});}).catch(()=>{}).finally(()=>{publicProfileSyncPending=false;});
}
function refreshSocialView(){if(activeView==='social'){const view=document.querySelector('#view');if(view)view.innerHTML=socialView();}}
async function stopPresence(){presenceConnectionListener?.();onlinePlayersListener?.();presenceConnectionListener=null;onlinePlayersListener=null;socialData.onlinePlayers=[];const connection=activePresenceRef;activePresenceRef=null;if(connection){await onDisconnect(connection).cancel().catch(()=>{});await setRealtime(connection,null).catch(()=>{});}}
function startPresence(){
  const player=auth?.currentUser;
  if(!realtimeDb||!player||presenceConnectionListener)return;
  const connectionState=realtimeRef(realtimeDb,'.info/connected');
  presenceConnectionListener=onValue(connectionState,async(snapshot)=>{
    if(snapshot.val()!==true)return;
    const connection=pushRealtime(realtimeRef(realtimeDb,`presence/${player.uid}/connections`));
    try{await onDisconnect(connection).remove();activePresenceRef=connection;await setRealtime(connection,{connectedAt:Date.now()});}
    catch(error){socialData.error=authErrorMessage(error);refreshSocialView();}
  });
  onlinePlayersListener=onValue(realtimeRef(realtimeDb,'presence'),async(snapshot)=>{
    const ids=Object.entries(snapshot.val()||{}).filter(([,value])=>Object.keys(value?.connections||{}).length>0).map(([uid])=>uid);
    const profiles=await Promise.all(ids.map(async(uid)=>{try{const profile=await getDoc(doc(db,'playerProfiles',uid));return profile.exists()?{uid,...profile.data()}:null;}catch{return null;}}));
    socialData.onlinePlayers=profiles.filter(Boolean).sort((a,b)=>String(a.username||'').localeCompare(String(b.username||'')));
    refreshSocialView();
  },(error)=>{socialData.error=authErrorMessage(error);refreshSocialView();});
}
async function loadSocialData(){
  if(!db||!auth?.currentUser||state.user?.localAccount){socialData.error='Inicia sesión con una cuenta Firebase para usar la comunidad.';socialData.loading=false;refreshSocialView();return;}
  socialData.loading=true;socialData.error='';refreshSocialView();
  try{
    const [rankingSnapshot,friendsSnapshot,requestsSnapshot]=await Promise.all([
      getDocs(query(collection(db,'playerProfiles'),orderBy('sold','desc'),limit(50))),
      getDocs(collection(db,'users',auth.currentUser.uid,'friends')),
      getDocs(collection(db,'users',auth.currentUser.uid,'friendRequests')),
    ]);
    socialData.ranking=rankingSnapshot.docs.map((item)=>({uid:item.id,...item.data()}));
    socialData.friends=friendsSnapshot.docs.map((item)=>({uid:item.id,...item.data()}));
    socialData.requests=requestsSnapshot.docs.map((item)=>({id:item.id,...item.data()})).filter((item)=>item.status==='pending');
  }catch(error){socialData.error=authErrorMessage(error);}
  finally{socialData.loading=false;refreshSocialView();}
}
async function sendFriendRequest(username){
  const player=auth?.currentUser,key=normalizeUsername(username);
  if(!db||!player||!key)throw new Error('Escribe el nombre de usuario de la persona que quieres agregar.');
  const result=await getDocs(query(collection(db,'playerProfiles'),where('usernameKey','==',key),limit(1)));
  if(result.empty)throw new Error('No encontramos ese nombre de usuario.');
  const target=result.docs[0];
  if(target.id===player.uid)throw new Error('No puedes enviarte una solicitud a ti mismo.');
  if((await getDoc(doc(db,'users',player.uid,'friends',target.id))).exists())throw new Error('Esa persona ya está en tu lista de amigos.');
  await setDoc(doc(db,'users',target.id,'friendRequests',player.uid),{fromUid:player.uid,toUid:target.id,username:state.user.username,status:'pending',createdAt:Date.now()});
}
async function respondToFriendRequest(request,accept){
  const player=auth?.currentUser;
  if(!db||!player||!request?.fromUid)throw new Error('No se pudo identificar la solicitud.');
  const requestRef=doc(db,'users',player.uid,'friendRequests',request.id);
  if(!accept){await updateDoc(requestRef,{status:'rejected',respondedAt:Date.now()});return;}
  const batch=writeBatch(db),now=Date.now();
  batch.set(doc(db,'users',player.uid,'friends',request.fromUid),{uid:request.fromUid,username:request.username,addedAt:now});
  batch.set(doc(db,'users',request.fromUid,'friends',player.uid),{uid:player.uid,username:state.user.username,addedAt:now});
  batch.update(requestRef,{status:'accepted',respondedAt:now});
  await batch.commit();
}
function scoreStars() { state.stars = Math.min(5, 2 + Math.floor(state.reputation / 35)); }
function setScene() { if (scene) scene.refresh(state); }
function rankLabel() { return ['','', 'Favorita del barrio', 'Pizzería popular', 'Imperio gastronómico', 'Leyenda de la pizza'][state.stars]; }
function elapsed() { return Math.floor(state.totalSeconds); }
function unlocked(r) { return r.id === 'classic' || state.sold >= (recipes.indexOf(r) > 0 ? Math.max(10, Math.ceil(recipes.indexOf(r) / 2) * 5) : 0) || state.researched.includes('app') && r.id !== 'classic'; }
function recipeCard(r) { const locked = !unlocked(r); return `<button class="recipe ${state.selected === r.id ? 'selected' : ''} ${locked ? 'locked' : ''}" data-recipe="${r.id}" ${locked ? 'disabled' : ''}><span>${r.icon}</span><b>${r.name}</b><small>${locked ? '🔒 Desbloquea al progresar' : `${money(r.price)} · ${r.time}s`}</small></button>`; }
function render() {
  const app = document.querySelector('#app');
  if (!state.user) { app.innerHTML = `<main class="auth-page"><section class="auth-card"><div class="brand-mark">🔥</div><p class="eyebrow">PIZZERÍA TYCOON</p><h1>Flame <i>&</i> Dough</h1><p class="muted">Tu receta para un imperio empieza aquí.</p><div class="auth-tabs"><button type="button" class="active" data-auth-mode="login">Ingresar</button><button type="button" data-auth-mode="register">Crear cuenta</button></div><form id="auth-form" data-mode="login"><label class="username-field" hidden>Nombre de usuario<input name="username" placeholder="Tu nombre" minlength="2" /></label><label>Correo electrónico<input name="email" type="email" placeholder="tu@correo.com" autocomplete="email" required /></label><label>Contraseña<input name="password" type="password" minlength="6" placeholder="Mínimo 6 caracteres" autocomplete="current-password" required /></label><button class="primary full" type="submit">Ingresar <span>→</span></button></form><div class="auth-links"><button type="button" data-action="forgot-password">Olvidé mi contraseña</button></div><p class="hint">${firebaseReady?'Crea una cuenta Firebase y úsala desde tus dispositivos.':'Puedes crear una cuenta local para ingresar desde este dispositivo. Para iniciar sesión desde otros dispositivos, hay que conectar Firebase.'}</p><div id="toast" class="toast" role="status" aria-live="polite"></div></section></main>`; attachEvents(); return; }
  app.innerHTML = `<div class="app-shell">
    <header class="topbar"><a class="brand" href="#"><span class="brand-icon">🔥</span><span>FLAME <i>&</i> DOUGH<small> PIZZERÍA TYCOON</small></span></a><div class="top-stats"><div class="stat-chip"><small>CAJA</small><b id="money">${money()}</b></div><div class="stat-chip reputation"><small>REPUTACIÓN</small><b id="stars">${'★'.repeat(state.stars)}${'☆'.repeat(5-state.stars)}</b></div><button class="icon-btn" data-action="pause" title="Pausar">Ⅱ</button><button class="avatar" data-action="settings" title="Configuración">${state.user.username.slice(0,1).toUpperCase()}</button></div></header>
    <main class="layout"><aside class="sidebar"><div class="day-card"><span>📅 JORNADA <b id="day-count">${Math.floor(elapsed()/60)+1}</b></span><div class="day-progress"><i></i></div><small>La ciudad nunca duerme</small></div><nav>${[['game','🏠','Pizzería'],['social','👥','Comunidad'],['upgrades','🛠️','Mejoras'],['lab','🧪','Laboratorio'],['missions','🎯','Objetivos'],['stats','📊','Estadísticas'],['settings','⚙️','Configuración']].map(([id,icon,label])=>`<button class="nav-item ${id==='game'?'active':''}" data-view="${id}"><span>${icon}</span>${label}${id==='missions' && state.missionClaims.length < missions.length ? '<i class="nav-dot"></i>':''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="profile"><div class="avatar mini">${state.user.username.slice(0,1).toUpperCase()}</div><div><b>${escapeHtml(state.user.username)}</b><small>Dueña de la pizzería</small></div></div><button class="text-btn" data-action="logout">↪ Cerrar sesión</button></div></aside>
    <section class="content"><div id="view"></div></section></main><div id="toast" class="toast"></div><div id="modal-root"></div></div>`;
  showView('game'); attachEvents(); setScene();
}
function escapeHtml(s='') { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function showView(id) {
  activeView=id;
  if(id!=='game'&&gameInstance){gameInstance.destroy(true);gameInstance=null;scene=null;}
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === id));
  const view = document.querySelector('#view'); if (!view) return;
  if (id === 'game') view.innerHTML = gameView(); if (id === 'social') view.innerHTML = socialView(); if (id === 'upgrades') view.innerHTML = upgradesView(); if (id === 'lab') view.innerHTML = labView(); if (id === 'missions') view.innerHTML = missionsView(); if (id === 'stats') view.innerHTML = statsView(); if (id === 'settings') view.innerHTML = settingsView();
  if (id === 'game') mountGame();
  attachEvents();
  if (id === 'social') loadSocialData();
}
 function gameView() { const current=recipes.find(r=>r.id===state.selected)||recipes[0]; const activeEvent=state.systemDown?{name:'Sistema detenido',desc:'Restablece el sistema para volver a producir.'}:state.event&&state.eventUntil>Date.now()?state.event:null;
  return `<div class="view-head"><div><p class="eyebrow">${new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long'})}</p><h1>¡Buen día, ${escapeHtml(state.user.username)}! <span>🍕</span></h1><p class="muted">${rankLabel()} · Hoy puede ser un gran día para vender.</p></div><button class="secondary" data-action="pause">Ⅱ <span>${state.paused?'Reanudar':'Pausar'}</span></button></div>
   ${activeEvent?`<div class="event-banner">✨ <b>${activeEvent.name}</b> · ${activeEvent.desc} ${state.systemDown?'<button class="tiny-btn" data-action="repair">Restablecer sistema · Gratis</button>':`<span>${Math.max(0,Math.ceil((state.eventUntil-Date.now())/1000))}s</span>`}</div>`:''}
  <div class="game-grid"><div class="main-column"><div class="scene-card"><div class="scene-top"><div><span class="live-dot"></span> LOCAL ABIERTO</div><span>🏆 NIVEL ${Math.floor(state.sold/50)+1}</span></div><div id="phaser-game"></div><div class="scene-footer"><span>👥 <b id="customer-count">${state.customers}</b> clientes esperando</span><span>⭐ ${state.stars}.0 · ${rankLabel()}</span></div></div>
  <div class="section-title"><div><h2>Elige tu receta</h2><p>El cliente de turno quiere <b>${state.order?state.order.name:'una sorpresa del chef'}</b></p></div><span class="pill">🔥 ${state.employees.cook.length} cocineros</span></div><div class="recipe-grid">${recipes.map(recipeCard).join('')}</div>
  <div class="make-row"><div class="make-info"><span class="big-food">${current.icon}</span><div><b>${current.name} de la casa</b><small>${current.time}s de preparación · ${money(current.price)} base</small></div></div><button class="primary make-btn" data-action="make">Preparar y servir <span>→</span></button></div></div>
  <aside class="right-column"><div class="card inventory"><div class="card-head"><div><p class="eyebrow">ALACENA</p><h3>Ingredientes</h3></div><button class="tiny-btn" data-action="restock-all">＋ Reponer</button></div>${ingredients.map(i=>`<div class="stock-row"><span>${i.icon} ${i.name}</span><div class="stock-meter"><i style="width:${Math.min(100,state.stock[i.id]/state.capacity*100)}%"></i></div><b>${state.stock[i.id]}</b></div>`).join('')}<small class="capacity">Capacidad ${state.capacity} por ingrediente</small></div>
  <div class="card order-card"><p class="eyebrow">SIGUIENTE PEDIDO</p><div class="customer-order"><span class="customer-face">${state.order?.face||'😊'}</span><div><b>${state.order?.name||'Cliente nuevo'}</b><small>“${state.order?`Quiero una ${state.order.name.toLowerCase()}, por favor.`:'Esperando al chef…'}”</small></div></div><div class="order-footer"><span>⏳ ${state.order?Math.max(0,Math.ceil((state.order.expires-Date.now())/1000))+'s':'—'}</span><span class="mood">${state.order?.mood||'Feliz'}</span></div></div>
  <div class="card competitor"><div class="competitor-head"><div><p class="eyebrow">AL OTRO LADO DE LA CALLE</p><h3>🍕 Don Rival</h3></div><span class="rival-score">⭐ ${Math.max(2,Math.min(5,5-state.stars+2))}</span></div><p>La reputación decide quién se queda con los clientes del barrio.</p><button class="secondary full" data-action="challenge">⚔️ Reto de marketing · $500</button></div>
  <div class="quick-goals"><div><span>💰</span><div><small>Meta Millonaria</small><b>${Math.min(100,Math.floor(state.money/1000))}% de $100K</b></div></div><div class="goal-track"><i style="width:${Math.min(100,state.money/1000)}%"></i></div></div></aside></div>`;
}
function upgradesView() { return `<div class="view-head"><div><p class="eyebrow">HAZ CRECER TU NEGOCIO</p><h1>Mejoras del local <span>🛠️</span></h1><p class="muted">Invierte hoy para servir más mañana.</p></div><div class="money-large">${money()}</div></div><div class="section-title"><div><h2>Equipo de trabajo</h2><p>Salarios cada 30 segundos de juego.</p></div></div><div class="upgrade-grid">${staff.map(s=>{const n=state.employees[s.id].length;return `<div class="card upgrade-card"><span class="upgrade-icon">${s.icon}</span><div class="upgrade-main"><h3>${s.name} <span class="count">×${n}</span></h3><p>${s.desc}</p><small>Contratación ${money(s.hire)} · salario ${money(s.salary)}/mes</small></div><button class="secondary" data-action="hire" data-id="${s.id}">Contratar</button>${n?`<div class="employee-detail">Nivel promedio ${avgLevel(s.id).toFixed(1)} <button data-action="train" data-id="${s.id}">↑ Entrenar $250</button><button data-action="vacation" data-id="${s.id}">🌴 Vacaciones</button></div>`:''}</div>`}).join('')}</div>
  <div class="section-title spaced"><div><h2>Expande tu pizzería</h2><p>Más espacio para atender a todo el barrio.</p></div><span class="pill">Nivel ${Math.min(7,state.expansions+1)}</span></div><div class="upgrade-grid two">${expansions.map((e,i)=>`<div class="card expansion-card ${i<state.expansions?'complete':''}"><span>${i<state.expansions?'✅':e.icon}</span><div><b>Nivel ${i+2}</b><p>${e.name}</p><small>${i<state.expansions?'Completado':money(e.cost)}</small></div><button class="secondary" data-action="expand" data-index="${i}" ${i<state.expansions?'disabled':''}>${i<state.expansions?'Listo':'Ampliar'}</button></div>`).join('')}</div>
  <div class="section-title spaced"><div><h2>Campañas de marketing</h2><p>Invierte para atraer más clientes.</p></div></div><div class="marketing-grid">${[['Anuncio pequeño',500,'+20% clientes · 60s'],['Anuncio mediano',1500,'+50% clientes · 120s'],['Anuncio grande',5000,'+100% clientes · 180s'],['Influenciador',10000,'+150% clientes · +10 reputación']].map((m,i)=>`<div class="card marketing-card"><span>${['📣','📻','🎬','⭐'][i]}</span><b>${m[0]}</b><small>${m[2]}</small><button class="secondary" data-action="marketing" data-index="${i}">${money(m[1])}</button></div>`).join('')}</div>
  <div class="card auto-buy"><div><b>🤖 Reposición automática</b><p>Actívala con Sistema Automático en el laboratorio para que nunca falte stock.</p></div><span class="pill">${state.researched.includes('automation')?'ACTIVA':'INVESTIGA'}</span></div>`; }
function labView() { return `<div class="view-head"><div><p class="eyebrow">INNOVA Y SUPERA A LA COMPETENCIA</p><h1>Laboratorio <span>🧪</span></h1><p class="muted">Desbloquea nuevas formas de hacer crecer el negocio.</p></div><span class="pill">${state.researched.length}/${research.length} descubrimientos</span></div>${!state.labUnlocked?`<div class="card lab-lock"><span>🔬</span><h2>Un laboratorio para tus grandes ideas</h2><p>Invierte $2,000 para desbloquear investigación y desarrollo.</p><button class="primary" data-action="unlock-lab">Desbloquear · $2,000</button></div>`:`${state.researchJob?`<div class="card research-active"><div><span>⚗️</span><div><b>Investigando: ${research.find(r=>r.id===state.researchJob.id)?.name}</b><small>No disponible hasta completar · ${Math.ceil((state.researchJob.end-Date.now())/1000)}s restantes</small></div></div><div class="progress"><i style="width:${Math.min(100,(1-(state.researchJob.end-Date.now())/(state.researchJob.duration*1000))*100)}%"></i></div></div>`:''}<div class="research-grid">${research.map(r=>{const done=state.researched.includes(r.id), busy=state.researchJob?.id===r.id;return `<div class="card research-card ${done?'complete':''}"><div class="research-icon">${done?'✅':'🧪'}</div><div class="research-info"><h3>${r.name}</h3><p>${r.desc}</p><small>⏱ ${r.duration}s · ${money(r.cost)}</small></div><button class="${done?'pill':'secondary'}" data-action="research" data-id="${r.id}" ${done||state.researchJob?'disabled':''}>${done?'Completado':busy?'En curso':'Investigar'}</button></div>`}).join('')}</div>`}`; }
function missionsView() { return `<div class="view-head"><div><p class="eyebrow">UN PASO MÁS HACIA LA LEYENDA</p><h1>Objetivos <span>🎯</span></h1><p class="muted">Misiones diarias · se renuevan al cambiar el día local.</p></div></div><div class="mission-list">${missions.map(m=>{const done=m.done(state),claimed=state.missionClaims.includes(m.id);return `<div class="card mission-row ${claimed?'complete':''}"><span class="mission-check">${claimed?'✓':done?'🎁':'○'}</span><div class="mission-copy"><b>${m.text}</b><small>${claimed?'Recompensa cobrada':done?'¡Completada! Reclama tu recompensa':missionProgress(m)}</small></div><strong>+${money(m.reward)}</strong><button class="${done&&!claimed?'primary':'secondary'}" data-action="claim" data-id="${m.id}" ${!done||claimed?'disabled':''}>${claimed?'Lista':done?'Cobrar':'En curso'}</button></div>`}).join('')}</div><div class="section-title spaced"><div><h2>Metas de toda la vida</h2><p>Trofeos que cuentan tu historia.</p></div></div><div class="trophy-grid">${[['rich','💰','Millonario','$100,000 en caja',state.money>=100000],['legend','⭐','Leyenda','Alcanza 5 estrellas',state.stars>=5],['empire','🏙️','Imperio','Abre 3 sucursales',state.expansions>=5],['baker','🍕','Panadero','Vende 10,000 pizzas',state.sold>=10000]].map(([id,icon,name,desc,done])=>`<div class="card trophy ${done?'earned':''}"><span>${icon}</span><b>${name}</b><small>${desc}</small><i>${done?'DESBLOQUEADO':'POR CONSEGUIR'}</i></div>`).join('')}</div>`; }
function missionProgress(m) { if(m.id==='sell50')return `${Math.min(50,state.sold)} / 50 pizzas`;if(m.id==='star4')return `${state.stars} / 4 estrellas`;if(m.id==='staff5')return `${totalStaff()} / 5 empleados`;if(m.id==='research2')return `${state.researched.length} / 2 tecnologías`;return `${money(state.marketingSpent)} / $5,000 invertidos`; }
function statsView() { const hours=Math.floor(elapsed()/3600), mins=Math.floor(elapsed()%3600/60); return `<div class="view-head"><div><p class="eyebrow">CADA PIZZA CUENTA</p><h1>Estadísticas <span>📊</span></h1><p class="muted">El progreso completo de tu imperio.</p></div></div><div class="stats-grid">${[['🍕','Pizzas vendidas',state.sold],['💵','Ingresos totales',money(state.revenue)],['👥','Empleados contratados',totalStaff()],['🏪','Expansiones completadas',state.expansions],['🧪','Tecnologías investigadas',state.researched.length],['⏱️','Tiempo jugado',`${hours}h ${mins}m`],['🔥','Mejor racha',`${state.bestStreak} pizzas`],['⭐','Reputación',`${state.reputation} puntos`]].map(([i,n,v])=>`<div class="card stat-card"><span>${i}</span><small>${n}</small><b>${v}</b></div>`).join('')}</div><div class="card stats-note"><span>📈</span><div><b>Tu negocio va tomando forma.</b><p>${state.sold?`Ya has servido ${state.sold} pizzas y ganado ${money(state.revenue)} en ventas.`:'Sirve tu primera pizza y aquí verás crecer tus números.'} Tu mejor racha es de ${state.bestStreak} ventas seguidas.</p></div></div>`; }
function socialView(){
  const currentUid=auth?.currentUser?.uid,onlineIds=new Set(socialData.onlinePlayers.map((player)=>player.uid));
  const identityRequired=!firebaseReady||state.user?.localAccount;
  return `<div class="view-head"><div><p class="eyebrow">JUEGA EN COMUNIDAD</p><h1>Comunidad <span>👥</span></h1><p class="muted">Encuentra jugadores, agrega amigos y sube en la clasificación.</p></div><button class="secondary" data-action="refresh-social" ${socialData.loading?'disabled':''}>${socialData.loading?'Actualizando…':'↻ Actualizar'}</button></div>
  ${identityRequired?'<div class="card social-notice"><b>Conecta una cuenta Firebase</b><p>La comunidad, los amigos y la clasificación funcionan con cuentas en la nube. Cierra sesión y crea o inicia sesión con tu cuenta Firebase.</p></div>':socialData.error?`<div class="card social-notice"><b>No se pudo cargar la comunidad</b><p>${escapeHtml(socialData.error)}</p><button class="secondary" data-action="refresh-social">Intentar de nuevo</button></div>`:''}
  <div class="social-layout"><div class="social-main"><section class="card social-panel"><div class="social-panel-head"><div><p class="eyebrow">EN ESTE MOMENTO</p><h2>Jugadores conectados</h2></div><span class="pill">${realtimeDb?`${socialData.onlinePlayers.length} en línea`:'PRESENCIA NO CONFIGURADA'}</span></div>${!realtimeDb?'<p class="social-empty">Para ver quién está en línea en tiempo real, activa Realtime Database en Firebase y agrega `VITE_FIREBASE_DATABASE_URL` en Vercel.</p>':socialData.onlinePlayers.length?`<div class="player-list">${socialData.onlinePlayers.map((player)=>{const isFriend=socialData.friends.some((friend)=>friend.uid===player.uid);return `<article class="player-row"><span class="player-avatar">${escapeHtml((player.username||'?').slice(0,1).toUpperCase())}<i></i></span><div class="player-info"><b>${escapeHtml(player.username||'Chef')}</b><small>⭐ ${Number(player.stars)||0} · 🍕 ${Number(player.sold)||0} pizzas · ${Number(player.reputation)||0} reputación</small></div>${player.uid===currentUid?'<span class="pill">TÚ</span>':isFriend?'<span class="pill friend-pill">AMIGO</span>':`<button class="tiny-btn" data-action="send-friend-request" data-username="${escapeHtml(player.username||'')}">＋ Agregar</button>`}</article>`;}).join('')}</div>`:'<p class="social-empty">Todavía no hay otros jugadores conectados. Invita a tus amigos para encontrarlos aquí.</p>'}</section>
  <section class="card social-panel"><div class="social-panel-head"><div><p class="eyebrow">LOS MEJORES CHEFS</p><h2>Clasificación</h2></div><span class="pill">POR PIZZAS VENDIDAS</span></div>${socialData.ranking.length?`<div class="leaderboard">${socialData.ranking.map((player,index)=>`<article class="leader-row ${player.uid===currentUid?'leader-self':''}"><span class="leader-rank">${index<3?['🥇','🥈','🥉'][index]:`#${index+1}`}</span><span class="player-avatar">${escapeHtml((player.username||'?').slice(0,1).toUpperCase())}</span><div class="player-info"><b>${escapeHtml(player.username||'Chef')}${player.uid===currentUid?' · Tú':''}</b><small>⭐ ${Number(player.stars)||0} estrellas · ${Number(player.reputation)||0} reputación</small></div><strong>${Number(player.sold)||0}<small> pizzas</small></strong></article>`).join('')}</div>`:socialData.loading?'<p class="social-empty">Cargando clasificación…</p>':'<p class="social-empty">La clasificación aparecerá cuando haya perfiles de jugadores.</p>'}</section></div>
  <aside class="social-side"><section class="card social-panel"><p class="eyebrow">HAZ EQUIPO</p><h2>Agregar amigo</h2><form id="friend-form" class="friend-form"><label for="friend-username">Nombre de usuario</label><div><input id="friend-username" name="username" placeholder="Ej. pizzachef" minlength="2" required ${identityRequired?'disabled':''}><button class="primary" type="submit" ${identityRequired?'disabled':''}>Enviar</button></div></form><p class="social-help">Busca el nombre de usuario exacto de otra persona.</p></section>
  <section class="card social-panel"><div class="social-panel-head"><div><p class="eyebrow">TU CÍRCULO</p><h2>Amigos</h2></div><span class="pill">${socialData.friends.length}</span></div>${socialData.friends.length?`<div class="player-list">${socialData.friends.map((friend)=>`<article class="player-row"><span class="player-avatar">${escapeHtml((friend.username||'?').slice(0,1).toUpperCase())}${onlineIds.has(friend.uid)?'<i></i>':''}</span><div class="player-info"><b>${escapeHtml(friend.username||'Chef')}</b><small>${onlineIds.has(friend.uid)?'En línea':'Desconectado'}</small></div></article>`).join('')}</div>`:'<p class="social-empty">Todavía no agregas amigos.</p>'}</section>
  <section class="card social-panel"><div class="social-panel-head"><div><p class="eyebrow">SOLICITUDES</p><h2>Invitaciones recibidas</h2></div><span class="pill">${socialData.requests.length}</span></div>${socialData.requests.length?`<div class="player-list">${socialData.requests.map((request)=>`<article class="player-row request-row"><div class="player-info"><b>${escapeHtml(request.username||'Chef')}</b><small>Quiere agregarte como amigo</small></div><button class="tiny-btn" data-action="accept-friend" data-request-id="${escapeHtml(request.id)}" data-from-uid="${escapeHtml(request.fromUid)}" data-username="${escapeHtml(request.username||'Chef')}">Aceptar</button><button class="text-btn" data-action="reject-friend" data-request-id="${escapeHtml(request.id)}">Rechazar</button></article>`).join('')}</div>`:'<p class="social-empty">No tienes solicitudes pendientes.</p>'}</section></aside></div>`;
}
function settingsView() { return `<div class="view-head"><div><p class="eyebrow">A TU MANERA</p><h1>Configuración <span>⚙️</span></h1><p class="muted">Ajusta tu experiencia y administra tu cuenta.</p></div></div><div class="settings-list"><div class="card setting-row"><div><b>🔊 Efectos de sonido</b><small>Sonido al vender y completar objetivos.</small></div><button class="toggle ${state.settings.sound?'on':''}" data-action="sound">${state.settings.sound?'Activado':'Desactivado'}</button></div><div class="card setting-row"><div><b>🔉 Volumen</b><small>Ajusta el volumen de juego.</small></div><input type="range" min="0" max="100" value="${state.settings.volume}" data-setting="volume"><b>${state.settings.volume}%</b></div><div class="card setting-row"><div><b>🌐 Idioma</b><small>Idioma de la interfaz.</small></div><select data-setting="language"><option value="es" selected>Español</option><option value="en">English (próximamente)</option></select></div><div class="card setting-row"><div><b>☁️ Cuenta y sincronización</b><small>${state.user.localAccount?'Cuenta local: funciona solo en este dispositivo.':'Cuenta Firebase: sesión y progreso sincronizados en la nube.'}</small></div><span class="pill">${navigator.onLine?'EN LÍNEA':'SIN CONEXIÓN'}</span></div><div class="card setting-row"><div><b>🛍️ Tienda de la pizzería</b><small>Gemas, paquetes, pase y cosméticos.</small></div><button class="secondary" data-action="store">Abrir tienda</button></div><div class="card setting-row"><div><b>🛡️ Panel de administración</b><small>Vista local de analítica para el prototipo.</small></div><button class="secondary" data-action="admin">Abrir dashboard</button></div><div class="card setting-row"><div><b>💾 Guardado</b><small>Último guardado ${new Date(state.savedAt).toLocaleTimeString('es-PE')} · auto guardado cada 5 segundos.</small></div><button class="secondary" data-action="save">Guardar ahora</button></div><button class="danger full" data-action="logout">Cerrar sesión</button></div>`; }

function attachEvents() {
  const app = document.querySelector('#app'); if (!app) return;
  app.onclick = async (ev) => {
    const nav=ev.target.closest('[data-view]'); if(nav){showView(nav.dataset.view);return;}
    const recipe=ev.target.closest('[data-recipe]'); if(recipe&&!recipe.disabled){state.selected=recipe.dataset.recipe;save();showView('game');return;}
    const authTab=ev.target.closest('[data-auth-mode]');if(authTab){const form=document.querySelector('#auth-form'),mode=authTab.dataset.authMode,register=mode==='register';form.dataset.mode=mode;const user=form.querySelector('.username-field'),password=form.querySelector('[name=password]'),submit=form.querySelector('[type=submit]');user.hidden=!register;user.querySelector('input').required=register;password.autocomplete=register?'new-password':'current-password';submit.innerHTML=`${register?'Crear mi cuenta':'Ingresar'} <span>→</span>`;document.querySelectorAll('[data-auth-mode]').forEach(tab=>tab.classList.toggle('active',tab.dataset.authMode===mode));return;}
    const button=ev.target.closest('[data-action]'); if(!button)return;
    const {action,id}=button.dataset; const index=Number(button.dataset.index);
    if(action==='refresh-social'){await loadSocialData();return;}
    if(action==='send-friend-request'){try{await sendFriendRequest(button.dataset.username);notify('Solicitud de amistad enviada.');await loadSocialData();}catch(error){notify(error.message||'No se pudo enviar la solicitud.');}return;}
    if(action==='accept-friend'||action==='reject-friend'){const request={id:button.dataset.requestId,fromUid:button.dataset.fromUid,username:button.dataset.username};try{await respondToFriendRequest(request,action==='accept-friend');notify(action==='accept-friend'?'Ahora son amigos.':'Solicitud rechazada.');await loadSocialData();}catch(error){notify(authErrorMessage(error));}return;}
    if(action==='make') await makePizza(button);
    if(action==='settings')showView('settings');
    if(action==='repair')repairSystem();
    if(action==='pause'){state.paused=!state.paused;showView('game');notify(state.paused?'Juego en pausa':'¡A cocinar!');}
    if(action==='logout'){const hadFirebase=!!auth?.currentUser;if(hadFirebase)await stopPresence();if(state.user?.localAccount){save();localStorage.removeItem(LOCAL_SESSION_KEY);state.user=null;}else{state.user=null;state.paused=false;save();}if(hadFirebase)await signOut(auth).catch(()=>{});render();}
    if(action==='forgot-password'){const email=document.querySelector('#auth-form [name=email]').value.trim();if(!email){notify('Escribe tu correo electrónico primero.');return;}if(!auth){notify('La recuperación por correo requiere Firebase.');return;}try{await sendPasswordResetEmail(auth,email);notify('Te enviamos un enlace para restablecer la contraseña. Revisa también el correo no deseado.');}catch(error){notify(authErrorMessage(error));}}
    if(action==='hire')hire(id);
    if(action==='train')train(id);
    if(action==='vacation')vacation(id);
    if(action==='expand')expand(index);
    if(action==='marketing')buyMarketing(index);
    if(action==='restock-all')restockAll();
    if(action==='challenge')challenge();
    if(action==='unlock-lab')unlockLab();
    if(action==='research')startResearch(id);
    if(action==='claim')claimMission(id);
    if(action==='sound'){state.settings.sound=!state.settings.sound;save();showView('settings');}
    if(action==='save'){save();notify('Progreso guardado.');showView('settings');}
    if(action==='store')showStore();
    if(action==='admin')showAdmin();
    if(action==='close-modal')document.querySelector('#modal-root').innerHTML='';
    if(action==='buy-demo')demoPurchase(button.dataset.product);
  };
  app.onsubmit = async (ev) => {
    if(ev.target.id==='friend-form'){
      ev.preventDefault();
      const form=ev.target,submit=form.querySelector('[type=submit]'),username=String(new FormData(form).get('username')||'').trim();
      submit.disabled=true;submit.textContent='Enviando…';
      try{await sendFriendRequest(username);form.reset();notify('Solicitud de amistad enviada.');await loadSocialData();}
      catch(error){notify(error.message||'No se pudo enviar la solicitud.');}
      finally{if(document.body.contains(submit)){submit.disabled=false;submit.textContent='Enviar';}}
      return;
    }
    if(ev.target.id!=='auth-form')return;
    ev.preventDefault();
    const form=ev.target,submit=form.querySelector('[type=submit]'),fd=new FormData(form),email=String(fd.get('email')).trim(),password=String(fd.get('password')),register=form.dataset.mode==='register',username=String(fd.get('username')||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){notify('Escribe un correo válido.');return;}
    if(password.length<6){notify('La contraseña debe tener al menos 6 caracteres.');return;}
    if(register&&username.length<2){notify('El nombre de usuario debe tener al menos 2 caracteres.');return;}
    submit.disabled=true;submit.textContent=register?'Creando cuenta…':'Ingresando…';
    let createdFirebaseUser=null;
    try{
      if(auth){
        await setPersistence(auth,browserLocalPersistence);
        if(register){
          const credential=await createUserWithEmailAndPassword(auth,email,password);createdFirebaseUser=credential.user;
          const normalized=normalizeUsername(username);
          if(normalized.length<2)throw new Error('El nombre debe contener letras o números.');
          await runTransaction(db,async(tx)=>{const usernameRef=doc(db,'usernames',normalized),existing=await tx.get(usernameRef);if(existing.exists())throw new Error('Ese nombre de usuario ya está ocupado.');tx.set(usernameRef,{uid:credential.user.uid,username});});
          state.user={uid:credential.user.uid,username,email};
        }else{
          const credential=await signInWithEmailAndPassword(auth,email,password),remote=await getDoc(doc(db,'users',credential.user.uid));
          if(remote.exists()){const data=remote.data();if(data.progress)state={...fresh(),...data.progress,startedAt:Date.now()};state.user={uid:credential.user.uid,username:data.username||email.split('@')[0],email};}
          else state.user={uid:credential.user.uid,username:email.split('@')[0],email};
        }
        state.startedAt=Date.now();save();
      }else if(register)await registerLocalAccount({email,password,username});
      else await loginLocalAccount({email,password});
      render();notify(register?'Cuenta creada. Ya puedes jugar.':'Sesión iniciada. ¡Bienvenido!');
    }catch(error){
      if(createdFirebaseUser&&!state.user)await deleteUser(createdFirebaseUser).catch(()=>signOut(auth).catch(()=>{}));
      notify(auth?authErrorMessage(error):error.message||'No se pudo completar el acceso.');
    }finally{if(document.body.contains(submit)){submit.disabled=false;submit.innerHTML=`${register?'Crear mi cuenta':'Ingresar'} <span>→</span>`;}}
  };
  app.oninput=(ev)=>{if(ev.target.dataset.setting==='volume'){state.settings.volume=Number(ev.target.value);save();}};
  app.onchange=(ev)=>{if(ev.target.dataset.setting==='language'){state.settings.language=ev.target.value;save();notify('El idioma español está activo.');}};
}
let gameInstance;
function mountGame(){
  const host=document.querySelector('#phaser-game');
  if(!host||host.dataset.mounted)return;
  host.dataset.mounted='1';
  if(gameInstance){gameInstance.destroy(true);gameInstance=null;scene=null;}
  const pizzeriaScene=new PizzeriaScene();
  pizzeriaScene.setStateProvider(()=>state);
  gameInstance=new Phaser.Game({type:Phaser.CANVAS,parent:host,width:640,height:280,backgroundColor:'#e8c69c',transparent:false,scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},scene:pizzeriaScene,render:{antialias:true}});
  scene=pizzeriaScene;
}function canAfford(amount){if(state.money<amount){notify('Todavía no tienes suficiente dinero.');return false;}state.money-=amount;return true;}
function updateMoney(){const el=document.querySelector('#money');if(el)el.textContent=money();}
function stockNeeded(recipe){return Object.entries(recipe.ingredients).every(([key,n])=>state.stock[key]>=n);}
async function makePizza(button){if(state.paused){notify('Reanuda el juego para preparar pizzas.');return;}if(state.systemDown){notify('Repara el sistema para volver a producir.');return;}const recipe=recipes.find(r=>r.id===state.selected)||recipes[0];if(!unlocked(recipe)){notify('Esta receta todavía está bloqueada.');return;}if(!stockNeeded(recipe)){notify('Faltan ingredientes. Repón la alacena.');return;}for(const [key,n] of Object.entries(recipe.ingredients))state.stock[key]-=n;button.disabled=true;button.innerHTML='🍕 Horneando…';const cookBonus=Math.min(.65,avgLevel('cook')*.09),speed=state.researched.includes('oven')?0.5:1,wait=Math.max(700,recipe.time*1000*(1-cookBonus)*speed);await new Promise(resolve=>setTimeout(resolve,wait));const base=recipe.price*(state.researched.includes('dough')?1.3:1),managerBonus=1+state.employees.manager.length*.1,boost=state.boostUntil>Date.now()?1.5:1,premium=state.premiumUntil>Date.now()?1.5:1,delivery=state.researched.includes('delivery')&&state.employees.courier.length?1.2:1,event=state.event==='Pizza Day'&&state.eventUntil>Date.now()?3:state.event==='Fin de semana'&&state.eventUntil>Date.now()?1.3:1;const revenue=Math.round(base*managerBonus*boost*premium*delivery*event);state.money+=revenue;state.revenue+=revenue;state.sold++;state.streak++;state.bestStreak=Math.max(state.bestStreak,state.streak);state.reputation+=1+(avgLevel('server')?1:0);scoreStars();const fast=wait<5000;if(fast)state.reputation+=1;state.customers=Math.max(0,state.customers-1);state.order=null;const tip=state.employees.courier.length&&state.researched.includes('delivery')?' · delivery incluido':'';save();const toast=document.querySelector('#toast');if(toast){toast.innerHTML=`+${money(revenue)} <span class="float-pizza">🍕</span>${tip}`;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1300);}if(state.settings.sound)ding();button.disabled=false;button.innerHTML='Preparar y servir <span>→</span>';checkMilestones();setScene();if(document.querySelector('#view')?.innerHTML.includes('ALACENA'))showView('game');}
function ding(){try{const c=new AudioContext(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.setValueAtTime(.08,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.18);o.start();o.stop(c.currentTime+.18);}catch{}}
function hire(id){const employee=staff.find(s=>s.id===id);if(!employee||!canAfford(employee.hire))return;state.employees[id].push({level:1,tired:0});save();notify(`${employee.name} se unió a tu equipo.`);showView('upgrades');}
function train(id){if(!state.employees[id].length){notify('Contrata a alguien primero.');return;}if(!canAfford(250))return;for(const e of state.employees[id])e.level=Math.min(4,e.level+1);save();notify('¡Tu equipo subió de nivel!');showView('upgrades');}
function vacation(id){const arr=state.employees[id];if(!arr.length)return;const cost=Math.ceil(arr.length*staff.find(s=>s.id===id).salary*2);if(!canAfford(cost))return;arr.forEach(e=>{e.tired=0;e.level=Math.min(4,e.level+1);});save();notify(`El equipo volvió renovado. (${money(cost)})`);showView('upgrades');}
function expand(index){if(index!==state.expansions){notify('Completa las expansiones en orden.');return;}const e=expansions[index];if(!e||!canAfford(e.cost))return;state.expansions++;if(index===0){state.capacity+=20;}if(index===1){state.capacity+=10;state.customers+=2;}save();notify('¡Tu pizzería se ha expandido!');showView('upgrades');checkMilestones();}
function buyMarketing(index){const data=[[500,.2,60],[1500,.5,120],[5000,1,180],[10000,1.5,0]][index];if(!data||!canAfford(data[0]))return;state.marketingSpent+=data[0];if(index===3)state.reputation+=10;else state.marketing={bonus:data[1],end:Date.now()+data[2]*1000};state.customers+=index===3?5:Math.max(1,Math.ceil(state.customers*data[1]));scoreStars();save();notify(index===3?'El influenciador mejoró tu reputación.':'La campaña está atrayendo clientes.');showView('upgrades');checkMilestones();}
function restock(id,qty=10){const ing=ingredients.find(i=>i.id===id),cost=ing.price*qty;if(!canAfford(cost))return;state.stock[id]=Math.min(state.capacity,state.stock[id]+qty);save();updateMoney();}
function restockAll(){let added=0;for(const i of ingredients){const q=Math.min(10,state.capacity-state.stock[i.id]);if(q&&state.money>=i.price*q){state.money-=i.price*q;state.stock[i.id]+=q;added+=q;}}save();notify(added?`Alacena repuesta · ${money(state.money)} disponibles.`:'No se pudo reponer; revisa tu caja.');showView('game');}
function challenge(){if(!canAfford(500))return;const rival=Math.max(2,Math.min(5,5-state.stars+2));const win=state.stars>=rival||Math.random()>.55;if(win){state.money+=1000;state.reputation+=2;notify('¡Ganaste la batalla! +$1,000');}else{state.reputation=Math.max(0,state.reputation-2);notify('Don Rival se llevó la victoria esta vez.');}scoreStars();save();showView('game');}
function unlockLab(){if(!canAfford(2000))return;state.labUnlocked=true;save();showView('lab');}
function startResearch(id){if(state.researchJob){notify('Termina la investigación activa primero.');return;}const r=research.find(x=>x.id===id);if(!r||state.researched.includes(id)||!canAfford(r.cost))return;state.researchJob={id,end:Date.now()+r.duration*1000,duration:r.duration};save();notify(`Investigación iniciada: ${r.name}.`);showView('lab');}
function claimMission(id){const m=missions.find(x=>x.id===id);if(!m||state.missionClaims.includes(id)||!m.done(state))return;state.missionClaims.push(id);state.money+=m.reward;save();notify(`¡Misión cumplida! +${money(m.reward)}`);showView('missions');}
function checkMilestones(){const t=[['rich',state.money>=100000,'Trofeo Millonario desbloqueado'],['legend',state.stars>=5,'Trofeo Leyenda desbloqueado'],['empire',state.expansions>=5,'Trofeo Imperio desbloqueado'],['baker',state.sold>=10000,'Trofeo Panadero desbloqueado']];for(const [id,ok,msg] of t)if(ok&&!state.trophies.includes(id)){state.trophies.push(id);notify(`🏆 ${msg}`);}save();}
function tick(){if(!state.user||state.paused)return;state.totalSeconds++;const now=Date.now();if(now-state.lastFatigue>=60000){for(const arr of Object.values(state.employees))for(const employee of arr)employee.tired=Math.min(3,(employee.tired||0)+1);state.lastFatigue=now;}if(state.order&&now>state.order.expires){state.reputation=Math.max(0,state.reputation-2);state.streak=0;state.customers=Math.max(0,state.customers-1);state.order=null;scoreStars();notify('Un cliente se fue sin pedir.');}
  if(!state.order&&now-state.lastCustomer>10000){const candidates=recipes.filter(unlocked);const r=candidates[Math.floor(Math.random()*candidates.length)];state.order={id:r.id,name:r.name,face:['😊','😋','😐','🤩'][Math.floor(Math.random()*4)],mood:'Con hambre',expires:now+18000};const campaign=state.marketing&&state.marketing.end>now?Math.ceil(state.marketing.bonus*2):0;state.customers=Math.min(12,state.customers+1+campaign);state.lastCustomer=now;setScene();}
  if(now-state.lastSalary>30000){const salary=staff.reduce((sum,s)=>sum+state.employees[s.id].reduce((n,e)=>n+s.salary*e.level,0),0);if(salary){state.money-=salary;notify(`Nómina pagada: ${money(salary)}.`);}state.lastSalary=now;}
  if(state.marketing&&now>state.marketing.end)state.marketing=null;
  if(state.researchJob&&now>=state.researchJob.end){const id=state.researchJob.id;state.researched.push(id);state.researchJob=null;notify(`¡Investigación completada! ${research.find(r=>r.id===id)?.name}`);}
  if(state.researched.includes('automation')&&state.sold<100000&&now%8000<1000){const r=recipes.find(x=>x.id==='classic');if(stockNeeded(r)){for(const [k,n]of Object.entries(r.ingredients))state.stock[k]-=n;const gain=10;state.money+=gain;state.revenue+=gain;state.sold++;}}
  if(now-state.lastEventAt>=90000){state.lastEventAt=now;triggerEvent();}const day=new Date().toDateString();if(day!==state.lastDay){state.missionClaims=[];state.lastDay=day;notify('¡Nuevas misiones diarias disponibles!');}if(state.money<0&&Math.random()<.02)notify('Tu caja está en números rojos.');if(now%5000<1000)save();refreshLive();}
 function triggerEvent(){const weekend=['Saturday','Sunday'].includes(new Date().toLocaleDateString('en-US',{weekday:'long'}));const choices=[...(weekend?[['Fin de semana','+50% clientes y +30% ingresos',90]]:[]),['Lluvia','−30% clientes',40],['Pizza Day','+200% ingresos',60],['Día tranquilo','Los críticos visitan el local',20],['Caída del sistema','La producción se detuvo; restablece el sistema gratis para continuar.',30]];const e=choices[Math.floor(Math.random()*choices.length)];state.event=e[0];state.eventUntil=Date.now()+e[2]*1000;if(e[0]==='Día tranquilo'){state.reputation+=2;scoreStars();notify('¡El crítico gastronómico disfrutó la calidad! +2 reputación.');}else if(e[0]==='Lluvia')state.customers=Math.max(0,Math.floor(state.customers*.7));else if(e[0]==='Fin de semana')state.customers+=Math.ceil(state.customers*.5);else if(e[0]==='Pizza Day')notify('¡Día de Pizza! Las ventas valen x3.');else if(e[0]==='Caída del sistema'){state.systemDown=true;notify('Caída del sistema: restablécelo gratis para volver a producir.');}save();if(document.querySelector('#view'))showView('game');}
 function repairSystem(){if(!state.systemDown)return;state.systemDown=false;state.event=null;state.eventUntil=0;save();notify('Sistema restablecido. ¡A producir!');showView('game');}
function refreshLive(){updateMoney();const s=document.querySelector('#stars');if(s)s.textContent='★'.repeat(state.stars)+'☆'.repeat(5-state.stars);const c=document.querySelector('#customer-count');if(c)c.textContent=state.customers;const order=document.querySelector('.customer-order');if(order&&state.order){order.querySelector('.customer-face').textContent=state.order.face;order.querySelector('b').textContent=state.order.name;}const timer=document.querySelector('.order-footer span');if(timer&&state.order)timer.textContent=`⏳ ${Math.max(0,Math.ceil((state.order.expires-Date.now())/1000))}s`;if(state.researchJob&&document.querySelector('#view')?.innerHTML.includes('Laboratorio'))showView('lab');}
function showModal(content){document.querySelector('#modal-root').innerHTML=`<div class="modal-backdrop" data-action="close-modal"><section class="modal" onclick="event.stopPropagation()"><button class="modal-close" data-action="close-modal">×</button>${content}</section></div>`;attachEvents();}
function showStore(){showModal(`<p class="eyebrow">APOYA A TU PIZZERÍA</p><h2>Tienda <span>🛍️</span></h2><p class="muted">Compras de demostración. El cobro real requiere Stripe o PayPal.</p><div class="store-list">${[['💎','100 gemas','$0.99'],['💎','350 gemas','$2.99'],['💎','600 gemas','$4.99'],['💎','1,500 gemas','$9.99'],['💵','$10,000 en juego','$1.99'],['💵','$50,000 en juego','$4.99'],['👑','Pase premium · 30 días','$2.99'],['🎨','Decoración especial','$0.99'],['⚡','2× ingresos · 1 hora','$1.99']].map(([i,n,p],ix)=>`<div class="store-item"><span>${i}</span><b>${n}</b><strong>${p}</strong><button class="secondary" data-action="buy-demo" data-product="${ix}">Ver opción</button></div>`).join('')}</div><p class="hint">Esta tienda no procesa pagos ni entrega artículos comprados.</p>`);}
function demoPurchase(product){const ix=Number(product);if(ix<=3){notify('Las gemas requieren habilitar el proveedor de pagos.');return;}if(ix>=4&&ix<=5){notify('El paquete de dinero requiere checkout seguro configurado.');return;}if(ix===6){notify('El pase premium requiere suscripción y confirmación de pago.');return;}if(ix===7){notify('Cosméticos disponibles cuando se conecte la tienda.');return;}notify('Los multiplicadores requieren checkout seguro configurado.');}
function showAdmin(){showModal(`<p class="eyebrow">SOLO DESARROLLO · VISTA LOCAL</p><h2>Dashboard <span>🛡️</span></h2><p class="muted">Analítica del dispositivo actual. La versión privada necesita backend, autenticación administrativa y fuentes de pago/anuncios.</p><div class="stats-grid admin-grid">${[['Ingresos del juego',money(state.revenue)],['Usuarios activos','1 local'],['Instalaciones','No disponible'],['Compras','No disponible'],['Impresiones AdSense','No conectado'],['Retención','No disponible']].map(([k,v])=>`<div class="card stat-card"><small>${k}</small><b>${v}</b></div>`).join('')}</div><div class="card admin-action"><b>Administración de datos</b><p>Para exportar, ver usuarios o restablecer progreso hace falta conectar una base de datos segura.</p><button class="danger" data-action="reset-save">Restablecer mi progreso</button></div>`);}
document.addEventListener('click',(ev)=>{const b=ev.target.closest('[data-action="reset-save"]');if(b&&confirm('¿Borrar todo el progreso de este dispositivo?')){localStorage.removeItem(KEY);state=fresh();document.querySelector('#modal-root').innerHTML='';render();}});

render();
if(auth){setPersistence(auth,browserLocalPersistence).catch(()=>{});onAuthStateChanged(auth,async(user)=>{if(!user){stopPresence();return;}startPresence();if(!state.user){try{const remote=await getDoc(doc(db,'users',user.uid));if(remote.exists()){const data=remote.data();if(data.progress)state={...fresh(),...data.progress,startedAt:Date.now()};state.user={uid:user.uid,username:data.username||user.email?.split('@')[0]||'Chef',email:user.email};save();render();}else{state=fresh();state.user={uid:user.uid,username:user.email?.split('@')[0]||'Chef',email:user.email};save();render();}}catch{}}});}
setInterval(tick,1000);
setInterval(()=>{if(state.user)save();},5000);
if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('/sw.js').catch(()=>{});

