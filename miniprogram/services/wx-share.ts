export function buildSharePath(templateId = 'A01'): string {
  return `/pages/home/index?source=share&template_id=${encodeURIComponent(templateId)}`
}

export function buildResultCardEntrancePath(templateId = 'A01'): string {
  return `/pages/home/index?source=result_card&template_id=${encodeURIComponent(templateId)}`
}
