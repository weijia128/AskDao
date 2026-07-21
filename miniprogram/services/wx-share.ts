export function buildSharePath(templateId = 'A01'): string {
  return `/pages/home/index?source=share&template_id=${encodeURIComponent(templateId)}`
}
