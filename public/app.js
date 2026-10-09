/* =====================================================================
   CONTENT — alle teksten, prijzen en foto's op één plek (later: CMS).
   Bron: www.marlinails.nl (geraadpleegd 9 oktober 2026) + info van Marjon.
   Originele salonfoto's zijn lokaal opgeslagen. Bij een laadfout wordt
   een zichtbare melding getoond en een fout gelogd.
   ===================================================================== */
const WP="/assets/";
const photo=(name,alt,caption,sizes='(min-width:860px) 400px, (min-width:481px) 50vw, 100vw')=>({
  srcs:[WP+name+'-1440.webp'],
  srcset:`${WP}${name}-640.webp 640w, ${WP}${name}-1440.webp 1440w`,
  sizes,alt,caption,ratio:'4:3'
});
const CONTENT={
  business:{name:"Marli Nails",owner:"Marjon van Rossum",phone:"06 22889353",phoneIntl:"+31622889353",email:"info@marlinails.nl",street:"Sonatestraat 6",postcode:"1312 EH",city:"Almere"},
  nav:[["Home","#/"],["Prijslijst","#/prijslijst"],["Producten Seduction","#/producten"],["Over Marli Nails","#/over"],["Contact","#/contact"]],
  hours:[["Woensdag","10:00–18:00"],["Donderdag","10:00–18:00"],["Vrijdag","10:00–18:00"],["Zaterdag","10:00–18:00"]],
  logo:{srcs:[WP+"logo.png"],alt:"Marli Nails"},
  images:{
    hero:photo('20260617_215744',"Roze nagels met verfijnde bloemen nail art, gemaakt bij Marli Nails","Roze nagels",'100vw'),
    heroSmall:photo('20260313_163813',"Plumkleurige en zachtroze nagels met een handgeschilderd takje","Nail art",'(min-width:1024px) 240px, 40vw'),
    salon:{srcs:[WP+"20211010_124909.jpg"],alt:"Voorbeelden van verfijnde nail art bij Marli Nails",ratio:"4:5",label:"Nail art uit de salon"},
    about:{srcs:[WP+"20211113_122901.jpg"],alt:"Marli Nails",ratio:"4:5",label:"Over Marli Nails"}
  },
  services:[
    {name:"Manicure",text:"Verwen uw handen met een verzorgende manicurebehandeling.",from:"Vanaf € 35",to:"manicure",img:{srcs:[WP+"20211111_160925-500x500.jpg"],alt:"Manicure bij Marli Nails",ratio:"1:1",label:"Manicure"}},
    {name:"Teennagels",text:"Geniet van mooi verzorgde voeten en gelakte teennagels. Cosmetische teennagelverzorging, geen medische pedicure.",from:"Vanaf € 35",to:"teennagels",img:{srcs:["/pedicure%20marli.jpg"],alt:"Gelakte teennagels bij Marli Nails",ratio:"1:1",label:"Teennagels"}},
    {name:"Nagelbehandelingen",text:"Laat uw nagels verzorgen en omtoveren tot prachtige blikvangers.",from:"Vanaf € 50",to:"natuurlijk",img:photo('20260327_122338',"Natuurlijke nagels met witte en blauwe french tips","Nagelbehandelingen",'180px')},
    {name:"Nail Art",text:"Geef uw nagels een persoonlijke uitstraling met creatieve nail art.",from:"Vanaf € 3 per nagel",to:"afwerking",img:photo('20260318_214033',"Lila nagels met handgeschilderde bloesem","Nail art",'180px')}
  ],
  gallery:[
    photo('20260210_223244',"Blauwe en roze nagels met marmeraccenten","Blauw & roze marmer"),
    photo('20260108_214645',"Donkerblauwe nagels met een subtiel structuurpatroon","Diepblauw met structuur"),
    photo('20260723_204906',"Rode nagels met handgeschilderde klaprozen op een witte basis","Rood & klaprozen"),
    photo('20260521_150616',"Turquoise glanzende nagels met paarse bloemen","Turquoise met bloemen")
  ],
  prices:[
    {id:"natuurlijk",title:"Natural nail treatments",intro:"Voor de natuurlijke nagel, met gelpolish of blushes naar keuze.",rows:[
      ["Natural Nail treatment (BIAB)","Met gelpolish naar keuze","50,00","52,50"],
      ["Natural Nail treatment incl. Russian Manicure","Met blushes naar keuze","60,00","62,50"]]},
    {id:"verlenging",title:"Sets met verlenging",intro:"",rows:[
      ["Nieuwe set met verlenging met gelpolish","Met behulp van sjablonen of shape-its","65,00","67,50"],
      ["Set met verlenging Babyboom","","67,50","70,00"],
      ["Set met verlenging Reverse French of Inlay","Afhankelijk van het aantal nagels: 2,50 per nagel","80,00","82,50"]]},
    {id:"afwerking",title:"Seal & Protect en nail art",intro:"",rows:[["Seal & Protect","","15,00","17,50"],["Nail art","Per nagel, vanaf","3,00",null]]},
    {id:"overig",title:"Reparatie en verwijderen",intro:"",rows:[["Breuk tot 2 nagels","Reparatie binnen 3 dagen na de behandeling","gratis",null],["Breuk per nagel","","10,00","12,50"],["Verwijderen gelpolish","Zonder nabehandeling","17,50",null]]},
    {id:"manicure",title:"Manicure",intro:"Natuurlijke nagelverzorging.",single:true,rows:[["Brons","Incl. nagels polijsten, nagelriem treatment en lotion","35,00"],["Zilver","Brons plus scrub en handmasker","40,00"],["Goud","Zilver plus massage","50,00"]]},
    {id:"teennagels",title:"Teennagels",intro:"Cosmetische afwerking van de teennagels.",single:true,rows:[["Teennagels gelpolish","","35,00"],["Teennagels french manicure","","37,50"]]},
    {id:"heren",title:"Voor heren",intro:"",single:true,rows:[["E-manicure voor heren","","27,50"]]}
  ],
  priceNotes:["Alle prijzen zijn in euro's en gelden vanaf 1 september 2025.","Marli Nails verzorgt alleen korte nagels en nagels met een medium lengte. (Extreem) lange nagels alleen op aanvraag.","Bij annulering binnen 24 uur voor de afspraak dient 50% van de behandeling betaald te worden."],
  toeNote:"Marli Nails brengt gelpolish of een french manicure aan op uw teennagels. Dit is een cosmetische behandeling. Marjon is geen pedicure en voert geen medische voetbehandelingen uit.",
  products:[
    {title:"Voor de <em>handen</em>",items:[["Liquid Hand Soap","250 ml","19,95"],["Hand Lotion","50 ml","12,95"],["Hand Lotion","250 ml","29,95"],["Hand Rich Cream & Mask","250 ml","32,95"],["Hand Scrub","250 ml","29,95"]]},
    {title:"Voor de <em>nagelriemen</em>",items:[["Intense Cuticle Cream","10 ml","10,95"],["Intense Cuticle Cream","50 ml","21,95"],["Intense Cuticle Cream","150 ml","49,50"],["Cuticle Oil","15 ml","12,95"]]},
    {title:"Cadeau en <em>ontspanning</em>",items:[["Bath Bombs","24 stuks","19,95"],["Gift box","Oil, scrub, mask en lotion","69,95"]]}
  ],
  timeline:[
    ["Ruim 30 jaar geleden","Een eerste liefde voor nagels","Ik ontdekte de nagelbranche en vond het een ontzettend leuke hobby. Destijds heb ik er niets mee gedaan, mede door een drukke baan."],
    ["2020","Het begint weer te kriebelen","Toen ik in 2020 drie maanden noodgedwongen thuis zat, kwam de liefde voor het vak terug. Ik volgde de opleiding tot allround nagelstyliste, aangevuld met veel nevenopleidingen."],
    ["2021","Examen behaald","Na veel oefenen rondde ik mijn praktijk- en theorie-examen af, met prachtige cijfers."],
    ["Nu","Mijn salon aan huis","Nu oefen ik in mijn salon aan huis met veel liefde en geduld dit prachtige beroep uit."]
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
$('#addr').innerHTML=`${B.street}<br>${B.postcode} ${B.city}`;
$('#faddr').innerHTML=`${B.street}<br>${B.postcode} ${B.city}`;
$('#cancel').textContent=C.priceNotes[2];
$('#copy').textContent=`© ${new Date().getFullYear()} ${B.name}`;

const navHtml=C.nav.map(([t,h])=>`<li><a href="${h}">${esc(t)}</a></li>`).join('');
$('#nav').innerHTML=navHtml;$('#mnav').innerHTML=navHtml;$('#fnav').innerHTML=navHtml;

$('#cards').innerHTML=C.services.map((s,i)=>`<li><a class="card" href="#/prijslijst/${s.to}"><span class="treat-number" aria-hidden="true">0${i+1}</span><div class="card-b"><h3>${esc(s.name)}</h3><p>${esc(s.text)}</p><div class="card-f"><span class="price">${esc(s.from)}</span><span class="go">Bekijk prijzen<span aria-hidden="true">↗</span></span></div></div><div class="ph reveal" data-card="${i}"></div></a></li>`).join('');
$$('[data-card]').forEach(el=>{fill(el,{...C.services[+el.dataset.card].img,alt:''},{ratio:false});el.setAttribute('aria-hidden','true')});

$('#gal').innerHTML=C.gallery.map((g,i)=>`<figure><button type="button" data-i="${i}" aria-label="Vergroot foto: ${esc(g.caption)}"><div class="ph reveal" data-g="${i}"></div><span class="gallery-zoom" aria-hidden="true">↗</span></button><figcaption><span class="photo-index" aria-hidden="true">0${i+1}</span><span>${esc(g.caption)}</span><span>Marli Nails</span></figcaption></figure>`).join('');
$$('[data-g]').forEach(el=>{const g=C.gallery[+el.dataset.g];fill(el,{...g,label:g.caption},{ratio:false})});


/* Prijslijst */
$('#pidx').innerHTML=C.prices.map(g=>`<li><a href="#/prijslijst/${g.id}" data-idx="${g.id}">${esc(g.title)}</a></li>`).join('');
$('#pmain').innerHTML=C.prices.map(g=>{
  const cols=g.single?`<th scope="col">Prijs</th>`:`<th scope="col">Kort</th><th scope="col">Medium</th>`;
  const rows=g.rows.map(([n,d,k,m])=>{
    let pr;
    const amount=value=>value==='gratis'?'Gratis':`€ ${esc(value)}`;
    if(g.single) pr=`<td>${amount(k)}</td>`;
    else if(m===null) pr=`<td colspan="2"><span class="sr">Kort en medium: </span>${amount(k)}</td>`;
    else pr=`<td>${amount(k)}</td><td>${amount(m)}</td>`;
    return `<tr><th scope="row">${esc(n)}${d?`<span class="ds">${esc(d)}</span>`:''}</th>${pr}</tr>`;
  }).join('');
  return `<section class="pg" id="${g.id}" aria-labelledby="pg-${g.id}"><div class="pg-head"><h2 id="pg-${g.id}">${esc(g.title)}</h2>${g.intro?`<p>${esc(g.intro)}</p>`:''}</div><table class="price-table"><caption class="sr">${esc(g.title)}, prijzen in euro's</caption><thead><tr><th scope="col">Behandeling</th>${cols}</tr></thead><tbody>${rows}</tbody></table></section>`;
}).join('')+`<div class="note-box"><h2>Over teennagels</h2><p>${esc(C.toeNote)}</p></div><div class="pnotes">${C.priceNotes.map(n=>`<p>${esc(n)}</p>`).join('')}<p><a class="tlink" href="https://www.marlinails.nl/prijslijst/" target="_blank" rel="noopener noreferrer">Bekijk de oorspronkelijke prijslijst<span class="sr"> (opent in een nieuw venster)</span></a></p></div><div class="hero-ctas"><a class="btn btn-pink" href="#/contact">Maak een afspraak</a><a class="btn btn-line" data-tel-href2>Bel ${esc(B.phone)}</a></div>`;
$$('[data-tel-href2]').forEach(a=>a.href=tel);

/* Producten */
$('#prods').innerHTML=C.products.map((c,i)=>`<section class="pcat" aria-labelledby="pc-${i}"><h2 id="pc-${i}">${c.title}</h2><ul class="prow pitems">${c.items.map(([n,s,p])=>`<li><div class="pline"><span class="nm">${esc(n)}</span><span class="dots" aria-hidden="true"></span><span class="pr">€ ${esc(p)}</span></div><span class="sz">${esc(s)}</span></li>`).join('')}</ul></section>`).join('')+`<div class="prod-note"><p>Vragen over een product? Bel of mail gerust.</p><a class="btn btn-pink" href="#/contact">Neem contact op</a></div>`;

/* Over */
$('#tl').innerHTML=C.timeline.map(([y,h,p])=>`<li><span class="yr">${esc(y)}</span><div><h3>${esc(h)}</h3><p>${esc(p)}</p></div></li>`).join('');
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
  $$('#main,.ftr,.actionbar,.hdr .logo,.hdr-book').forEach(el=>el.inert=open);
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

/* Lightbox */
const lb=$('#lb');let cur=0;
function show(i){cur=(i+C.gallery.length)%C.gallery.length;const g=C.gallery[cur];fill($('#lbImg'),{...g,srcset:'',label:g.caption});$('#lbCap').textContent=`${g.caption} (${cur+1} van ${C.gallery.length})`}
$('#gal').addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(!b)return;show(+b.dataset.i);lb.showModal()});
$('#lbPrev').onclick=()=>show(cur-1);$('#lbNext').onclick=()=>show(cur+1);$('#lbClose').onclick=()=>lb.close();
lb.addEventListener('click',e=>{if(e.target===lb)lb.close()});
lb.addEventListener('keydown',e=>{if(e.key==='ArrowRight')show(cur+1);if(e.key==='ArrowLeft')show(cur-1)});

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
