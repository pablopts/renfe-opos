/* Andén 1 · app de estudio (sin tests).
   El material de estudio NO va en la web: se importa desde un archivo .json y se guarda solo en el dispositivo (IndexedDB).
   El progreso de las tarjetas se guarda en localStorage. */
'use strict';
const DBN='anden1-estudio', ST='kv', KEY='material';
const BLOQUES=[
 {id:'B1',num:1,color:'var(--b1)',icon:'🎟️',title:'Actividad Comercial en el Transporte Ferroviario de Viajeros',subs:[
  {id:'B1S1',name:'Condiciones Generales de Transporte'},{id:'B1S2',name:'Normativa Comercial'},{id:'B1S3',name:'Pases Internacionales'}]},
 {id:'B2',num:2,color:'var(--b2)',icon:'⚖️',title:'II Plan de Igualdad de Género del Grupo Renfe',subs:[
  {id:'B2S1',name:'Grupo Renfe y Compromiso con la Igualdad'},{id:'B2S2',name:'Diagnóstico de Situación'},{id:'B2S3',name:'Auditoría Retributiva y Registro Salarial'},{id:'B2S4',name:'Protocolo contra el Acoso'},{id:'B2S5',name:'Estructura, Acciones y Sistema de Gestión'}]},
 {id:'B3',num:3,color:'var(--b3)',icon:'🦺',title:'Libro Blanco de la Cultura de Seguridad Operacional',subs:[
  {id:'B3S1',name:'Por qué revisar la Cultura de Seguridad'},{id:'B3S2',name:'Cultura de Seguridad y SGS'},{id:'B3S3',name:'Modelo de Cultura de Seguridad Renfe'},{id:'B3S4',name:'Plan de Transformación de la Cultura'}]},
 {id:'B4',num:4,color:'var(--b4)',icon:'⭐',title:'Nociones Básicas de Experiencia de Cliente en el Grupo Renfe',subs:[
  {id:'B4S1',name:'Introducción a la Experiencia de Cliente'},{id:'B4S2',name:'Fundamentos de la Experiencia de Cliente'},{id:'B4S3',name:'Diseño y Gestión de la Experiencia de Cliente'},{id:'B4S4',name:'Cultura de Servicio y Orientación al Cliente'},{id:'B4S5',name:'CX Digital, Fidelización y Resolución'}]},
 {id:'B5',num:5,color:'var(--b5)',icon:'🚄',title:'Conocimientos Básicos Ferroviarios',subs:[
  {id:'B5S1',name:'El Sistema Ferroviario e Historia'},{id:'B5S2',name:'Marco Normativo Europeo y Español'},{id:'B5S3',name:'La RFIG: Red Ferroviaria de Interés General'},{id:'B5S4',name:'Infraestructura, Vía y Energía'},{id:'B5S5',name:'Material Rodante'},{id:'B5S6',name:'Control, Mando y Señalización'},{id:'B5S7',name:'Explotación y Gestión del Tráfico'}]},
];
const TAGS={ya_preguntado:['Ya preguntado','t-ya'],trampa:['Trampa','t-tr'],clave:['Clave','t-cl']};

/* ---------- estado ---------- */
const S={tab:'inicio', sub:null, tema:null, grupo:'', soloTag:'', q:[], cur:null, flip:false, done:0, libre:false,
  cmp:null, caso:null, ver:false, buscar:'', tBloque:null, tSub:null, dark:false, ip:null, infoOpen:false};
let MAT=null, LOADED=false;
S.dark=true;

/* ---------- almacenamiento ---------- */
function idb(){return new Promise((ok,ko)=>{const r=indexedDB.open(DBN,1);r.onupgradeneeded=()=>r.result.createObjectStore(ST);r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error);});}
async function dbGet(k){const d=await idb();return new Promise((ok,ko)=>{const t=d.transaction(ST).objectStore(ST).get(k);t.onsuccess=()=>ok(t.result);t.onerror=()=>ko(t.error);});}
async function dbSet(k,v){const d=await idb();return new Promise((ok,ko)=>{const t=d.transaction(ST,'readwrite');t.objectStore(ST).put(v,k);t.oncomplete=()=>ok();t.onerror=()=>ko(t.error);});}
async function dbDel(k){const d=await idb();return new Promise((ok,ko)=>{const t=d.transaction(ST,'readwrite');t.objectStore(ST).delete(k);t.oncomplete=()=>ok();t.onerror=()=>ko(t.error);});}
function lsGet(k,def){try{const v=localStorage.getItem(k);return v?JSON.parse(v):def}catch{return def}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
async function loadMat(){try{MAT=await dbGet(KEY)||null}catch{MAT=null}LOADED=true;}

/* ---------- utilidades ---------- */
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/&lt;(\/?)b&gt;/g,'<$1b>');}
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=0|Math.random()*(i+1);[b[i],b[j]]=[b[j],b[i]]}return b}
function today(){const d=new Date();return Math.floor((d.getTime()-d.getTimezoneOffset()*60000)/86400000);}
function temas(){return MAT?MAT.temas:[];}
function tema(){return temas().find(t=>t.id===S.tema)||temas()[0];}
function srs(){return lsGet('rnf_srs',{});}
function cfg(){return lsGet('rnf_srs_cfg',{nuevas:20});}
function dayLog(){const l=lsGet('rnf_srs_day',{d:0,n:0});return l.d===today()?l:{d:today(),n:0};}
function toTop(){document.getElementById('scr')?.scrollTo(0,0);}
function go(){history.pushState({a:1},'');}
function toast(msg){const o=document.querySelector('.toast');if(o)o.remove();const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2600);}
function tagHtml(tags){return (tags||[]).filter(t=>TAGS[t]).sort((a,b)=>Object.keys(TAGS).indexOf(a)-Object.keys(TAGS).indexOf(b)).map(t=>`<span class="tag ${TAGS[t][1]}">${TAGS[t][0]}</span>`).join(' ');}
function filtCards(){const t=tema();if(!t)return[];return t.cards.filter(c=>(!S.grupo||c.grupo===S.grupo)&&(!S.soloTag||(c.tags||[]).includes(S.soloTag)));}
function counts(){
  const s=srs(),d=today();let due=0,nue=0,vistas=0;
  for(const c of filtCards()){const x=s[c.id];if(!x)nue++;else{vistas++;if(x.d<=d)due++;}}
  const lim=Math.max(0,cfg().nuevas-dayLog().n);
  return{due,nue,vistas,hoy:Math.min(nue,lim)};
}

