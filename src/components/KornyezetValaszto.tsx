import { Building2, Sun } from 'lucide-react'
import { KORNYEZETEK, type Kornyezet } from '../lib/ledSzamitas'

interface Props {
  ertek: Kornyezet
  onValtozas: (ertek: Kornyezet) => void
}

const IKONOK = { belteri: Building2, kulteri: Sun } as const

export default function KornyezetValaszto({ ertek, onValtozas }: Props) {
  return (
    <div role="radiogroup" aria-label="Telepítési környezet" className="grid grid-cols-2 gap-2">
      {KORNYEZETEK.map((k) => {
        const aktiv = k.id === ertek
        const Ikon = IKONOK[k.id]
        return (
          <button
            key={k.id}
            type="button"
            role="radio"
            aria-checked={aktiv}
            onClick={() => onValtozas(k.id)}
            className={`rounded-2xl border p-3 text-left transition-all active:scale-[0.98] ${
              aktiv
                ? 'border-primary bg-primary/15 shadow-[0_0_24px_-6px_#9E7FFF]'
                : 'border-line bg-base hover:border-primary/60'
            }`}
          >
            <span className="flex items-center gap-2 font-semibold">
              <Ikon className={`h-5 w-5 ${aktiv ? 'text-primary' : 'text-muted'}`} aria-hidden="true" />
              {k.nev}
            </span>
            <span className="mt-1 block text-xs leading-snug text-muted">{k.leiras}</span>
          </button>
        )
      })}
    </div>
  )
}
