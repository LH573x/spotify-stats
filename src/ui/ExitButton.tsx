import { useRef } from 'react'
import { ExitIcon } from './icons'
import { t } from '../i18n'

/** O botão de sair do topo: pergunta antes de apagar os dados deste aparelho. */
export function ExitButton({ onConfirm }: { onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const close = () => dialog.current?.close()
  return (
    <>
      <button
        className="ghost icon"
        onClick={() => dialog.current?.showModal()}
        aria-label={t('Sair', 'Leave', 'Salir')}
        title={t('Sair', 'Leave', 'Salir')}
      >
        <ExitIcon />
      </button>
      <dialog
        ref={dialog}
        className="confirm"
        aria-labelledby="sair-titulo"
        // Tocar fora da caixa fecha, como no celular.
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className="confirm-box">
          <h2 id="sair-titulo">{t('Sair?', 'Leave?', '¿Salir?')}</h2>
          <p>
            {t(
              'Seus dados serão apagados deste aparelho.',
              'Your data will be deleted from this device.',
              'Tus datos se borrarán de este dispositivo.',
            )}
          </p>
          <div className="confirm-actions">
            <button className="ghost" onClick={close} autoFocus>
              {t('Cancelar', 'Cancel', 'Cancelar')}
            </button>
            <button
              className="danger"
              onClick={() => {
                close()
                onConfirm()
              }}
            >
              {t('Sair', 'Leave', 'Salir')}
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
