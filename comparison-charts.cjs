/* Comparison geometry: no resampling, inference, financial recomputation or IO. */
(function(root,factory){const node=typeof module==='object'&&module.exports;const api=factory(node?require('./data.cjs'):root.RRData,node?require('./charts.cjs'):root.RRCharts,node?require('./comparison.cjs'):root.RRComparison);if(node)module.exports=api;else root.RRComparisonCharts=api;})(typeof globalThis!=='undefined'?globalThis:this,function(D,C,M){
'use strict';
const e=C.esc;
const styles=[['#1F55C9',''],['#15171C','8 5'],['#B4470B','3 4'],['#5E636E','10 4 2 4']];
function metric(row,key){
 if(Object.hasOwn(row.run.metrics,key))return row.run.metrics[key];
 const costs={fees:'fee_eur',spread:'spread_reference_eur',slippage:'slippage_reference_eur'};
 if(costs[key])return row.run.costs[costs[key]];
 if(key==='exposure_pct'&&row.context)return row.context.exposure;
 return {value:null,availability:'missing',reason:'Uppgift saknas i jämförelseunderlaget.'};
}
function unit(key){return key==='closed_trades'?'': ['fees','spread','slippage'].includes(key)?'EUR':'%';}
function text(row,key){return D.metricText(metric(row,key),unit(key),key==='closed_trades'?0:['fees','spread','slippage'].includes(key)?2:1);}
function chosen(report,ids){if(!Array.isArray(ids)||ids.length>4||new Set(ids).size!==ids.length)throw Error('Visa högst fyra olika kurvor i ett gemensamt diagram.');const rows=ids.map(id=>report.rows.find(r=>r.id===id));if(rows.some(r=>!r))throw Error('Diagramurvalet måste ingå i jämförelsen.');return rows;}
function eligibility(report,key,ids){const rows=chosen(report,ids),reasons=new Set();
 if(rows.length<2)reasons.add('Välj minst två körningar för ett gemensamt jämförelsediagram.');
 for(let i=0;i<rows.length;i++)for(let j=i;j<rows.length;j++){
  const a=M.assess(rows[i].run,rows[j].run,rows[i].context,rows[j].context,key);
  if(a.status!=='comparable')a.reasons.forEach(s=>reasons.add(s));
 }
 return {allowed:reasons.size===0,reasons:[...reasons]};
}
const nf=n=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:1}).format(n);
const dt=t=>new Intl.DateTimeFormat('sv-SE',{timeZone:'UTC',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(t));
function legend(rows){return `<div class="rr-legend">${rows.map((r,i)=>`<span><svg width="28" height="10" viewBox="0 0 28 10" aria-hidden="true"><path d="M0 5H28" stroke="${styles[i%4][0]}" stroke-width="3"${styles[i%4][1]?` stroke-dasharray="${styles[i%4][1]}"`:''}/></svg> ${e(r.code)} · ${e(r.run.title)}</span>`).join('')}</div>`;}
function frame(rows,width,title){const W=Math.round(Math.max(280,Math.min(1100,width))),H=300,L=54,R=20,T=25,B=55;
 const points=rows.flatMap(r=>r.run.series.equity.filter(p=>p.strategy!==null).map(p=>({t:Date.parse(p.time),v:Number(p.strategy)})));
 if(!points.length)return '<div class="rr-chart-empty">Ingen publicerbar värdekurva finns.</div>';
 const x0=Date.parse(rows[0].run.period.start),x1=Date.parse(rows[0].run.period.end),lo=Math.min(...points.map(p=>p.v)),hi=Math.max(...points.map(p=>p.v)),padding=(hi-lo||1)*.12,low=lo-padding,high=hi+padding;
 const X=t=>L+(t-x0)/(x1-x0||1)*(W-L-R),Y=v=>T+(high-v)/(high-low)*(H-T-B);
 let out=`<svg class="rr-chart" role="img" aria-label="${e(title)}. Publicerat index i källans skala. Ingen ombasering. Tid i UTC. Tabellalternativ finns nedan." viewBox="0 0 ${W} ${H}"><text x="${L}" y="14" class="rr-tick">Publicerat index</text>`;
 for(let i=0;i<4;i++){const v=high-(high-low)*i/3,y=Y(v);out+=`<path d="M${L} ${y}H${W-R}" stroke="#E3E3DE"/><text x="${L-8}" y="${y+4}" text-anchor="end">${e(nf(v))}</text>`;}
 for(const f of (W<420?[0,1]:[0,.5,1]))out+=`<text x="${X(x0+(x1-x0)*f)}" y="${H-28}" text-anchor="${f===0?'start':f===1?'end':'middle'}">${e(dt(x0+(x1-x0)*f))}</text>`;
 if(low<=100&&high>=100)out+=`<path d="M${L} ${Y(100)}H${W-R}" stroke="#5E636E" stroke-dasharray="2 6"/>`;
 rows.forEach((r,i)=>{for(const part of C.segments(r.run.series.equity,'strategy',r.context?.observation_interval_minutes||r.run.interval_minutes)){const color=styles[i%4][0],dash=styles[i%4][1];if(part.length>1)out+=`<polyline data-comparison-series="${e(r.id)}" fill="none" stroke="${color}" stroke-width="2.5"${dash?` stroke-dasharray="${dash}"`:''} points="${part.map(p=>X(p.t).toFixed(2)+','+Y(p.value).toFixed(2)).join(' ')}"/>`;else out+=`<circle data-comparison-series="${e(r.id)}" cx="${X(part[0].t)}" cy="${Y(part[0].value)}" r="3" fill="${color}"/>`;}});
 return out+`<text x="${W-R}" y="${H-5}" text-anchor="end">Tid · UTC</text></svg>`;
}
function valuesTable(rows,key){return `<div class="rr-scroll" role="region" aria-label="Diagramvärden som tabell" tabindex="0"><table><caption>Redovisade syntetiska mått · ${e(unit(key)||'antal')}</caption><thead><tr><th scope="col">Körning</th><th scope="col">Redovisat värde</th><th scope="col">Mot referensen</th></tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${e(r.code)} · ${e(r.run.title)}</th><td>${e(text(r,key))}</td><td>${e(r.assessments[key].label)}</td></tr>`).join('')}</tbody></table></div>`;}
function equityTable(rows){return `<details><summary>Visa ursprungliga diagrampunkter som tabell</summary><div class="rr-scroll" role="region" aria-label="Värdeutvecklingens ursprungliga punkter" tabindex="0"><table><caption>Syntetiska ursprungspunkter · index · UTC · inga nya punkter har skapats</caption><thead><tr><th scope="col">Körning</th><th scope="col">Tidpunkt UTC</th><th scope="col">Index</th></tr></thead><tbody>${rows.flatMap(r=>r.run.series.equity.map(p=>`<tr><th scope="row">${e(r.code)}</th><td>${e(p.time)}</td><td>${p.strategy===null?'Saknas':e(C.pointText(p.strategy))}</td></tr>`)).join('')}</tbody></table></div></details>`;}
function overlay(report,ids,width=1000){const rows=chosen(report,ids),gate=eligibility(report,'equity',ids);
 if(!gate.allowed)return `<div class="rr-notice" data-comparison-chart-blocked><h3>Gemensamt diagram kan inte visas</h3><ul>${gate.reasons.map(x=>`<li>${e(x)}</li>`).join('')}</ul><p>Välj kompatibla syntetiska exempel eller visa separata smådiagram.</p></div>`;
 const signature=r=>JSON.stringify(r.run.series.equity.map(p=>[p.time,p.strategy]));const same=rows.every(r=>signature(r)===signature(rows[0]));
 return `<figure>${legend(rows)}${same?'<p class="rr-small rr-muted">Kurvorna har identiska publicerade punkter och ligger ovanpå varandra.</p>':''}${frame(rows,width,'Gemensam värdeutveckling för valda syntetiska körningar')}<figcaption class="rr-chart-description">Samma kalenderperiod och indexdefinition. Inga kurvor normaliseras om, beskärs eller fylls ut. Benchmarkkurvor ingår inte i denna figur.</figcaption>${equityTable(rows)}</figure>`;
}
function bars(report,key,ids,width=1000){if(!['net_return_pct','max_drawdown_pct','closed_trades','exposure_pct','fees','spread','slippage','benchmark_return_pct'].includes(key))throw Error('Stapeldiagrammet kräver ett känt skalärt mått.');const rows=chosen(report,ids),gate=eligibility(report,key,ids),def=report.metric_definitions.find(m=>m.key===key);
 if(!gate.allowed)return `<div class="rr-notice" data-comparison-chart-blocked><h3>Inget gemensamt ${e((def?.label||'mått').toLocaleLowerCase('sv-SE'))}-diagram</h3><ul>${gate.reasons.map(x=>`<li>${e(x)}</li>`).join('')}</ul><p>Värdena kan läsas med sina begränsningar i tabellen.</p></div>${valuesTable(rows,key)}`;
 const W=Math.max(280,Math.min(1100,width)),L=56,R=90,T=25,H=rows.length*60+75,nums=rows.map(r=>Number(metric(r,key).value)),min=Math.min(0,...nums),max=Math.max(0,...nums),span=max-min||1,X=n=>L+(n-min)/span*(W-L-R),zero=X(0);
 let out=`<figure><svg class="rr-chart" role="img" aria-label="${e(def?.label||key)} för valda körningar. Enhet ${e(unit(key)||'antal')}. Värdena finns i tabellen nedan." viewBox="0 0 ${W} ${H}">`;
 for(const [i,r] of rows.entries()){const v=nums[i],y=T+i*60;out+=`<text x="8" y="${y+20}" class="rr-tick">${e(r.code)}</text><rect x="${Math.min(zero,X(v))}" y="${y+4}" width="${Math.abs(X(v)-zero)}" height="22" fill="${v<0?'#B4470B':'#1F55C9'}"/><text x="${W-R+10}" y="${y+21}">${e(text(r,key))}</text>`;}
 out+=`<path d="M${zero} 18V${H-43}" stroke="#15171C"/><text x="${L}" y="${H-22}">${e(nf(min))}</text><text x="${W-R}" y="${H-22}" text-anchor="end">${e(nf(max))}</text><text x="${W-R}" y="${H-3}" text-anchor="end">${e(unit(key)||'antal')}</text></svg><figcaption class="rr-chart-description">${e(def?.description||'')} Ingen kostnad summeras till ett nytt netto.</figcaption></figure>`;
 return out+valuesTable(rows,key);
}
function multiples(report,width=500){return `<p class="rr-small rr-muted">Alla ${report.rows.length} körningar behålls. Varje diagram har egen skala och egen redovisad period. Detta är ingen gemensam rangordning.</p><div class="rr-cmp-multiples">${report.rows.map(r=>`<article class="rr-card"><h3>${e(r.code)} · ${e(r.run.title)}</h3><p class="rr-small rr-muted">${e(r.run.market)} · ${e(r.run.period.start.replace('T',' ').replace('Z',''))} – ${e(r.run.period.end.replace('T',' ').replace('Z',''))} UTC</p>${r.run.publication==='blocked'?'<div class="rr-chart-empty">Blockerat · inga resultatvärden eller kurvor publicerade.</div>':frame([r],Math.min(width,540),r.code+' '+r.run.title)+equityTable([r])}<p class="rr-small">${e(r.assessments.equity.label)} mot referensen. ${e(r.assessments.equity.reasons.join(' '))}</p><a href="#/runs/${e(r.id)}" data-from-comparison>Öppna ${e(r.code)}</a></article>`).join('')}</div>`;}
function parameters(report,onlyDifferences=true){
 const keys=new Map();for(const row of report.rows)for(const p of row.run.strategy.parameters)keys.set(p.label+'\u0000'+p.unit,{label:p.label,unit:p.unit});
 return [...keys.values()].map(k=>{const cells=report.rows.map(row=>{const found=row.run.strategy.parameters.filter(p=>p.label===k.label&&p.unit===k.unit);return {id:row.id,available:row.run.publication!=='blocked'&&found.length>0,value:row.run.publication==='blocked'?'Blockerat':found.map(p=>p.value).join('; ')||'Saknas'};});return {...k,cells,different:new Set(cells.filter(c=>c.available).map(c=>c.value)).size>1};}).filter(p=>!onlyDifferences||p.different);
}
return Object.freeze({metric,text,unit,eligibility,overlay,bars,multiples,parameters,valuesTable});
});
