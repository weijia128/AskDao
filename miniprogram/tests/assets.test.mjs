import test from 'node:test'
import assert from 'node:assert/strict'
import { stat } from 'node:fs/promises'

const imageSize = async (name) =>
  (await stat(new URL(`../assets/images/${name}`, import.meta.url))).size

// 体积预算：主包上限 2MB，四张页面底图各自守约，防止后续提交回弹
test('result page background image stays within size budget', async () => {
  assert.ok((await imageSize('result-bg.jpg')) <= 260 * 1024)
})

test('result card background image stays within size budget', async () => {
  assert.ok((await imageSize('result-card-bg.png')) <= 180 * 1024)
})

test('taiji entry image stays within size budget', async () => {
  assert.ok((await imageSize('bagua-taiji.png')) <= 80 * 1024)
})

// 断课面六象底图：单张 ≤64KB，合计 ≤300KB，守住主包 2MB 上限
test('card back images stay within size budget', async () => {
  const names = [
    'card-back-da-an.jpg',
    'card-back-liu-lian.jpg',
    'card-back-su-xi.jpg',
    'card-back-chi-kou.jpg',
    'card-back-xiao-ji.jpg',
    'card-back-kong-wang.jpg',
  ]
  const sizes = await Promise.all(names.map(imageSize))

  for (const [index, size] of sizes.entries()) {
    assert.ok(size <= 64 * 1024, `${names[index]} is ${size} bytes`)
  }
  assert.ok(
    sizes.reduce((total, size) => total + size, 0) <= 300 * 1024,
  )
})
