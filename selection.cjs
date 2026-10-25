/* Pure, bounded comparison selection. No persistence, IO or research controls. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RRSelection=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const MAX=20;
function validate(ids,catalog){
 if(!Array.isArray(ids)||ids.length>MAX)throw Error('Du kan välja högst 20 körningar.');
 const known=new Set(catalog.map(r=>r.id)),seen=new Set();
 for(const id of ids){if(typeof id!=='string'||!known.has(id))throw Error('Urvalet innehåller en körning som inte finns i demonstrationspaketet.');if(seen.has(id))throw Error('Samma körning får bara väljas en gång.');seen.add(id);}
 return [...ids];
}
function toggle(ids,id,catalog){const current=validate(ids,catalog);validate([id],catalog);return current.includes(id)?current.filter(x=>x!==id):validate([...current,id],catalog);}
function add(ids,more,catalog){validate(ids,catalog);validate(more,catalog);return validate([...new Set([...ids,...more])],catalog);}
function resolve(ids,catalog){return validate(ids,catalog).map(id=>catalog.find(r=>r.id===id));}
function ready(ids,catalog){validate(ids,catalog);return ids.length>=2;}
return Object.freeze({MAX,validate,toggle,add,resolve,ready});
});
