export function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value || 0))
}

export function formatCents(value) {
  return formatCurrency(Number(value || 0) / 100)
}

export function formatDate(value) {
  if (!value) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value))
}
