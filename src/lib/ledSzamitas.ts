/**
 * LED-fal számítások – tiszta TypeScript-függvények, külső függőség nélkül.
 */

export type Kornyezet = 'belteri' | 'kulteri'

export interface Pixelosztas {
  id: string
  felirat: string
  /** Pixelosztás milliméterben (két szomszédos pixel középpontjának távolsága). */
  mm: number
  kornyezetek: Kornyezet[]
}

export const KORNYEZETEK: { id: Kornyezet; nev: string; leiras: string }[] = [
  { id: 'belteri', nev: 'Beltéri', leiras: 'Közeli nézet, finom pixelosztás' },
  { id: 'kulteri', nev: 'Kültéri', leiras: 'Nagy fényerő, távoli nézet' },
]

export const PIXELOSZTASOK: Pixelosztas[] = [
  { id: 'p1.25', felirat: 'P1.25', mm: 1.25, kornyezetek: ['belteri'] },
  { id: 'p1.56', felirat: 'P1.56', mm: 1.5625, kornyezetek: ['belteri'] },
  { id: 'p1.95', felirat: 'P1.95', mm: 1.953125, kornyezetek: ['belteri'] },
  { id: 'p2', felirat: 'P2', mm: 2, kornyezetek: ['belteri'] },
  { id: 'p2.5', felirat: 'P2.5', mm: 2.5, kornyezetek: ['belteri', 'kulteri'] },
  { id: 'p3.33', felirat: 'P3.33', mm: 3.3333333, kornyezetek: ['kulteri'] },
  { id: 'p3.91', felirat: 'P3.91', mm: 3.90625, kornyezetek: ['belteri', 'kulteri'] },
  { id: 'p4', felirat: 'P4', mm: 4, kornyezetek: ['belteri', 'kulteri'] },
  { id: 'p5', felirat: 'P5', mm: 5, kornyezetek: ['kulteri'] },
  { id: 'p6.67', felirat: 'P6.67', mm: 6.6666667, kornyezetek: ['kulteri'] },
  { id: 'p8', felirat: 'P8', mm: 8, kornyezetek: ['kulteri'] },
  { id: 'p10', felirat: 'P10', mm: 10, kornyezetek: ['kulteri'] },
]

export const HATARERTEKEK = {
  szelesseg: { min: 0.5, max: 50 },
  magassag: { min: 0.5, max: 20 },
} as const

/** Az adott környezetben elérhető pixelosztások. */
export function elerhetoPixelosztasok(kornyezet: Kornyezet): Pixelosztas[] {
  return PIXELOSZTASOK.filter((p) => p.kornyezetek.includes(kornyezet))
}

/**
 * Feloldja a kiválasztott pixelosztást: ha az nem érhető el az adott
 * környezetben, az első elérhetőt adja vissza.
 */
export function pixelosztasFeloldasa(kornyezet: Kornyezet, id: string): Pixelosztas {
  const lista = elerhetoPixelosztasok(kornyezet)
  return lista.find((p) => p.id === id) ?? lista[0]
}

/** Magyar (vesszős) és angol (pontos) tizedesjegyű számot is elfogad. NaN, ha érvénytelen. */
export function tizedesBeolvas(szoveg: string): number {
  const tisztitott = szoveg.trim().replace(/\s/g, '').replace(',', '.')
  if (tisztitott === '' || !/^\d*\.?\d*$/.test(tisztitott)) return Number.NaN
  return Number(tisztitott)
}

/** Számot szövegmezőbe szánt, vesszős alakra hoz. */
export function tizedesKiir(ertek: number): string {
  return String(Math.round(ertek * 100) / 100).replace('.', ',')
}

export interface MeretHibak {
  szelesseg?: string
  magassag?: string
}

export function meretekEllenorzese(szelesseg: number, magassag: number): MeretHibak {
  const hibak: MeretHibak = {}
  const { szelesseg: sz, magassag: m } = HATARERTEKEK

  if (!Number.isFinite(szelesseg)) {
    hibak.szelesseg = 'Adj meg egy számot méterben.'
  } else if (szelesseg < sz.min || szelesseg > sz.max) {
    hibak.szelesseg = `A szélesség ${sz.min} és ${sz.max} m között lehet.`
  }

  if (!Number.isFinite(magassag)) {
    hibak.magassag = 'Adj meg egy számot méterben.'
  } else if (magassag < m.min || magassag > m.max) {
    hibak.magassag = `A magasság ${m.min} és ${m.max} m között lehet.`
  }

  return hibak
}

export function legnagyobbKozosOszto(a: number, b: number): number {
  let x = Math.abs(Math.round(a))
  let y = Math.abs(Math.round(b))
  while (y !== 0) {
    ;[x, y] = [y, x % y]
  }
  return x || 1
}

const ISMERT_KEPARANYOK: [number, number][] = [
  [1, 1],
  [4, 3],
  [3, 2],
  [16, 10],
  [16, 9],
  [21, 9],
  [2, 1],
  [3, 1],
  [4, 1],
]

/** Képarány felirata: ismert arányhoz közel (±1,5%) „16:9”, különben „2,35:1”. */
export function keparanyFelirat(szelesseg: number, magassag: number): string {
  const arany = szelesseg / magassag
  for (const [a, b] of ISMERT_KEPARANYOK) {
    if (Math.abs(arany / (a / b) - 1) <= 0.015) return `${a}:${b}`
  }
  if (arany < 1) {
    const forditott = 1 / arany
    return `1:${forditott.toFixed(2).replace('.', ',')}`
  }
  return `${arany.toFixed(2).replace('.', ',')}:1`
}

export interface Eredmeny {
  szelessegM: number
  magassagM: number
  feluletM2: number
  pixelSzeles: number
  pixelMagas: number
  osszesPixel: number
  megapixel: number
  /** Pixelsűrűség (pixel / m²). */
  surusegPxM2: number
  atloM: number
  atloCol: number
  keparany: string
  /** Ajánlott minimális nézési távolság méterben (hüvelykujj-szabály: ≈ pixelosztás mm-ben). */
  minTavolsagM: number
}

export function szamol(szelessegM: number, magassagM: number, pixelosztasMm: number): Eredmeny {
  // A kis korrekció kiküszöböli a lebegőpontos kerekítési hibákat (pl. 3 m / 2,5 mm).
  const pixelSzeles = Math.floor((szelessegM * 1000) / pixelosztasMm + 1e-6)
  const pixelMagas = Math.floor((magassagM * 1000) / pixelosztasMm + 1e-6)
  const osszesPixel = pixelSzeles * pixelMagas
  const atloM = Math.hypot(szelessegM, magassagM)

  return {
    szelessegM,
    magassagM,
    feluletM2: szelessegM * magassagM,
    pixelSzeles,
    pixelMagas,
    osszesPixel,
    megapixel: osszesPixel / 1_000_000,
    surusegPxM2: 1_000_000 / (pixelosztasMm * pixelosztasMm),
    atloM,
    atloCol: atloM / 0.0254,
    keparany: keparanyFelirat(szelessegM, magassagM),
    minTavolsagM: pixelosztasMm,
  }
}
