export function selectTemplateVariant(templates, variantIndex = 0) {
  if (!Array.isArray(templates) || templates.length === 0) {
    throw new Error('Interpretation templates must not be empty')
  }

  const requestedIndex = Number.isInteger(variantIndex) ? variantIndex : 0
  const normalizedIndex = ((requestedIndex % templates.length) + templates.length) % templates.length
  return templates[normalizedIndex]
}
