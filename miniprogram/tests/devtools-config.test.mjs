import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))

test('WeChat DevTools compiles TypeScript page entries', async () => {
  const projectConfig = await readJson('../../project.config.json')
  const appConfig = await readJson('../app.json')

  assert.deepEqual(projectConfig.setting.useCompilerPlugins, ['typescript'])
  assert.equal(projectConfig.setting.packNpmManually, true)
  assert.deepEqual(projectConfig.setting.packNpmRelationList, [
    {
      packageJsonPath: './package.json',
      miniprogramNpmDistDir: './miniprogram/',
    },
  ])

  for (const page of appConfig.pages) {
    const pageScript = new URL(`../${page}.ts`, import.meta.url)
    const file = await stat(pageScript)
    assert.equal(file.isFile(), true)
  }
})
