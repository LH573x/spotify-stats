import { unzipSync, strFromU8 } from 'fflate'
import { isHistoryFile, parseFiles, type SourceFile } from './parse'
import type { Dataset } from './types'
import { t } from '../i18n'

function parseJson(name: string, text: string): SourceFile | null {
  const rows = JSON.parse(text)
  return Array.isArray(rows) ? { name, rows } : null
}

/** Descompacta (se for zip), lê os JSONs de histórico e monta o Dataset. */
export async function processFiles(files: File[], progress: (message: string) => void): Promise<Dataset> {
  const sources: SourceFile[] = []
  for (const file of files) {
    if (/\.zip$/i.test(file.name)) {
      progress(`${t('Descompactando', 'Unzipping', 'Descomprimiendo')} ${file.name}…`)
      const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
        filter: (f) => isHistoryFile(f.name),
      })
      for (const [path, bytes] of Object.entries(entries)) {
        progress(`${t('Lendo', 'Reading', 'Leyendo')} ${path.split('/').pop()}…`)
        const src = parseJson(path, strFromU8(bytes))
        if (src) sources.push(src)
      }
    } else if (isHistoryFile(file.name)) {
      progress(`${t('Lendo', 'Reading', 'Leyendo')} ${file.name}…`)
      const src = parseJson(file.name, await file.text())
      if (src) sources.push(src)
    }
  }
  if (sources.length === 0) {
    throw new Error(
      t(
        'Não encontrei arquivos de histórico. Envie o zip do Spotify ou os arquivos Streaming_History_Audio_*.json / StreamingHistory_*.json.',
        "I couldn't find any history files. Send the Spotify zip or the Streaming_History_Audio_*.json / StreamingHistory_*.json files.",
        'No encontré archivos de historial. Envía el zip de Spotify o los archivos Streaming_History_Audio_*.json / StreamingHistory_*.json.',
      ),
    )
  }
  progress(t('Organizando suas reproduções…', 'Sorting your plays…', 'Organizando tus reproducciones…'))
  return parseFiles(sources)
}
