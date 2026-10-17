import type { LucideIcon } from 'lucide-react'
import { Eye, Grid3x3, Hash, Maximize, Monitor, Ruler } from 'lucide-react'
import { szam } from '../lib/formazas'
import type { Eredmeny } from '../lib/ledSzamitas'

interface KartyaProps {
  ikon: LucideIcon
  felirat: string
  ertek: string
  egyseg?: string
  megjegyzes?: string
  szin: string
}

function Kartya({ ikon: Ikon, felirat, ertek, egyseg, megjegyzes, szin }: KartyaProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-primary/50">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Ikon className={`h-4 w-4 ${szin}`} aria-hidden="true" />
        {felirat}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-white">
        {ertek}
        {egyseg && <span className="ml-1 text-base font-medium text-muted">{egyseg}</span>}
      </p>
      {megjegyzes && <p className="mt-1 text-xs text-muted">{megjegyzes}</p>}
    </div>
  )
}

interface Props {
  eredmeny: Eredmeny
}

export default function EredmenyKartyak({ eredmeny: e }: Props) {
  return (
    <div className="space-y-3" aria-live="polite">
      {/* Fő eredmény: teljes felület */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/25 via-surface to-surface p-5 sm:p-6">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl"
          aria-hidden="true"
        />
        <p className="flex items-center gap-2 text-sm font-medium text-muted">
          <Maximize className="h-4 w-4 text-primary" aria-hidden="true" />
          Teljes kijelzőfelület
        </p>
        <p className="mt-2 text-5xl font-bold tabular-nums tracking-tight text-white sm:text-6xl">
          {szam(e.feluletM2, 2)}
          <span className="ml-2 text-2xl font-medium text-muted">m²</span>
        </p>
        <p className="mt-2 text-sm text-muted">
          {szam(e.szelessegM, 2)} m × {szam(e.magassagM, 2)} m
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Kartya
          ikon={Monitor}
          felirat="Felbontás"
          ertek={`${szam(e.pixelSzeles)} × ${szam(e.pixelMagas)}`}
          egyseg="px"
          megjegyzes={`Képarány: ${e.keparany}`}
          szin="text-secondary"
        />
        <Kartya
          ikon={Hash}
          felirat="Összes pixel"
          ertek={szam(e.osszesPixel)}
          megjegyzes={`≈ ${szam(e.megapixel, 2)} megapixel`}
          szin="text-accent"
        />
        <Kartya
          ikon={Grid3x3}
          felirat="Pixelsűrűség"
          ertek={szam(e.surusegPxM2)}
          egyseg="px/m²"
          szin="text-primary"
        />
        <Kartya
          ikon={Ruler}
          felirat="Átló"
          ertek={szam(e.atloM, 2)}
          egyseg="m"
          megjegyzes={`≈ ${szam(e.atloCol)} hüvelyk`}
          szin="text-secondary"
        />
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
        <Eye className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <p className="text-sm text-muted">
          Ajánlott minimális nézési távolság:{' '}
          <strong className="text-white">{szam(e.minTavolsagM, 1)} m</strong>
          <span className="block text-xs">Hüvelykujj-szabály: pixelosztás (mm) ≈ távolság (m).</span>
        </p>
      </div>
    </div>
  )
}
