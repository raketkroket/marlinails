/* =====================================================================
   MARLI NAILS
   Teksten, foto's en prijzen staan in public/content/*.json en zijn te
   bewerken via /admin (Decap CMS) of rechtstreeks in die bestanden.
   Dit bestand bevat de vaste bedrijfsgegevens, de opbouw van de pagina's
   en het gedrag. Bron: www.marlinails.nl + info van Marjon (oktober 2026).
   ===================================================================== */

/* Vaste gegevens: staan ook in de structured data en metadata in index.html,
   dus wijzigingen hier ook daar doorvoeren (niet via /admin). */
const SITE={
  business:{name:"Marli Nails",owner:"Marjon van Rossum",phone:"06 22889353",phoneIntl:"+31622889353",email:"info@marlinails.nl",street:"Sonatestraat 6",postcode:"1312 EH",city:"Almere"},
  nav:[["Home","#/"],["Prijslijst","#/prijslijst"],["Producten Seduction","#/producten"],["Over Marli Nails","#/over"],["Contact","#/contact"]],
  /* Vaste openingstijden. Avondafspraken zijn mogelijk in overleg, maar zijn géén vaste openingstijd. */
  hours:[["Woensdag","10:00–18:00"],["Donderdag","10:00–18:00"],["Vrijdag","10:00–18:00"],["Zaterdag","10:00–18:00"]],
  hoursNote:"Afwijkende tijden zijn in overleg mogelijk, bijvoorbeeld in de avond.",
  logo:{srcs:["/assets/marli-logo-glossy.png"],alt:"Marli Nails"}
};
/* Prijscategorieën op volgorde van prijzen.json (ankers in de prijslijst). */
const PRICE_GROUP_IDS=['natuurlijk','verlenging','afwerking','overig','manicure','teennagels','heren'];
/* Behandelkaarten op de homepage, op volgorde van home.json: naar welke
   prijscategorie ze linken en waar het "Vanaf"-bedrag vandaan komt. */
const SERVICE_LINKS=[
  {to:'manicure'},{to:'teennagels'},{to:'natuurlijk'},
  {to:'afwerking',row:1,suffix:' per nagel'}
];
const FOCUS={center:'50% 50%',top:'50% 25%',bottom:'50% 75%'};

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
/* *schuin* wordt de roze cursieve accenttekst, een nieuwe regel wordt een regelafbreking. */
const rich=s=>esc(s).replace(/\*([^*\n]+)\*/g,'<em>$1</em>').replace(/\n/g,'<br>');
const lookup=(obj,path)=>path.split('.').reduce((o,k)=>o==null?undefined:o[k],obj);
const hasValue=v=>v!==null&&v!==undefined&&v!=='';
/* Foto's: `-1440.webp` heeft altijd een `-640.webp` naast zich (npm run images,
   of de build voor uploads via /admin); andere bestanden worden direct gebruikt. */
