export function hashVerdictSelectionKey(value = '') {
  if (!value) {
    return 0
  }

  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return hash
}

export function selectStableVerdict(verdicts, selectionKey = '', variantIndex = 0) {
  if (!Array.isArray(verdicts) || verdicts.length === 0) {
    throw new Error('Traditional verdicts must not be empty')
  }

  const rotation = Number.isInteger(variantIndex) ? variantIndex : 0
  const requestedIndex = hashVerdictSelectionKey(selectionKey) + rotation
  const normalizedIndex = ((requestedIndex % verdicts.length) + verdicts.length) % verdicts.length
  return verdicts[normalizedIndex]
}
