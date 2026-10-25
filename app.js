/* Isolated synthetic portal. No network, database, production adapter or trading. */
(function(){
'use strict';
const main=document.getElementById('rr-main'),live=document.getElementById('rr-status');
let runs=[],contexts=[],selected=[],report=null,filters={search:'',market:'',status:'',sort:'newest'},libraryHash='#/library';
let studio={view:'overview',reference:'',focusIds:[],diagramMode:'multiples',chartKey:'equity',onlyDifferences:true};
const views=['overview','charts','metrics','parameters','method','prepare'],sorts=['newest','oldest','return-desc','return-asc'];
const e=v=>RRCharts.esc(v);
document.querySelector('.rr-skip').addEventListener('click',event=>{event.preventDefault();main.focus();main.scrollIntoView({block:'start'});});
function announce(message){live.textContent=message;}
function focusMain(){main.focus({preventScroll:true});window.scrollTo(0,0);}
function safeError(){main.innerHTML='<section class="rr-card rr-empty"><h1>Demonstrationen kunde inte läsas</h1><p>Det lokala presentationsunderlaget är ogiltigt eller en modul saknas. Inga resultat ersätts med noll eller verkliga data.</p><button class="rr-btn" id="rr-retry" type="button">Försök igen</button></section>';document.getElementById('rr-retry').onclick=()=>location.reload();main.setAttribute('aria-busy','false');announce('Demonstrationen kunde inte läsas.');}
function selectionError(message){main.innerHTML=`<section class="rr-card rr-empty"><h1>Urvalet kunde inte läsas</h1><p>${e(message)}</p><button type="button" class="rr-btn" data-reset-selection>Rensa urval och börja om</button></section>`;main.setAttribute('aria-busy','false');}
function cmpHash(){const q=new URLSearchParams({ids:selected.join(','),ref:studio.reference||selected[0]||'',view:studio.view,mode:studio.diagramMode,metric:studio.chartKey});q.set('focus',studio.focusIds.join(','));if(!studio.onlyDifferences)q.set('allparams','1');return '#/compare?'+q;}
function saveFilters(){const q=new URLSearchParams();if(filters.search)q.set('q',filters.search);if(filters.market)q.set('market',filters.market);if(filters.status)q.set('status',filters.status);if(filters.sort!=='newest')q.set('sort',filters.sort);if(selected.length)q.set('sel',selected.join(','));libraryHash='#/library'+(q.size?'?'+q:'');if(location.hash.startsWith('#/library')||!location.hash)history.replaceState(null,'',libraryHash);}
function resetStudioSelection(fillFocus=true){if(!selected.includes(studio.reference))studio.reference=selected[0]||'';studio.focusIds=studio.focusIds.filter(id=>selected.includes(id));if(!studio.focusIds.length&&fillFocus)studio.focusIds=selected.slice(0,3);saveFilters();}
function refreshSelectionBar(){const node=document.getElementById('rr-selection-host');if(node)node.innerHTML=RRComparisonViews.selectionBar(selected,RRData.selectRuns(runs,filters).length);}
function updateList(){const visible=RRData.selectRuns(runs,filters);document.getElementById('rr-run-list').innerHTML=RRViews.list(visible,selected);document.getElementById('rr-results-count').textContent=visible.length+' av '+runs.length+' körningar';refreshSelectionBar();saveFilters();announce(visible.length+' körningar matchar filtren. '+selected.length+' valda.');}
function setLibraryControls(){for(const [id,key] of [['rr-search','search'],['rr-market','market'],['rr-filter-status','status'],['rr-sort','sort']]){const el=document.getElementById(id);el.value=filters[key];el.addEventListener(id==='rr-search'?'input':'change',()=>{filters[key]=el.value;updateList();});}}
function warn(message){let node=document.getElementById('rr-cmp-message');if(!node){node=document.createElement('p');node.id='rr-cmp-message';node.className='rr-notice rr-cmp-message';node.setAttribute('role','alert');main.prepend(node);}node.textContent=message;announce(message);}
function bindComparisonLinks(){main.querySelectorAll('[data-from-comparison]').forEach(a=>{const id=a.getAttribute('href').split('/').pop().split('?')[0];a.href='#/runs/'+id+'?selection='+encodeURIComponent(selected.join(','))+'&reference='+encodeURIComponent(studio.reference);});}
function renderStudio(focusSelector){resetStudioSelection(false);if(selected.length<2){report=null;main.innerHTML=RRComparisonViews.empty(selected);history.replaceState(null,'',cmpHash());if(focusSelector)focusMain();return;}
 report=RRComparison.compare(RRSelection.resolve(selected,runs),contexts,studio.reference);
 main.innerHTML=RRComparisonViews.render(report,{...studio,width:Math.max(280,Math.min(1000,window.innerWidth-400)),libraryHash});
 history.replaceState(null,'',cmpHash());bindComparisonLinks();
 const reportURL='#/reports?'+new URLSearchParams({type:'comparison',ids:selected.join(','),ref:studio.reference});
 const reportLink=document.createElement('a');reportLink.className='rr-btn';reportLink.href=reportURL;reportLink.textContent='Skapa PDF-rapport';main.querySelector('.rr-page-head')?.append(reportLink);
 if(studio.view==='prepare'){const lead=main.querySelector('#rr-cmp-content .rr-lead');if(lead)lead.textContent='Rapportcentret skapar PDF från samma valda syntetiska underlag. Du kan också hämta jämförelsemodellen som JSON.';}

 if(focusSelector)main.querySelector(focusSelector)?.focus({preventScroll:true});
}
function parseSelection(value){const ids=value?value.split(','):[];return RRSelection.validate(ids,runs);}
function readStudioQuery(q){
 if(q.has('ids'))selected=parseSelection(q.get('ids'));
 if(q.has('ref')){const ref=q.get('ref');if(ref&&!selected.includes(ref))throw Error('Referenskörningen måste ingå i urvalet.');studio.reference=ref;}
 if(q.has('view')){if(!views.includes(q.get('view')))throw Error('Den begärda jämförelsevyn finns inte.');studio.view=q.get('view');}
 if(q.has('mode')){if(!['multiples','overlay'].includes(q.get('mode')))throw Error('Ogiltigt diagramläge.');studio.diagramMode=q.get('mode');}
 if(q.has('metric')){if(!['equity','net_return_pct','max_drawdown_pct','fees','spread','slippage'].includes(q.get('metric')))throw Error('Diagrammåttet stöds inte.');studio.chartKey=q.get('metric');}
 if(q.has('focus')){const ids=parseSelection(q.get('focus'));if(ids.length>4||ids.some(id=>!selected.includes(id)))throw Error('Diagramfokus får innehålla högst fyra av de valda körningarna.');studio.focusIds=ids;}
 studio.onlyDifferences=q.get('allparams')!=='1';resetStudioSelection(!q.has('focus'));
}
function resultActions(r,q){
 if(q.has('selection')){selected=parseSelection(q.get('selection'));studio.reference=q.get('reference')||selected[0]||'';if(studio.reference&&!selected.includes(studio.reference))throw Error('Referensen ingår inte i urvalet.');}
 const back=main.querySelector('[data-back]');if(back)back.href=libraryHash;
 const controls=document.createElement('div');controls.className='rr-actions rr-result-selection';
 controls.innerHTML=`<button type="button" class="rr-btn rr-btn-secondary" data-toggle-result="${e(r.id)}">${selected.includes(r.id)?'Ta bort från jämförelse':'Lägg till i jämförelse'}</button>${selected.length?`<a class="rr-btn rr-btn-secondary" href="${e(cmpHash())}">Till jämförelsestudion (${selected.length})</a>`:''}`;
 controls.insertAdjacentHTML('beforeend',`<a class="rr-btn" href="#/reports?type=quick&ids=${e(r.id)}">Skapa PDF-rapport</a>`);
 main.querySelector('.rr-detail-head')?.append(controls);
}
function route(moveFocus=true){try{
 RRReportCenter.dispose();
 const hash=location.hash||'#/library';const [path,query='']=hash.slice(1).split('?'),q=new URLSearchParams(query),match=/^\/(runs|print)\/(rr-[a-z0-9-]{1,80})$/.exec(path);
 document.querySelectorAll('.rr-header nav a').forEach(a=>{const active=path==='/about'?a.hash==='#/about':path==='/compare'?a.hash==='#/compare':path==='/reports'?a.hash==='#/reports':a.hash==='#/library';if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 if(path==='/library'||path==='/'||!path){if(q.has('sel'))selected=parseSelection(q.get('sel'));if(q.has('q')||q.has('market')||q.has('status')||q.has('sort'))filters={search:(q.get('q')||'').slice(0,180),market:runs.some(r=>r.market===q.get('market'))?q.get('market'):'',status:Object.hasOwn(RRViews.statusLabels,q.get('status'))?q.get('status'):'',sort:sorts.includes(q.get('sort'))?q.get('sort'):'newest'};
  main.innerHTML=RRViews.library(runs,selected);const host=document.createElement('div');host.id='rr-selection-host';main.querySelector('.rr-filter').after(host);setLibraryControls();updateList();document.title='Forskningsbibliotek · Cashmoney';}
 else if(path==='/compare'){try{readStudioQuery(q);renderStudio();}catch(err){selectionError(err.message);}document.title='Jämförelsestudio · Cashmoney';}
 else if(path==='/reports'){const ids=q.has('ids')?parseSelection(q.get('ids')):selected;const type=q.get('type')||(ids.length>1?'comparison':'quick');const ref=q.get('ref')||ids[0]||'';RRReportCenter.mount({host:main,runs,contexts,ids,referenceId:ref,type,backHash:type==='comparison'?cmpHash():ids.length===1?'#/runs/'+ids[0]:libraryHash});document.title='Rapportcenter · Cashmoney';}
 else if(path==='/about'){main.innerHTML=RRViews.about();document.title='Om prototypen · Cashmoney';}
 else if(match){const r=runs.find(r=>r.id===match[2]);if(!r)main.innerHTML='<section class="rr-card rr-empty"><h1>Körningen finns inte</h1><p>Körningen ingår inte i demonstrationspaketet.</p><a class="rr-btn" href="#/library">Till biblioteket</a></section>';
  else{main.innerHTML=match[1]==='print'?RRViews.print(r,new Date().toISOString(),contexts.find(c=>c.run_id===r.id)||null):RRViews.result(r,Math.max(280,Math.min(1100,window.innerWidth-80)),contexts.find(c=>c.run_id===r.id)||null);if(match[1]==='runs')resultActions(r,q);document.title=(match[1]==='print'?'Utskriftsprov':r.title)+' · Cashmoney';const print=document.getElementById('rr-print');if(print)print.onclick=()=>window.print();}}
 else main.innerHTML='<section class="rr-card rr-empty"><h1>Sidan finns inte</h1><p>Välj forskningsbiblioteket för att fortsätta.</p><a class="rr-btn" href="#/library">Till biblioteket</a></section>';
 main.setAttribute('aria-busy','false');if(moveFocus)focusMain();
 }catch(err){if(runs.length)selectionError(err.message);else safeError();}}
main.addEventListener('click',event=>{const target=event.target.closest('button');if(!target)return;try{
 if(target.matches('[data-reset-selection]')){selected=[];resetStudioSelection();history.replaceState(null,'','#/library');route();}
 else if(target.matches('[data-clear]')){filters={search:'',market:'',status:'',sort:'newest'};document.getElementById('rr-search').value='';document.getElementById('rr-market').value='';document.getElementById('rr-filter-status').value='';document.getElementById('rr-sort').value='newest';updateList();document.getElementById('rr-search').focus();}
 else if(target.matches('[data-select-visible]')){selected=RRSelection.add(selected,RRData.selectRuns(runs,filters).map(r=>r.id),runs);resetStudioSelection();updateList();document.querySelector('[data-select-visible]')?.focus();}
 else if(target.matches('[data-clear-selection]')){selected=[];resetStudioSelection();if(location.hash.startsWith('#/library')){updateList();document.querySelector('[data-select-visible]')?.focus();}else location.hash='#/compare';announce('Urvalet har rensats.');}
 else if(target.matches('[data-open-comparison]')){if(RRSelection.ready(selected,runs))location.hash=cmpHash();}
 else if(target.matches('[data-remove-run]')){selected=RRSelection.toggle(selected,target.dataset.removeRun,runs);renderStudio('[data-cmp-view="'+studio.view+'"]');announce(selected.length+' körningar kvar i jämförelsen.');}
 else if(target.matches('[data-toggle-result]')){selected=RRSelection.toggle(selected,target.dataset.toggleResult,runs);resetStudioSelection();history.replaceState(null,'','#/runs/'+target.dataset.toggleResult+(selected.length?'?selection='+encodeURIComponent(selected.join(','))+'&reference='+encodeURIComponent(studio.reference):''));const y=window.scrollY;route(false);window.scrollTo(0,y);main.querySelector('[data-toggle-result]')?.focus({preventScroll:true});announce(selected.length+' körningar valda.');}
 else if(target.matches('[data-cmp-view]')){studio.view=target.dataset.cmpView;renderStudio('[data-cmp-view="'+studio.view+'"]');announce('Visar '+target.textContent+'.');}
 else if(target.matches('[data-cmp-mode]')){studio.diagramMode=target.dataset.cmpMode;renderStudio('[data-cmp-mode="'+studio.diagramMode+'"]');}
 else if(target.id==='rr-download-comparison'&&report){const blob=new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='cashmoney-comparison-demo-v1.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('Jämförelseunderlaget har förberetts för nedladdning.');}
 }catch(err){warn(err.message);}});
main.addEventListener('change',event=>{const target=event.target;try{
 if(target.matches('[data-select-run]')){selected=RRSelection.toggle(selected,target.dataset.selectRun,runs);resetStudioSelection();refreshSelectionBar();saveFilters();announce(selected.length+' körningar valda.');}
 else if(target.id==='rr-reference'){studio.reference=target.value;renderStudio('#rr-reference');announce('Referenskörningen har ändrats.');}
 else if(target.matches('[data-cmp-focus]')){const id=target.dataset.cmpFocus,next=studio.focusIds.includes(id)?studio.focusIds.filter(x=>x!==id):[...studio.focusIds,id];if(next.length>4){target.checked=false;warn('Visa högst fyra kurvor samtidigt. Alla körningar finns kvar i det totala urvalet.');return;}studio.focusIds=next;renderStudio('[data-cmp-focus="'+id+'"]');}
 else if(target.id==='rr-chart-key'){studio.chartKey=target.value;renderStudio('#rr-chart-key');}
 else if(target.id==='rr-only-differences'){studio.onlyDifferences=target.checked;renderStudio('#rr-only-differences');}
 }catch(err){if(target.matches('[data-select-run]'))target.checked=selected.includes(target.dataset.selectRun);warn(err.message);}});
window.addEventListener('hashchange',()=>route());
let timer;window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(()=>{if(location.hash.startsWith('#/compare')&&report&&studio.view==='charts'){const host=main.querySelector('[data-cmp-plot]');if(host){const opened=[...host.querySelectorAll('details[open] summary')].map(n=>n.textContent),focused=host.contains(document.activeElement)?document.activeElement.textContent:null;host.innerHTML=studio.diagramMode==='multiples'?RRComparisonCharts.multiples(report,host.clientWidth>680?host.clientWidth/2-24:host.clientWidth):studio.chartKey==='equity'?RRComparisonCharts.overlay(report,studio.focusIds,host.clientWidth):RRComparisonCharts.bars(report,studio.chartKey,studio.focusIds,host.clientWidth);host.querySelectorAll('summary').forEach(n=>{if(opened.includes(n.textContent))n.parentElement.open=true;if(focused===n.textContent)n.focus({preventScroll:true});});bindComparisonLinks();}}
 else if(/^#\/runs\//.test(location.hash)){const id=location.hash.split('?')[0].slice('#/runs/'.length),r=runs.find(r=>r.id===id);if(r){main.querySelectorAll('[data-rr-chart]').forEach(el=>el.innerHTML=RRCharts.axisChart(r,el.dataset.rrChart,el.clientWidth,contexts.find(c=>c.run_id===r.id)?.observation_interval_minutes||r.interval_minutes,contexts.find(c=>c.run_id===r.id)||null));main.querySelectorAll('[data-rr-cost-chart]').forEach(el=>el.innerHTML=RRCharts.costs(r,el.clientWidth));}}},150);});
try{if(!window.RRData||!window.RRLanguage||!window.RRViews||!window.RRFixtures||!window.RRComparison||!window.RRComparisonFixtures||!window.RRSelection||!window.RRComparisonViews||!window.RRReportModel||!window.RRReportCenter)throw Error('Missing module');runs=RRData.validateCatalog([...RRFixtures,...RRComparisonFixtures.runs]);contexts=RRComparisonFixtures.contexts;contexts.forEach(c=>RRComparison.validateContext(c,runs.find(r=>r.id===c.run_id)));route(false);}catch{safeError();}
})();
