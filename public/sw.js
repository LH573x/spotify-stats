// Recebe o arquivo que o Android manda pelo "Compartilhar → Lyra" (share_target do manifest)
// e o guarda para a página, que abre em seguida com ?compartilhado e lê o arquivo daqui.
// Nada sai do aparelho: o arquivo fica só no cache do navegador até a página pegar.
const CACHE = 'compartilhado'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'POST' || !url.pathname.endsWith('/compartilhar')) return
  e.respondWith(
    (async () => {
      const form = await e.request.formData()
      const cache = await caches.open(CACHE)
      for (const old of await cache.keys()) await cache.delete(old)
      let i = 0
      for (const f of form.getAll('files')) {
        if (typeof f === 'string') continue
        const headers = { 'content-type': f.type || 'application/octet-stream', 'x-nome': encodeURIComponent(f.name) }
        await cache.put(new Request(`compartilhado/${i++}`), new Response(f, { headers }))
      }
      return Response.redirect(new URL('./?compartilhado', self.registration.scope).href, 303)
    })(),
  )
})
