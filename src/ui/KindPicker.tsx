import type { KindFilter } from '../data/stats'
import { t } from '../i18n'
import { HeadphonesIcon, MicIcon, MusicIcon } from './icons'
import { SheetPicker } from './SheetPicker'

/** Ao lado do idioma: contar só músicas (o padrão), só podcasts ou tudo. */
export function KindPicker({ kind, onChange }: { kind: KindFilter; onChange: (kind: KindFilter) => void }) {
  return (
    <SheetPicker
      label={t('O que contar', 'What to count', 'Qué contar')}
      current={kind}
      onPick={onChange}
      options={[
        { id: 'music', name: t('Música', 'Music', 'Música'), Icon: MusicIcon },
        { id: 'podcast', name: 'Podcasts', Icon: MicIcon },
        { id: 'all', name: t('Tudo', 'All', 'Todo'), Icon: HeadphonesIcon },
      ]}
    />
  )
}
