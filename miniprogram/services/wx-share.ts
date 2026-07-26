export function buildSharePath(templateId = 'A01'): string {
  return `/pages/home/index?source=share&template_id=${encodeURIComponent(templateId)}`
}

export function buildShareTimelineQuery(templateId = 'A01'): string {
  return `source=share&template_id=${encodeURIComponent(templateId)}&share_scene=timeline`
}

export function buildResultCardEntrancePath(templateId = 'A01'): string {
  return `/pages/home/index?source=result_card&template_id=${encodeURIComponent(templateId)}`
}
