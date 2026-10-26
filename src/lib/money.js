export function toCents(value, maxWholeDigits = 12) {
  const decimal = String(value ?? '').trim()
  const wholeDigits = maxWholeDigits === null ? '\\d+' : `\\d{1,${maxWholeDigits}}`
  if (!new RegExp(`^-?${wholeDigits}(?:\\.\\d{1,2})?$`).test(decimal)) return null

  const negative = decimal.startsWith('-')
  const [whole, fraction = ''] = decimal.replace(/^-/, '').split('.')
  const cents =
    BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0') || '0')
  const signedCents = negative ? -cents : cents
  if (
    maxWholeDigits !== null &&
    (signedCents > 99999999999999n || signedCents < -99999999999999n)
  ) {
    return null
  }
  return signedCents
}

export function formatCents(cents) {
  const negative = cents < 0n
  const absolute = negative ? -cents : cents
  const whole = absolute / 100n
  const fraction = String(absolute % 100n).padStart(2, '0')
  const wholeFormatted = new Intl.NumberFormat('en-PH', {
    maximumFractionDigits: 0,
  }).format(whole)
  return `${negative ? '-' : ''}₱${wholeFormatted}.${fraction}`
}

export function centsToDecimal(cents) {
  const negative = cents < 0n
  const absolute = negative ? -cents : cents
  const whole = absolute / 100n
  const fraction = String(absolute % 100n).padStart(2, '0')
  return `${negative ? '-' : ''}${whole}.${fraction}`
}
