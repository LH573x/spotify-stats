import { useRef, type ReactElement } from 'react'
import { CheckIcon } from './icons'

export interface SheetOption<T extends string> {
  id: T
  name: string
  Icon: () => ReactElement
  /** Idioma do nome, para o leitor de tela pronunciar certo. */
  lang?: string
}

/** Botão do canto com o ícone da opção atual; abre uma janelinha com todas as opções. */
export function SheetPicker<T extends string>({
  label,
  options,
  current,
  onPick,
}: {
  label: string
  options: SheetOption<T>[]
  current: T
  onPick: (id: T) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const close = () => dialog.current?.close()
  const Current = (options.find((o) => o.id === current) ?? options[0]).Icon
  return (
    <>
      <button className="ghost icon pick-btn" onClick={() => dialog.current?.showModal()} aria-label={label} title={label}>
        <Current />
      </button>
      <dialog
        ref={dialog}
        className="confirm pick-sheet"
        aria-label={label}
        // Tocar fora da caixa fecha, como no celular.
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <ul className="pick-list">
          {options.map((o) => {
            const on = o.id === current
            return (
              <li key={o.id}>
                <button
                  className={on ? 'on' : ''}
                  aria-current={on ? 'true' : undefined}
                  lang={o.lang}
                  autoFocus={on}
                  onClick={() => {
                    close()
                    onPick(o.id)
                  }}
                >
                  <o.Icon />
                  <span>{o.name}</span>
                  {on && <CheckIcon />}
                </button>
              </li>
            )
          })}
        </ul>
      </dialog>
    </>
  )
}
