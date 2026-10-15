/* =====================================================================
   CONTENT — alle teksten, prijzen en foto's op één plek.
   Bron: www.marlinails.nl (geraadpleegd 9 en 15 oktober 2026) + info van Marjon.
   Originele salonfoto's zijn lokaal opgeslagen. Bij een laadfout wordt
   een zichtbare melding getoond en een fout gelogd.

   FOTO VERVANGEN: zet het origineel in public/ (of public/assets/), voeg de
   naam toe in scripts/optimize-images.mjs, draai `npm run images` en pas
   hieronder de bestandsnaam, alt-tekst en het bijschrift aan. `focus` bepaalt
   welk deel van de foto zichtbaar blijft bij het bijsnijden (CSS object-position).
   ===================================================================== */
const WP="/assets/";
const photo=(name,alt,caption,{sizes='(min-width:1180px) 440px, (min-width:600px) 45vw, 80vw',ratio='4:5',focus='50% 50%'}={})=>({
  srcs:[WP+name+'-1440.webp'],
  srcset:`${WP}${name}-640.webp 640w, ${WP}${name}-1440.webp 1440w`,
  sizes,alt,caption,ratio,focus
});
const CONTENT={
  business:{name:"Marli Nails",owner:"Marjon van Rossum",phone:"06 22889353",phoneIntl:"+31622889353",email:"info@marlinails.nl",street:"Sonatestraat 6",postcode:"1312 EH",city:"Almere"},
  nav:[["Home","#/"],["Prijslijst","#/prijslijst"],["Producten Seduction","#/producten"],["Over Marli Nails","#/over"],["Contact","#/contact"]],
  /* Vaste openingstijden. Avondafspraken zijn mogelijk in overleg, maar zijn géén vaste openingstijd. */
  hours:[["Woensdag","10:00–18:00"],["Donderdag","10:00–18:00"],["Vrijdag","10:00–18:00"],["Zaterdag","10:00–18:00"]],
  hoursNote:"Afwijkende tijden zijn in overleg mogelijk, bijvoorbeeld in de avond.",
  logo:{srcs:[WP+"marli-logo-glossy.png"],alt:"Marli Nails"},
  images:{
    hero:photo('20260617_215744',"Roze nagels met verfijnde bloemen nail art, gemaakt bij Marli Nails","Roze nagels",{sizes:'100vw',ratio:null}),
    /* Profielfoto van Marjon. Vervang deze door haar nieuwste goedgekeurde portret zodra dat is aangeleverd. */
    about:photo('20211113_122901',"Portret van Marjon van Rossum, eigenaresse en nagelstyliste van Marli Nails","Marjon van Rossum",{sizes:'(min-width:1024px) 520px, (min-width:600px) 420px, 90vw',focus:'50% 30%'})
  },
  services:[
    {name:"Manicure",text:"Verwen uw handen met een verzorgende manicurebehandeling.",prices:"manicure",to:"manicure",img:{srcs:[WP+"20211111_160925-500x500.jpg"],alt:"",ratio:"4:5",label:"Manicure"}},
    {name:"Teennagels",text:"Mooi verzorgde, gelakte teennagels. Cosmetische teennagelverzorging, geen medische pedicure.",prices:"teennagels",to:"teennagels",img:{srcs:["/pedicure%20marli.jpg"],alt:"",ratio:"4:5",label:"Teennagels"}},
    {name:"Nagel\u00ADbehandelingen",text:"Laat uw nagels verzorgen en omtoveren tot prachtige blikvangers.",prices:"natuurlijk",to:"natuurlijk",img:photo('20260327_122338',"","Nagelbehandelingen",{sizes:'(min-width:1180px) 300px, (min-width:860px) 45vw, 120px'})},
    {name:"Nail Art",text:"Geef uw nagels een persoonlijke uitstraling met creatieve nail art.",fixedFrom:"Vanaf €\u00A03 per nagel",to:"afwerking",img:photo('20260318_214033',"","Nail art",{sizes:'(min-width:1180px) 300px, (min-width:860px) 45vw, 120px'})}
  ],
  /* Galerij: echte foto's uit de salon, zonder herhaling van de foto's elders op de homepage. */
  gallery:[
    photo('20260210_223244',"Blauwe en roze nagels met marmeraccenten","Blauw & roze marmer"),
    photo('20260313_163813',"Plumkleurige en zachtroze nagels met een handgeschilderd takje","Plum & handgeschilderd takje"),
    photo('20260108_214645',"Donkerblauwe nagels met een subtiel structuurpatroon","Diepblauw met structuur"),
    photo('20260723_204906',"Rode nagels met handgeschilderde klaprozen op een witte basis","Rood & klaprozen"),
    photo('20211111_160344',"Waaier met gelpolishkleuren van Magnetic in de salon","Kleurenwaaier in de salon"),
    photo('20260521_150616',"Turquoise glanzende nagels met paarse bloemen","Turquoise met bloemen")
  ],
  /* =====================================================================
     PRIJZEN
     Bedragen in euro's als getal. Kort/medium: [kort, medium]. Eén prijs: getal.
     `hand:true` = handbehandeling die per PRICE_CHANGE.date met PRICE_CHANGE.increase
     stijgt (verzoek Marjon: +€ 2,50 voor handbehandelingen per 1 januari 2027).
     Niet verhoogd: teennagels, Seduction-producten, en — tot Marjon dit bevestigt —
     nail art, reparaties en het verwijderen van gelpolish. Gratis blijft gratis.
     ===================================================================== */
  priceChange:{date:"2027-01-01",label:"1 januari 2027",until:"31 december 2026",increase:2.5},
  pricesSince:"1 september 2025",
  prices:[
    {id:"natuurlijk",title:"Natural nail treatments",intro:"Voor de natuurlijke nagel, met gelpolish of blushes naar keuze.",rows:[
      {name:"Natural Nail treatment (BIAB)",desc:"Met gelpolish naar keuze",price:[50,52.5],hand:true},
      {name:"Natural Nail treatment incl. Russian Manicure",desc:"Met blushes naar keuze",price:[60,62.5],hand:true}]},
    {id:"verlenging",title:"Sets met verlenging",intro:"",rows:[
      {name:"Nieuwe set met verlenging met gelpolish",desc:"Met behulp van sjablonen of shape-its",price:[65,67.5],hand:true},
      {name:"Set met verlenging Babyboom",price:[67.5,70],hand:true},
      {name:"Set met verlenging Reverse French of Inlay",desc:"Afhankelijk van het aantal nagels: 2,50 per nagel",price:[80,82.5],hand:true}]},
    {id:"afwerking",title:"Seal & Protect en nail art",intro:"",rows:[
      {name:"Seal & Protect",price:[15,17.5],hand:true},
      {name:"Nail art",desc:"Per nagel, vanaf",price:3}]},
    {id:"overig",title:"Reparatie en verwijderen",intro:"",rows:[
      {name:"Breuk tot 2 nagels",desc:"Reparatie binnen 3 dagen na de behandeling",price:0},
      {name:"Breuk per nagel",price:[10,12.5]},
      {name:"Verwijderen gelpolish",desc:"Zonder nabehandeling",price:17.5}]},
    {id:"manicure",title:"Manicure",intro:"Natuurlijke nagelverzorging.",single:true,rows:[
      {name:"Brons",desc:"Incl. nagels polijsten, nagelriem treatment en lotion",price:35,hand:true},
      {name:"Zilver",desc:"Brons plus scrub en handmasker",price:40,hand:true},
      {name:"Goud",desc:"Zilver plus massage",price:50,hand:true}]},
    {id:"teennagels",title:"Teennagels",intro:"Cosmetische afwerking van de teennagels.",single:true,rows:[
      {name:"Teennagels gelpolish",price:35},
      {name:"Teennagels french manicure",price:37.5}]},
    {id:"heren",title:"Voor heren",intro:"",single:true,rows:[
      {name:"E-manicure voor heren",price:27.5,hand:true}]}
  ],
  priceNotes:["Marli Nails verzorgt alleen korte nagels en nagels met een medium lengte. (Extreem) lange nagels alleen op aanvraag.","Bij annulering binnen 24 uur voor de afspraak dient 50% van de behandeling betaald te worden."],
  toeNote:"Marli Nails brengt gelpolish of een french manicure aan op uw teennagels. Dit is een cosmetische behandeling. Marjon is geen pedicure en voert geen medische voetbehandelingen uit.",
  products:[
    {title:"Voor de <em>handen</em>",items:[["Liquid Hand Soap","250 ml","19,95"],["Hand Lotion","50 ml","12,95"],["Hand Lotion","250 ml","29,95"],["Hand Rich Cream & Mask","250 ml","32,95"],["Hand Scrub","250 ml","29,95"]]},
    {title:"Voor de <em>nagelriemen</em>",items:[["Intense Cuticle Cream","10 ml","10,95"],["Intense Cuticle Cream","50 ml","21,95"],["Intense Cuticle Cream","150 ml","49,50"],["Cuticle Oil","15 ml","12,95"]]},
    {title:"Cadeau en <em>ontspanning</em>",items:[["Bath Bombs","24 stuks","19,95"],["Gift box","Oil, scrub, mask en lotion","69,95"]]}
  ],
  timeline:[
    ["Ruim 30 jaar geleden","Een eerste liefde voor nagels","Ik ontdekte de nagelbranche en vond het een ontzettend leuke hobby. Destijds heb ik er niets mee gedaan, mede door een drukke baan."],
    ["2020","Het begint weer te kriebelen","In 2020 zat ik door de coronaperiode noodgedwongen drie maanden thuis. In die periode begon mijn interesse in nagelstyling opnieuw te groeien en besloot ik mij verder te verdiepen in het vak. Ik volgde de opleiding tot allround nagelstyliste, aangevuld met vervolgopleidingen en specialistische nagelcertificaten."],
    ["2021","Examen behaald","Na veel oefenen rondde ik mijn praktijk- en theorie-examen af, met prachtige cijfers."],
    ["Nu","Mijn salon aan huis","Nu oefen ik in mijn salon aan huis met veel liefde en geduld dit prachtige beroep uit."]
  ],
  education:[
    ["Allround nagelstyliste","Opleiding tot allround nagelstyliste, afgerond met een praktijk- en theorie-examen in 2021."],
    ["Vervolgopleidingen en specialistische nagelcertificaten","Aanvullende opleidingen om mijn vakkennis en technieken verder te verdiepen."],
    ["NAIL register","Aangesloten bij het kwaliteitsregister voor nagelstylisten in Nederland."]
  ],
  values:[
    ["Alle tijd voor u","Ik ben zeker geen productiebedrijf. Een nagelbehandeling duurt 1,5 tot 2 uur, zodat ik zorgvuldig kan werken."],
    ["De natuurlijke nagel voorop","De gezondheid van uw eigen nagel staat bij elke behandeling centraal."],
    ["Kort en medium","Ik verzorg korte nagels en nagels met een medium lengte. Extreem lange nagels alleen op aanvraag."],
    ["Hygiënisch werken","Ik werk met hygiënische vijlen: voor elke klant een nieuwe set."]
  ],
  register:{
    intro:"Het NAIL register is het kwaliteitsregister voor nagelstylisten in Nederland. Nagelstylisten in het register:",
    points:["voldoen aan kwaliteitseisen op het niveau van de Allround Nagelstylist (NLQF-3)","beschikken over de benodigde diploma's","scholen zich verplicht bij om hun vakkennis op peil te houden","werken volgens de gedragscode van het register"],
    you:"Voor u maakt het zichtbaar dat uw nagelstylist goed is opgeleid en haar vak serieus neemt. Het register is openbaar: iedereen kan het raadplegen."
  }
};

