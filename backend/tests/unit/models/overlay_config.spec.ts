import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import { createTestUser } from '#tests/helpers/test_utils'
import { streamer as Streamer } from '#models/streamer'

test.group('OverlayConfig Model - Static Methods', () => {
  test('getDefaultConfig should return valid default structure', async ({ assert }) => {
    const { overlayConfig: OverlayConfig } = await import('#models/overlay_config')

    const config = OverlayConfig.getDefaultConfig()

    assert.equal(config.version, '1.0')
    assert.equal(config.canvas.width, 1920)
    assert.equal(config.canvas.height, 1080)
    assert.isArray(config.elements)
    assert.lengthOf(config.elements, 0)
  })

  test('getDefaultDiceProperties should return all dice configuration', async ({ assert }) => {
    const { overlayConfig: OverlayConfig } = await import('#models/overlay_config')

    const props = OverlayConfig.getDefaultDiceProperties()

    // Check main categories exist (new structure with diceBox and hud)
    assert.property(props, 'diceBox')
    assert.property(props, 'hud')
    assert.property(props, 'hudTransform')
    assert.property(props, 'colors')
    assert.property(props, 'audio')
    assert.property(props, 'animations')
    assert.property(props, 'mockData')

    // Check diceBox structure
    const diceBox = props.diceBox as Record<string, unknown>
    assert.property(diceBox, 'colors')
    assert.property(diceBox, 'texture')
    assert.property(diceBox, 'material')

    // Check diceBox colors
    const diceBoxColors = diceBox.colors as Record<string, string>
    assert.equal(diceBoxColors.foreground, '#9146FF') // Tumulte Purple
    assert.equal(diceBoxColors.background, '#ffffff') // White dice

    // Check hud structure
    const hud = props.hud as Record<string, unknown>
    assert.property(hud, 'container')
    assert.property(hud, 'criticalBadge')
    assert.property(hud, 'formula')
    assert.property(hud, 'result')
  })

  test('getDefaultGoalBarProperties should return all goal bar configuration', async ({
    assert,
  }) => {
    const { overlayConfig: OverlayConfig } = await import('#models/overlay_config')

    const props = OverlayConfig.getDefaultGoalBarProperties()

    // Check main categories exist
    assert.property(props, 'container')
    assert.property(props, 'progressBar')
    assert.property(props, 'shake')
    assert.property(props, 'animations')
    assert.property(props, 'audio')
    assert.property(props, 'typography')
    assert.property(props, 'width')
    assert.property(props, 'height')
    assert.property(props, 'mockData')

    // Check some specific values
    const container = props.container as Record<string, unknown>
    assert.equal(container.borderColor, '#9146FF')
    assert.equal(container.borderRadius, 16)

    const typography = props.typography as Record<string, unknown>
    assert.property(typography, 'title')
    assert.property(typography, 'progress')
    assert.property(typography, 'timer')
  })

  test('getDefaultImpactHudProperties should return all impact hud configuration', async ({
    assert,
  }) => {
    const { overlayConfig: OverlayConfig } = await import('#models/overlay_config')

    const props = OverlayConfig.getDefaultImpactHudProperties()

    // Check main categories exist
    assert.property(props, 'container')
    assert.property(props, 'animations')
    assert.property(props, 'audio')
    assert.property(props, 'typography')
    assert.property(props, 'width')
    assert.property(props, 'height')

    // Check some specific values
    const container = props.container as Record<string, unknown>
    assert.equal(container.borderColor, '#9146FF') // Tumulte Purple (harmonized)
    assert.equal(container.borderWidth, 3)

    const typography = props.typography as Record<string, unknown>
    assert.property(typography, 'title')
    assert.property(typography, 'detail')
  })

  test('getDefaultConfigWithPoll should include poll, dice, goal bar and impact hud elements', async ({
    assert,
  }) => {
    const { overlayConfig: OverlayConfig } = await import('#models/overlay_config')

    const config = OverlayConfig.getDefaultConfigWithPoll()

    assert.equal(config.version, '1.0')
    assert.lengthOf(config.elements, 4)

    // Check poll element
    const pollElement = config.elements.find((e) => e.type === 'poll')
    assert.exists(pollElement)
    assert.equal(pollElement!.id, 'default_poll')
    assert.equal(pollElement!.name, 'Sondage par défaut')
    assert.deepEqual(pollElement!.position, { x: 664, y: 0, z: 0 })
    assert.deepEqual(pollElement!.scale, { x: 0.5, y: 0.5, z: 1 })
    assert.isTrue(pollElement!.visible)
    assert.isFalse(pollElement!.locked)

    // Check dice element
    const diceElement = config.elements.find((e) => e.type === 'dice')
    assert.exists(diceElement)
    assert.equal(diceElement!.id, 'default_dice')
    assert.equal(diceElement!.name, 'Dés 3D par défaut')
    assert.deepEqual(diceElement!.position, { x: 0, y: 0, z: 0 })
    assert.deepEqual(diceElement!.scale, { x: 1, y: 1, z: 1 })

    // Check goal bar element
    const goalBarElement = config.elements.find((e) => e.type === 'diceReverseGoalBar')
    assert.exists(goalBarElement)
    assert.equal(goalBarElement!.id, 'default_goal_bar')
    assert.equal(goalBarElement!.name, 'Goal Bar par défaut')
    assert.deepEqual(goalBarElement!.position, { x: 0, y: 400, z: 0 })
    assert.equal(goalBarElement!.zIndex, 2)

    // Check impact hud element
    const impactHudElement = config.elements.find((e) => e.type === 'diceReverseImpactHud')
    assert.exists(impactHudElement)
    assert.equal(impactHudElement!.id, 'default_impact_hud')
    assert.equal(impactHudElement!.name, 'Impact HUD par défaut')
    assert.deepEqual(impactHudElement!.position, { x: 0, y: 0, z: 0 })
    assert.equal(impactHudElement!.zIndex, 3)
  })
})