/* ---------- importación ---------- */
async function importar(file){
  try{
    const data=JSON.parse(await file.text());
    if(data.formato!=='anden1-estudio'||!Array.isArray(data.temas))throw new Error('el archivo no es material de estudio de Andén 1.');
    const cur=MAT&&MAT.temas?MAT:{temas:[]};
    for(const t of data.temas){const i=cur.temas.findIndex(x=>x.id===t.id);if(i>=0)cur.temas[i]=t;else cur.temas.push(t);}
    cur.temas.sort((a,b)=>a.id.localeCompare(b.id));
    await dbSet(KEY,cur);MAT=cur;S.tema=data.temas[0].id;S.grupo='';
    try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch{}
    toast('Material importado: '+data.temas.length+(data.temas.length>1?' temas':' tema'));
    S.sub=null;render();
  }catch(e){alert('No se pudo importar: '+e.message);}
}
function pedirArchivo(){const i=document.createElement('input');i.type='file';i.accept='.json,application/json';i.style.display='none';document.body.appendChild(i);i.addEventListener('change',()=>{const f=i.files[0];i.remove();if(f)importar(f);});i.click();}
async function borrarMaterial(){if(!confirm('¿Borrar el material de estudio de este dispositivo? Tu progreso de tarjetas se conserva por si lo vuelves a importar.'))return;await dbDel(KEY);MAT=null;S.sub=null;render();}
function resetProgreso(){if(!confirm('¿Reiniciar el progreso? Todas las tarjetas volverán a salir como nuevas.'))return;lsSet('rnf_srs',{});lsSet('rnf_srs_day',{d:today(),n:0});render();}

/* ---------- repetición espaciada ---------- */
function startSesion(){
  const s=srs(),d=today(),c=counts(),all=filtCards();
  const due=shuffle(all.filter(x=>s[x.id]&&s[x.id].d<=d));
  const nue=all.filter(x=>!s[x.id]).slice(0,c.hoy);
  const q=[];let i=0,j=0;while(i<due.length||j<nue.length){if(i<due.length)q.push(due[i++]);if(i<due.length)q.push(due[i++]);if(j<nue.length)q.push(nue[j++]);}
  if(!q.length){toast('No hay tarjetas pendientes hoy con este filtro');return;}
  Object.assign(S,{q,cur:q[0],flip:false,done:0,libre:false,sub:'sesion'});go();render();toTop();
}
function startLibre(){const q=shuffle(filtCards());if(!q.length)return;Object.assign(S,{q,cur:q[0],flip:false,done:0,libre:true,sub:'sesion'});go();render();toTop();}
function voltear(){S.flip=true;render();}
function nextIvl(st,g){let i=st.i,e=st.e;if(g===1)i=Math.max(1,Math.round(i*1.2));if(g===2)i=Math.max(i+1,Math.round(i*e));if(g===3)i=Math.max(i+2,Math.round(i*e*1.3));return i;}
function calificar(g){ // 0 otra vez, 1 difícil, 2 bien, 3 fácil
  const c=S.cur,s=srs(),d=today(),x=s[c.id];
  if(!S.libre){
    if(!x){const l=dayLog();l.n++;lsSet('rnf_srs_day',l);}
    const st=x?{...x}:{i:0,e:2.5,r:0,l:0,d};
    if(g===0){if(x)st.l++;st.e=Math.max(1.3,st.e-0.2);st.i=0;st.d=d;}
    else if(st.i===0){st.i=g===3?4:1;st.d=d+st.i;st.r++;}
    else{const ni=nextIvl(st,g);if(g===1)st.e=Math.max(1.3,st.e-0.15);if(g===3)st.e+=0.15;st.i=ni;st.d=d+ni;st.r++;}
    s[c.id]=st;lsSet('rnf_srs',s);
  }
  S.q.shift();
  if(g===0)S.q.splice(Math.min(3,S.q.length),0,c);else S.done++;
  S.cur=S.q.length?S.q[0]:null;S.flip=false;render();toTop();
}

