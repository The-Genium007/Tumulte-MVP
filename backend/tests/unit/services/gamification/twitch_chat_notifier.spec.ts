import { test } from '@japa/runner'
import { buildNotificationMessage } from '#services/gamification/twitch_chat_notifier'
import type { ResultData } from '#models/gamification_instance'

// ========================================
// TESTS — buildNotificationMessage
// ========================================

test.group('twitch_chat_notifier - buildNotificationMessage', () => {
  test('should return null for unknown action type', async ({ assert }) => {
    const result = buildNotificationMessage({
      actionType: 'unknown_action',
      resultData: { success: true },
    })
    assert.isNull(result)
  })

  test('should return null for action types without templates', async ({ assert }) => {
    for (const actionType of ['chat_message', 'stat_modify', 'custom']) {
      const result = buildNotificationMessage({
        actionType,
        resultData: { success: true },
      })
      assert.isNull(result, `Expected null for ${actionType}`)
    }
  })

  // ========================================
  // dice_invert
  // ========================================

  test('should build dice_invert message with original and inverted values', async ({ assert }) => {
    const resultData: ResultData = {
      success: true,
      actionResult: { originalResult: 20, invertedResult: 1 },
    }

    const message = buildNotificationMessage({ actionType: 'dice_invert', resultData })

    assert.isNotNull(message)
    assert.include(message!, '20')
    assert.include(message!, '1')
    assert.include(message!, 'inversé')
  })

  test('should return null for dice_invert when result data is missing values', async ({
    assert,
  }) => {
    const resultData: ResultData = {
      success: true,
      actionResult: {},
    }

    const message = buildNotificationMessage({ actionType: 'dice_invert', resultData })
    assert.isNull(message)
  })

  test('should return null for dice_invert when resultData is null', async ({ assert }) => {
    const message = buildNotificationMessage({ actionType: 'dice_invert', resultData: null })
    assert.isNull(message)
  })

  // ========================================
  // spell_buff
  // ========================================

  test('should build spell_buff message with spell name', async ({ assert }) => {
    const resultData: ResultData = {
      success: true,
      actionResult: { spellName: 'Boule de feu' },
    }

    const message = buildNotificationMessage({ actionType: 'spell_buff', resultData })

    assert.isNotNull(message)
    assert.include(message!, 'Boule de feu')
    assert.include(message!, 'bénit')
  })

  test('should use fallback for spell_buff when spell name is missing', async ({ assert }) => {
    const resultData: ResultData = {
      success: true,
      actionResult: {},
    }

    const message = buildNotificationMessage({ actionType: 'spell_buff', resultData })

    assert.isNotNull(message)
    assert.include(message!, 'un sort')
  })

  // ========================================
  // spell_debuff
  // ========================================

  test('should build spell_debuff message with spell name', async ({ assert }) => {
    const resultData: ResultData = {
      success: true,
      actionResult: { spellName: 'Bouclier' },
    }

    const message = buildNotificationMessage({ actionType: 'spell_debuff', resultData })

    assert.isNotNull(message)
    assert.include(message!, 'Bouclier')
    assert.include(message!, 'maudit')
  })

  // ========================================
  // spell_disable
  // ========================================

  test('should build spell_disable message with spell name and duration', async ({ assert }) => {
    const resultData: ResultData = {
      success: true,
      actionResult: { spellName: 'Éclair', effectDuration: 600 },
    }

    const message = buildNotificationMessage({ actionType: 'spell_disable', resultData })

    assert.isNotNull(message)
    assert.include(message!, 'Éclair')
    assert.include(message!, '10 min')
    assert.include(message!, 'scellé')
  })

  test('should show ? when spell_disable duration is missing', async ({ assert }) => {
    const resultData: ResultData = {
      success: true,
      actionResult: { spellName: 'Rayon de givre' },
    }

    const message = buildNotificationMessage({ actionType: 'spell_disable', resultData })

    assert.isNotNull(message)
    assert.include(message!, '? min')
  })
})
