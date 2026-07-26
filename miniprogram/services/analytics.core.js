// 分享场景值映射：1007 单人会话、1008 群聊、1044 群聊带分享卡片、1154 朋友圈
const SESSION_SCENES = new Set([1007, 1008, 1044])
const TIMELINE_SCENES = new Set([1154])

export function buildAnalyticsPayload(event, properties = {}) {
  return {
    ...properties,
    event,
    client_time: new Date().toISOString(),
  }
}

export function mapShareScene(scene) {
  if (SESSION_SCENES.has(scene)) {
    return 'session'
  }

  if (TIMELINE_SCENES.has(scene)) {
    return 'timeline'
  }

  return 'unknown'
}

// 首页 onLoad 的 options 为分享回流时返回 reopen_from_share 属性，否则返回 null
export function buildShareReopenProperties(options = {}, scene) {
  if (!options || options.source !== 'share') {
    return null
  }

  return {
    template_id: options.template_id || '',
    share_scene: mapShareScene(scene),
  }
}
