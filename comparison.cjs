/* Synthetic-only comparison policy. No strategy evaluation, research IO or approval. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./data.cjs'):root.RRData);if(typeof module==='object'&&module.exports)module.exports=api;else root.RRComparison=api;})(typeof globalThis!=='undefined'?globalThis:this,function(D){
'use strict';
const SCHEMA='cashmoney.comparison-report.v1',CONTEXT_SCHEMA='cashmoney.comparison-context.v1',VERSION='comparison-policy-v2';
const LABELS=Object.freeze({comparable:'Jämförbar',limited:'Begränsad jämförbarhet',not_comparable:'Inte jämförbar',unknown:'Kan inte bedömas'});
const definitions=Object.freeze([
 {key:'net_return_pct',label:'Avkastning efter kostnader',unit:'%',description:'Redovisad avkastning för hela den angivna perioden efter modellens kostnader.'},
 {key:'max_drawdown_pct',label:'Största värdeminskning',unit:'%',description:'Största observerade minskning från en tidigare topp, med angiven period och observationsfrekvens.'},
 {key:'closed_trades',label:'Avslutade affärer',unit:'',description:'Antal enligt den uttryckliga affärsdefinitionen. Öppningar och stängningar är inte automatiskt rundresor.'},
 {key:'exposure_pct',label:'Andel av tiden investerad',unit:'%',description:'Tidsandel enligt den deklarerade exponeringsdefinitionen, aldrig härledd ur avkastning.'},
 {key:'fees',label:'Debiterade avgifter',unit:'EUR',description:'Debiterade avgifter, jämförbara som absoluta belopp endast med förenlig kapital- och kostnadsgrund.'},
 {key:'spread',label:'Spread, referens',unit:'EUR',description:'Referensuppskattning. Får inte summeras till ett nytt netto eller dras av ytterligare.'},
 {key:'slippage',label:'Slippage, referens',unit:'EUR',description:'Referensuppskattning av prisavvikelse. Inte en ytterligare debitering när den redan ingår i fillpriset.'},
 {key:'benchmark_return_pct',label:'Köp och behåll',unit:'%',description:'Benchmark kräver förenlig marknad, period, definition och kostnadsgrund både inom och mellan körningarna.'},
 {key:'equity',label:'Värdeutveckling',unit:'index 100',description:'Publicerade indexserier används oförändrade. Ingen ombasering, interpolation eller beskärning görs.'}
]);
const METRIC_KEYS=Object.freeze(definitions.map(d=>d.key));
const METHOD_KEYS=['cost_model','execution_model','valuation_model','return_definition','drawdown_definition','trade_definition','exposure_definition','dataset_family'];
const contextFields=['schema','run_id','source_binding','currency','starting_capital','capital_flows',...METHOD_KEYS,'exposure','series_base','observation_interval_minutes','coverage','benchmark','notes'];
function fail(s){throw Error('Ogiltigt jämförelseunderlag: '+s);}
function exact(x,keys){if(!x||Object.getPrototypeOf(x)!==Object.prototype||Object.keys(x).sort().join('|')!==[...keys].sort().join('|'))fail('okända fält eller objekttyp');}
function text(x,max=400){if(typeof x!=='string'||x.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x))fail('text');}
function nullable(x,max=160){if(x!==null){text(x,max);if(!x.trim())fail('tom metoduppgift');}}
function metric(x,max,allowNull=false){if(x===null&&allowNull)return;exact(x,['value','availability','reason']);text(x.reason,2048);if(!['available','missing','not_evaluated','blocked'].includes(x.availability))fail('måttstatus');if(x.availability==='available'){const n=D.scaled(x.value);if(n<0n||n>D.scaled(max))fail('måttgräns');}else if(x.value!==null)fail('saknat mått med dolt värde');}
function binding(run){return {schema:run.schema,id:run.id,market:run.market,start:run.period.start,end:run.period.end,interval_minutes:run.interval_minutes,source:run.provenance.source};}
function validateContext(ctx,run){D.validate(run);if(run.data_kind!=='synthetic')fail('endast syntetiskt underlag stöds');exact(ctx,contextFields);if(ctx.schema!==CONTEXT_SCHEMA||ctx.run_id!==run.id)fail('schema eller körningsidentitet');exact(ctx.source_binding,['schema','id','market','start','end','interval_minutes','source']);for(const [k,v] of Object.entries(binding(run)))if(ctx.source_binding[k]!==v)fail('metadatakoppling skiljer sig från körningen');
 if(ctx.currency!==null&&!['EUR','SEK'].includes(ctx.currency))fail('valuta');metric(ctx.starting_capital,'999999999',true);if(ctx.starting_capital?.availability==='available'&&D.scaled(ctx.starting_capital.value)<=0n)fail('startkapital måste vara positivt');
 if(!['none','unknown'].includes(ctx.capital_flows))fail('kapitalflöden');METHOD_KEYS.forEach(k=>nullable(ctx[k]));metric(ctx.exposure,'100');if(ctx.series_base!==null&&ctx.series_base!=='index100')fail('seriegrund');
 if(ctx.observation_interval_minutes!==null&&(!Number.isInteger(ctx.observation_interval_minutes)||ctx.observation_interval_minutes<1||ctx.observation_interval_minutes>10080))fail('observationsintervall');if(!['complete','gapped','unknown'].includes(ctx.coverage))fail('täckning');exact(ctx.benchmark,['definition','market','start','end','cost_model']);Object.values(ctx.benchmark).forEach(x=>nullable(x));for(const k of ['start','end'])if(ctx.benchmark[k]!==null&&(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(ctx.benchmark[k])||new Date(ctx.benchmark[k]).toISOString().replace('.000','')!==ctx.benchmark[k]))fail('benchmarktid');
 if(!Array.isArray(ctx.notes)||ctx.notes.length>20)fail('noteringar');ctx.notes.forEach(x=>text(x,2048));
 if(run.publication==='blocked'){
  if(ctx.currency!==null||ctx.starting_capital!==null||ctx.exposure.availability!=='blocked'||ctx.exposure.value!==null||ctx.series_base!==null||ctx.observation_interval_minutes!==null||ctx.coverage!=='unknown'||ctx.capital_flows!=='unknown'||METHOD_KEYS.some(k=>ctx[k]!==null)||Object.values(ctx.benchmark).some(x=>x!==null))fail('blockerad jämförelsemetadata');
 }
 return ctx;
}
function contextMap(runs,contexts){if(!Array.isArray(contexts)||contexts.length>100)fail('metadataomfattning');const known=new Map(runs.map(r=>[r.id,r])),map=new Map();for(const ctx of contexts){if(!known.has(ctx.run_id)||map.has(ctx.run_id))fail('okänd eller dubblerad metadatakoppling');validateContext(ctx,known.get(ctx.run_id));map.set(ctx.run_id,ctx);}return map;}
function result(status,reasons){return {status,label:LABELS[status],reasons:[...new Set(reasons)]};}
function combine(items){const weights={comparable:0,limited:1,unknown:2,not_comparable:3};let state='comparable';for(const r of items)if(weights[r.status]>weights[state])state=r.status;return result(state,items.flatMap(r=>r.reasons));}
function metricValue(r,ctx,key){const costs={fees:'fee_eur',spread:'spread_reference_eur',slippage:'slippage_reference_eur'};if(key==='exposure_pct')return ctx?.exposure||{value:null,availability:'missing',reason:'Exponering saknas.'};if(costs[key])return r.costs[costs[key]];if(key==='equity')return {value:null,availability:r.series.equity.some(p=>p.strategy!==null)?'available':'missing',reason:'Serie saknas.'};return r.metrics[key];}
function seriesIssues(r,ctx,which='equity'){const rows=which==='drawdown'?r.series.drawdown:r.series.equity,fields=which==='drawdown'?['value']:which==='benchmark'?['benchmark']:['strategy'];if(!rows.length)return true;const step=(ctx?.observation_interval_minutes||r.interval_minutes)*60000;return rows[0].time!==r.period.start||rows.at(-1).time!==r.period.end||rows.some((p,i)=>fields.some(k=>p[k]===null)||(i>0&&Date.parse(p.time)-Date.parse(rows[i-1].time)!==step));}
function assess(a,b,ca,cb,key){if(!METRIC_KEYS.includes(key))fail('okänt jämförelsemått');D.validate(a);D.validate(b);if(a.data_kind!=='synthetic'||b.data_kind!=='synthetic')fail('icke-syntetiskt underlag');if(ca)validateContext(ca,a);if(cb)validateContext(cb,b);
 const checks=[];const add=(status,why)=>checks.push(result(status,[why]));const abs=['fees','spread','slippage'].includes(key);
 if([a,b].some(r=>r.publication==='blocked'||r.status==='blocked'))return result('not_comparable',['Resultatvärdena är blockerade och har uteslutits före publicering.']);
 if([a,b].some(r=>r.technical_status==='STOP'||r.quality.status==='STOP'))return result('not_comparable',['En teknisk STOP-spärr hindrar den här jämförelsen.']);
 if([a,b].some(r=>r.result_kind==='technical_diagnostic'))return result('not_comparable',['Teknisk diagnostik är inte ett ekonomiskt strategiresultat.']);
 if(a.result_kind!==b.result_kind)add('not_comparable','Resultaten avser olika resultattyper och får inte ges en direkt ekonomisk jämförelse.');
 if(!ca||!cb)add('unknown','Nödvändig metodmetadata saknas för minst en körning.');
 if(metricValue(a,ca,key)?.availability!=='available'||metricValue(b,cb,key)?.availability!=='available')add('unknown','Måttet eller dess publicerbara observationer saknas i minst en körning.');
 const samePeriod=a.period.start===b.period.start&&a.period.end===b.period.end;
 if(!samePeriod)add(key==='equity'||key==='benchmark_return_pct'?'not_comparable':'limited','Körningarna undersöktes under olika tidsperioder; resultaten är periodspecifika.');
 if(a.market!==b.market)add(key==='equity'||key==='benchmark_return_pct'?'not_comparable':'limited','Marknaderna skiljer sig. Det här isolerar inte strategins effekt.');
 if(a.interval_minutes!==b.interval_minutes)add(key==='equity'?'not_comparable':'limited','Tidsupplösningen skiljer sig och kan påverka signaler, risk och aktivitet.');
 if([a,b].some(r=>!r.period.complete||r.status==='incomplete'))add('limited','Minst en körning är ofullständig. Endast redovisad bearbetad period får beskrivas.');
 if([a,b].some(r=>r.technical_status==='LIMITED'||r.quality.status==='LIMITED'))add('limited','Teknisk kontroll eller datakvalitet har uttryckliga begränsningar.');
 if(ca&&cb){
  const requireSame=(field,{different='limited',missing='unknown',why}={})=>{if(ca[field]===null||cb[field]===null)add(missing,why||'Uppgift om '+field+' saknas.');else if(ca[field]!==cb[field])add(different,why||'Metoduppgiften '+field+' skiljer sig.');};
  const capA=ca.starting_capital,capB=cb.starting_capital;
  if(!capA||!capB||capA.availability!=='available'||capB.availability!=='available')add('unknown','Startkapital saknas; kapitalgrunden kan inte bedömas.');else if(D.scaled(capA.value)!==D.scaled(capB.value))add(abs?'not_comparable':'limited','Startkapitalet skiljer sig. Absoluta belopp och kapitalberoende beslut är inte direkt likvärdiga.');
  if(ca.currency===null||cb.currency===null)add('unknown','Valutan saknas i jämförelseunderlaget.');else if(ca.currency!==cb.currency)add(abs?'not_comparable':'limited','Valutorna skiljer sig. Ingen valutakonvertering har gjorts.');
  if(ca.capital_flows!=='none'||cb.capital_flows!=='none')add('unknown','Det är inte styrkt att perioden saknar externa kapitalflöden.');
  requireSame('execution_model',{different:key==='equity'?'not_comparable':'limited',why:'Exekveringsmodell saknas eller skiljer sig.'});
  if(['net_return_pct','max_drawdown_pct','equity','benchmark_return_pct'].includes(key))requireSame('valuation_model',{different:'not_comparable',why:'Värderingsgrund saknas eller skiljer sig.'});
  if(['net_return_pct','equity','benchmark_return_pct'].includes(key))requireSame('return_definition',{different:'not_comparable',why:'Avkastningens beräkningsdefinition saknas eller skiljer sig.'});
  if(key==='max_drawdown_pct'){requireSame('drawdown_definition',{different:'not_comparable',why:'Definitionen av största värdeminskning saknas eller skiljer sig.'});requireSame('observation_interval_minutes',{different:'limited',why:'Riskens observationsfrekvens saknas eller skiljer sig.'});}
  if(key==='closed_trades')requireSame('trade_definition',{different:'not_comparable',why:'Affärer räknas enligt okänd eller olika definition.'});
  if(key==='exposure_pct'){requireSame('exposure_definition',{different:'not_comparable',why:'Exponeringen saknar en gemensam tidsandelsdefinition.'});if([ca,cb].some(c=>c.exposure_definition!==null&&c.exposure_definition!=='share-of-observed-time-v1'))add('unknown','Exponeringsdefinitionen är inte en stödd tidsandel. Kapitalexponering får inte märkas som tid investerad.');}
  if(abs||['net_return_pct','max_drawdown_pct','equity','benchmark_return_pct'].includes(key))requireSame('cost_model',{different:abs||key==='benchmark_return_pct'?'not_comparable':'limited',why:'Handelskostnaderna är okända eller beräknade med olika modeller.'});
  if((key==='spread'||key==='slippage')&&a.costs.embedded_in_fill_price!==b.costs.embedded_in_fill_price)add('not_comparable','Referenskostnadernas koppling till handelspriset skiljer sig. Ingen ytterligare avräkning görs.');
  requireSame('dataset_family',{different:'limited',why:'Datagrunden saknas eller skiljer sig; resultaten är inte oberoende bevis.'});
  if(ca.coverage==='unknown'||cb.coverage==='unknown')add('unknown','Uppgift om observationernas täckning saknas.');else if(ca.coverage==='gapped'||cb.coverage==='gapped')add('limited','Underlaget har dataluckor. Inga saknade observationer konstrueras.');
  if(key==='equity'){if(ca.series_base!=='index100'||cb.series_base!=='index100')add('unknown','Gemensam deklarerad indexgrund saknas; ingen normalisering utförs.');else if([a,b].some(r=>r.series.equity[0]?.time===r.period.start&&r.series.equity[0].strategy!==null&&D.scaled(r.series.equity[0].strategy)!==D.scaled('100')))add('not_comparable','Publicerad indexstart avviker från den deklarerade grunden 100. Ingen ombasering görs.');if(ca.observation_interval_minutes===null||cb.observation_interval_minutes===null)add('unknown','Kurvornas observationsintervall saknas.');else if(ca.observation_interval_minutes!==cb.observation_interval_minutes)add('not_comparable','Kurvorna har olika observationsintervall och visas inte som en gemensam direkt jämförelse.');}
  if(key==='benchmark_return_pct'){
   if(ca.series_base!=='index100'||cb.series_base!=='index100')add('unknown','Benchmarkens gemensamma deklarerade indexgrund saknas; ingen normalisering utförs.');
   else if([a,b].some(r=>r.series.equity[0]?.time===r.period.start&&r.series.equity[0].benchmark!==null&&D.scaled(r.series.equity[0].benchmark)!==D.scaled('100')))add('not_comparable','Benchmarkens publicerade indexstart avviker från den deklarerade grunden 100. Ingen ombasering görs.');
   for(const [r,c] of [[a,ca],[b,cb]]){
    if(r.benchmark.cost_basis==='different')add('not_comparable','Benchmark har en uttryckligen oförenlig kostnadsgrund inom körningen.');else if(r.benchmark.cost_basis!=='same'||!r.benchmark.comparable)add('unknown','Benchmarkens jämförbarhet eller kostnadsgrund har inte styrkts.');
    for(const k of ['definition','market','start','end','cost_model'])if(c.benchmark[k]===null)add('unknown','Benchmarkens definition, marknad, period eller kostnadsmodell saknas.');
    if(c.benchmark.market!==null&&c.benchmark.market!==r.market||c.benchmark.start!==null&&c.benchmark.start!==r.period.start||c.benchmark.end!==null&&c.benchmark.end!==r.period.end||c.benchmark.cost_model!==null&&c.cost_model!==null&&c.benchmark.cost_model!==c.cost_model)add('not_comparable','Benchmark matchar inte körningens egen marknad, period eller kostnadsmodell.');
   }
   for(const k of ['definition','market','start','end','cost_model'])if(ca.benchmark[k]!==null&&cb.benchmark[k]!==null&&ca.benchmark[k]!==cb.benchmark[k])add('not_comparable','Benchmarkdefinitionerna är inte likvärdiga mellan körningarna.');
  }
 }
 const publicStrategyGaps=[a,b].some((r,i)=>seriesIssues(r,i===0?ca:cb,'equity'));
 if(publicStrategyGaps)add('limited','De publicerade strategiobservationerna har luckor eller ofullständiga ändpunkter. Det begränsar även aktivitets- och kostnadsjämförelser trots en deklaration om fullständig täckning.');
 if(['max_drawdown_pct','benchmark_return_pct'].includes(key)&&[a,b].some((r,i)=>seriesIssues(r,i===0?ca:cb,key==='max_drawdown_pct'?'drawdown':'benchmark')))add('limited','Måttets egna observationer har luckor eller ofullständiga ändpunkter. Linjer får inte överbrygga luckorna.');
 if(!checks.length)add('comparable','De deklarerade syntetiska metodvillkoren för detta mått är lika och validerade. Det är inget forskningsgodkännande.');
 return combine(checks);
}
function summary(report){const markets=[...new Set(report.rows.map(r=>r.run.market))];const periods=new Set(report.rows.map(r=>r.run.period.start+'|'+r.run.period.end));return [report.rows.length+' syntetiska körningar från '+markets.length+' marknad'+(markets.length===1?'':'er')+' ingår i jämförelsen.',periods.size>1?'Körningarna undersöktes under olika tidsperioder. Därför går det inte att utse vilken strategi som presterade bäst utifrån denna jämförelse.':'Körningarna redovisar samma kalenderperiod; jämförbarhet prövas fortfarande separat för varje mått.','Övergripande bedömning: '+report.overall.label+'. Läs måttens skäl innan du tolkar skillnader.','Tekniska tester och syntetisk jämförbarhet innebär inte vetenskapligt godkänd strategi eller framtida avkastning.'];}
function compare(runs,contexts,referenceId){if(!Array.isArray(runs)||runs.length<2||runs.length>20)fail('välj mellan två och tjugo körningar');D.validateCatalog(runs);const selectedIds=new Set(runs.map(r=>r.id));if(!selectedIds.has(referenceId))fail('referensen finns inte i urvalet');
 // Callers may provide the complete public catalog context pool; unknown context
 // IDs are ignored only if not selected, but duplicate IDs are never accepted.
 if(!Array.isArray(contexts)||contexts.length>100)fail('metadataomfattning');const ids=new Set();for(const c of contexts){if(!c||typeof c.run_id!=='string'||ids.has(c.run_id))fail('dubblerad metadata');ids.add(c.run_id);}
 const map=contextMap(runs,contexts.filter(c=>selectedIds.has(c.run_id))),ref=runs.find(r=>r.id===referenceId);
 const rows=runs.map((r,i)=>{const c=map.get(r.id)||null,assessments={};for(const key of METRIC_KEYS)assessments[key]=assess(r,ref,c,map.get(ref.id)||null,key);return {id:r.id,code:'R'+String(i+1).padStart(2,'0'),run:JSON.parse(JSON.stringify(r)),context:c?JSON.parse(JSON.stringify(c)):null,assessments,overall:combine(Object.values(assessments))};});
 const report={schema:SCHEMA,demo:true,engine_version:VERSION,context_schema:CONTEXT_SCHEMA,reference_id:referenceId,run_ids:runs.map(r=>r.id),overall:combine(rows.map(r=>r.overall)),summary:[],rows,metric_definitions:definitions.map(x=>({...x})),limitations:['Alla underlag och metoduppgifter är uttryckligen syntetiska. Jämförbar betyder endast teknisk jämförbarhet inom dessa deklarerade testvillkor.','Inga körningar har forskningsgodkännande. Tekniskt PASS öppnar inga forsknings- eller handelstillstånd.','Samma datasetfamilj eller överlappande perioder är beroende observationer, inte oberoende bekräftelser.','Parameterändringar och resultatskillnader redovisas utan påståenden om orsakssamband.','Spread och slippage som ingår i handelspriset är referensvärden; de dras inte av igen.','Ingen vinnare, sammanvägd poäng, statistisk signifikans eller framtida avkastning beräknas.']};report.summary=summary(report);return D.deepFreeze(report);
}
return Object.freeze({SCHEMA,CONTEXT_SCHEMA,VERSION,LABELS,METRIC_KEYS,definitions,binding,validateContext,assess,compare,summary,metricValue,seriesIssues});
});
