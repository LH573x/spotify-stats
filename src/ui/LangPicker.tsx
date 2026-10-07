import type { ReactElement } from 'react'
import { LANGS, setLang, t, useLang, type Lang } from '../i18n'
import { FlagBR, FlagES, FlagUK } from './icons'
import { SheetPicker } from './SheetPicker'

const FLAGS: Record<Lang, () => ReactElement> = { pt: FlagBR, en: FlagUK, es: FlagES }

/** Botão do canto com a bandeira do idioma atual; abre uma janelinha com os três idiomas. */
export function LangPicker() {
  return (
    <SheetPicker
      label={t('Idioma', 'Language', 'Idioma')}
      current={useLang()}
      onPick={setLang}
      options={LANGS.map((l) => ({ id: l.id, name: l.name, Icon: FLAGS[l.id], lang: l.locale }))}
    />
  )
}
