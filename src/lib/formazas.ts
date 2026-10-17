const formazok = new Map<number, Intl.NumberFormat>()

/** Magyar számformázás (szóköz ezres elválasztó, vessző tizedesjel). */
export function szam(ertek: number, tizedes = 0): string {
  let formazo = formazok.get(tizedes)
  if (!formazo) {
    formazo = new Intl.NumberFormat('hu-HU', {
      minimumFractionDigits: tizedes,
      maximumFractionDigits: tizedes,
    })
    formazok.set(tizedes, formazo)
  }
  return formazo.format(ertek)
}
