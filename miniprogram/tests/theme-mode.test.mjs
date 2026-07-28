import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const readText = (path) => readFile(new URL(path, import.meta.url), 'utf8')
const readJson = async (path) => JSON.parse(await readText(path))

test('app enables system dark mode with a theme file', async () => {
  const appJson = await readJson('../app.json')

  assert.equal(appJson.darkmode, true)
  assert.equal(appJson.themeLocation, 'theme.json')
  assert.equal(appJson.window.navigationBarBackgroundColor, '@navBgColor')
  assert.equal(appJson.window.navigationBarTextStyle, '@navTxtStyle')
  assert.equal(appJson.window.backgroundColor, '@bgColor')
})

test('theme file defines light and dark window variables', async () => {
  const theme = await readJson('../theme.json')

  assert.equal(theme.light.navBgColor, '#f4eee2')
  assert.equal(theme.light.navTxtStyle, 'black')
  assert.equal(theme.light.bgColor, '#f4eee2')
  assert.equal(theme.dark.navBgColor, '#10100f')
  assert.equal(theme.dark.navTxtStyle, 'white')
  assert.equal(theme.dark.bgColor, '#10100f')
})

test('themed pages follow system theme via variables', async () => {
  for (const page of ['../pages/home/index.json', '../pages/xiao-liuren/index.json', '../pages/history/index.json']) {
    const pageJson = await readJson(page)

    assert.equal(pageJson.navigationBarBackgroundColor, '@navBgColor')
    assert.equal(pageJson.navigationBarTextStyle, '@navTxtStyle')
    assert.equal(pageJson.backgroundColor, '@bgColor')
  }
})

test('result page stays dark in both modes', async () => {
  const pageJson = await readJson('../pages/result/index.json')

  assert.equal(pageJson.navigationBarBackgroundColor, '#10100f')
  assert.equal(pageJson.navigationBarTextStyle, 'white')
  assert.equal(pageJson.backgroundColor, '#10100f')
})

test('themed pages define dark mode style overrides', async () => {
  for (const page of ['../pages/home/index.wxss', '../pages/xiao-liuren/index.wxss', '../pages/history/index.wxss']) {
    const styles = await readText(page)

    assert.match(styles, /@media \(prefers-color-scheme: dark\)/)
    assert.match(styles, /#141614/)
    assert.match(styles, /#0c0e0c/)
  }
})
