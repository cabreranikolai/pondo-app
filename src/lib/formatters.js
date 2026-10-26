const phpFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('en-PH', {
  day: 'numeric',
  month: 'short',
})

export function formatPHP(amountCentavos) {
  return phpFormatter.format(amountCentavos / 100)
}

export function formatShortDate(isoDate) {
  return dateFormatter.format(new Date(`${isoDate}T00:00:00`))
}

export function formatCurrentDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-PH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatCompactPHP(amountCentavos) {
  const pesos = amountCentavos / 100
  if (pesos >= 1_000_000) {
    return `₱${(pesos / 1_000_000).toFixed(1)}M`
  }
  if (pesos >= 1_000) {
    return `₱${(pesos / 1_000).toFixed(0)}k`
  }
  return phpFormatter.format(pesos)
}
