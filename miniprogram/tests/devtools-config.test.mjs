import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile, stat } from 'node:fs/promises'

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))

test('WeChat DevTools compiles TypeScript page entries', async () => {
  const projectConfig = await readJson('../../project.config.json')
  const appConfig = await readJson('../app.json')

  assert.deepEqual(projectConfig.setting.useCompilerPlugins, ['typescript'])
  // 历法数据改为构建期 .data.js 数据模块后，小程序无运行时 npm 依赖，
  // 关闭手动 npm 打包，避免 DevTools 启动时查找不存在的 miniprogram_npm 产物。
  assert.equal(projectConfig.setting.packNpmManually, false)
  assert.equal(projectConfig.setting.packNpmRelationList, undefined)

  for (const page of appConfig.pages) {
    const pageScript = new URL(`../${page}.ts`, import.meta.url)
    const file = await stat(pageScript)
    assert.equal(file.isFile(), true)
  }
})

test('dead code stays deleted', async () => {
  const deletedPaths = [
    '../pages/question/index.ts',
    '../services/poster.ts',
    '../application/result-service.ts',
    '../assets/images/liuren-hand.png',
    '../design/tokens.ts',
    '../design/copywriting.ts',
    '../components/ritual-button/index.ts',
  ]

  for (const path of deletedPaths) {
    await assert.rejects(access(new URL(path, import.meta.url)))
  }
})

test('pages do not register placeholder components', async () => {
  const appConfig = await readJson('../app.json')

  for (const page of appConfig.pages) {
    const pageConfig = await readJson(`../${page}.json`)
    const components = pageConfig.usingComponents || {}
    assert.deepEqual(Object.keys(components), [])
  }
})
