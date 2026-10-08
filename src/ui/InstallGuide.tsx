import { useRef, useState, type ReactNode } from 'react'
import { AddSquareIcon, CheckIcon, ExternalIcon, MenuDotsIcon, ShareIcon } from './icons'
import { chromeIntent, type InstallGuideKind } from './install'
import { pick, t } from '../i18n'

/** Onde não existe janela de instalar, o botão abre o passo a passo daquele navegador. */
export function InstallGuide({ label, kind }: { label: string; kind: InstallGuideKind }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const close = () => dialog.current?.close()
  return (
    <>
      <button className="primary" onClick={() => dialog.current?.showModal()}>
        {label}
      </button>
      <dialog
        ref={dialog}
        className="confirm install-sheet"
        aria-labelledby="instalar-titulo"
        // Tocar fora da caixa fecha, como no celular.
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className="confirm-box">
          <h2 id="instalar-titulo">{label}</h2>
          {kind === 'android-other' ? <OpenInChrome /> : <Steps kind={kind} />}
          <button className="ghost" onClick={close} autoFocus>
            {kind === 'android-other' ? t('Agora não', 'Not now', 'Ahora no') : t('Entendi', 'Got it', 'Entendido')}
          </button>
        </div>
      </dialog>
    </>
  )
}

function Steps({ kind }: { kind: Exclude<InstallGuideKind, 'android-other'> }) {
  const tap = (pt: ReactNode, en: ReactNode, es: ReactNode) =>
    pick(
      <>Toque em {pt}</>,
      <>Tap {en}</>,
      <>Toca {es}</>,
    )
  const steps: [() => ReactNode, ReactNode][] =
    kind === 'android-chrome'
      ? [
          [MenuDotsIcon, tap(<strong>⋮</strong>, <strong>⋮</strong>, <strong>⋮</strong>)],
          [
            AddSquareIcon,
            tap(<strong>Instalar app</strong>, <strong>Install app</strong>, <strong>Instalar aplicación</strong>),
          ],
          [CheckIcon, tap(<strong>Instalar</strong>, <strong>Install</strong>, <strong>Instalar</strong>)],
        ]
      : [
          [
            ShareIcon,
            kind === 'ios'
              ? pick(
                  <>
                    Toque em <strong>⋯</strong> e depois em <strong>Compartilhar</strong>
                  </>,
                  <>
                    Tap <strong>⋯</strong>, then <strong>Share</strong>
                  </>,
                  <>
                    Toca <strong>⋯</strong> y luego <strong>Compartir</strong>
                  </>,
                )
              : // Chrome e Firefox do iPhone: o Compartilhar fica na barra de endereço ou no menu.
                tap(<strong>Compartilhar</strong>, <strong>Share</strong>, <strong>Compartir</strong>),
          ],
          [
            AddSquareIcon,
            tap(
              <strong>Adicionar à Tela de Início</strong>,
              <strong>Add to Home Screen</strong>,
              <strong>Añadir a pantalla de inicio</strong>,
            ),
          ],
          [CheckIcon, tap(<strong>Adicionar</strong>, <strong>Add</strong>, <strong>Añadir</strong>)],
        ]
  return (
    <ol className="install-steps">
      {steps.map(([Icon, text], i) => (
        <li key={i}>
          <Icon />
          <span>{text}</span>
        </li>
      ))}
    </ol>
  )
}

/** Navegador do Android que não instala o app (Firefox, o de dentro do Instagram etc.): mandamos para o Chrome. */
function OpenInChrome() {
  const [copied, setCopied] = useState(false)
  const copy = () =>
    navigator.clipboard
      ?.writeText(location.href)
      .then(() => setCopied(true))
      .catch(() => {})
  return (
    <>
      <p>
        {t(
          'Este navegador não instala o app. Abra o site no Chrome para instalar.',
          "This browser can't install the app. Open the site in Chrome to install it.",
          'Este navegador no instala la app. Abre el sitio en Chrome para instalarla.',
        )}
      </p>
      <div className="install-actions">
        <a className="primary" href={chromeIntent()}>
          <ExternalIcon />
          {t('Abrir no Chrome', 'Open in Chrome', 'Abrir en Chrome')}
        </a>
        <button className="ghost" onClick={copy}>
          {copied ? t('Link copiado', 'Link copied', 'Enlace copiado') : t('Copiar link', 'Copy link', 'Copiar enlace')}
        </button>
      </div>
    </>
  )
}