test.group('OverlayConfig Model - JSON Serialization', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should serialize config to JSON when saving', async ({ assert }) => {
    const { overlayConfig: OverlayConfig } = await import('#models/overlay_config')
    const user = await createTestUser()

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
      accessToken: 'token_abc',
      refreshToken: 'refresh_abc',
      scopes: ['channel:manage:polls'],
    })

    const configData = OverlayConfig.getDefaultConfig()
    configData.elements.push({
      id: 'test-element',
      type: 'text',
      name: 'Test Text',
      position: { x: 100, y: 200, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      visible: true,
      locked: false,
      properties: { text: 'Hello World' },
    })

    const overlay = await OverlayConfig.create({
      streamerId: streamer.id,
      name: 'Test Overlay',
      config: configData,
      isActive: true,
    })

    assert.exists(overlay.id)
    assert.equal(overlay.name, 'Test Overlay')
    assert.isTrue(overlay.isActive)
  })

  test('should deserialize config from JSON when reading', async ({ assert }) => {
    const { overlayConfig: OverlayConfig } = await import('#models/overlay_config')
    const user = await createTestUser()

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '789012',
      twitchLogin: 'teststreamer2',
      twitchDisplayName: 'TestStreamer2',
      accessToken: 'token_def',
      refreshToken: 'refresh_def',
      scopes: ['channel:manage:polls'],
    })

    const configData = OverlayConfig.getDefaultConfigWithPoll()

    const overlay = await OverlayConfig.create({
      streamerId: streamer.id,
      name: 'Full Overlay',
      config: configData,
      isActive: false,
    })

    // Fetch fresh from database
    const fetched = await OverlayConfig.findOrFail(overlay.id)

    // Config should be an object, not a string
    assert.isObject(fetched.config)
    assert.equal(fetched.config.version, '1.0')
    assert.isArray(fetched.config.elements)
    assert.lengthOf(fetched.config.elements, 4)

    // Verify element types
    const types = fetched.config.elements.map((e) => e.type)
    assert.include(types, 'poll')
    assert.include(types, 'dice')
    assert.include(types, 'diceReverseGoalBar')
    assert.include(types, 'diceReverseImpactHud')
  })

  test('should handle complex nested properties in config', async ({ assert }) => {
    const { overlayConfig: OverlayConfig } = await import('#models/overlay_config')
    const user = await createTestUser()

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '345678',
      twitchLogin: 'teststreamer3',
      twitchDisplayName: 'TestStreamer3',
      accessToken: 'token_ghi',
      refreshToken: 'refresh_ghi',
      scopes: ['channel:manage:polls'],
    })

    const complexConfig = {
      version: '1.0',
      canvas: { width: 1920, height: 1080 },
      elements: [
        {
          id: 'complex-element',
          type: 'particle' as const,
          name: 'Particle System',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          visible: true,
          locked: false,
          properties: {
            nested: {
              deeply: {
                value: 'test',
                array: [1, 2, 3],
                object: { a: 'b' },
              },
            },
            unicode: 'émojis_🎲_中文',
            special: 'quotes\'and"chars',
          },
        },
      ],
    }

    const overlay = await OverlayConfig.create({
      streamerId: streamer.id,
      name: 'Complex Config',
      config: complexConfig,
      isActive: true,
    })

    const fetched = await OverlayConfig.findOrFail(overlay.id)

    // Verify complex nested properties survived serialization
    const props = fetched.config.elements[0].properties as Record<string, unknown>
    const nested = props.nested as Record<string, unknown>
    const deeply = nested.deeply as Record<string, unknown>

    assert.equal(deeply.value, 'test')
    assert.deepEqual(deeply.array, [1, 2, 3])
    assert.deepEqual(deeply.object, { a: 'b' })
    assert.equal(props.unicode, 'émojis_🎲_中文')
    assert.equal(props.special, 'quotes\'and"chars')
  })
})

