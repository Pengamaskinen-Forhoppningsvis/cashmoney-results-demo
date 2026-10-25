/* Synthetic-only report boundary. No IO, adapters, trading or economic calculations. */
(function(root,factory){const node=typeof module==='object'&&module.exports;const api=factory(node?require('./data.cjs'):root.RRData,node?require('./language.cjs'):root.RRLanguage,node?require('./comparison.cjs'):root.RRComparison,node?require('node:crypto').webcrypto:root.crypto);if(node)module.exports=api;else root.RRReportModel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(D,L,M,crypto){
'use strict';
const SCHEMA='cashmoney.pdf-report.v1',VERSION='report-layout-v2';
const TYPES=Object.freeze({quick:'Snabbrapport',full:'Fullständig forskningsrapport',comparison:'Jämförelserapport'});
const WARNINGS=Object.freeze([
 'DEMO - Alla resultat, observationer och metoduppgifter är syntetiska. De är inte verkliga forskningsresultat.',
 'Inga körningar har forskningsgodkännande. Tekniskt PASS gäller en teknisk kontroll och innebär inte att strategin är vetenskapligt godkänd.',
 'Rapporten bevisar inte lönsamhet i verklig handel och ger inga löften om framtida avkastning.',
 'Saknade uppgifter visas som saknade. Dataluckor fylls inte och mått räknas inte om från diagram.',
 'Spread och slippage som redan ingår i handelspriset är referensuppskattningar. De dras inte av en gång till.',
 'Ingen vinnare, orsakstolkning eller statistisk signifikans beräknas. Parameterändringar är inte bevis för en resultatskillnads orsak.',
 'Kodversionen är en uppgift från underlaget, inte en verifierad exekveringsversion. Saknad dataset-hash ersätts inte med ett påhittat värde.'
]);
function fail(message){throw Error('Rapporten kan inte skapas: '+message);}
function exact(o,fields){if(!o||Object.getPrototypeOf(o)!==Object.prototype||Object.keys(o).sort().join('|')!==[...fields].sort().join('|'))fail('okända fält eller objekttyp.');}
function canonical(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';}
function copy(x){return JSON.parse(JSON.stringify(x));}
function utc(value){if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().replace('.000','')!==value)fail('genereringstiden måste vara en giltig UTC-tid.');return value;}
function validateOptions(options){exact(options,['parameters','pointTable']);if(typeof options.parameters!=='boolean'||typeof options.pointTable!=='boolean')fail('rapporttilläggen måste vara uttryckliga val.');return copy(options);}
async function digest(text){if(!crypto?.subtle)fail('den här webbläsaren saknar säker hashfunktion. Ingen rapport ersätter det ogiltiga underlaget.');const bytes=new TextEncoder().encode(text),hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');}
function publicInputs(runs,contexts){
 if(!Array.isArray(runs)||runs.length<1||runs.length>20)fail('välj mellan en och tjugo körningar.');
 // Validation is intentionally completed before cloning, hashing or rendering.
 D.validateCatalog(runs);
 for(const run of runs){if(run.data_kind!=='synthetic')fail('endast syntetiska testunderlag får exporteras.');if(run.publication==='blocked'||run.status==='blocked'||run.technical_status==='STOP'||run.quality.status==='STOP')fail('urvalet innehåller en blockerad körning eller STOP. Ta bort körningen innan du fortsätter.');}
 if(!Array.isArray(contexts)||contexts.length>100)fail('ogiltig metodmetadata.');
 const selected=new Map(runs.map(r=>[r.id,r])),seen=new Set(),map=new Map();
 for(const ctx of contexts){if(!ctx||typeof ctx.run_id!=='string'||seen.has(ctx.run_id))fail('dubblerad eller ogiltig metodmetadata.');seen.add(ctx.run_id);if(selected.has(ctx.run_id)){M.validateContext(ctx,selected.get(ctx.run_id));map.set(ctx.run_id,ctx);}}
 return map;
}
async function prepare(input){
 exact(input,['type','runs','contexts','referenceId','options','generatedAt']);
 const {type,runs,contexts,referenceId,generatedAt}=input;
 if(!Object.hasOwn(TYPES,type))fail('okänd rapporttyp eller schemaversion.');
 const options=validateOptions(input.options),generated_at=utc(generatedAt),map=publicInputs(runs,contexts);
 if(type!=='quick'&&!options.parameters)fail('strategiparametrar är obligatoriska i fullständig rapport och jämförelserapport.');
 if(type==='comparison'&&runs.length<2)fail('jämförelserapport kräver minst två körningar.');
 if(type!=='comparison'&&runs.length!==1)fail('en enskild rapport kräver exakt en körning.');
 if(typeof referenceId!=='string'||!runs.some(r=>r.id===referenceId))fail('referenskörningen måste finnas i urvalet.');
 const comparison=type==='comparison'?M.compare(runs,contexts,referenceId):null;
 const rows=runs.map((run,i)=>{const ctx=map.get(run.id)||null,assessments={};for(const key of M.METRIC_KEYS)assessments[key]=comparison?copy(comparison.rows[i].assessments[key]):M.assess(run,run,ctx,ctx,key);return {id:run.id,code:'R'+String(i+1).padStart(2,'0'),run:copy(run),context:ctx?copy(ctx):null,summary:L.summarize(run),benchmark_assessment:M.assess(run,run,ctx,ctx,'benchmark_return_pct'),assessments};});
 const provenance=rows.map(row=>({run_id:row.id,source:row.run.provenance.source,code_claim:row.run.provenance.code_claim,code_verified:false,dataset_hash:null,presentation_schema:row.run.schema,context_schema:row.context?row.context.schema:null}));
 const payload={schema:SCHEMA,generator_version:VERSION,demo:true,type,generated_at,reference_id:referenceId,options,run_ids:runs.map(r=>r.id),rows,comparison,mandatory_warnings:[...WARNINGS],provenance};
 const content_sha256=await digest(canonical(payload));
 return D.deepFreeze({...payload,report_id:'CM-'+content_sha256.slice(0,20),content_sha256});
}
async function validate(model){
 exact(model,['schema','generator_version','demo','type','generated_at','reference_id','options','run_ids','rows','comparison','mandatory_warnings','provenance','report_id','content_sha256']);
 if(model.schema!==SCHEMA||model.generator_version!==VERSION||model.demo!==true)fail('okänd schemaversion, generatorversion eller dataklass.');
 if(!Array.isArray(model.rows)||model.rows.length<1||model.rows.length>20)fail('ogiltigt rapporturval.');
 for(const row of model.rows)exact(row,['id','code','run','context','summary','benchmark_assessment','assessments']);
 const prepared=await prepare({type:model.type,runs:model.rows.map(r=>r.run),contexts:model.rows.filter(r=>r.context!==null).map(r=>r.context),referenceId:model.reference_id,options:model.options,generatedAt:model.generated_at});
 if(canonical(prepared)!==canonical(model))fail('rapportunderlaget har ändrats eller motsäger den gemensamma jämförbarhetsmotorn.');
 return prepared;
}
return Object.freeze({SCHEMA,VERSION,TYPES,WARNINGS,prepare,validate,canonical});
});