/* ---------- temario (el del alumno, viene en el material importado) ---------- */
function bloqueDe(tid){return BLOQUES[parseInt(tid.slice(1))-1]||{color:'var(--m)',icon:'📘',num:tid.slice(1)};}
/* ---------- piezas comunes ---------- */
function head(titulo,kicker,back){
  return `<div class="hd">${back?`<button class="btn btn-g btn-sm" onclick="${back}">← Volver</button>`:''}<div class="hd-t"><div class="kick">${esc(kicker||'')}</div><div class="tit">${titulo}</div></div></div>`;
}
function selTema(){const ts=temas();if(ts.length<2)return'';return `<select class="sel" onchange="S.tema=this.value;S.grupo='';render()">${ts.map(t=>`<option value="${t.id}" ${t.id===tema().id?'selected':''}>${esc(t.titulo)}</option>`).join('')}</select>`;}
function selGrupo(){const t=tema();return `<select class="sel" onchange="S.grupo=this.value;render()"><option value="">Todo el tema</option>${t.grupos.map(g=>`<option ${g===S.grupo?'selected':''}>${esc(g)}</option>`).join('')}</select>`;}
function sinMaterial(){
  return `<div class="box"><p>Aquí estudias con <b>tarjetas de repaso</b> (repetición espaciada), <b>trucos</b>, <b>esquemas comparativos</b> y <b>casos prácticos</b>.</p>
    <p>El material no está en la web: lo importas desde el archivo <b>.json</b> que te pasa Claude y se guarda solo en este dispositivo. Funciona sin conexión.</p>
    <button class="btn btn-p" style="margin-top:.8rem" onclick="pedirArchivo()">📥 Importar material</button></div>`;
}

