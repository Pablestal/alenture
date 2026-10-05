/**
 * An ISO 3166-1 alpha-2 code as a country name in the reader's language.
 *
 * Lifted out of the placement form's detection line, which was the first place
 * that needed it and is no longer the only one: the detail panel names the
 * country of a saved place from the same code, and the two must not answer
 * differently.
 *
 * `Intl`, not the geocoder's own country string: the geocoder answers in
 * whatever language it was asked in, and its list of languages is not ours.
 * This way the country reads in the user's language even when the city name
 * beside it does not.
 */
export function formatCountryName(countryCode: string, locale: string): string | null {
  const country = new Intl.DisplayNames([locale], { type: 'region' }).of(countryCode)
  // `of` hands back the code itself for a region it does not know. Printing
  // "ES" where a country name belongs reads as a data glitch, and null lets
  // each caller decide what to show instead — which for both of them today is
  // nothing at all.
  return country && country !== countryCode ? country : null
}
