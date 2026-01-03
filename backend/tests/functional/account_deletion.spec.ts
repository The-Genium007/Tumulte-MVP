import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import {
  createTestUser,
  createTestStreamer,
  createTestCampaign,
  createTestMembership,
  createTestPollInstance,
} from '#tests/helpers/test_utils'
import { user as User } from '#models/user'
import { streamer as Streamer } from '#models/streamer'
import { campaign as Campaign } from '#models/campaign'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import { pollTemplate as PollTemplate } from '#models/poll_template'
import { pollInstance as PollInstance } from '#models/poll_instance'
import { pollSession as PollSession } from '#models/poll_session'
import db from '@adonisjs/lucid/services/db'

test.group('Account Deletion (GDPR Anonymization)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should anonymize user displayName and email', async ({ assert }) => {
    const user = await createTestUser({
      role: 'STREAMER',
      displayName: 'TestUser123',
      email: 'test@example.com',
    })
    const shortId = user.id.substring(0, 8)

    // Simulate anonymization
    user.displayName = `Utilisateur supprimé ${shortId}`
    user.email = null
    await user.save()

    const updatedUser = await User.find(user.id)
    assert.equal(updatedUser!.displayName, `Utilisateur supprimé ${shortId}`)
    assert.isNull(updatedUser!.email)
  })

  test('should anonymize streamer twitchUserId to allow re-registration', async ({ assert }) => {
    const user = await createTestUser({ role: 'STREAMER' })
    const streamer = await createTestStreamer({
      userId: user.id,
      twitchUserId: '12345678',
      twitchLogin: 'originaluser',
      twitchDisplayName: 'OriginalUser',
    })

    const originalTwitchId = streamer.twitchUserId
    const shortId = user.id.substring(0, 8)
    const anonymizedTwitchId = `deleted_${shortId}_${Date.now()}`

    // Simulate anonymization
    streamer.twitchUserId = anonymizedTwitchId
    streamer.twitchLogin = `deleted_${shortId}`
    streamer.twitchDisplayName = `Streamer supprimé ${shortId}`
    streamer.profileImageUrl = null
    streamer.accessTokenEncrypted = null
    streamer.refreshTokenEncrypted = null
    streamer.scopes = []
    streamer.isActive = false
    await streamer.save()

    // Verify anonymization
    const updatedStreamer = await Streamer.find(streamer.id)
    assert.notEqual(updatedStreamer!.twitchUserId, originalTwitchId)
    assert.isTrue(updatedStreamer!.twitchUserId.startsWith('deleted_'))
    assert.equal(updatedStreamer!.twitchLogin, `deleted_${shortId}`)
    assert.isFalse(updatedStreamer!.isActive)
    assert.isNull(updatedStreamer!.accessTokenEncrypted)
    assert.isNull(updatedStreamer!.refreshTokenEncrypted)

    // Verify that a new streamer with original twitchUserId can be created
    const newStreamer = await createTestStreamer({
      twitchUserId: originalTwitchId,
      twitchLogin: 'newuser',
    })
    assert.equal(newStreamer.twitchUserId, originalTwitchId)
  })

  test('should anonymize campaigns owned by user', async ({ assert }) => {
    const user = await createTestUser({ role: 'MJ' })
    await createTestCampaign({
      ownerId: user.id,
      name: 'Ma Campagne RPG',
      description: 'Description détaillée',
    })
    await createTestCampaign({
      ownerId: user.id,
      name: 'Autre Campagne',
      description: 'Autre description',
    })

    const shortId = user.id.substring(0, 8)

    // Simulate anonymization
    await Campaign.query()
      .where('ownerId', user.id)
      .update({
        name: `Campagne supprimée ${shortId}`,
        description: null,
      })

    const updatedCampaigns = await Campaign.query().where('ownerId', user.id)
    assert.lengthOf(updatedCampaigns, 2)
    for (const campaign of updatedCampaigns) {
      assert.equal(campaign.name, `Campagne supprimée ${shortId}`)
      assert.isNull(campaign.description)
    }
  })

  test('should delete campaign memberships for streamer', async ({ assert }) => {
    const user = await createTestUser({ role: 'STREAMER' })
    const streamer = await createTestStreamer({ userId: user.id })

    // Create memberships
    const campaign1 = await createTestCampaign()
    const campaign2 = await createTestCampaign()
    await createTestMembership({ campaignId: campaign1.id, streamerId: streamer.id })
    await createTestMembership({ campaignId: campaign2.id, streamerId: streamer.id })

    // Verify memberships exist
    let memberships = await CampaignMembership.query().where('streamerId', streamer.id)
    assert.lengthOf(memberships, 2)

    // Simulate deletion
    await CampaignMembership.query().where('streamerId', streamer.id).delete()

    // Verify memberships deleted
    memberships = await CampaignMembership.query().where('streamerId', streamer.id)
    assert.lengthOf(memberships, 0)
  })

  test('should anonymize poll templates owned by user', async ({ assert }) => {
    const user = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })

    await PollTemplate.create({
      ownerId: user.id,
      campaignId: campaign.id,
      label: 'Mon Template',
      title: 'Question importante ?',
      options: JSON.stringify(['Oui', 'Non', 'Peut-être']) as unknown as string[],
      durationSeconds: 60,
      isDefault: false,
    })

    const shortId = user.id.substring(0, 8)

    // Simulate anonymization
    await PollTemplate.query()
      .where('ownerId', user.id)
      .update({
        label: `Template supprimé ${shortId}`,
        title: 'Sondage supprimé',
        options: JSON.stringify(['Option 1', 'Option 2']),
      })

    const updatedTemplates = await PollTemplate.query().where('ownerId', user.id)
    assert.lengthOf(updatedTemplates, 1)
    assert.equal(updatedTemplates[0].label, `Template supprimé ${shortId}`)
    assert.equal(updatedTemplates[0].title, 'Sondage supprimé')
  })

  test('should anonymize poll instances created by user', async ({ assert }) => {
    const user = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })

    await createTestPollInstance({
      campaignId: campaign.id,
      createdBy: user.id,
      title: 'Sondage secret',
    })

    // Simulate anonymization
    await PollInstance.query().where('createdBy', user.id).update({
      title: 'Sondage supprimé',
    })

    const updatedInstances = await PollInstance.query().where('createdBy', user.id)
    assert.lengthOf(updatedInstances, 1)
    assert.equal(updatedInstances[0].title, 'Sondage supprimé')
  })

  test('should anonymize poll sessions owned by user', async ({ assert }) => {
    const user = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })

    await PollSession.create({
      ownerId: user.id,
      campaignId: campaign.id,
      name: 'Session du 15 janvier',
      defaultDurationSeconds: 60,
    })

    const shortId = user.id.substring(0, 8)

    // Simulate anonymization
    await PollSession.query()
      .where('ownerId', user.id)
      .update({
        name: `Session supprimée ${shortId}`,
      })

    const updatedSessions = await PollSession.query().where('ownerId', user.id)
    assert.lengthOf(updatedSessions, 1)
    assert.equal(updatedSessions[0].name, `Session supprimée ${shortId}`)
  })

  test('full account deletion should anonymize all related data in transaction', async ({
    assert,
  }) => {
    // Setup: Create a complete user with all related data
    const user = await createTestUser({
      role: 'MJ',
      displayName: 'CompleteMJ',
      email: 'complete@test.com',
    })
    const streamer = await createTestStreamer({
      userId: user.id,
      twitchUserId: '99999999',
    })
    const campaign = await createTestCampaign({
      ownerId: user.id,
      name: 'Campagne Complète',
      description: 'Description',
    })

    // Create another streamer as member
    const otherStreamer = await createTestStreamer()
    await createTestMembership({
      campaignId: campaign.id,
      streamerId: otherStreamer.id,
      status: 'ACTIVE',
    })

    // Create membership for the user's streamer in another campaign
    const otherCampaign = await createTestCampaign()
    await createTestMembership({
      campaignId: otherCampaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
    })

    await PollTemplate.create({
      ownerId: user.id,
      campaignId: campaign.id,
      label: 'Template Test',
      title: 'Question ?',
      options: JSON.stringify(['A', 'B']) as unknown as string[],
      durationSeconds: 30,
      isDefault: false,
    })

    await PollSession.create({
      ownerId: user.id,
      campaignId: campaign.id,
      name: 'Session Test',
      defaultDurationSeconds: 60,
    })

    await createTestPollInstance({
      campaignId: campaign.id,
      createdBy: user.id,
      title: 'Instance Test',
    })

    const shortId = user.id.substring(0, 8)
    const anonymizedTwitchId = `deleted_${shortId}_${Date.now()}`

    // Execute full anonymization in transaction
    await db.transaction(async (trx) => {
      // Delete user's memberships
      await CampaignMembership.query({ client: trx }).where('streamerId', streamer.id).delete()

      // Anonymize streamer
      streamer.useTransaction(trx)
      streamer.twitchUserId = anonymizedTwitchId
      streamer.twitchLogin = `deleted_${shortId}`
      streamer.twitchDisplayName = `Streamer supprimé ${shortId}`
      streamer.profileImageUrl = null
      streamer.accessTokenEncrypted = null
      streamer.refreshTokenEncrypted = null
      streamer.scopes = []
      streamer.isActive = false
      await streamer.save()

      // Anonymize campaigns
      await Campaign.query({ client: trx })
        .where('ownerId', user.id)
        .update({
          name: `Campagne supprimée ${shortId}`,
          description: null,
        })

      // Anonymize templates
      await PollTemplate.query({ client: trx })
        .where('ownerId', user.id)
        .update({
          label: `Template supprimé ${shortId}`,
          title: 'Sondage supprimé',
          options: JSON.stringify(['Option 1', 'Option 2']),
        })

      // Anonymize instances
      await PollInstance.query({ client: trx }).where('createdBy', user.id).update({
        title: 'Sondage supprimé',
      })

      // Anonymize sessions
      await PollSession.query({ client: trx })
        .where('ownerId', user.id)
        .update({
          name: `Session supprimée ${shortId}`,
        })

      // Anonymize user
      user.useTransaction(trx)
      user.displayName = `Utilisateur supprimé ${shortId}`
      user.email = null
      await user.save()
    })

    // Verify all data is anonymized
    const updatedUser = await User.find(user.id)
    assert.equal(updatedUser!.displayName, `Utilisateur supprimé ${shortId}`)
    assert.isNull(updatedUser!.email)

    const updatedStreamer = await Streamer.find(streamer.id)
    assert.isTrue(updatedStreamer!.twitchUserId.startsWith('deleted_'))
    assert.isFalse(updatedStreamer!.isActive)

    const updatedCampaigns = await Campaign.query().where('ownerId', user.id)
    assert.equal(updatedCampaigns[0].name, `Campagne supprimée ${shortId}`)

    const userMemberships = await CampaignMembership.query().where('streamerId', streamer.id)
    assert.lengthOf(userMemberships, 0)

    // Other streamer's membership should still exist
    const otherMemberships = await CampaignMembership.query().where('streamerId', otherStreamer.id)
    assert.lengthOf(otherMemberships, 1)

    const templates = await PollTemplate.query().where('ownerId', user.id)
    assert.equal(templates[0].title, 'Sondage supprimé')

    const sessions = await PollSession.query().where('ownerId', user.id)
    assert.equal(sessions[0].name, `Session supprimée ${shortId}`)

    const instances = await PollInstance.query().where('createdBy', user.id)
    assert.equal(instances[0].title, 'Sondage supprimé')
  })
})
