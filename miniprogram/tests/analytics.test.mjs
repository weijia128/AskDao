import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildAnalyticsPayload,
  buildShareReopenProperties,
  mapShareScene,
} from '../services/analytics.core.js'

const readText = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('analytics payload keeps properties and adds event metadata without mutating input', () => {
  const properties = { page: 'home', source: 'share' }
  const payload = buildAnalyticsPayload('page_view', properties)

  assert.equal(payload.page, 'home')
  assert.equal(payload.source, 'share')
  assert.equal(payload.event, 'page_view')
  assert.ok(typeof payload.client_time === 'string')
  assert.deepEqual(properties, { page: 'home', source: 'share' })
})

test('share reopen properties are built only for share source', () => {
  assert.deepEqual(buildShareReopenProperties({ source: 'share', template_id: 'A01' }, 1007), {
    template_id: 'A01',
    share_scene: 'session',
  })
  assert.deepEqual(buildShareReopenProperties({ source: 'share' }, 1154), {
    template_id: '',
    share_scene: 'timeline',
  })
  assert.equal(buildShareReopenProperties({ source: 'direct' }, 1007), null)
  assert.equal(buildShareReopenProperties({}, 1007), null)
  assert.equal(buildShareReopenProperties(undefined, 1007), null)
})

test('share scene mapping covers session timeline and unknown', () => {
  assert.equal(mapShareScene(1007), 'session')
  assert.equal(mapShareScene(1008), 'session')
  assert.equal(mapShareScene(1044), 'session')
  assert.equal(mapShareScene(1154), 'timeline')
  assert.equal(mapShareScene(1001), 'unknown')
  assert.equal(mapShareScene(undefined), 'unknown')
})

test('analytics track reports to wechat analytics with console fallback', async () => {
  const analyticsSource = await readText('../services/analytics.ts')
  const homeSource = await readText('../pages/home/index.ts')

  assert.match(analyticsSource, /wx\.reportAnalytics/)
  assert.match(analyticsSource, /console\.info/)
  assert.match(analyticsSource, /buildAnalyticsPayload/)
  assert.match(analyticsSource, /'clear_history'/)

  assert.match(homeSource, /reopen_from_share/)
  assert.match(homeSource, /buildShareReopenProperties/)
})
