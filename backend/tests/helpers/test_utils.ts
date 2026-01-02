import { faker } from '@faker-js/faker'
import { user as User } from '#models/user'
import { campaign as Campaign } from '#models/campaign'
import { streamer as Streamer } from '#models/streamer'
import { pollTemplate as PollTemplate } from '#models/poll_template'
import { pollInstance as PollInstance } from '#models/poll_instance'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'

/**
 * Factory: Create a test user with optional overrides
 * Note: User model only has id, role, displayName, email
 * Twitch info is in the Streamer model
 */
export async function createTestUser(overrides: Partial<any> = {}): Promise<User> {
  const userData = {
    role: overrides.role || 'MJ',
    displayName: overrides.displayName || faker.internet.username(),
    email: overrides.email || null,
    ...overrides,
  }

  return await User.create(userData)
}

/**
 * Factory: Create an authenticated user with access token
 * Generates a real access token using User.accessTokens
 */
export async function createAuthenticatedUser(
  overrides: Partial<any> = {}
): Promise<{ user: User; token: string }> {
  const user = await createTestUser(overrides)

  // Generate a real access token for API authentication
  const accessToken = await User.accessTokens.create(user, ['*'], {
    name: 'test-token',
    expiresIn: '1 day',
  })

  return { user, token: accessToken.value!.release() }
}

/**
 * Factory: Create a test streamer with encrypted tokens
 */
export async function createTestStreamer(overrides: Partial<any> = {}): Promise<Streamer> {
  // Create associated user first if not provided
  let userId = overrides.userId
  if (!userId) {
    const user = await createTestUser({ role: 'STREAMER' })
    userId = user.id
  }

  const streamerData = {
    userId,
    twitchUserId: overrides.twitchUserId || faker.string.numeric(8),
    twitchLogin: overrides.twitchLogin || faker.internet.username().toLowerCase(),
    twitchDisplayName: overrides.twitchDisplayName || faker.internet.username(),
    profileImageUrl: overrides.profileImageUrl || faker.image.avatar(),
    broadcasterType: overrides.broadcasterType || 'affiliate',
    accessToken: overrides.accessToken || faker.string.alphanumeric(30),
    refreshToken: overrides.refreshToken || faker.string.alphanumeric(50),
    scopes: overrides.scopes || ['channel:manage:polls', 'channel:read:polls'],
  }

  return await Streamer.createWithEncryptedTokens(streamerData)
}

/**
 * Factory: Create a test campaign
 */
export async function createTestCampaign(overrides: Partial<any> = {}): Promise<Campaign> {
  // Create owner if not provided
  let ownerId = overrides.ownerId
  if (!ownerId) {
    const owner = await createTestUser({ role: 'MJ' })
    ownerId = owner.id
  }

  const campaignData = {
    ownerId,
    name: overrides.name || faker.commerce.productName(),
    description: overrides.description || faker.lorem.sentence(),
    ...overrides,
  }

  return await Campaign.create(campaignData)
}

/**
 * Factory: Create a campaign membership
 */
export async function createTestMembership(
  overrides: Partial<any> = {}
): Promise<CampaignMembership> {
  // Create campaign if not provided
  let campaignId = overrides.campaignId
  if (!campaignId) {
    const campaign = await createTestCampaign()
    campaignId = campaign.id
  }

  // Create streamer if not provided
  let streamerId = overrides.streamerId
  if (!streamerId) {
    const streamer = await createTestStreamer()
    streamerId = streamer.id
  }

  const membershipData = {
    campaignId,
    streamerId,
    status: overrides.status || 'PENDING',
    invitedAt: overrides.invitedAt || DateTime.now(),
    acceptedAt: overrides.acceptedAt || null,
    isPollAuthorized: overrides.isPollAuthorized || false,
    pollAuthorizationGrantedAt: overrides.pollAuthorizationGrantedAt || null,
    pollAuthorizationExpiresAt: overrides.pollAuthorizationExpiresAt || null,
    ...overrides,
  }

  return await CampaignMembership.create(membershipData)
}

/**
 * Factory: Create a poll template
 */
export async function createTestPollTemplate(overrides: Partial<any> = {}): Promise<PollTemplate> {
  // Create campaign if not provided
  let campaignId = overrides.campaignId
  if (!campaignId) {
    const campaign = await createTestCampaign()
    campaignId = campaign.id
  }

  const templateData = {
    campaignId,
    question:
      overrides.question ||
      faker.helpers.arrayElement([
        'Quel personnage jouer ?',
        'Quelle arme choisir ?',
        'Quel chemin prendre ?',
      ]),
    options: overrides.options || ['Option A', 'Option B', 'Option C'],
    defaultDurationSeconds: overrides.defaultDurationSeconds || 60,
    channelPointsVotingEnabled: overrides.channelPointsVotingEnabled || false,
    channelPointsPerVote: overrides.channelPointsPerVote || 0,
    ...overrides,
  }

  return await PollTemplate.create(templateData)
}

/**
 * Factory: Create a poll instance
 */
export async function createTestPollInstance(overrides: Partial<any> = {}): Promise<PollInstance> {
  // Create campaign if not provided
  let campaignId = overrides.campaignId
  if (!campaignId) {
    const campaign = await createTestCampaign()
    campaignId = campaign.id
  }

  const instanceData = {
    campaignId,
    question:
      overrides.question ||
      faker.helpers.arrayElement(['Vote pour la prochaine action ?', 'Choisis la destination ?']),
    options: overrides.options || ['Oui', 'Non'],
    durationSeconds: overrides.durationSeconds || 60,
    status: overrides.status || 'PENDING',
    channelPointsVotingEnabled: overrides.channelPointsVotingEnabled || false,
    channelPointsPerVote: overrides.channelPointsPerVote || 0,
    startedAt: overrides.startedAt || null,
    endedAt: overrides.endedAt || null,
    ...overrides,
  }

  return await PollInstance.create(instanceData)
}

/**
 * Helper: Grant poll authorization to a campaign member
 */
export async function grantPollAuthorization(
  membership: CampaignMembership,
  durationHours: number = 12
): Promise<CampaignMembership> {
  membership.isPollAuthorized = true
  membership.pollAuthorizationGrantedAt = DateTime.now()
  membership.pollAuthorizationExpiresAt = DateTime.now().plus({ hours: durationHours })
  await membership.save()
  return membership
}

/**
 * Helper: Create a complete campaign setup with members
 */
export async function createCampaignWithMembers(memberCount: number = 2): Promise<{
  campaign: Campaign
  owner: User
  members: CampaignMembership[]
  streamers: Streamer[]
}> {
  const owner = await createTestUser({ role: 'MJ' })
  const campaign = await createTestCampaign({ ownerId: owner.id })

  const streamers: Streamer[] = []
  const members: CampaignMembership[] = []

  for (let i = 0; i < memberCount; i++) {
    const streamer = await createTestStreamer()
    const membership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })

    streamers.push(streamer)
    members.push(membership)
  }

  return { campaign, owner, members, streamers }
}
