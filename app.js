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
  cmp:null, caso:null, ver:false, buscar:'', tBloque:null, tSub:null, dark:false, ip:null};
let MAT=null, LOADED=false;
try{S.dark=localStorage.getItem('rnf_dark')==='1'}catch{}

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
  const brand=`<div class="brand"><button class="dark-toggle" onclick="toggleDark()">${S.dark?'☀️':'🌙'}</button><div class="anden-title">Andén 1</div><div class="anden-tagline">Próxima parada: Operador Comercial</div></div>`;
  if(!LOADED)return brand+`<div class="loader"><div class="spin"></div></div>`;
  if(!MAT||!temas().length)return brand+`<div class="pad">${sinMaterial()}</div>`;
  const t=tema(),c=counts(),cf=cfg(),tot=c.vistas+c.nue,pct=tot?Math.round(c.vistas*100/tot):0;
  return brand+`<div class="pad">
    <div class="filtros">${selTema()}${selGrupo()}
      <div class="chips">${['','ya_preguntado','trampa','clave'].map(k=>`<button class="chip ${S.soloTag===k?'on':''}" onclick="S.soloTag='${k}';render()">${k?TAGS[k][0]:'Todas'}</button>`).join('')}</div></div>
    <div class="box main">
      <div class="stats"><div><b>${c.due}</b><span>para repasar</span></div><div><b>${c.hoy}</b><span>nuevas hoy</span></div><div><b>${pct}%</b><span>visto (${c.vistas}/${tot})</span></div></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <button class="btn btn-p wide" onclick="startSesion()" ${c.due+c.hoy?'':'disabled'}>${c.due+c.hoy?'Empezar sesión · '+(c.due+c.hoy)+' tarjetas':'¡Al día! Vuelve mañana'}</button>
      <button class="btn btn-g btn-sm wide" style="margin-top:.5rem" onclick="startLibre()">Repaso libre (no cambia el calendario)</button>
    </div>
    <div class="ajustes">
      <div class="aj-row">Nuevas por día <span><button class="btn btn-g btn-sm" onclick="setNuevas(-5)">−</button> <b>${cf.nuevas}</b> <button class="btn btn-g btn-sm" onclick="setNuevas(5)">+</button></span></div>
      <button class="lnk" onclick="pedirArchivo()">📥 Importar o actualizar material</button>
      <button class="lnk" onclick="resetProgreso()">↺ Reiniciar progreso de tarjetas</button>
      <button class="lnk" onclick="borrarMaterial()">🗑 Borrar material del dispositivo</button>
      ${S.ip?`<button class="lnk" onclick="instalar()">📱 Instalar como app</button>`:''}
    </div></div>`;
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
  document.body.classList.toggle('dark',S.dark);
  let v;
  if(S.sub==='sesion')v=vSesion();
  else v={inicio:vInicio,trucos:vTrucos,esquemas:vEsquemas,casos:vCasos,temario:vTemario}[S.tab]();
  const enSesion=S.sub==='sesion';
  document.getElementById('app').innerHTML=`<div class="screen" id="scr">${v}</div>
    ${enSesion?'':`<nav class="tabs">${TABS.map(([k,i,l])=>`<button class="tab ${S.tab===k?'on':''}" onclick="setTab('${k}')"><span>${i}</span>${l}</button>`).join('')}</nav>`}`;
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
window.addEventListener('popstate',()=>{
  // Reponemos el estado ANTES de procesar, para que Android nunca vea el historial vacío
  history.pushState({a:1},'');
  back();
});
function setNuevas(d){const c=cfg();c.nuevas=Math.max(5,Math.min(100,c.nuevas+d));lsSet('rnf_srs_cfg',c);render();}
function toggleDark(){S.dark=!S.dark;try{localStorage.setItem('rnf_dark',S.dark?'1':'0')}catch{};render();}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();S.ip=e;render();});
function instalar(){if(S.ip){S.ip.prompt();S.ip.userChoice.then(()=>{S.ip=null;render();});}}
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});

// Metemos suficientes estados en el historial para que el botón atrás nunca agote la pila
history.replaceState({a:0},'');
for(let i=1;i<=10;i++)history.pushState({a:i},'');
render();
loadMat().then(()=>{if(MAT&&!S.tema)S.tema=temas()[0]?.id;render();});
