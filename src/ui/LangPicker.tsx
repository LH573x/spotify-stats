import { useRef, type ReactElement } from 'react'
import { LANGS, setLang, t, useLang, type Lang } from '../i18n'
import { CheckIcon, FlagBR, FlagES, FlagUK } from './icons'

const FLAGS: Record<Lang, () => ReactElement> = { pt: FlagBR, en: FlagUK, es: FlagES }

/** Botão do canto com a bandeira do idioma atual; abre uma janelinha com os três idiomas. */
export function LangPicker() {
  const current = useLang()
  const dialog = useRef<HTMLDialogElement>(null)
  const close = () => dialog.current?.close()
  const Flag = FLAGS[current]
  const label = t('Idioma', 'Language', 'Idioma')
  return (
    <>
      <button className="ghost icon lang-btn" onClick={() => dialog.current?.showModal()} aria-label={label} title={label}>
        <Flag />
      </button>
      <dialog
        ref={dialog}
        className="confirm lang-sheet"
        aria-label={label}
        // Tocar fora da caixa fecha, como no celular.
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <ul className="lang-list">
          {LANGS.map((l) => {
            const F = FLAGS[l.id]
            const on = l.id === current
            return (
              <li key={l.id}>
                <button
                  className={on ? 'on' : ''}
                  aria-current={on ? 'true' : undefined}
                  lang={l.locale}
                  autoFocus={on}
                  onClick={() => {
                    close()
                    setLang(l.id)
                  }}
                >
                  <F />
                  <span>{l.name}</span>
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