function imgOf(src,alt,{sizes='(min-width:1180px) 440px, (min-width:600px) 45vw, 80vw',ratio='4:5',focus,label}={}){
  if(!src) return {srcs:[],alt,ratio,label};
  const img={srcs:[src],alt:alt||'',ratio,label,focus:FOCUS[focus]||(/^\d{1,3}% \d{1,3}%$/.test(focus||'')?focus:FOCUS.center)};
  if(/-1440\.webp$/.test(src)){img.srcset=`${src.replace(/-1440\.webp$/,'-640.webp')} 640w, ${src} 1440w`;img.sizes=sizes}
  return img;
}
const dutchDate=iso=>new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${iso}T00:00:00Z`));
const dayBefore=iso=>new Date(Date.parse(`${iso}T00:00:00Z`)-864e5).toISOString().slice(0,10);
const num=v=>hasValue(v)?Number(v):null;

/* Zet de JSON-bestanden om naar de vorm die de pagina's gebruiken. */
function adapt(J){
  const H=J.home,P=J.prijzen,O=J.over;
  const card='(min-width:1180px) 300px, (min-width:860px) 45vw, 120px';
  const prices=P.groups.map((g,i)=>{
    const rows=g.rows.map(r=>{const k=num(r.price),m=num(r.medium);return {name:r.name,desc:r.desc,price:m===null?k:[k,m],next:[num(r.next),num(r.nextMedium)],hand:!!r.hand}});
    return {id:PRICE_GROUP_IDS[i]||`groep-${i+1}`,title:g.title,intro:g.intro,single:g.rows.every(r=>!hasValue(r.medium)),rows};
  });
  return {...SITE,J,
    images:{
      hero:imgOf(H.hero.photo.src,H.hero.photo.alt,{sizes:'100vw',ratio:null,label:'Foto',focus:H.hero.photo.focus}),
      about:imgOf(O.portrait.src,O.portrait.alt,{sizes:'(min-width:1024px) 520px, (min-width:600px) 420px, 90vw',focus:O.portrait.focus,label:'Marjon van Rossum'})
    },
    facts:H.welcome.facts,
    services:H.treatments.cards.map((c,i)=>({name:c.name,text:c.text,...(SERVICE_LINKS[i]||{to:PRICE_GROUP_IDS[0]}),img:imgOf(c.photo,'',{sizes:card,label:c.name,focus:c.focus})})),
    gallery:H.gallery.photos.map(p=>({...imgOf(p.src,p.alt,{focus:p.focus,label:p.caption}),caption:p.caption})),
    priceChange:P.change&&P.change.date?{date:P.change.date,label:dutchDate(P.change.date),until:dutchDate(dayBefore(P.change.date)),increase:Number(P.change.increase)}:null,
    pricesSince:dutchDate(P.since),
    prices,
    priceNotes:[P.lengthNote,P.cancelNote],
    toeNote:P.toeNote,
    products:J.producten.categories.map(c=>({title:c.title,items:c.items.map(i=>[i.name,i.size,num(i.price)])})),
    timeline:O.story.timeline.map(t=>[t.period,t.title,t.text]),
    education:O.education.items.map(e=>[e.title,e.text]),
    values:O.values.items.map(v=>[v.title,v.text]),
    register:O.register
  };
}

/* window.MARLI_CONTENT komt uit /content.js, door de build gemaakt uit public/content/*.json. */
try{
  if(!window.MARLI_CONTENT) throw new Error('content.js ontbreekt');
  render(adapt(window.MARLI_CONTENT));
}catch(error){
  console.error('Inhoud kon niet worden geladen:',error);
  $('#main').innerHTML=`<div class="wrap no-js"><h1 tabindex="-1">Welkom bij Marli Nails</h1><p>De pagina kon niet volledig worden geladen. Probeer het later opnieuw, of bel <a href="tel:${SITE.business.phoneIntl}">${esc(SITE.business.phone)}</a> of mail <a href="mailto:${SITE.business.email}">${esc(SITE.business.email)}</a>.</p></div>`;
}

/* =====================================================================
   RENDER
   ===================================================================== */
function render(CONTENT){
const C=CONTENT,B=C.business;
const tel=`tel:${B.phoneIntl}`,mail=`mailto:${B.email}`;
const route=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${B.street}, ${B.postcode} ${B.city}`)}`;

/* Bewerkbare teksten: data-c = platte tekst, data-c-rich = met *accent* en regelafbrekingen. */
$$('[data-c]').forEach(el=>{const v=lookup(C.J,el.dataset.c);if(hasValue(v))el.textContent=v});
$$('[data-c-rich]').forEach(el=>{const v=lookup(C.J,el.dataset.cRich);if(hasValue(v))el.innerHTML=rich(v)});
$('#facts').innerHTML=C.facts.map((f,i)=>`<li><strong data-edit="home.welcome.facts.${i}.title">${esc(f.title)}</strong><span data-edit="home.welcome.facts.${i}.text">${esc(f.text)}</span></li>`).join('');

function placeholder(el,label){
  console.error('Afbeelding niet beschikbaar:',label);
  el.setAttribute('role','img');el.setAttribute('aria-label',`Afbeelding niet beschikbaar: ${label}`);
  el.innerHTML=`<span class="ph-tag"><b>Foto niet beschikbaar</b><br>${esc(label)}</span>`;
}
function fill(el,img,{ratio=true}={}){
  if(!img) return;
  if(ratio&&img.ratio){const[w,h]=img.ratio.split(':').map(Number);el.style.aspectRatio=`${w}/${h}`;}
  const list=[...(img.srcs||[])];
  if(!list.length){placeholder(el,img.label||img.caption);return}
  const im=new Image();im.alt=img.alt||'';im.decoding='async';im.loading=el.classList.contains('hero-backdrop')?'eager':'lazy';if(el.classList.contains('hero-backdrop')) im.fetchPriority='high';
  if(img.srcset){im.srcset=img.srcset;im.sizes=img.sizes}
  if(img.focus) im.style.objectPosition=img.focus;
  let i=0;
  im.onerror=()=>{i++; if(i<list.length) im.src=list[i]; else placeholder(el,img.label||img.caption)};
  el.removeAttribute('role');el.removeAttribute('aria-label');
  el.innerHTML='';el.appendChild(im);im.src=list[0];
}
$$('[data-logo]').forEach(im=>im.src=C.logo.srcs[0]);
$$('[data-img]').forEach(el=>fill(el,C.images[el.dataset.img],{ratio:!el.classList.contains('hero-main')&&!el.classList.contains('hero-small')}));

$$('[data-tel]').forEach(a=>{a.href=tel;a.textContent=B.phone});
$$('[data-mail]').forEach(a=>{a.href=mail;a.textContent=B.email});
$$('[data-tel-href]').forEach(a=>a.href=tel);$$('[data-mail-href]').forEach(a=>a.href=mail);
$$('[data-tel-text]').forEach(a=>a.textContent=B.phone);$$('[data-mail-text]').forEach(a=>a.textContent=B.email);
$$('[data-route]').forEach(a=>a.href=route);
$$('[data-hours]').forEach(dl=>dl.innerHTML=C.hours.map(([d,t])=>`<dt>${d}</dt><dd>${t}</dd>`).join(''));
$$('[data-hours-note]').forEach(el=>el.textContent=C.hoursNote);
$('#addr').innerHTML=`${B.street}<br>${B.postcode} ${B.city}`;
$('#faddr').innerHTML=`${B.street}<br>${B.postcode} ${B.city}`;
$('#cancel').textContent=C.priceNotes[1];
$('#copy').textContent=`© ${new Date().getFullYear()} ${B.name}`;

const navHtml=C.nav.map(([t,h])=>`<li><a href="${h}">${esc(t)}</a></li>`).join('');
$('#nav').innerHTML=navHtml;$('#mnav').innerHTML=navHtml;$('#fnav').innerHTML=navHtml;

/* ---------- Prijzen met ingangsdatum ----------
   De datum wordt bepaald in Nederlandse tijd (Europe/Amsterdam). Vóór
   PRICE_CHANGE.date gelden de huidige prijzen en zijn de nieuwe prijzen
   alleen als aankondiging te bekijken; vanaf die datum gelden ze automatisch. */
const PC=C.priceChange;
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const changeActive=!PC||today>=PC.date;
const money=n=>n.toFixed(2).replace('.',',');
const eur=n=>n===0?'Gratis':`€\u00A0${money(n)}`;
const eurShort=n=>`€\u00A0${Number.isInteger(n)?n:money(n)}`;
/* Vanaf de ingangsdatum: een ingeplande prijs (next) of de huidige prijs plus de verhoging voor handbehandelingen. */
const priceOf=(row,future)=>{
  if(!future||!PC) return row.price;
  const out=[].concat(row.price).map((p,i)=>row.next[i]!==null?row.next[i]:Math.round((p+(row.hand?PC.increase:0))*100)/100);
  return Array.isArray(row.price)?out:out[0];
};
const serviceFrom=(s,future)=>{
  const g=C.prices.find(x=>x.id===s.to);if(!g)return '';
  const rows=(s.row!=null?[g.rows[s.row]]:g.rows).filter(Boolean);if(!rows.length)return '';
  return `Vanaf ${eurShort(Math.min(...rows.map(r=>[].concat(priceOf(r,future))[0])))}${s.suffix||''}`;
};

$('#cards').innerHTML=C.services.map((s,i)=>`<li><a class="card" href="#/prijslijst/${s.to}"><div class="ph reveal" data-card="${i}" data-edit-img="home.treatments.cards.${i}.photo"></div><div class="card-b"><span class="treat-number" aria-hidden="true">0${i+1}</span><h3 data-edit="home.treatments.cards.${i}.name">${esc(s.name)}</h3><p data-edit="home.treatments.cards.${i}.text">${esc(s.text)}</p><div class="card-f"><span class="price">${esc(serviceFrom(s,changeActive))}</span><span class="go">Bekijk prijzen<span aria-hidden="true">→</span></span></div></div></a></li>`).join('');
$$('[data-card]').forEach(el=>{fill(el,{...C.services[+el.dataset.card].img,alt:''},{ratio:false});el.setAttribute('aria-hidden','true')});
$('#treatFoot').textContent=!PC?`Prijzen geldig vanaf ${C.pricesSince}.`:changeActive?`Prijzen geldig vanaf ${PC.label}.`:`Prijzen geldig t/m ${PC.until}. Per ${PC.label} gelden nieuwe tarieven voor handbehandelingen.`;

$('#gal').innerHTML=C.gallery.map((g,i)=>`<figure><button type="button" data-i="${i}" aria-label="Vergroot foto: ${esc(g.caption)}"><div class="ph reveal" data-g="${i}" data-edit-img="home.gallery.photos.${i}"></div><span class="gallery-zoom" aria-hidden="true">+</span></button><figcaption><span class="photo-index" aria-hidden="true">0${i+1}</span><span data-edit="home.gallery.photos.${i}.caption">${esc(g.caption)}</span></figcaption></figure>`).join('');
$$('[data-g]').forEach(el=>{const g=C.gallery[+el.dataset.g];fill(el,{...g,label:g.caption},{ratio:false})});


/* Prijslijst */
$('#pidx').innerHTML=C.prices.map(g=>`<li><a href="#/prijslijst/${g.id}" data-idx="${g.id}">${esc(g.title)}</a></li>`).join('');
const priceRows=(g,future)=>g.rows.map((row,j)=>{
  const p=priceOf(row,future),at=`prijzen.groups.${C.prices.indexOf(g)}.rows.${j}`;let pr;
  if(g.single) pr=`<td data-label="Prijs" data-edit-price="${at}.price">${eur(p)}</td>`;
  else if(!Array.isArray(p)) pr=`<td colspan="2" data-label="Kort en medium" data-edit-price="${at}.price"><span class="sr">Kort en medium: </span>${eur(p)}</td>`;
  else pr=`<td data-label="Kort" data-edit-price="${at}.price">${eur(p[0])}</td><td data-label="Medium" data-edit-price="${at}.medium">${eur(p[1])}</td>`;
  return `<tr><th scope="row"><span data-edit="${at}.name">${esc(row.name)}</span>${row.desc?`<span class="ds" data-edit="${at}.desc">${esc(row.desc)}</span>`:''}</th>${pr}</tr>`;
}).join('');
const periodText=future=>!PC?`Prijzen geldig vanaf ${C.pricesSince}.`:future?`Prijzen geldig vanaf ${PC.label}.`:`Prijzen geldig vanaf ${C.pricesSince} tot en met ${PC.until}.`;
const changeNotice=changeActive?'':`<section class="price-change" aria-labelledby="pc-title"><div><span class="kicker">Aankondiging</span><h2 id="pc-title">Nieuwe tarieven per ${esc(PC.label)}</h2><p>Per ${esc(PC.label)} worden de prijzen van de handbehandelingen met ${esc(eur(PC.increase))} verhoogd. Tot en met ${esc(PC.until)} gelden de huidige prijzen.</p></div><div class="period-switch" role="group" aria-label="Toon prijzen"><button type="button" data-period="now" aria-pressed="true">Huidige prijzen<small>t/m ${esc(PC.until)}</small></button><button type="button" data-period="future" aria-pressed="false">Nieuwe prijzen<small>vanaf ${esc(PC.label)}</small></button></div></section>`;
$('#pmain').innerHTML=changeNotice+`<p class="period-status" id="periodStatus" aria-live="polite">${esc(periodText(changeActive))}</p>`+C.prices.map(g=>{
  const cols=g.single?`<th scope="col">Prijs</th>`:`<th scope="col">Kort</th><th scope="col">Medium</th>`;
  return `<section class="pg" id="${g.id}" aria-labelledby="pg-${g.id}"><div class="pg-head"><h2 id="pg-${g.id}" data-edit="prijzen.groups.${C.prices.indexOf(g)}.title">${esc(g.title)}</h2>${g.intro?`<p data-edit="prijzen.groups.${C.prices.indexOf(g)}.intro">${esc(g.intro)}</p>`:''}</div><table class="price-table"><caption class="sr">${esc(g.title)}, prijzen in euro's</caption><thead><tr><th scope="col">Behandeling</th>${cols}</tr></thead><tbody data-group="${g.id}">${priceRows(g,changeActive)}</tbody></table></section>`;
}).join('')+`<div class="note-box"><h2>Over teennagels</h2><p data-edit="prijzen.toeNote">${esc(C.toeNote)}</p></div><div class="pnotes"><p>${esc(!PC?`Alle prijzen zijn in euro's en gelden vanaf ${C.pricesSince}.`:changeActive?`Alle prijzen zijn in euro's en gelden vanaf ${PC.label}.`:`Alle prijzen zijn in euro's. De huidige prijzen gelden vanaf ${C.pricesSince} tot en met ${PC.until}. Per ${PC.label} stijgen de prijzen van de handbehandelingen met ${eur(PC.increase)}.`)}</p>${C.priceNotes.map((n,i)=>`<p data-edit="prijzen.${['lengthNote','cancelNote'][i]}">${esc(n)}</p>`).join('')}</div><div class="hero-ctas"><a class="btn btn-pink" href="#/contact">Maak een afspraak</a><a class="btn btn-line" data-tel-href2>Bel ${esc(B.phone)}</a></div>`;
$$('[data-tel-href2]').forEach(a=>a.href=tel);
$('#pmain').addEventListener('click',e=>{
  const b=e.target.closest('[data-period]');if(!b)return;
  const future=b.dataset.period==='future';
  $$('[data-period]').forEach(x=>x.setAttribute('aria-pressed',x===b));
  C.prices.forEach(g=>{$(`tbody[data-group="${g.id}"]`).innerHTML=priceRows(g,future)});
  $('#periodStatus').textContent=periodText(future);
});

