/* Dipartimento di Pubblicazioni · guardiano per l'uso senza internet
   Va messo nella STESSA cartella del programma, su un indirizzo web.
   Il nome dell'archivio è DIVERSO da quello della Tesoreria di proposito:
   i due programmi stanno in cartelle separate e non si devono pestare i piedi. */
const CACHE='pubblicazioni-v1';
const PAGINA=new URL(self.location).searchParams.get('p')||'./';
const ATTESA=3000;

self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    try{
      const c=await caches.open(CACHE);
      await c.add(new Request(PAGINA,{cache:'reload'}));
    }catch(err){}
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    for(const k of await caches.keys()) if(k!==CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
/* la pagina puo' chiedere di rimettersi da parte dopo un aggiornamento */
self.addEventListener('message',e=>{
  if(e.data&&e.data.metti){
    e.waitUntil((async()=>{
      try{ const c=await caches.open(CACHE); await c.add(new Request(e.data.metti,{cache:'reload'})) }catch(err){}
    })());
  }
});

function conAttesa(p,ms){
  return new Promise(res=>{
    let fatto=false;
    const t=setTimeout(()=>{ if(!fatto){ fatto=true; res(null) } },ms);
    p.then(r=>{ if(!fatto){ fatto=true; clearTimeout(t); res(r) } })
     .catch(()=>{ if(!fatto){ fatto=true; clearTimeout(t); res(null) } });
  });
}

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const apertura = req.mode==='navigate';
  e.respondWith((async()=>{
    const c=await caches.open(CACHE);
    const r=await conAttesa(fetch(req),apertura?ATTESA:8000);
    if(r&&r.ok){ try{ c.put(req,r.clone()) }catch(err){} return r }
    const hit=await c.match(req,{ignoreSearch:true});
    if(hit) return hit;
    if(apertura){
      const pag=await c.match(PAGINA,{ignoreSearch:true});
      if(pag) return pag;
    }
    return r||Response.error();
  })());
});