/* =====================================================================
   RENDER
   ===================================================================== */
const C=CONTENT,B=C.business,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const tel=`tel:${B.phoneIntl}`,mail=`mailto:${B.email}`;
const route=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${B.street}, ${B.postcode} ${B.city}`)}`;

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
const changeActive=today>=PC.date;
const money=n=>n.toFixed(2).replace('.',',');
const eur=n=>n===0?'Gratis':`€\u00A0${money(n)}`;
const eurShort=n=>`€\u00A0${Number.isInteger(n)?n:money(n)}`;
const priceOf=(row,future)=>{const add=future&&row.hand?PC.increase:0;return Array.isArray(row.price)?row.price.map(p=>p+add):row.price+add};
const fromPrice=(id,future)=>Math.min(...C.prices.find(g=>g.id===id).rows.map(r=>[].concat(priceOf(r,future))[0]));
const serviceFrom=(s,future)=>s.fixedFrom||`Vanaf ${eurShort(fromPrice(s.prices,future))}`;

$('#cards').innerHTML=C.services.map((s,i)=>`<li><a class="card" href="#/prijslijst/${s.to}"><div class="ph reveal" data-card="${i}"></div><div class="card-b"><span class="treat-number" aria-hidden="true">0${i+1}</span><h3>${esc(s.name)}</h3><p>${esc(s.text)}</p><div class="card-f"><span class="price">${esc(serviceFrom(s,changeActive))}</span><span class="go">Bekijk prijzen<span aria-hidden="true">↗</span></span></div></div></a></li>`).join('');
$$('[data-card]').forEach(el=>{fill(el,{...C.services[+el.dataset.card].img,alt:''},{ratio:false});el.setAttribute('aria-hidden','true')});
$('#treatFoot').textContent=changeActive?`Prijzen geldig vanaf ${PC.label}.`:`Prijzen geldig t/m ${PC.until}. Per ${PC.label} gelden nieuwe tarieven voor handbehandelingen.`;