/* Producten */
$('#prods').innerHTML=C.products.map((c,i)=>`<section class="pcat" aria-labelledby="pc-${i}"><h2 id="pc-${i}" data-edit-rich="producten.categories.${i}.title">${rich(c.title)}</h2><ul class="prow pitems">${c.items.map(([n,s,p],j)=>`<li><div class="pline"><span class="nm" data-edit="producten.categories.${i}.items.${j}.name">${esc(n)}</span><span class="dots" aria-hidden="true"></span><span class="pr" data-edit-price="producten.categories.${i}.items.${j}.price">€ ${money(p)}</span></div><span class="sz" data-edit="producten.categories.${i}.items.${j}.size">${esc(s)}</span></li>`).join('')}</ul></section>`).join('')+`<div class="prod-note"><p>Vragen over een product? Bel of mail gerust.</p><a class="btn btn-pink" href="#/contact">Neem contact op</a></div>`;

/* Over */
$('#tl').innerHTML=C.timeline.map(([y,h,p],i)=>`<li><span class="yr" data-edit="over.story.timeline.${i}.period">${esc(y)}</span><div><h3 data-edit="over.story.timeline.${i}.title">${esc(h)}</h3><p data-edit="over.story.timeline.${i}.text">${esc(p)}</p></div></li>`).join('');
$('#edu').innerHTML=C.education.map(([h,p],i)=>`<li><span class="edu-n" aria-hidden="true">0${i+1}</span><h3 data-edit="over.education.items.${i}.title">${esc(h)}</h3><p data-edit="over.education.items.${i}.text">${esc(p)}</p></li>`).join('');
$('#vals').innerHTML=C.values.map(([h,p],i)=>`<li><h3 data-edit="over.values.items.${i}.title">${esc(h)}</h3><p data-edit="over.values.items.${i}.text">${esc(p)}</p></li>`).join('');
$('#regIntro').textContent=C.register.intro;
$('#regList').innerHTML=C.register.points.map((p,i)=>`<li data-edit="over.register.points.${i}">${esc(p)}</li>`).join('');
$('#regYou').textContent=C.register.you;