test.group('OverlayConfig Model - Element Types', () => {
  test('should support all element types in default config', async ({ assert }) => {
    const { overlayConfig: OverlayConfig } = await import('#models/overlay_config')

    const configWithPoll = OverlayConfig.getDefaultConfigWithPoll()

    // Check that elements have valid types
    const validTypes = [
      'text',
      'image',
      'shape',
      'particle',
      'poll',
      'dice',
      'diceReverse',
      'diceReverseGoalBar',
      'diceReverseImpactHud',
    ]
    for (const element of configWithPoll.elements) {
      assert.include(validTypes, element.type)
    }
  })

  test('poll element should have required style properties', async ({ assert }) => {
    const { overlayConfig: OverlayConfig } = await import('#models/overlay_config')

    const config = OverlayConfig.getDefaultConfigWithPoll()
    const pollElement = config.elements.find((e) => e.type === 'poll')!

    const props = pollElement.properties as Record<string, unknown>

    // Check required poll properties
    assert.property(props, 'questionStyle')
    assert.property(props, 'optionBoxStyle')
    assert.property(props, 'optionTextStyle')
    assert.property(props, 'optionPercentageStyle')
    assert.property(props, 'progressBar')
    assert.property(props, 'animations')
    assert.property(props, 'layout')
    assert.property(props, 'mockData')
  })

  test('dice element should have required properties from getDefaultDiceProperties', async ({
    assert,
  }) => {
    const { overlayConfig: OverlayConfig } = await import('#models/overlay_config')

    const config = OverlayConfig.getDefaultConfigWithPoll()
    const diceElement = config.elements.find((e) => e.type === 'dice')!
    const defaultDiceProps = OverlayConfig.getDefaultDiceProperties()

    // Dice element properties should match default dice properties
    assert.deepEqual(diceElement.properties, defaultDiceProps)
  })

  test('goal bar element should have required properties from getDefaultGoalBarProperties', async ({
    assert,
  }) => {
    const { overlayConfig: OverlayConfig } = await import('#models/overlay_config')

    const config = OverlayConfig.getDefaultConfigWithPoll()
    const goalBarElement = config.elements.find((e) => e.type === 'diceReverseGoalBar')!
    const defaultGoalBarProps = OverlayConfig.getDefaultGoalBarProperties()

    // Goal bar element properties should match default goal bar properties
    assert.deepEqual(goalBarElement.properties, defaultGoalBarProps)
  })

  test('impact hud element should have required properties from getDefaultImpactHudProperties', async ({
    assert,
  }) => {
    const { overlayConfig: OverlayConfig } = await import('#models/overlay_config')

    const config = OverlayConfig.getDefaultConfigWithPoll()
    const impactHudElement = config.elements.find((e) => e.type === 'diceReverseImpactHud')!
    const defaultImpactHudProps = OverlayConfig.getDefaultImpactHudProperties()

    // Impact hud element properties should match default impact hud properties
    assert.deepEqual(impactHudElement.properties, defaultImpactHudProps)
  })
})

test.group('OverlayConfig Model - Relations', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should belong to a streamer', async ({ assert }) => {
    const { overlayConfig: OverlayConfig } = await import('#models/overlay_config')
    const user = await createTestUser()

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '999888',
      twitchLogin: 'relationtest',
      twitchDisplayName: 'RelationTest',
      accessToken: 'token_rel',
      refreshToken: 'refresh_rel',
      scopes: ['channel:manage:polls'],
    })

    const overlay = await OverlayConfig.create({
      streamerId: streamer.id,
      name: 'Relation Test',
      config: OverlayConfig.getDefaultConfig(),
      isActive: true,
    })

    // Load the relation
    await overlay.load('streamer')

    assert.exists(overlay.streamer)
    assert.equal(overlay.streamer.id, streamer.id)
    assert.equal(overlay.streamer.twitchLogin, 'relationtest')
  })
})