/* ---------- vistas ---------- */
function vInicio(){
  const cf=cfg();
  const popover=`<div class="info-wrap"><button class="info-toggle" onclick="toggleInfo(event)" aria-label="Ajustes">ℹ</button><div class="info-panel" style="display:${S.infoOpen?'flex':'none'}"><div class="aj-row">Nuevas por día <span><button class="btn btn-g btn-sm" onclick="setNuevas(-5)">−</button> <b>${cf.nuevas}</b> <button class="btn btn-g btn-sm" onclick="setNuevas(5)">+</button></span></div><button class="lnk" onclick="pedirArchivo()">📥 Importar o actualizar material</button><button class="lnk" onclick="resetProgreso()">↺ Reiniciar progreso de tarjetas</button><button class="lnk" onclick="borrarMaterial()">🗑 Borrar material del dispositivo</button>${S.ip?'<button class="lnk" onclick="instalar()">📱 Instalar como app</button>':''}</div></div>`;
  const brand=`<div class="brand">${popover}<div class="anden-title">Andén 1</div><div class="anden-tagline">Próxima parada: Operador Comercial</div></div>`;
  if(!LOADED)return brand+`<div class="loader"><div class="spin"></div></div>`;
  if(!MAT||!temas().length)return brand+`<div class="pad">${sinMaterial()}</div>`;
  const c=counts(),tot=c.vistas+c.nue,pct=tot?Math.round(c.vistas*100/tot):0;
  const svgBilleteria=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="30 30 140 145"><defs><filter id="iS1"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#000" flood-opacity="0.55"/></filter><linearGradient id="iAp1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#182743"/><stop offset="100%" stop-color="#0a1626"/></linearGradient><linearGradient id="iAcL1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f0d8c0"/><stop offset="100%" stop-color="#ca9471"/></linearGradient></defs><g filter="url(#iS1)"><g transform="translate(100,110) rotate(-40) translate(-28,-52)"><rect x="0" y="0" width="56" height="90" rx="8" fill="url(#iAp1)" stroke="#0e0420" stroke-width="1.5"/></g><g transform="translate(100,110) rotate(32) translate(-28,-52)"><rect x="0" y="0" width="56" height="90" rx="8" fill="url(#iAp1)" stroke="#0e0420" stroke-width="1.5"/></g><g transform="translate(100,108) rotate(0) translate(-29,-54)"><rect x="0" y="0" width="58" height="94" rx="8" fill="url(#iAcL1)" stroke="#e8d060" stroke-width="2"/><path d="M0,8A8,8 0 0 1 8,0L50,0A8,8 0 0 1 58,8L58,22L0,22Z" fill="url(#iAp1)"/><text x="29" y="15" font-family="Trebuchet MS,Arial,sans-serif" font-weight="900" font-style="italic" font-size="11" fill="#ca9471" text-anchor="middle">renfe</text><line x1="10" y1="34" x2="48" y2="34" stroke="#1a0a3a" stroke-width="3.5" stroke-linecap="round"/><line x1="10" y1="45" x2="38" y2="45" stroke="#1a0a3a" stroke-width="2.5" stroke-linecap="round" opacity=".55"/><line x1="10" y1="55" x2="28" y2="55" stroke="#1a0a3a" stroke-width="2" stroke-linecap="round" opacity=".35"/><circle cx="12" cy="76" r="4" fill="#7B4FBE"/><circle cx="46" cy="76" r="4" fill="#7B4FBE"/><line x1="16" y1="76" x2="42" y2="76" stroke="#7B4FBE" stroke-width="1.5" stroke-dasharray="3,3"/></g></g></svg>`;
  const svgCuaderno=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><filter id="iS2"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#000" flood-opacity="0.55"/></filter><linearGradient id="iAp2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0e2860"/><stop offset="100%" stop-color="#040e28"/></linearGradient><linearGradient id="iAc2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#60d8d0"/><stop offset="100%" stop-color="#209890"/></linearGradient><linearGradient id="iRing2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#40c8c0"/><stop offset="100%" stop-color="#107870"/></linearGradient></defs><g filter="url(#iS2)"><path d="M148,58L162,58C165,58 167,60 167,63L167,75C167,78 165,80 162,80L148,80Z" fill="url(#iAc2)"/><path d="M148,90L162,90C165,90 167,92 167,95L167,107C167,110 165,112 162,112L148,112Z" fill="url(#iAp2)" stroke="#e8c04040" stroke-width="1"/><path d="M48,150L148,150C153,150 157,146 158,141L162,55C162,51 158,48 153,48L50,48Z" fill="#b8ccf030" stroke="#b8ccf050" stroke-width="1.5"/><rect x="38" y="44" width="112" height="106" rx="10" fill="url(#iAp2)" stroke="#040e28" stroke-width="2.5"/><text x="94" y="68" font-family="Trebuchet MS,Arial,sans-serif" font-weight="900" font-style="italic" font-size="13" fill="#40c8c0" text-anchor="middle">renfe</text><path d="M28,58C28,55 32,55 42,55L42,63C32,63 28,63 28,60Z" fill="url(#iRing2)"/><circle cx="44" cy="59" r="2.5" fill="#040e28"/><path d="M28,82C28,79 32,79 42,79L42,87C32,87 28,87 28,84Z" fill="url(#iRing2)"/><circle cx="44" cy="83" r="2.5" fill="#040e28"/><path d="M28,106C28,103 32,103 42,103L42,111C32,111 28,111 28,108Z" fill="url(#iRing2)"/><circle cx="44" cy="107" r="2.5" fill="#040e28"/><path d="M28,130C28,127 32,127 42,127L42,135C32,135 28,135 28,132Z" fill="url(#iRing2)"/><circle cx="44" cy="131" r="2.5" fill="#040e28"/><line x1="60" y1="82" x2="128" y2="82" stroke="#b8ccf0" stroke-width="2.5" stroke-linecap="round" opacity=".8"/><line x1="60" y1="96" x2="118" y2="96" stroke="#b8ccf0" stroke-width="2" stroke-linecap="round" opacity=".55"/><line x1="60" y1="108" x2="100" y2="108" stroke="#b8ccf0" stroke-width="2" stroke-linecap="round" opacity=".35"/><line x1="60" y1="74" x2="128" y2="74" stroke="url(#iAc2)" stroke-width="1.5" stroke-linecap="round" opacity=".7"/></g></svg>`;
  const svgSenales=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><filter id="iS3"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#000" flood-opacity="0.55"/></filter><linearGradient id="iAp3v" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#1e441780"/><stop offset="50%" stop-color="#2a5c20"/><stop offset="100%" stop-color="#1e441780"/></linearGradient><linearGradient id="iPlate3" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#1e4417"/><stop offset="100%" stop-color="#0c200a"/></linearGradient><radialGradient id="iGG3" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#86efac"/><stop offset="40%" stop-color="#00b448"/><stop offset="100%" stop-color="#004d1a"/></radialGradient><radialGradient id="iRG3" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fca5a5"/><stop offset="45%" stop-color="#dc2626"/><stop offset="100%" stop-color="#7f1d1d"/></radialGradient></defs><g filter="url(#iS3)"><rect x="88" y="145" width="24" height="32" rx="4" fill="url(#iPlate3)" stroke="#040e08" stroke-width="2"/><rect x="96" y="30" width="8" height="120" rx="2" fill="url(#iAp3v)"/><circle cx="100" cy="28" r="6" fill="#1e4417" stroke="#0c200a" stroke-width="1.5"/><g transform="translate(100,57) rotate(-28)"><rect x="-50" y="-10" width="100" height="20" rx="4" fill="url(#iPlate3)" stroke="#a76ecd" stroke-width="2"/><text x="0" y="5" font-family="Arial Black,sans-serif" font-weight="900" font-size="10" fill="#a76ecd" text-anchor="middle" letter-spacing="1">SEÑALES</text></g><g transform="translate(100,57) rotate(28)"><rect x="-50" y="-10" width="100" height="20" rx="4" fill="url(#iPlate3)" stroke="#a76ecd" stroke-width="2"/><text x="0" y="5" font-family="Arial Black,sans-serif" font-weight="900" font-size="10" fill="#a76ecd" text-anchor="middle" letter-spacing="1">TRUCOS</text></g><circle cx="100" cy="57" r="5" fill="#a76ecd" stroke="#1e4417" stroke-width="2"/><rect x="58" y="100" width="84" height="7" rx="2" fill="url(#iAp3v)"/><g transform="translate(62,104)"><circle cx="0" cy="0" r="20" fill="url(#iPlate3)" stroke="#1e4417" stroke-width="2"/><circle cx="0" cy="0" r="15" fill="#a76ecd"/><circle cx="0" cy="0" r="12" fill="url(#iRG3)"/></g><g transform="translate(138,104)"><circle cx="0" cy="0" r="20" fill="url(#iPlate3)" stroke="#1e4417" stroke-width="2"/><circle cx="0" cy="0" r="15" fill="#a76ecd"/><circle cx="0" cy="0" r="12" fill="url(#iGG3)"/><circle cx="0" cy="0" r="18" fill="none" stroke="#a76ecd" stroke-width="1.5" opacity=".6" stroke-dasharray="3,3"/></g></g></svg>`;
  const svgCuadroMandos=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><filter id="iS4"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#000" flood-opacity="0.55"/></filter><linearGradient id="iAp4" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#3a0e00"/><stop offset="100%" stop-color="#160400"/></linearGradient><linearGradient id="iPan4" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f0d878"/><stop offset="100%" stop-color="#c8a020"/></linearGradient><linearGradient id="iScr4" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#1a0500"/><stop offset="100%" stop-color="#080200"/></linearGradient><linearGradient id="iBar4a" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f0d060"/><stop offset="100%" stop-color="#c08010"/></linearGradient><linearGradient id="iBar4g" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#4ade80"/><stop offset="100%" stop-color="#008f39"/></linearGradient><linearGradient id="iTog4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f0d878"/><stop offset="50%" stop-color="#c8a020"/><stop offset="100%" stop-color="#7a5800"/></linearGradient></defs><g filter="url(#iS4)"><path d="M32,148L168,148C174,148 178,144 176,138L166,112C165,108 160,105 154,105L46,105C40,105 35,108 34,112L24,138C22,144 26,148 32,148Z" fill="url(#iAp4)" stroke="#0a0200" stroke-width="2"/><rect x="52" y="122" width="16" height="14" rx="3" fill="#200600" stroke="#f0d06040" stroke-width="1"/><circle cx="60" cy="125" r="3" fill="url(#iBar4g)"/><path d="M58,125L56,114C56,112 64,112 64,114L62,125Z" fill="url(#iTog4)" stroke="#80400010" stroke-width="1"/><rect x="92" y="122" width="16" height="14" rx="3" fill="#200600" stroke="#f0d06040" stroke-width="1"/><circle cx="100" cy="133" r="3" fill="url(#iBar4a)"/><path d="M98,133L96,122C96,120 104,120 104,122L102,133Z" fill="url(#iTog4)" stroke="#80400010" stroke-width="1"/><rect x="132" y="122" width="16" height="14" rx="3" fill="#200600" stroke="#f0d06040" stroke-width="1"/><circle cx="140" cy="125" r="3" fill="url(#iBar4g)"/><path d="M138,125L136,114C136,112 144,112 144,114L142,125Z" fill="url(#iTog4)" stroke="#80400010" stroke-width="1"/><rect x="36" y="32" width="128" height="80" rx="10" fill="url(#iPan4)" stroke="#a07010" stroke-width="2.5"/><rect x="42" y="38" width="116" height="68" rx="7" fill="url(#iScr4)" stroke="#c08010" stroke-width="2"/><rect x="52" y="44" width="22" height="5" rx="2.5" fill="#fff8d0" opacity=".85"/><rect x="88" y="44" width="28" height="5" rx="2.5" fill="url(#iBar4a)"/><rect x="126" y="44" width="22" height="5" rx="2.5" fill="url(#iBar4g)"/><rect x="52" y="60" width="20" height="6" rx="2" fill="#fff8d0" opacity=".5"/><rect x="86" y="60" width="28" height="6" rx="3" fill="url(#iBar4g)"/><rect x="124" y="60" width="18" height="6" rx="3" fill="url(#iBar4a)"/><rect x="52" y="74" width="24" height="6" rx="2" fill="#fff8d0" opacity=".5"/><rect x="86" y="74" width="16" height="6" rx="3" fill="url(#iBar4a)"/><rect x="124" y="74" width="24" height="6" rx="3" fill="url(#iBar4g)"/><rect x="52" y="88" width="18" height="6" rx="2" fill="#fff8d0" opacity=".5"/><rect x="86" y="88" width="22" height="6" rx="3" fill="url(#iBar4a)"/><rect x="124" y="88" width="14" height="6" rx="3" fill="url(#iBar4g)"/><circle cx="52" cy="35" r="2" fill="#008f39"/><circle cx="58" cy="35" r="2" fill="#f0d060"/></g></svg>`;
  const svgCasos=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><filter id="iS5"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#000" flood-opacity="0.5"/></filter><linearGradient id="iAp5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#54060b"/><stop offset="100%" stop-color="#280206"/></linearGradient><linearGradient id="iAc5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#70ffcc"/><stop offset="100%" stop-color="#18b880"/></linearGradient><linearGradient id="iBub5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#d0fff0"/><stop offset="100%" stop-color="#80e8c0"/></linearGradient><linearGradient id="iGI5" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#4ade80"/><stop offset="100%" stop-color="#008f39"/></linearGradient></defs><g filter="url(#iS5)"><rect x="42" y="48" width="116" height="100" rx="14" fill="url(#iAp5)" stroke="#0a0400" stroke-width="2.5"/><line x1="65" y1="76" x2="135" y2="76" stroke="#50ebba" stroke-width="2.5" stroke-linecap="round" opacity=".4"/><circle cx="65" cy="76" r="6" fill="url(#iAc5)" stroke="#d0fff0" stroke-width="1.5"/><circle cx="100" cy="76" r="5" fill="#F5A800" stroke="#d0fff0" stroke-width="1.5"/><circle cx="135" cy="76" r="5" fill="#d0fff0" stroke="#50ebba" stroke-width="1.5" opacity=".5"/><g transform="translate(48,90)"><rect x="0" y="0" width="104" height="50" rx="9" fill="url(#iBub5)" stroke="url(#iAc5)" stroke-width="2"/><path d="M28,50L36,62L44,50Z" fill="url(#iBub5)" stroke="url(#iAc5)" stroke-width="2" stroke-linejoin="round"/><rect x="29" y="48" width="14" height="4" fill="#ffeedd"/><line x1="14" y1="16" x2="90" y2="16" stroke="#3a1e00" stroke-width="3.5" stroke-linecap="round"/><line x1="14" y1="28" x2="68" y2="28" stroke="#5a2e10" stroke-width="2.5" stroke-linecap="round" opacity=".65"/><line x1="14" y1="38" x2="46" y2="38" stroke="#5a2e10" stroke-width="2" stroke-linecap="round" opacity=".4"/><circle cx="84" cy="32" r="8" fill="url(#iGI5)"/><path d="M80,32L83,35L89,28" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g></g></svg>`;
  const grid=`<div class="inicio-grid">
    <button class="i-card" style="background:#7B4FBE" onclick="startSesion()">
      ${svgBilleteria}
      <div class="i-lbl">Billetería</div>
    </button>
    <button class="i-card" style="background:#3B6FD4" onclick="setTab('temario')">
      ${svgCuaderno}
      <div class="i-lbl">Cuaderno</div>
    </button>
    <button class="i-card" style="background:#2A7A5A" onclick="setTab('trucos')">
      ${svgSenales}
      <div class="i-lbl">Señales</div>
    </button>
    <button class="i-card" style="background:#E8650A" onclick="setTab('esquemas')">
      ${svgCuadroMandos}
      <div class="i-lbl">Cuadro de mandos</div>
    </button>
    <button class="i-card" style="background:#F5A800" onclick="setTab('casos')">
      ${svgCasos}
      <div class="i-lbl i-lbl-dk">Casos en ruta</div>
    </button>
  </div>`;
  return brand+`<div class="pad">${grid}</div>`;
}
function vSesion(){
  if(!S.cur)return `<div class="pad">${head('Sesión terminada','', 'salirSesion()')}<div class="box center"><div style="font-size:2.5rem">🎉</div><p><b>${S.done}</b> tarjetas repasadas.</p><button class="btn btn-p" onclick="salirSesion()">Volver</button></div></div>`;
  const c=S.cur,st=srs()[c.id],pv=g=>(S.libre||!st||st.i===0)?'':`<small>${nextIvl(st,g)} d</small>`;
  return `<div class="pad">${head(S.libre?'Repaso libre':'Sesión de tarjetas',S.q.length+' pendientes','salirSesion()')}
    <div class="box flash" onclick="${S.flip?'':'voltear()'}">
      <div class="grp">${esc(c.grupo)}</div>${tagHtml(c.tags)}
      <div class="q">${esc(c.q)}</div>
      ${S.flip?`<div class="a">${esc(c.a)}</div><div class="cita"><div class="ap">Temario · ${esc(c.apartado)}</div>${esc(c.cita)}</div>`:`<div class="hint">Piensa la respuesta y toca para verla</div>`}
    </div>
    ${S.flip?(S.libre?`<div class="row2"><button class="btn btn-g" onclick="calificar(0)">Otra vez</button><button class="btn btn-p" onclick="calificar(2)">Siguiente</button></div>`
      :`<div class="row4"><button class="eb eb0" onclick="calificar(0)">Otra vez<small>hoy</small></button><button class="eb eb1" onclick="calificar(1)">Difícil${pv(1)}</button><button class="eb eb2" onclick="calificar(2)">Bien${pv(2)||'<small>1 d</small>'}</button><button class="eb eb3" onclick="calificar(3)">Fácil${pv(3)||'<small>4 d</small>'}</button></div>`)
      :`<button class="btn btn-p wide" style="margin-top:.4rem" onclick="voltear()">Ver respuesta</button>`}</div>`;
}
function vTrucos(){
  if(!MAT)return `<div class="pad">${head('💡 Trucos y reglas','Estudio')}${sinMaterial()}</div>`;
  const t=tema(),b=S.buscar.toLowerCase();
  const items=t.trucos.filter(x=>(!S.grupo||x.grupo===S.grupo)&&(!b||(x.titulo+' '+x.texto).toLowerCase().includes(b)));
  let html='',g0=null;
  for(const x of items){if(x.grupo!==g0){g0=x.grupo;html+=`<div class="gh">${esc(g0)}</div>`;}
    html+=`<div class="truco ${x.origen==='clase'?'cl':'pr'}"><div class="tt">${esc(x.titulo)} <span>${x.origen==='clase'?'de clase':'propio'}</span></div><div>${esc(x.texto)}</div></div>`;}
  return `<div class="pad">${head('💡 Trucos y reglas',t.titulo)}
    <div class="filtros">${selTema()}${selGrupo()}<input id="busca" class="sel" placeholder="Buscar…" value="${esc(S.buscar)}" oninput="buscarT(this.value)"></div>
    ${html||'<p class="empty">Nada con este filtro.</p>'}</div>`;
}
let _bt;function buscarT(v){S.buscar=v;clearTimeout(_bt);_bt=setTimeout(()=>{render();const i=document.getElementById('busca');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},300);}
function vEsquemas(){
  if(!MAT)return `<div class="pad">${head('📊 Esquemas comparativos','Estudio')}${sinMaterial()}</div>`;
  const t=tema();
  if(S.cmp!=null){const c=t.comparativas[S.cmp];
    return `<div class="pad">${head(esc(c.titulo),t.titulo,'S.cmp=null;render()')}
      ${c.intro?`<p class="intro">${esc(c.intro)}</p>`:''}
      ${c.tablas.map(tb=>`${tb.subtitulo?`<div class="gh">${esc(tb.subtitulo)}</div>`:''}<div class="tw"><table class="tb"><thead><tr>${tb.cabecera.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${tb.filas.map(r=>`<tr>${r.map((v,i)=>i?`<td>${esc(v)}</td>`:`<th>${esc(v)}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('')}
      ${(c.claves||[]).map(k=>`<div class="clave"><b>Clave:</b> ${esc(k)}</div>`).join('')}</div>`;}
  return `<div class="pad">${head('📊 Esquemas comparativos',t.titulo)}<div class="filtros">${selTema()}</div>
    ${t.comparativas.map((c,i)=>`<div class="item" onclick="S.cmp=${i};go();render();toTop()"><div><div class="it-t">${esc(c.titulo)}</div><div class="it-s">${c.tablas.length} tabla${c.tablas.length>1?'s':''}</div></div><span>›</span></div>`).join('')}</div>`;
}
function vCasos(){
  if(!MAT)return `<div class="pad">${head('🎫 Casos prácticos','Estudio')}${sinMaterial()}</div>`;
  const t=tema();
  if(S.caso!=null){const c=t.casos[S.caso];
    return `<div class="pad">${head('Caso '+(S.caso+1)+'. '+esc(c.titulo),c.grupo,'S.caso=null;S.ver=false;render()')}
      <div class="box"><p>${esc(c.planteamiento)}</p><div class="preg"><b>Pregunta:</b> ${esc(c.pregunta)}</div></div>
      ${S.ver?`<div class="box"><div class="gh" style="margin-top:0">Solución</div><p>${esc(c.solucion)}</p><div class="cita"><div class="ap">Temario</div>${esc(c.norma)}</div></div>`
        :`<button class="btn btn-p wide" onclick="S.ver=true;render()">Ver solución</button>`}
      <div class="row2" style="margin-top:1rem">${S.caso>0?`<button class="btn btn-g btn-sm" onclick="S.caso--;S.ver=false;render();toTop()">‹ Anterior</button>`:'<span></span>'}${S.caso<t.casos.length-1?`<button class="btn btn-g btn-sm" onclick="S.caso++;S.ver=false;render();toTop()">Siguiente ›</button>`:''}</div></div>`;}
  let html='',g0=null;
  t.casos.forEach((c,i)=>{if(S.grupo&&c.grupo!==S.grupo)return;if(c.grupo!==g0){g0=c.grupo;html+=`<div class="gh">${esc(g0)}</div>`;}
    html+=`<div class="item" onclick="S.caso=${i};S.ver=false;go();render();toTop()"><div class="it-t">Caso ${i+1}. ${esc(c.titulo)}</div><span>›</span></div>`;});
  return `<div class="pad">${head('🎫 Casos prácticos',t.titulo)}<div class="filtros">${selTema()}${selGrupo()}</div>${html}</div>`;
}
function vTemario(){
  if(!MAT)return `<div class="pad">${head('📚 Mi temario','Lectura')}${sinMaterial()}</div>`;
  const ts=temas().filter(t=>t.temario&&t.temario.length);
  if(!ts.length)return `<div class="pad">${head('📚 Mi temario','Lectura')}<div class="box"><p>El material importado no trae tu temario. Importa la versión nueva del archivo de material.</p><button class="btn btn-p" style="margin-top:.6rem" onclick="pedirArchivo()">📥 Importar material</button></div></div>`;
  if(S.tBloque){
    const t=ts.find(x=>x.id===S.tBloque); if(!t){S.tBloque=null;return vTemario();}
    if(S.tSub!=null){
      const s=t.temario[S.tSub];
      return `<div class="pad">${head(esc(s.titulo),t.titulo,'S.tSub=null;render()')}<div class="box temario">${s.html}</div>
        <div class="row2">${S.tSub>0?`<button class="btn btn-g btn-sm" onclick="S.tSub--;render();toTop()">‹ Anterior</button>`:'<span></span>'}${S.tSub<t.temario.length-1?`<button class="btn btn-g btn-sm" onclick="S.tSub++;render();toTop()">Siguiente ›</button>`:''}</div></div>`;
    }
    let html='',g0=null;
    t.temario.forEach((s,i)=>{if(s.grupo&&s.grupo!==g0){html+=`<div class="gh">${esc(s.grupo)}</div>`;}g0=s.grupo;
      html+=`<div class="item" onclick="S.tSub=${i};go();render();toTop()"><div class="it-t">${esc(s.titulo)}</div><span>›</span></div>`;});
    return `<div class="pad">${head(esc(t.titulo),'Mi temario','S.tBloque=null;render()')}${html}</div>`;
  }
  return `<div class="pad">${head('📚 Mi temario','Tus resúmenes con las notas de clase')}
    <div class="leyenda"><span class="nota n-ya">Ya preguntado</span><span class="nota n-clave">Clave de clase</span><span class="nota n-truco">Truco</span><span class="nota n-ojo">Ojo con el temario</span><span class="nota n-nopri">No priorizar</span></div>
    ${ts.map(t=>{const b=bloqueDe(t.id);return `<div class="item" onclick="S.tBloque='${t.id}';S.tSub=null;go();render();toTop()"><div class="num" style="background:${b.color}">${b.num}</div><div style="flex:1"><div class="it-t">${esc(t.titulo)}</div><div class="it-s">${t.temario.length} apartados</div></div><span>›</span></div>`}).join('')}</div>`;
}

/* ---------- render y navegación ---------- */
const TABS=[['inicio','🃏','Tarjetas'],['temario','📚','Temario'],['trucos','💡','Trucos'],['esquemas','📊','Esquemas'],['casos','🎫','Casos']];
function render(){
  try{
  document.body.classList.toggle('dark',S.dark);
  let v;
  if(S.sub==='sesion')v=vSesion();
  else v={inicio:vInicio,trucos:vTrucos,esquemas:vEsquemas,casos:vCasos,temario:vTemario}[S.tab]();
  document.getElementById('app').innerHTML=`<div class="screen" id="scr">${v}</div>`;
  }catch(e){document.getElementById('app').innerHTML='<div style="padding:2rem;color:red;font-size:.8rem;word-break:break-all">ERROR: '+e.message+'<br>'+e.stack+'</div>';}
}
function setTab(k){if(S.tab===k&&!S.cmp&&S.caso==null&&!S.tBloque)return toTop();S.tab=k;S.cmp=null;S.caso=null;S.ver=false;S.tBloque=null;S.tSub=null;S.buscar='';go();render();toTop();}
function salirSesion(){S.sub=null;S.cur=null;render();toTop();}
function back(){
  if(S.sub==='sesion'){salirSesion();return true;}
  if(S.cmp!=null){S.cmp=null;render();return true;}
  if(S.caso!=null){S.caso=null;S.ver=false;render();return true;}
  if(S.tSub!=null){S.tSub=null;render();return true;}
  if(S.tBloque){S.tBloque=null;render();return true;}
  if(S.tab!=='inicio'){S.tab='inicio';render();return true;}
  return false;
}
if('navigation' in window){
  navigation.addEventListener('navigate',e=>{
    if(e.navigationType==='traverse'&&e.destination.index<navigation.currentEntry.index){
      e.intercept({handler:async()=>{back();}});
    }
  });
}else{
  window.addEventListener('popstate',()=>{
    history.pushState({a:1},'');
    back();
  });
}
function setNuevas(d){const c=cfg();c.nuevas=Math.max(5,Math.min(100,c.nuevas+d));lsSet('rnf_srs_cfg',c);render();}
function toggleInfo(e){e&&e.stopPropagation();S.infoOpen=!S.infoOpen;render();if(S.infoOpen){setTimeout(()=>document.addEventListener('click',_closeInfo,{once:true}),0);}}
function _closeInfo(){S.infoOpen=false;render();}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();S.ip=e;render();});
function instalar(){if(S.ip){S.ip.prompt();S.ip.userChoice.then(()=>{S.ip=null;render();});}}
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});

// Metemos suficientes estados en el historial para que el botón atrás nunca agote la pila
history.replaceState({a:0},'');
for(let i=1;i<=10;i++)history.pushState({a:i},'');
render();
loadMat().then(()=>{if(MAT&&!S.tema)S.tema=temas()[0]?.id;render();});
