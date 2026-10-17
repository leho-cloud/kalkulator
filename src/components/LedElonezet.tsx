import { User } from 'lucide-react'
import { szam } from '../lib/formazas'
import type { Eredmeny } from '../lib/ledSzamitas'

interface Props {
  eredmeny: Eredmeny
}

const MAX_MAGASSAG_PX = 320
const MAX_PONT_VIZSZINTESEN = 90
const EMBER_MAGASSAG_M = 1.7

/**
 * Arányos LED-fal ábra. A pontrács sűrűsége a valódi felbontást követi,
 * de a megjelenítés érdekében felső korlátot kap.
 */
export default function LedElonezet({ eredmeny }: Props) {
  const { szelessegM, magassagM, pixelSzeles, pixelMagas } = eredmeny

  const arany = szelessegM / magassagM
  const lekicsinyites = Math.min(1, MAX_PONT_VIZSZINTESEN / pixelSzeles)
  const pontX = Math.max(1, Math.round(pixelSzeles * lekicsinyites))
  const pontY = Math.max(1, Math.round(pixelMagas * lekicsinyites))
  const emberSzazalek = Math.min(100, (EMBER_MAGASSAG_M / magassagM) * 100)

  return (
    <figure className="m-0">
      <div className="flex justify-center rounded-2xl border border-line bg-base p-4 sm:p-6">
        <div
          role="img"
          aria-label={`LED-fal ábra: ${szam(szelessegM, 2)} méter széles és ${szam(
            magassagM,
            2,
          )} méter magas, ${szam(pixelSzeles)} × ${szam(pixelMagas)} pixel`}
          className="relative overflow-hidden rounded-lg shadow-[0_0_60px_-12px_#9E7FFF]"
          style={{
            aspectRatio: `${szelessegM} / ${magassagM}`,
            width: `min(100%, ${Math.round(arany * MAX_MAGASSAG_PX)}px)`,
          }}
        >
          <div className="led-tartalom absolute inset-0" />

          {/* Pontrács: a sötét réteg "lyukain" át látszik a tartalom. */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 50%, transparent 0 36%, #0a0a0a 44%)',
              backgroundSize: `${100 / pontX}% ${100 / pontY}%`,
            }}
          />

          {/* Léptékhez: 1,7 m magas ember sziluettje. */}
          <div
            className="absolute bottom-0 left-[4%] flex flex-col items-center justify-end text-white/70"
            style={{ height: `${emberSzazalek}%` }}
            aria-hidden="true"
          >
            <User className="h-full w-auto" strokeWidth={1.25} />
          </div>
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          {szam(szelessegM, 2)} × {szam(magassagM, 2)} m
        </span>
        <span>
          {pontX < pixelSzeles
            ? 'Illusztráció: a pontrács egyszerűsítve látszik'
            : 'A pontrács a valós pixelkiosztást mutatja'}
          {' · '}ember: 1,7 m
        </span>
      </figcaption>
    </figure>
  )
}
