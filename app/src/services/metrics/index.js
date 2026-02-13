const counters = new Map()
const gauges = new Map()
const histograms = new Map()

function stableLabelKey(labels = {}) {
  const entries = Object.entries(labels)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)])
    .sort(([a], [b]) => a.localeCompare(b))
  return entries.map(([key, value]) => `${key}=${value}`).join(',')
}

function metricStorageKey(metric, labels) {
  const labelKey = stableLabelKey(labels)
  return `${metric}|${labelKey}`
}

function parseMetricStorageKey(storageKey) {
  const [metricName, labelKey = ''] = storageKey.split('|', 2)
  const labels = {}
  if (labelKey) {
    for (const segment of labelKey.split(',')) {
      const [key, value] = segment.split('=', 2)
      if (key) {
        labels[key] = value || ''
      }
    }
  }
  return { metricName, labels }
}

export function incrementCounter(metric, labels = {}, value = 1) {
  const key = metricStorageKey(metric, labels)
  counters.set(key, (counters.get(key) || 0) + value)
}

export function setGauge(metric, labels = {}, value = 0) {
  const key = metricStorageKey(metric, labels)
  gauges.set(key, value)
}

export function observeDuration(metric, milliseconds, labels = {}) {
  const key = metricStorageKey(metric, labels)
  const entry = histograms.get(key) || {
    count: 0,
    sum: 0,
    min: Number.POSITIVE_INFINITY,
    max: 0,
  }

  entry.count += 1
  entry.sum += milliseconds
  entry.min = Math.min(entry.min, milliseconds)
  entry.max = Math.max(entry.max, milliseconds)
  histograms.set(key, entry)
}

export function getMetricsSnapshot() {
  return {
    counters: Array.from(counters.entries()).map(([key, value]) => {
      const { metricName, labels } = parseMetricStorageKey(key)
      return { metric: metricName, labels, value }
    }),
    gauges: Array.from(gauges.entries()).map(([key, value]) => {
      const { metricName, labels } = parseMetricStorageKey(key)
      return { metric: metricName, labels, value }
    }),
    histograms: Array.from(histograms.entries()).map(([key, value]) => {
      const { metricName, labels } = parseMetricStorageKey(key)
      return {
        metric: metricName,
        labels,
        ...value,
        avg: value.count > 0 ? value.sum / value.count : 0,
      }
    }),
    collectedAt: new Date().toISOString(),
  }
}

function renderLabels(labels = {}) {
  const entries = Object.entries(labels)
  if (!entries.length) {
    return ''
  }

  return `{${entries.map(([key, value]) => `${key}="${value}"`).join(',')}}`
}

export function toPrometheusText() {
  const lines = []

  for (const [key, value] of counters.entries()) {
    const { metricName, labels } = parseMetricStorageKey(key)
    lines.push(`${metricName}${renderLabels(labels)} ${value}`)
  }

  for (const [key, value] of gauges.entries()) {
    const { metricName, labels } = parseMetricStorageKey(key)
    lines.push(`${metricName}${renderLabels(labels)} ${value}`)
  }

  for (const [key, value] of histograms.entries()) {
    const { metricName, labels } = parseMetricStorageKey(key)
    lines.push(`${metricName}_count${renderLabels(labels)} ${value.count}`)
    lines.push(`${metricName}_sum${renderLabels(labels)} ${value.sum}`)
    lines.push(`${metricName}_min${renderLabels(labels)} ${value.min}`)
    lines.push(`${metricName}_max${renderLabels(labels)} ${value.max}`)
  }

  return lines.join('\n')
}

export function resetMetrics() {
  counters.clear()
  gauges.clear()
  histograms.clear()
}

export default {
  incrementCounter,
  setGauge,
  observeDuration,
  getMetricsSnapshot,
  toPrometheusText,
  resetMetrics,
}
