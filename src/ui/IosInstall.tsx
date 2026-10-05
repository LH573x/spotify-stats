import { useRef } from 'react'
import { AddSquareIcon, CheckIcon, ShareIcon } from './icons'
import { pick, t } from '../i18n'

/** No iPhone não existe janela de instalar: o botão abre o passo a passo do Safari. */
export function IosInstall({ label }: { label: string }) {
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
          <ol className="install-steps">
            <li>
              <ShareIcon />
              <span>
                {pick(
                  <>
                    Toque em <strong>⋯</strong> e depois em <strong>Compartilhar</strong>
                  </>,
                  <>
                    Tap <strong>⋯</strong>, then <strong>Share</strong>
                  </>,
                  <>
                    Toca <strong>⋯</strong> y luego <strong>Compartir</strong>
                  </>,
                )}
              </span>
            </li>
            <li>
              <AddSquareIcon />
              <span>
                {pick(
                  <>
                    Toque em <strong>Adicionar à Tela de Início</strong>
                  </>,
                  <>
                    Tap <strong>Add to Home Screen</strong>
                  </>,
                  <>
                    Toca <strong>Añadir a pantalla de inicio</strong>
                  </>,
                )}
              </span>
            </li>
            <li>
              <CheckIcon />
              <span>
                {pick(
                  <>
                    Toque em <strong>Adicionar</strong>
                  </>,
                  <>
                    Tap <strong>Add</strong>
                  </>,
                  <>
                    Toca <strong>Añadir</strong>
                  </>,
                )}
              </span>
            </li>
          </ol>
          <button className="ghost" onClick={close} autoFocus>
            {t('Entendi', 'Got it', 'Entendido')}
          </button>
        </div>
      </dialog>
    </>
  )
}
