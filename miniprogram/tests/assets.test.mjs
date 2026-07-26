import test from 'node:test'
import assert from 'node:assert/strict'
import { stat } from 'node:fs/promises'

const imageSize = async (name) =>
  (await stat(new URL(`../assets/images/${name}`, import.meta.url))).size

// 体积预算：主包上限 2MB，图片合计目标 ≤410KB，防止后续提交回弹
test('page background image stays within size budget', async () => {
  assert.ok((await imageSize('page-bg.png')) <= 150 * 1024)
})

test('result card background image stays within size budget', async () => {
  assert.ok((await imageSize('result-card-bg.png')) <= 180 * 1024)
})

test('taiji entry image stays within size budget', async () => {
  assert.ok((await imageSize('bagua-taiji.png')) <= 80 * 1024)
})
