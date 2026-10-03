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
        Envie aqui o arquivo que o Spotify te mandou e veja tudo o que você já ouviu: horas, artistas, manias e
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
            <strong className="on-desk">Arraste o .zip ou os arquivos .json aqui</strong>
            <span className="on-desk">ou clique para escolher</span>
            <strong className="on-touch">Toque para escolher o arquivo</strong>
            <span className="on-touch">o my_spotify_data.zip, na pasta Downloads</span>
          </>
        )}
        <input
          ref={input}
          type="file"
          // Alguns Androids salvam o zip com outro tipo e o escondem da lista; por isso os tipos extras.
          accept=".zip,.json,application/zip,application/x-zip-compressed,application/x-zip,application/octet-stream,application/json"
          multiple
          hidden
          onChange={(e) => take(e.target.files)}
        />
      </div>
      {error && <p className="error">{error}</p>}

      <p className="privacy">
        Seu histórico não sai deste aparelho: tudo é lido aqui mesmo no navegador. Para mostrar fotos e capas, o site
        só procura os nomes dos artistas e álbuns que aparecem na tela no Wikidata e no MusicBrainz.
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

      <details className="howto">
        <summary>Como enviar pelo celular?</summary>
        <ol>
          <li>
            No e-mail do Spotify, abra o link de download no navegador (Safari no iPhone, Chrome no Android). Se o e-mail
            estiver no app do Gmail ou do Outlook, use <strong>Abrir no navegador</strong>: dentro desses apps o arquivo
            costuma não ser salvo.
          </li>
          <li>
            Toque em baixar e entre na sua conta se o Spotify pedir. No iPhone o arquivo vai para o app{' '}
            <strong>Arquivos</strong>, em Downloads. No Android, vai para <strong>Downloads</strong>.
          </li>
          <li>
            Volte aqui, toque em <strong>Toque para escolher o arquivo</strong> e procure em Downloads. No iPhone, escolha{' '}
            <strong>Escolher arquivo</strong> ou <strong>Procurar</strong>.
          </li>
          <li>
            Se o celular abriu o zip e ele virou uma pasta, tudo bem: entre na pasta e marque os arquivos que começam com{' '}
            <code>Streaming_History_Audio</code>.
          </li>
        </ol>
      </details>
    </main>
  )
}