/* =====================================================================
   GEDRAG
   ===================================================================== */
const body=document.body;
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -6% 0px'});
const observe=scope=>scope.querySelectorAll('.reveal:not(.in)').forEach(el=>io.observe(el));

/* Router */
const views=Object.fromEntries($$('.view').map(v=>[v.dataset.view,v]));
const parse=()=>{const h=location.hash;if(!h.startsWith('#/'))return null;const[,p='',s='']=h.split('/');return{page:p||'home',sub:s}};
function go(first){
  const r=parse();if(!r)return;
  if(!Object.hasOwn(views,r.page)){location.replace('#/');return;}
  const view=views[r.page];const changed=!view.classList.contains('on');
  Object.values(views).forEach(v=>v.classList.toggle('on',v===view));
  document.title=view.dataset.title;
  if(view.dataset.description) $('meta[name="description"]').content=view.dataset.description;
  $$('#nav a,#mnav a,#fnav a').forEach(a=>{const p=a.getAttribute('href').split('/')[1]||'home';p===view.dataset.view?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current')});
  setMenu(false);
  if(r.sub&&r.page==='prijslijst'&&C.prices.some(g=>g.id===r.sub)){requestAnimationFrame(()=>{const t=document.getElementById(r.sub);t.tabIndex=-1;t.focus({preventScroll:true});t.scrollIntoView({block:'start'});setIdx(r.sub)})}
  else if(changed&&!first) scrollTo(0,0);
  if(changed&&!first&&!r.sub){const h=view.querySelector('h1');h&&h.focus({preventScroll:true})}
  observe(view);
}
addEventListener('hashchange',()=>go(false));
$('[data-skip]').addEventListener('click',e=>{e.preventDefault();($('.view.on h1')||$('#main')).focus()});

/* Mobiel menu */
const mbtn=$('#menuBtn'),mm=$('#mmenu');
function setMenu(open){
  body.classList.toggle('menu-open',open);mbtn.setAttribute('aria-expanded',open);
  $('#menuLbl').textContent=open?'Sluiten':'Menu';mm.setAttribute('aria-hidden',!open);mm.inert=!open;
  $$('#main,.ftr,.actionbar,.hdr .logo,.hdr-book,.hdr-tel').forEach(el=>el.inert=open);
  if(open) mm.querySelector('a').focus();
}
mm.inert=true;
mbtn.addEventListener('click',()=>setMenu(!body.classList.contains('menu-open')));
mm.addEventListener('click',e=>{
  const link=e.target.closest('a[href^="#/"]');
  if(link&&link.hash===location.hash){
    setMenu(false);
    $('.view.on h1').focus({preventScroll:true});
  }
});
addEventListener('keydown',e=>{if(e.key==='Escape'&&body.classList.contains('menu-open')){setMenu(false);mbtn.focus()}});
addEventListener('resize',()=>{
  if(innerWidth>=1180&&body.classList.contains('menu-open')){
    const focusWasInMenu=mm.contains(document.activeElement)||document.activeElement===mbtn;
    setMenu(false);
    if(focusWasInMenu) $('#nav a').focus();
  }
});
addEventListener('keydown',e=>{
  if(e.key!=='Tab'||!body.classList.contains('menu-open')) return;
  const controls=[mbtn,...mm.querySelectorAll('a[href],button')];
  const first=controls[0],last=controls[controls.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});

/* Header-schaduw */
const hdr=$('#hdr');
addEventListener('scroll',()=>hdr.classList.toggle('solid',scrollY>8),{passive:true});

/* Prijslijst-index */
function setIdx(id){$$('[data-idx]').forEach(a=>a.classList.toggle('on',a.dataset.idx===id))}
const pio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)setIdx(e.target.id)}),{rootMargin:'-30% 0px -60% 0px'});
C.prices.forEach(g=>pio.observe(document.getElementById(g.id)));
addEventListener('scroll',()=>{if(scrollY<120&&views.prijslijst.classList.contains('on'))setIdx(C.prices[0].id)},{passive:true});