$('#gal').innerHTML=C.gallery.map((g,i)=>`<figure><button type="button" data-i="${i}" aria-label="Vergroot foto: ${esc(g.caption)}"><div class="ph reveal" data-g="${i}"></div><span class="gallery-zoom" aria-hidden="true">↗</span></button><figcaption><span class="photo-index" aria-hidden="true">0${i+1}</span><span>${esc(g.caption)}</span></figcaption></figure>`).join('');
$$('[data-g]').forEach(el=>{const g=C.gallery[+el.dataset.g];fill(el,{...g,label:g.caption},{ratio:false})});


/* Prijslijst */
$('#pidx').innerHTML=C.prices.map(g=>`<li><a href="#/prijslijst/${g.id}" data-idx="${g.id}">${esc(g.title)}</a></li>`).join('');
const priceRows=(g,future)=>g.rows.map(row=>{
  const p=priceOf(row,future);let pr;
  if(g.single) pr=`<td data-label="Prijs">${eur(p)}</td>`;
  else if(!Array.isArray(p)) pr=`<td colspan="2" data-label="Kort en medium"><span class="sr">Kort en medium: </span>${eur(p)}</td>`;
  else pr=`<td data-label="Kort">${eur(p[0])}</td><td data-label="Medium">${eur(p[1])}</td>`;
  return `<tr><th scope="row">${esc(row.name)}${row.desc?`<span class="ds">${esc(row.desc)}</span>`:''}</th>${pr}</tr>`;
}).join('');
const periodText=future=>future?`Prijzen geldig vanaf ${PC.label}.`:`Prijzen geldig vanaf ${C.pricesSince} tot en met ${PC.until}.`;
const changeNotice=changeActive?'':`<section class="price-change" aria-labelledby="pc-title"><div><span class="kicker">Aankondiging</span><h2 id="pc-title">Nieuwe tarieven per ${esc(PC.label)}</h2><p>Per ${esc(PC.label)} worden de prijzen van de handbehandelingen met ${esc(eur(PC.increase))} verhoogd. Tot en met ${esc(PC.until)} gelden de huidige prijzen.</p></div><div class="period-switch" role="group" aria-label="Toon prijzen"><button type="button" data-period="now" aria-pressed="true">Huidige prijzen<small>t/m ${esc(PC.until)}</small></button><button type="button" data-period="future" aria-pressed="false">Nieuwe prijzen<small>vanaf ${esc(PC.label)}</small></button></div></section>`;
$('#pmain').innerHTML=changeNotice+`<p class="period-status" id="periodStatus" aria-live="polite">${esc(periodText(changeActive))}</p>`+C.prices.map(g=>{
  const cols=g.single?`<th scope="col">Prijs</th>`:`<th scope="col">Kort</th><th scope="col">Medium</th>`;
  return `<section class="pg" id="${g.id}" aria-labelledby="pg-${g.id}"><div class="pg-head"><h2 id="pg-${g.id}">${esc(g.title)}</h2>${g.intro?`<p>${esc(g.intro)}</p>`:''}</div><table class="price-table"><caption class="sr">${esc(g.title)}, prijzen in euro's</caption><thead><tr><th scope="col">Behandeling</th>${cols}</tr></thead><tbody data-group="${g.id}">${priceRows(g,changeActive)}</tbody></table></section>`;
}).join('')+`<div class="note-box"><h2>Over teennagels</h2><p>${esc(C.toeNote)}</p></div><div class="pnotes"><p>${esc(changeActive?`Alle prijzen zijn in euro's en gelden vanaf ${PC.label}.`:`Alle prijzen zijn in euro's. De huidige prijzen gelden vanaf ${C.pricesSince} tot en met ${PC.until}. Per ${PC.label} stijgen de prijzen van de handbehandelingen met ${eur(PC.increase)}.`)}</p>${C.priceNotes.map(n=>`<p>${esc(n)}</p>`).join('')}</div><div class="hero-ctas"><a class="btn btn-pink" href="#/contact">Maak een afspraak</a><a class="btn btn-line" data-tel-href2>Bel ${esc(B.phone)}</a></div>`;
$$('[data-tel-href2]').forEach(a=>a.href=tel);
$('#pmain').addEventListener('click',e=>{
  const b=e.target.closest('[data-period]');if(!b)return;
  const future=b.dataset.period==='future';
  $$('[data-period]').forEach(x=>x.setAttribute('aria-pressed',x===b));
  C.prices.forEach(g=>{$(`tbody[data-group="${g.id}"]`).innerHTML=priceRows(g,future)});
  $('#periodStatus').textContent=periodText(future);
});

