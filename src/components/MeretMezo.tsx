import type { LucideIcon } from 'lucide-react'
import { AlertCircle } from 'lucide-react'
import { tizedesBeolvas, tizedesKiir } from '../lib/ledSzamitas'

interface Props {
  id: string
  felirat: string
  ikon: LucideIcon
  ertek: string
  onValtozas: (ertek: string) => void
  hiba?: string
  min: number
  max: number
  csuszkaMax: number
}

export default function MeretMezo({
  id,
  felirat,
  ikon: Ikon,
  ertek,
  onValtozas,
  hiba,
  min,
  max,
  csuszkaMax,
}: Props) {
  const szam = tizedesBeolvas(ertek)
  const csuszkaErtek = Number.isFinite(szam) ? Math.min(Math.max(szam, min), csuszkaMax) : min
  const hibaId = `${id}-hiba`

  return (
    <div>
      <label htmlFor={id} className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
        <Ikon className="h-4 w-4 text-primary" aria-hidden="true" />
        {felirat}
      </label>

      <div
        className={`flex items-center rounded-2xl border bg-base transition-colors focus-within:border-secondary ${
          hiba ? 'border-red-500' : 'border-line hover:border-primary/60'
        }`}
      >
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={ertek}
          onChange={(e) => onValtozas(e.target.value)}
          aria-invalid={hiba ? true : undefined}
          aria-describedby={hiba ? hibaId : undefined}
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-lg font-semibold tabular-nums text-white outline-none"
          style={{ outline: 'none' }}
        />
        <span className="pr-4 text-sm font-medium text-muted">m</span>
      </div>

      <input
        type="range"
        aria-label={`${felirat} csúszka`}
        min={min}
        max={csuszkaMax}
        step={0.1}
        value={csuszkaErtek}
        onChange={(e) => onValtozas(tizedesKiir(Number(e.target.value)))}
        className="mt-3 h-2 w-full cursor-pointer accent-primary"
      />
      <div className="mt-1 flex justify-between text-xs text-muted" aria-hidden="true">
        <span>{String(min).replace('.', ',')} m</span>
        <span>{csuszkaMax} m</span>
      </div>

      {hiba ? (
        <p id={hibaId} role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {hiba}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted">Megengedett: {min}–{max} m</p>
      )}
    </div>
  )
}
