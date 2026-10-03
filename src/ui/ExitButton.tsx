import { useRef } from 'react'
import { ExitIcon } from './icons'

/** O botão de sair do topo: pergunta antes de apagar os dados deste aparelho. */
export function ExitButton({ onConfirm }: { onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const close = () => dialog.current?.close()
  return (
    <>
      <button className="ghost icon" onClick={() => dialog.current?.showModal()} aria-label="Sair" title="Sair">
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
          <h2 id="sair-titulo">Sair?</h2>
          <p>Seus dados serão apagados deste aparelho.</p>
          <div className="confirm-actions">
            <button className="ghost" onClick={close} autoFocus>
              Cancelar
            </button>
            <button
              className="danger"
              onClick={() => {
                close()
                onConfirm()
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
