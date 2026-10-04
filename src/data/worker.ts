import { processFiles } from './process'
import type { Dataset } from './types'
import { setLang, t, type Lang } from '../i18n'

export type WorkerRequest = { files: File[]; lang: Lang }
export type WorkerResponse =
  | { type: 'progress'; message: string }
  | { type: 'done'; dataset: Dataset }
  | { type: 'error'; message: string }

const ctx = self as unknown as {
  postMessage(msg: WorkerResponse, transfer?: Transferable[]): void
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null
}

ctx.onmessage = async (e) => {
  setLang(e.data.lang, false)
  try {
    const dataset = await processFiles(e.data.files, (message) => ctx.postMessage({ type: 'progress', message }))
    const p = dataset.plays
    ctx.postMessage({ type: 'done', dataset }, [p.start.buffer, p.ms.buffer, p.item.buffer, p.flags.buffer, p.platform.buffer])
  } catch (err) {
    ctx.postMessage({
      type: 'error',
      message: `${t('Não consegui ler os arquivos', "Couldn't read the files", 'No pude leer los archivos')}: ${(err as Error).message}`,
    })
  }
}
