import { useMemo, useState } from 'react'
import { AlertCircle, ArrowLeftRight, ArrowUpDown, Info, RotateCcw } from 'lucide-react'
import EredmenyKartyak from './components/EredmenyKartyak'
import KornyezetValaszto from './components/KornyezetValaszto'
import LedElonezet from './components/LedElonezet'
import MeretMezo from './components/MeretMezo'
import PixelosztasValaszto from './components/PixelosztasValaszto'
import {
  HATARERTEKEK,
  elerhetoPixelosztasok,
  meretekEllenorzese,
  pixelosztasFeloldasa,
  szamol,
  tizedesBeolvas,
  type Kornyezet,
} from './lib/ledSzamitas'

const ELOBEALLITASOK = [
  { felirat: '3 × 2 m', szelesseg: '3', magassag: '2' },
  { felirat: '4 × 2,25 m', szelesseg: '4', magassag: '2,25' },
  { felirat: '6 × 3,5 m', szelesseg: '6', magassag: '3,5' },
  { felirat: '10 × 4 m', szelesseg: '10', magassag: '4' },
]

const ALAP = { kornyezet: 'belteri' as Kornyezet, szelesseg: '4', magassag: '2,25', pixelosztas: 'p2.5' }

export default function App() {
  const [kornyezet, setKornyezet] = useState<Kornyezet>(ALAP.kornyezet)
  const [szelesseg, setSzelesseg] = useState(ALAP.szelesseg)
  const [magassag, setMagassag] = useState(ALAP.magassag)
  const [pixelosztasId, setPixelosztasId] = useState(ALAP.pixelosztas)

  const lehetosegek = useMemo(() => elerhetoPixelosztasok(kornyezet), [kornyezet])
  const pixelosztas = pixelosztasFeloldasa(kornyezet, pixelosztasId)

  const szelessegM = tizedesBeolvas(szelesseg)
  const magassagM = tizedesBeolvas(magassag)
  const hibak = meretekEllenorzese(szelessegM, magassagM)
  const ervenyes = !hibak.szelesseg && !hibak.magassag

  // Minden módosításnál azonnal újraszámol.
  const eredmeny = useMemo(
    () => (ervenyes ? szamol(szelessegM, magassagM, pixelosztas.mm) : null),
    [ervenyes, szelessegM, magassagM, pixelosztas.mm],
  )

  const alaphelyzet = () => {
    setKornyezet(ALAP.kornyezet)
    setSzelesseg(ALAP.szelesseg)
    setMagassag(ALAP.magassag)
    setPixelosztasId(ALAP.pixelosztas)
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Háttér fények */}
      <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden="true">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-24 top-40 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="megjelenes mb-8 sm:mb-12">
          <div
            className="mb-5 h-3 w-48 bg-gradient-to-r from-primary via-secondary to-accent"
            style={{
              WebkitMaskImage: 'radial-gradient(circle, #000 0 40%, transparent 46%)',
              maskImage: 'radial-gradient(circle, #000 0 40%, transparent 46%)',
              WebkitMaskSize: '12px 12px',
              maskSize: '12px 12px',
            }}
            aria-hidden="true"
          />
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            LED-fal{' '}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              konfigurátor
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Add meg a méretet és a pixelosztást – a felület, a felbontás és a pixelszám minden
            módosítás után azonnal frissül.
          </p>
        </header>

        <main className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8">
          {/* Beállítások */}
          <section
            aria-labelledby="beallitasok-cim"
            className="megjelenes h-fit space-y-7 rounded-3xl border border-line bg-surface p-5 sm:p-7 lg:sticky lg:top-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="beallitasok-cim" className="text-xl font-semibold">
                Beállítások
              </h2>
              <button
                type="button"
                onClick={alaphelyzet}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-line px-3 text-sm text-muted transition-colors hover:border-primary/60 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Alaphelyzet
              </button>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium">Környezet</h3>
              <KornyezetValaszto
                ertek={kornyezet}
                onValtozas={(k) => {
                  setKornyezet(k)
                  setPixelosztasId(pixelosztasFeloldasa(k, pixelosztasId).id)
                }}
              />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium">Gyors méretek</h3>
              <div className="flex flex-wrap gap-2">
                {ELOBEALLITASOK.map((e) => {
                  const aktiv = e.szelesseg === szelesseg && e.magassag === magassag
                  return (
                    <button
                      key={e.felirat}
                      type="button"
                      onClick={() => {
                        setSzelesseg(e.szelesseg)
                        setMagassag(e.magassag)
                      }}
                      className={`min-h-[44px] rounded-xl border px-3 text-sm transition-all active:scale-95 ${
                        aktiv
                          ? 'border-accent bg-accent/15 text-white'
                          : 'border-line bg-base text-muted hover:border-accent/60 hover:text-white'
                      }`}
                    >
                      {e.felirat}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <MeretMezo
                id="szelesseg"
                felirat="Szélesség"
                ikon={ArrowLeftRight}
                ertek={szelesseg}
                onValtozas={setSzelesseg}
                hiba={hibak.szelesseg}
                min={HATARERTEKEK.szelesseg.min}
                max={HATARERTEKEK.szelesseg.max}
                csuszkaMax={30}
              />
              <MeretMezo
                id="magassag"
                felirat="Magasság"
                ikon={ArrowUpDown}
                ertek={magassag}
                onValtozas={setMagassag}
                hiba={hibak.magassag}
                min={HATARERTEKEK.magassag.min}
                max={HATARERTEKEK.magassag.max}
                csuszkaMax={12}
              />
            </div>

            <div>
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-sm font-medium">Pixelosztás</h3>
                <span className="text-xs text-muted">{pixelosztas.mm.toFixed(2).replace('.', ',')} mm</span>
              </div>
              <PixelosztasValaszto
                lehetosegek={lehetosegek}
                kivalasztottId={pixelosztas.id}
                onValtozas={setPixelosztasId}
              />
              <p className="mt-3 flex items-start gap-2 text-xs text-muted">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Kisebb pixelosztás = élesebb kép közelről, de több pixel és magasabb költség.
              </p>
            </div>
          </section>

          {/* Eredmények */}
          <section aria-labelledby="eredmeny-cim" className="megjelenes space-y-6">
            <h2 id="eredmeny-cim" className="sr-only">
              Eredmények
            </h2>

            {eredmeny ? (
              <>
                <LedElonezet eredmeny={eredmeny} />
                <EredmenyKartyak eredmeny={eredmeny} />
              </>
            ) : (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-3xl border border-red-500/40 bg-red-500/10 p-6"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Nem számolható ki az eredmény</p>
                  <p className="mt-1 text-sm text-muted">
                    Javítsd a hibás mezőket a bal oldali beállításokban – az eredmény azonnal
                    megjelenik.
                  </p>
                </div>
              </div>
            )}
          </section>
        </main>

        <footer className="mt-12 border-t border-line pt-6 text-sm text-muted">
          A kiszámított értékek tájékoztató jellegűek. Végleges tervezés előtt egyeztess a gyártóval.
        </footer>
      </div>
    </div>
  )
}