/* Lightbox */
const lb=$('#lb');let cur=0;
function show(i){cur=(i+C.gallery.length)%C.gallery.length;const g=C.gallery[cur];fill($('#lbImg'),{...g,srcset:'',label:g.caption});$('#lbCap').textContent=`${g.caption} (${cur+1} van ${C.gallery.length})`}
$('#gal').addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(!b)return;show(+b.dataset.i);lb.showModal()});
$('#lbPrev').onclick=()=>show(cur-1);$('#lbNext').onclick=()=>show(cur+1);$('#lbClose').onclick=()=>lb.close();
lb.addEventListener('click',e=>{if(e.target===lb)lb.close()});
lb.addEventListener('keydown',e=>{if(e.key==='ArrowRight')show(cur+1);if(e.key==='ArrowLeft')show(cur-1)});
/* Vegen op touchscreens */
let touchX=null;
lb.addEventListener('touchstart',e=>{touchX=e.touches.length===1?e.touches[0].clientX:null},{passive:true});
lb.addEventListener('touchend',e=>{if(touchX===null)return;const dx=e.changedTouches[0].clientX-touchX;touchX=null;if(Math.abs(dx)>50)show(cur+(dx<0?1:-1))},{passive:true});

/* Contactformulier → e-mail met ingevuld bericht */
$('#cform').addEventListener('submit',e=>{
  e.preventDefault();const f=e.target,n=f.naam.value.trim(),m=f.email.value.trim();
  const okN=!!n&&f.naam.validity.valid,okM=!!m&&f.email.validity.valid;
  [[f.naam,okN,'e-name'],[f.email,okM,'e-mail']].forEach(([el,ok,id])=>{el.closest('.f').classList.toggle('invalid',!ok);el.setAttribute('aria-invalid',!ok);ok?el.removeAttribute('aria-describedby'):el.setAttribute('aria-describedby',id)});
  if(!okN){f.naam.focus();return}if(!okM){f.email.focus();return}
  if(!f.reportValidity()) return;
  $('#form-status').textContent='Uw e-mailconcept wordt geopend. Het bericht is nog niet verstuurd. Werkt dit niet? Bel 06 22889353.';
  const t=f.telefoon.value.trim();
  location.href=`${mail}?subject=${encodeURIComponent('Afspraak bij Marli Nails')}&body=${encodeURIComponent(`${f.bericht.value.trim()}\n\nNaam: ${n}\nE-mail: ${m}${t?`\nTelefoon: ${t}`:''}`)}`;
});

/* Start */
if(!location.hash.startsWith('#/')) history.replaceState(null,'','#/');
go(true);
// Scroll within the homepage without changing its hash route.
$('[data-scroll-welcome]').addEventListener('click',event=>{
  event.preventDefault();
  $('#h-welkom').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  $('#h-welkom').setAttribute('tabindex','-1');
  $('#h-welkom').focus({preventScroll:true});
});
}
