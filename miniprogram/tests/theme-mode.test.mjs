import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'

const readText = (path) => readFile(new URL(path, import.meta.url), 'utf8')
const readJson = async (path) => JSON.parse(await readText(path))

const LIGHT_BG = '#f4eee2'

test('app pins the light window palette and disables dark mode', async () => {
  const appJson = await readJson('../app.json')

  assert.equal(appJson.darkmode, false)
  assert.equal(appJson.themeLocation, undefined)
  assert.equal(appJson.window.navigationBarBackgroundColor, LIGHT_BG)
  assert.equal(appJson.window.navigationBarTextStyle, 'black')
  assert.equal(appJson.window.backgroundColor, LIGHT_BG)
})

test('theme variable file stays deleted', async () => {
  await assert.rejects(access(new URL('../theme.json', import.meta.url)))
})

test('themed pages pin the same light palette instead of theme variables', async () => {
  for (const page of ['../pages/home/index.json', '../pages/xiao-liuren/index.json', '../pages/result/index.json', '../pages/history/index.json']) {
    const pageJson = await readJson(page)

    assert.equal(pageJson.navigationBarBackgroundColor, LIGHT_BG)
    assert.equal(pageJson.navigationBarTextStyle, 'black')
    assert.equal(pageJson.backgroundColor, LIGHT_BG)
  }
})

test('no stylesheet reintroduces a system dark mode override', async () => {
  const stylesheets = [
    '../app.wxss',
    '../pages/home/index.wxss',
    '../pages/xiao-liuren/index.wxss',
    '../pages/history/index.wxss',
    '../pages/result/index.wxss',
  ]

  for (const sheet of stylesheets) {
    assert.doesNotMatch(await readText(sheet), /prefers-color-scheme/)
  }
})

test('light pages drop the retired ink dark palette', async () => {
  for (const page of ['../pages/home/index.wxss', '../pages/xiao-liuren/index.wxss', '../pages/result/index.wxss', '../pages/history/index.wxss']) {
    const styles = await readText(page)

    assert.doesNotMatch(styles, /#141614/)
    assert.doesNotMatch(styles, /#0c0e0c/)
  }
})
