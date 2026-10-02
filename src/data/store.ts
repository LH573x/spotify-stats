import { DATASET_VERSION, type Dataset } from './types'

// Os dados ficam só neste navegador (IndexedDB), para não precisar reenviar os arquivos.
const DB = 'spotify-stats'
const STORE = 'data'
const KEY = 'dataset'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(db.transaction(STORE, mode).objectStore(STORE))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error)
      }),
  )
}

export interface Saved {
  dataset: Dataset | null
  /** Havia dados salvos, mas de uma versão antiga do site: é preciso enviar o arquivo de novo. */
  outdated: boolean
}

export async function loadSaved(): Promise<Saved> {
  try {
    const d = await run<Dataset | undefined>('readonly', (s) => s.get(KEY))
    if (!d) return { dataset: null, outdated: false }
    return d.version === DATASET_VERSION ? { dataset: d, outdated: false } : { dataset: null, outdated: true }
  } catch {
    return { dataset: null, outdated: false }
  }
}

export async function save(d: Dataset): Promise<void> {
  try {
    await run('readwrite', (s) => s.put(d, KEY))
  } catch {
    // Sem IndexedDB (aba anônima etc.): o site funciona, só não lembra dos dados.
  }
}

export async function clearSaved(): Promise<void> {
  try {
    await run('readwrite', (s) => s.delete(KEY))
  } catch {
    // nada a limpar
  }
}
