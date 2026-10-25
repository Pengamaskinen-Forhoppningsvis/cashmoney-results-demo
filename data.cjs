/* Cashmoney results-view.v1. Pure, bounded presentation validation; no IO. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RRData=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const SCHEMA='cashmoney.results-view.v1';
const METRICS=['net_return_pct','benchmark_return_pct','max_drawdown_pct','closed_trades'];
const COSTS=['fee_eur','spread_reference_eur','slippage_reference_eur'];
function fail(reason){throw new Error('Ogiltigt presentationsunderlag: '+reason);}
function exact(o,fields){if(!o||Object.getPrototypeOf(o)!==Object.prototype||Object.keys(o).sort().join('|')!==[...fields].sort().join('|'))fail('fält eller objekttyp');}
function text(v,n=2048){if(typeof v!=='string'||v.length>n||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))fail('text');}
function one(v,allowed){if(!allowed.includes(v))fail('okänt värde');}
function stamp(v){if(typeof v!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().replace('.000','')!==v)fail('UTC-tid');return Date.parse(v);}
function decimal(v){if(typeof v!=='string'||! /^-?(0|[1-9]\d{0,8})(\.\d{1,8})?$/.test(v)|| /^-0(?:\.0+)?$/.test(v))fail('decimalsträng');return v;}
function scaled(v){decimal(v);const neg=v[0]==='-';const [a,b='']=(neg?v.slice(1):v).split('.');return BigInt((neg?'-':'')+a+b.padEnd(8,'0'));}
function bounded(v,lo,hi){const n=scaled(v);if(n<scaled(lo)||n>scaled(hi))fail('tal utanför gräns');}
function metric(m,lo,hi,integer=false){exact(m,['value','availability','reason']);one(m.availability,['available','missing','not_evaluated','blocked']);text(m.reason);if(m.availability==='available'){bounded(m.value,lo,hi);if(integer&&!/^\d+$/.test(m.value))fail('antal måste vara heltal');}else if(m.value!==null)fail('otillgängligt mått måste vara null');}
function strings(a,max=30){if(!Array.isArray(a)||a.length>max)fail('textlista');a.forEach(v=>text(v));}
function validate(run){
 exact(run,['schema','id','title','strategy','market','interval_minutes','created_at','period','data_kind','result_kind','status','technical_status','research_approved','publication','metrics','series','costs','benchmark','quality','provenance','limitations','unknowns']);
 if(run.schema!==SCHEMA)fail('okänd schemaversion');
 if(typeof run.id!=='string'||!/^rr-[a-z0-9-]{1,80}$/.test(run.id))fail('körnings-ID');text(run.title,180);text(run.market,40);
 if(!Number.isInteger(run.interval_minutes)||run.interval_minutes<1||run.interval_minutes>10080)fail('tidsupplösning');stamp(run.created_at);
 exact(run.period,['start','end','complete']);if(stamp(run.period.end)<stamp(run.period.start)||typeof run.period.complete!=='boolean')fail('period');
 one(run.data_kind,['synthetic','demo','historical']);one(run.result_kind,['synthetic_test','demonstration','historical_research','hypothetical_paper','technical_diagnostic']);
 if((run.result_kind==='synthetic_test'&&run.data_kind!=='synthetic')||(run.result_kind==='demonstration'&&run.data_kind!=='demo')||(run.result_kind==='historical_research'&&run.data_kind!=='historical'))fail('felmärkt underlag');
 one(run.status,['completed','incomplete','blocked','diagnostic']);one(run.publication,['demo_public','blocked']);one(run.technical_status,['PASS','LIMITED','STOP']);
 if(run.research_approved!==false)fail('inget forskningsgodkännande stöds');
 exact(run.strategy,['id','parameters']);text(run.strategy.id,100);if(!Array.isArray(run.strategy.parameters)||run.strategy.parameters.length>40)fail('parametrar');run.strategy.parameters.forEach(p=>{exact(p,['label','value','unit']);text(p.label,120);text(p.value,200);text(p.unit,40);});
 exact(run.metrics,METRICS);metric(run.metrics.net_return_pct,'-100','1000000');metric(run.metrics.benchmark_return_pct,'-100','1000000');metric(run.metrics.max_drawdown_pct,'0','100');metric(run.metrics.closed_trades,'0','1000000',true);
 exact(run.costs,[...COSTS,'embedded_in_fill_price']);COSTS.forEach(k=>metric(run.costs[k],'0','999999999'));if(typeof run.costs.embedded_in_fill_price!=='boolean')fail('kostnadsgrund');
 exact(run.benchmark,['comparable','cost_basis','note']);one(run.benchmark.cost_basis,['same','different','unknown']);text(run.benchmark.note);if(typeof run.benchmark.comparable!=='boolean'||(run.benchmark.comparable&&run.benchmark.cost_basis!=='same'))fail('oförenlig benchmark');
 exact(run.quality,['status','note']);one(run.quality.status,['PASS','LIMITED','STOP']);text(run.quality.note);
 exact(run.provenance,['source','code_claim','verified']);text(run.provenance.source);text(run.provenance.code_claim);if(run.provenance.verified!==false)fail('kodversion är inte attesterad');
 strings(run.limitations);strings(run.unknowns);exact(run.series,['equity','drawdown']);
 for(const key of ['equity','drawdown']){const rows=run.series[key];if(!Array.isArray(rows)||rows.length>2000)fail('seriegräns');let previous=-Infinity;for(const p of rows){exact(p,key==='equity'?['time','strategy','benchmark']:['time','value']);const t=stamp(p.time);if(t<=previous||t<stamp(run.period.start)||t>stamp(run.period.end))fail('serieordning/period');previous=t;for(const k of key==='equity'?['strategy','benchmark']:['value'])if(p[k]!==null)bounded(p[k],key==='equity'?'0':'-100',key==='equity'?'1000000':'0');}}
 if(run.status==='completed'&&!run.period.complete)fail('ofullständig period märkt slutförd');
 if(run.status==='diagnostic'&&run.result_kind!=='technical_diagnostic')fail('diagnostiktyp');
 if(run.status==='incomplete'&&run.period.complete)fail('ofullständigt underlag måste märkas som ofullständigt');
 if(run.result_kind==='technical_diagnostic'&&run.publication!=='blocked'){
  if(run.status!=='diagnostic'||run.series.equity.length||run.series.drawdown.length||run.benchmark.comparable)fail('diagnostik får inte innehålla ekonomisk jämförelse eller kurva');
  for(const k of METRICS)if(!['missing','not_evaluated'].includes(run.metrics[k].availability)||run.metrics[k].value!==null)fail('diagnostik får inte redovisa ekonomiskt resultat');
  for(const k of COSTS)if(!['missing','not_evaluated'].includes(run.costs[k].availability)||run.costs[k].value!==null)fail('diagnostik får inte redovisa handelskostnader');
 }
 if(run.publication==='blocked'||run.status==='blocked'){
  if(run.publication!=='blocked'||run.status!=='blocked'||run.strategy.parameters.length||run.series.equity.length||run.series.drawdown.length)fail('blockerat innehåll');
  for(const k of METRICS)if(run.metrics[k].availability!=='blocked'||run.metrics[k].value!==null)fail('blockerat resultatvärde');
  for(const k of COSTS)if(run.costs[k].availability!=='blocked'||run.costs[k].value!==null)fail('blockerad kostnad');
  if(run.benchmark.comparable)fail('blockerad jämförelse');
 }
 return run;
}
function deepFreeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(deepFreeze);Object.freeze(v);}return v;}
function isDemo(run){return run.data_kind==='synthetic'||run.data_kind==='demo';}
function validateCatalog(runs){if(!Array.isArray(runs)||runs.length>100)fail('kataloggräns');const ids=new Set();for(const r of runs){validate(r);if(r.data_kind!=='synthetic')fail('etapp 2 tillåter endast syntetiskt underlag');if(ids.has(r.id))fail('dubbelt körnings-ID');ids.add(r.id);}return deepFreeze(runs);}
function metricText(m,unit='%',digits=1){if(m.availability!=='available')return {missing:'Saknas',not_evaluated:'Inte beräknat',blocked:'Blockerat'}[m.availability]||'Saknas';decimal(m.value);if(!Number.isInteger(digits)||digits<0||digits>8)fail('avrundning');const negative=m.value.startsWith('-');const [a,b='']=(negative?m.value.slice(1):m.value).split('.');const raw=BigInt(a+b.padEnd(8,'0'));const divisor=10n**BigInt(8-digits);let rounded=(raw+divisor/2n)/divisor;const f=10n**BigInt(digits);const whole=(rounded/f).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0');const fraction=digits?','+(rounded%f).toString().padStart(digits,'0'):'';const sign=negative&&raw!==0n?'−':'';const tiny=raw!==0n&&rounded===0n?' (nära noll efter avrundning)':'';return sign+whole+fraction+(unit?'\u00a0'+unit:'')+tiny;}
function selectRuns(runs,{search='',market='',status='',sort='newest'}={}){let result=runs.filter(r=>(!market||r.market===market)&&(!status||r.status===status)&&(!search||[r.title,r.id,r.market,r.strategy.id].join(' ').toLocaleLowerCase('sv-SE').includes(search.toLocaleLowerCase('sv-SE'))));return result.sort((a,b)=>{let diff=0;if(sort==='return-desc'||sort==='return-asc'){const x=a.metrics.net_return_pct,y=b.metrics.net_return_pct;if(x.availability!=='available'||y.availability!=='available')diff=(x.availability==='available'?0:1)-(y.availability==='available'?0:1);else{const n=scaled(x.value)-scaled(y.value);diff=(n<0n?-1:n>0n?1:0)*(sort==='return-desc'?-1:1);}}else diff=(Date.parse(a.created_at)-Date.parse(b.created_at))*(sort==='oldest'?1:-1);return diff||a.id.localeCompare(b.id);});}
return Object.freeze({SCHEMA,METRICS,COSTS,validate,validateCatalog,deepFreeze,isDemo,metricText,selectRuns,scaled});
});