/* Producten */
$('#prods').innerHTML=C.products.map((c,i)=>`<section class="pcat" aria-labelledby="pc-${i}"><h2 id="pc-${i}">${c.title}</h2><ul class="prow pitems">${c.items.map(([n,s,p])=>`<li><div class="pline"><span class="nm">${esc(n)}</span><span class="dots" aria-hidden="true"></span><span class="pr">€ ${esc(p)}</span></div><span class="sz">${esc(s)}</span></li>`).join('')}</ul></section>`).join('')+`<div class="prod-note"><p>Vragen over een product? Bel of mail gerust.</p><a class="btn btn-pink" href="#/contact">Neem contact op</a></div>`;

/* Over */
$('#tl').innerHTML=C.timeline.map(([y,h,p])=>`<li><span class="yr">${esc(y)}</span><div><h3>${esc(h)}</h3><p>${esc(p)}</p></div></li>`).join('');
$('#edu').innerHTML=C.education.map(([h,p],i)=>`<li><span class="edu-n" aria-hidden="true">0${i+1}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join('');
$('#vals').innerHTML=C.values.map(([h,p])=>`<li><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join('');
$('#regIntro').textContent=C.register.intro;
$('#regList').innerHTML=C.register.points.map(p=>`<li>${esc(p)}</li>`).join('');
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
