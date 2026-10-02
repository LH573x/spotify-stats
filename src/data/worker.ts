import { unzipSync, strFromU8 } from 'fflate'
import { isHistoryFile, parseFiles, type SourceFile } from './parse'

export type WorkerRequest = { files: File[] }
export type WorkerResponse =
  | { type: 'progress'; message: string }
  | { type: 'done'; dataset: ReturnType<typeof parseFiles>; fileCount: number }
  | { type: 'error'; message: string }

const ctx = self as unknown as {
  postMessage(msg: WorkerResponse, transfer?: Transferable[]): void
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null
}

function parseJson(name: string, text: string): SourceFile | null {
  const rows = JSON.parse(text)
  return Array.isArray(rows) ? { name, rows } : null
}

ctx.onmessage = async (e) => {
  try {
    const sources: SourceFile[] = []
    for (const file of e.data.files) {
      if (/\.zip$/i.test(file.name)) {
        ctx.postMessage({ type: 'progress', message: `Descompactando ${file.name}…` })
        const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
          filter: (f) => isHistoryFile(f.name),
        })
        for (const [path, bytes] of Object.entries(entries)) {
          ctx.postMessage({ type: 'progress', message: `Lendo ${path.split('/').pop()}…` })
          const src = parseJson(path, strFromU8(bytes))
          if (src) sources.push(src)
        }
      } else if (isHistoryFile(file.name)) {
        ctx.postMessage({ type: 'progress', message: `Lendo ${file.name}…` })
        const src = parseJson(file.name, await file.text())
        if (src) sources.push(src)
      }
    }
    if (sources.length === 0) {
      ctx.postMessage({
        type: 'error',
        message:
          'Não encontrei arquivos de histórico. Envie o zip do Spotify ou os arquivos Streaming_History_Audio_*.json / StreamingHistory_*.json.',
      })
      return
    }
    ctx.postMessage({ type: 'progress', message: 'Organizando suas reproduções…' })
    const dataset = parseFiles(sources)
    const p = dataset.plays
    ctx.postMessage({ type: 'done', dataset, fileCount: sources.length }, [
      p.start.buffer,
      p.ms.buffer,
      p.item.buffer,
      p.flags.buffer,
      p.platform.buffer,
    ])
  } catch (err) {
    ctx.postMessage({ type: 'error', message: `Não consegui ler os arquivos: ${(err as Error).message}` })
  }
}
