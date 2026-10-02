import type { Dataset } from './types'
import type { WorkerResponse } from './worker'

/** Lê o zip ou os JSONs do export num Web Worker, sem travar a tela. */
export function loadFiles(files: File[], onProgress: (message: string) => void): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data
      if (msg.type === 'progress') return onProgress(msg.message)
      worker.terminate()
      if (msg.type === 'done') resolve(msg.dataset)
      else reject(new Error(msg.message))
    }
    worker.onerror = (e) => {
      worker.terminate()
      reject(new Error(e.message))
    }
    worker.postMessage({ files })
  })
}
