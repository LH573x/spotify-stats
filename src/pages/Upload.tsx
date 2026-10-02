import { useRef, useState } from 'react'

interface Props {
  busy: string | null
  error: string | null
  notice: string | null
  onFiles: (files: File[]) => void
}

export function Upload({ busy, error, notice, onFiles }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const take = (list: FileList | null) => {
    if (list && list.length) onFiles([...list])
  }

  return (
    <main className="upload">
      <h1>
        Seu Spotify,
        <br />
        <span className="accent">do começo até hoje.</span>
      </h1>
      <p className="lead">
        Solte aqui o arquivo que o Spotify te mandou e veja tudo o que você já ouviu: horas, artistas, manias e
        fases.
      </p>

      {notice && <p className="notice">{notice}</p>}
      <div
        className={`drop ${over ? 'over' : ''} ${busy ? 'busy' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          if (!busy) take(e.dataTransfer.files)
        }}
        onClick={() => !busy && input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !busy && input.current?.click()}
      >
        {busy ? (
          <>
            <div className="spinner" aria-hidden />
            <strong>{busy}</strong>
          </>
        ) : (
          <>
            <strong>Arraste o .zip ou os arquivos .json aqui</strong>
            <span>ou clique para escolher</span>
          </>
        )}
        <input
          ref={input}
          type="file"
          accept=".zip,.json,application/zip,application/json"
          multiple
          hidden
          onChange={(e) => take(e.target.files)}
        />
      </div>
      {error && <p className="error">{error}</p>}

      <p className="privacy">
        Seus dados não saem deste computador: tudo é lido aqui mesmo no navegador, e nada é enviado para servidor
        nenhum.
      </p>

      <details className="howto">
        <summary>Como conseguir meus dados do Spotify?</summary>
        <ol>
          <li>
            Entre em <a href="https://www.spotify.com/account/privacy/" target="_blank" rel="noreferrer">spotify.com → Conta → Privacidade</a>.
          </li>
          <li>
            Marque <strong>Histórico de streaming estendido</strong> (ele tem a conta inteira, não só o último ano) e
            peça os dados.
          </li>
          <li>Confirme pelo e-mail. O Spotify manda o link em alguns dias.</li>
          <li>Baixe o <code>my_spotify_data.zip</code> e solte aqui, sem precisar descompactar.</li>
        </ol>
      </details>
    </main>
  )
}
