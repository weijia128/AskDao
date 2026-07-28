import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { symbolTemplates, disclaimer } from '../domain/interpretation/templates.ts'
import { selectTemplateVariant } from '../domain/interpretation/template-provider.core.js'
import {
  getTraditionalVerdicts,
  traditionalVerdictGuidance,
  traditionalVerdictSummaries,
} from '../domain/interpretation/traditional-verdicts.ts'
import {
  hashVerdictSelectionKey,
  selectStableVerdict,
} from '../domain/interpretation/traditional-verdicts.core.js'

const SYMBOLS = ['大安', '留连', '速喜', '赤口', '小吉', '空亡']
const VERDICT_CATEGORIES = ['general', 'finding_person', 'lost_item', 'travel']
const TEMPLATE_FIELDS = ['oracleText', 'explanation', 'actionHint']
const FORBIDDEN_COPY = /必中|必然|保证|改命|转运|化解/
const FORBIDDEN_VERDICT_COPY = /必中|必然|保证|治愈|康复|赌博|稳赚|改命|转运|化解/

test('each symbol provides three complete interpretation variants', () => {
  assert.deepEqual(Object.keys(symbolTemplates), SYMBOLS)

  for (const symbol of SYMBOLS) {
    const templates = symbolTemplates[symbol]
    assert.equal(templates.length, 3)

    for (const template of templates) {
      assert.deepEqual(Object.keys(template), TEMPLATE_FIELDS)
      for (const field of TEMPLATE_FIELDS) {
        assert.equal(typeof template[field], 'string')
        assert.ok(template[field].trim().length > 0)
      }
    }
  }
})

test('variant selection wraps by the actual template count', () => {
  const templates = symbolTemplates['大安']

  assert.equal(selectTemplateVariant(templates, 0), templates[0])
  assert.equal(selectTemplateVariant(templates, 1), templates[1])
  assert.equal(selectTemplateVariant(templates, 2), templates[2])
  assert.equal(selectTemplateVariant(templates, 3), templates[0])
  assert.equal(selectTemplateVariant(templates, 7), templates[1])
  assert.equal(selectTemplateVariant(templates, -1), templates[2])
  assert.equal(selectTemplateVariant(templates, Number.NaN), templates[0])
})

test('interpretation copy avoids prohibited promises and keeps the fixed disclaimer', () => {
  for (const templates of Object.values(symbolTemplates)) {
    for (const template of templates) {
      assert.doesNotMatch(Object.values(template).join(''), FORBIDDEN_COPY)
    }
  }

  assert.equal(disclaimer, '仅供传统文化体验与自我参考。')
})

test('result interpretation omits the reflection question entirely', async () => {
  const providerSource = await readFile(
    new URL('../domain/interpretation/template-provider.ts', import.meta.url),
    'utf8',
  )
  const resultMarkup = await readFile(
    new URL('../pages/result/index.wxml', import.meta.url),
    'utf8',
  )

  // 不与用户对话：解读结果与结果页均不包含反思问题
  assert.doesNotMatch(providerSource, /reflectionQuestion/)
  assert.doesNotMatch(resultMarkup, /reflectionQuestion/)
})

test('traditional verdict library provides 72 complete categorized entries', () => {
  assert.deepEqual(Object.keys(traditionalVerdictSummaries), VERDICT_CATEGORIES)
  assert.deepEqual(Object.keys(traditionalVerdictGuidance), VERDICT_CATEGORIES)

  let verdictCount = 0
  for (const category of VERDICT_CATEGORIES) {
    assert.deepEqual(Object.keys(traditionalVerdictSummaries[category]), SYMBOLS)
    assert.deepEqual(Object.keys(traditionalVerdictGuidance[category]), SYMBOLS)

    for (const symbol of SYMBOLS) {
      const verdicts = getTraditionalVerdicts(symbol, category)
      assert.equal(verdicts.length, 3)
      verdictCount += verdicts.length

      for (const verdict of verdicts) {
        assert.deepEqual(Object.keys(verdict), ['summary', 'trend', 'advice'])
        for (const value of Object.values(verdict)) {
          assert.equal(typeof value, 'string')
          assert.ok(value.trim().length > 0)
        }
        assert.doesNotMatch(Object.values(verdict).join(''), FORBIDDEN_VERDICT_COPY)
      }
    }
  }

  assert.equal(verdictCount, 72)
})

test('traditional verdict selection is stable per period and rotates safely', () => {
  const verdicts = getTraditionalVerdicts('大安', 'general')
  const selectionKey = '2026-07-27/7:daily_state:大安'
  const selected = selectStableVerdict(verdicts, selectionKey, 1)

  assert.equal(hashVerdictSelectionKey(selectionKey), hashVerdictSelectionKey(selectionKey))
  assert.equal(selectStableVerdict(verdicts, selectionKey, 1), selected)
  assert.equal(selectStableVerdict(verdicts, selectionKey, 4), selected)
  assert.equal(selectStableVerdict(verdicts, '', 0), verdicts[0])
  assert.equal(selectStableVerdict(verdicts, '', -1), verdicts[2])
  assert.throws(() => selectStableVerdict([], selectionKey), /must not be empty/)
})
