import type { Pixelosztas } from '../lib/ledSzamitas'

interface Props {
  lehetosegek: Pixelosztas[]
  kivalasztottId: string
  onValtozas: (id: string) => void
}

export default function PixelosztasValaszto({ lehetosegek, kivalasztottId, onValtozas }: Props) {
  return (
    <div role="radiogroup" aria-label="Pixelosztás" className="flex flex-wrap gap-2">
      {lehetosegek.map((p) => {
        const aktiv = p.id === kivalasztottId
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={aktiv}
            onClick={() => onValtozas(p.id)}
            className={`min-h-[44px] min-w-[64px] rounded-xl border px-4 py-2 text-sm font-semibold tabular-nums transition-all active:scale-95 ${
              aktiv
                ? 'border-secondary bg-secondary/15 text-white shadow-[0_0_20px_-6px_#38bdf8]'
                : 'border-line bg-base text-muted hover:border-secondary/60 hover:text-white'
            }`}
          >
            {p.felirat}
          </button>
        )
      })}
    </div>
  )
}
