// Arquivo que chegou pelo "Compartilhar" do Android: o service worker (public/sw.js) guarda no cache
// e abre o site com ?compartilhado. Aqui a página pega o arquivo e limpa o cache.

const CACHE = 'compartilhado'

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('./sw.js').catch(() => {
    // Sem service worker o site funciona igual; só não recebe arquivos compartilhados.
  })
}

/** O site abriu por um compartilhamento? Então devolve os arquivos (talvez vazio); senão, null. */
export async function takeSharedFiles(): Promise<File[] | null> {
  const url = new URL(location.href)
  if (!url.searchParams.has('compartilhado')) return null
  url.searchParams.delete('compartilhado')
  history.replaceState(null, '', url.pathname + url.search + url.hash)
  const files: File[] = []
  try {
    const cache = await caches.open(CACHE)
    for (const req of await cache.keys()) {
      const res = await cache.match(req)
      if (res) {
        const name = decodeURIComponent(res.headers.get('x-nome') ?? 'my_spotify_data.zip')
        files.push(new File([await res.blob()], name, { type: res.headers.get('content-type') ?? '' }))
      }
      await cache.delete(req)
    }
  } catch {
    // sem Cache Storage: segue sem arquivos
  }
  return files
}
