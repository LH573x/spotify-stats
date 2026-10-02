import { processFiles } from './process'
import type { Dataset } from './types'

export type WorkerRequest = { files: File[] }
export type WorkerResponse =
  | { type: 'progress'; message: string }
  | { type: 'done'; dataset: Dataset }
  | { type: 'error'; message: string }

const ctx = self as unknown as {
  postMessage(msg: WorkerResponse, transfer?: Transferable[]): void
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null
}

ctx.onmessage = async (e) => {
  try {
    const dataset = await processFiles(e.data.files, (message) => ctx.postMessage({ type: 'progress', message }))
    const p = dataset.plays
    ctx.postMessage({ type: 'done', dataset }, [p.start.buffer, p.ms.buffer, p.item.buffer, p.flags.buffer, p.platform.buffer])
  } catch (err) {
    ctx.postMessage({ type: 'error', message: `Não consegui ler os arquivos: ${(err as Error).message}` })
  }
}
