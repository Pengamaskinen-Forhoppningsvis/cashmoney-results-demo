/* SVG presentation only: values are never used to recompute financial metrics. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./data.cjs'):root.RRData,()=>typeof module==='object'&&module.exports?require('./comparison.cjs'):root.RRComparison);if(typeof module==='object'&&module.exports)module.exports=api;else root.RRCharts=api;})(typeof globalThis!=='undefined'?globalThis:this,function(D,getComparison){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=t=>new Intl.DateTimeFormat('sv-SE',{timeZone:'UTC',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(t));
const tick=v=>v!==0&&(Math.abs(v)<.01||Math.abs(v)>=100000)?v.toExponential(2).replace('.',',').replace('e-','e−'):new Intl.NumberFormat('sv-SE',{maximumFractionDigits:1}).format(v);
const C={blue:'#1F55C9',ink:'#15171C',orange:'#B4470B',line:'#E3E3DE',muted:'#5E636E'};
function segments(rows,key,interval){let previous=-Infinity,parts=[],part=[],origin=rows.length?Date.parse(rows[0].time):0;for(const row of rows){const t=Date.parse(row.time);if(!Number.isFinite(t)||t<=previous)throw Error('Diagrammet kräver strikt tidsordning.');const step=interval*60000,gap=previous!==-Infinity&&(t-previous!==step||(t-origin)%step!==0||(previous-origin)%step!==0);if(row[key]===null||gap){if(part.length)parts.push(part);part=[];}if(row[key]!==null){const n=Number(row[key]);if(!Number.isFinite(n))throw Error('Ogiltig diagrampunkt.');part.push({t,value:n});}previous=t;}if(part.length)parts.push(part);return parts;}
function benchmarkAssessment(run,context=null){const M=getComparison();return M.assess(run,run,context,context,'benchmark_return_pct');}
function axisChart(run,which,width,observationInterval=run.interval_minutes,context=null){D.validate(run);if(!Number.isInteger(observationInterval)||observationInterval<1||observationInterval>10080)throw Error('Ogiltigt observationsintervall för diagrammet.');if(run.publication==='blocked')return '<div class="rr-chart-empty">Blockerat resultat. Inga diagrampunkter har publicerats.</div>';
 const equity=which==='equity',rows=equity?run.series.equity:run.series.drawdown;
 const allowBenchmark=equity&&benchmarkAssessment(run,context).status==='comparable';
 const keys=equity?['strategy',...(allowBenchmark?['benchmark']:[])]:['value'];const nums=rows.flatMap(p=>keys.map(k=>p[k]===null?null:Number(p[k]))).filter(x=>x!==null);
 if(!nums.length)return '<div class="rr-chart-empty">Ingen publicerbar tidsserie finns. Saknade punkter ersätts inte med noll.</div>';
 const W=Math.round(Math.max(280,Math.min(1100,width||900))),H=300,R=20,T=28,B=58,ph=H-T-B;
 let low=Math.min(...nums),high=Math.max(...nums);if(!equity)high=0;
 const pad=(high-low||Math.max(Math.abs(high),1e-8))*.12;low-=pad;if(equity)high+=pad;else if(low===0)low=-1;
 const L=Math.max(54,...Array.from({length:4},(_,i)=>tick(high-(high-low)*i/3).length*7+14)),pw=W-L-R;
 const x0=Date.parse(run.period.start),x1=Date.parse(run.period.end),X=t=>L+(t-x0)/(x1-x0||1)*pw,Y=v=>T+(high-v)/(high-low||1)*ph;
 const id='rr-'+esc(run.id)+'-'+which;
 let out=`<svg class="rr-chart" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${equity?'Värdeutveckling, publicerat index':'Värdeminskning från tidigare topp, procent'}</title><desc id="${id}-desc">Konstruerade syntetiska observationer i UTC. Luckor lämnas öppna. Samma punkter finns i tabellen nedan.</desc>`;
 out+=`<text x="${L}" y="14" class="rr-tick">${equity?'Index · publicerad skala':'Nedgång · %'}</text>`;
 for(let i=0;i<4;i++){const v=high-(high-low)*i/3,y=Y(v);out+=`<path d="M${L} ${y.toFixed(2)}H${W-R}" fill="none" stroke="${C.line}"/><text x="${L-10}" y="${y+4}" text-anchor="end">${esc(tick(v))}</text>`;}
 for(const f of [0,.5,1]){const t=x0+(x1-x0)*f;out+=`<text x="${X(t)}" y="${H-30}" text-anchor="${f===0?'start':f===1?'end':'middle'}">${esc(date(t))}</text>`;}
 out+=`<text x="${W-R}" y="${H-6}" text-anchor="end">Tid · UTC</text>`;
 if(equity&&low<=100&&high>=100)out+=`<path d="M${L} ${Y(100)}H${W-R}" stroke="${C.muted}" stroke-dasharray="2 6" fill="none"/>`;
 for(const key of keys){const color=key==='benchmark'?C.ink:equity?C.blue:C.orange;for(const part of segments(rows,key,observationInterval)){if(part.length>1)out+=`<polyline data-series="${key}" points="${part.map(p=>X(p.t).toFixed(2)+','+Y(p.value).toFixed(2)).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5"${key==='benchmark'?' stroke-dasharray="7 5"':''}/>`;else out+=`<circle cx="${X(part[0].t)}" cy="${Y(part[0].value)}" r="3" fill="${color}"/>`;}}
 return out+'</svg>';
}
function pointText(v,unit=''){return v===null?'Saknas':D.metricText({value:v,availability:'available',reason:''},unit,(v.split('.')[1]||'').length);}
function table(run,which,context=null){const equity=which==='equity',rows=equity?run.series.equity:run.series.drawdown;const bm=equity&&benchmarkAssessment(run,context).status==='comparable';if(!rows.length)return '';
 const val=v=>pointText(v,equity?'':'%');
 return `<details><summary>Visa ${equity?'värdeutvecklingen':'värdeminskningen'} som tabell (${rows.length} tidpunkter)</summary><div class="rr-scroll" role="region" aria-label="${equity?'Värdeutveckling':'Värdeminskning'} som tabell" tabindex="0"><table><caption>Syntetiska punkter · ${equity?'publicerat index':'procent från tidigare topp'} · UTC</caption><thead><tr><th scope="col">Tidpunkt</th><th scope="col">${equity?'Strategi':'Nedgång'}</th>${bm?'<th scope="col">Köp och behåll</th>':''}</tr></thead><tbody>${rows.map(p=>`<tr><th scope="row">${esc(p.time.replace('T',' ').replace('Z',' UTC'))}</th><td>${esc(val(equity?p.strategy:p.value))}</td>${bm?`<td>${esc(val(p.benchmark))}</td>`:''}</tr>`).join('')}</tbody></table></div></details>`;
}
function figure(run,which='equity',width=900,withTable=true,context=null){const equity=which==='equity',bm=equity&&benchmarkAssessment(run,context).status==='comparable';return `<figure><div class="rr-legend"><span><i class="rr-key${equity?'':' rr-key-drawdown'}" aria-hidden="true"></i>${equity?'Strategi':'Nedgång från topp'}</span>${bm?'<span><i class="rr-key rr-key-benchmark" aria-hidden="true"></i>Köp och behåll</span>':''}</div><div data-rr-chart="${which}">${axisChart(run,which,width,context?.observation_interval_minutes||run.interval_minutes,context)}</div><figcaption class="rr-chart-description">${equity?'Publicerat index på källans skala, inte ett faktiskt kontobelopp. Ingen ombasering görs.':'Observerad nedgång i de syntetiska punkterna. Inställda riskgränser är ett annat mått.'} Luckor förbinds inte med linjer.</figcaption>${withTable?table(run,which,context):''}</figure>`;}
function costs(run,width=500){D.validate(run);if(run.publication==='blocked')return '<p>Inga kostnadsvärden har publicerats.</p>';
 const items=[['fee_eur','Avgifter'],['spread_reference_eur','Spread · referens'],['slippage_reference_eur','Slippage · referens']];
 const max=Math.max(1,...items.map(([k])=>run.costs[k].availability==='available'?Number(run.costs[k].value):0));
 const W=Math.round(Math.max(280,Math.min(650,width))),left=12,right=12,pw=W-left-right;
 let out=`<svg class="rr-chart" viewBox="0 0 ${W} 265" role="img" aria-label="Kostnadsöversikt i EUR. Beloppen redovisas även i text. Referensvärden summeras inte till ett nytt netto.">`;
 items.forEach(([key,label],i)=>{const m=run.costs[key],y=20+i*73;out+=`<text x="${left}" y="${y}" class="rr-tick">${esc(label)}</text><text x="${W-right}" y="${y}" text-anchor="end">${esc(D.metricText(m,'EUR',2))}</text>`;if(m.availability==='available')out+=`<rect x="${left}" y="${y+12}" width="${(Number(m.value)/max*pw).toFixed(2)}" height="15" rx="2" fill="${key==='fee_eur'?C.blue:C.muted}"/>`;});
 out+=`<text x="${left}" y="258">0</text><text x="${W-right}" y="258" text-anchor="end">${esc(tick(max))} EUR</text></svg>`;return out;
}
return Object.freeze({axisTick:tick,pointText,esc,benchmarkAssessment,segments,figure,axisChart,costs,table});
});
