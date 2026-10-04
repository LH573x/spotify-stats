import type { Dataset } from './types'
import type { WorkerResponse } from './worker'
import { lang, t } from '../i18n'

/** Lê o zip ou os JSONs do export num Web Worker, sem travar a tela. */
export function loadFiles(files: File[], onProgress: (message: string) => void): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    // Se o navegador não deixar criar o worker, lê na própria página (mais lento, mas funciona).
    const fallback = () =>
      import('./process')
        .then((m) => m.processFiles(files, onProgress))
        .then(resolve, (err: Error) => reject(new Error(`${t('Não consegui ler os arquivos', "Couldn't read the files", 'No pude leer los archivos')}: ${err.message}`)))

    let worker: Worker
    try {
      worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    } catch {
      fallback()
      return
    }
    let started = false
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      started = true
      const msg = e.data
      if (msg.type === 'progress') return onProgress(msg.message)
      worker.terminate()
      if (msg.type === 'done') resolve(msg.dataset)
      else reject(new Error(msg.message))
    }
    worker.onerror = (e) => {
      worker.terminate()
      if (!started) fallback()
      else reject(new Error(e.message))
    }
    // O worker não vê o idioma da página: vai junto com os arquivos.
    worker.postMessage({ files, lang: lang() })
  })
}
