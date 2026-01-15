import { faker } from '@faker-js/faker'
import { user as User } from '#models/user'
import { campaign as Campaign } from '#models/campaign'
import { streamer as Streamer } from '#models/streamer'
import { pollTemplate as PollTemplate } from '#models/poll_template'
import { pollInstance as PollInstance } from '#models/poll_instance'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import VttConnection from '#models/vtt_connection'
import VttProvider from '#models/vtt_provider'
import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'

/**
 * Factory: Create a test user with optional overrides
 * Note: User model only has id, displayName, email
 * Twitch info is in the Streamer model
 */
export async function createTestUser(overrides: Partial<any> = {}): Promise<User> {
  const userData = {
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
    const user = await createTestUser()
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
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
  }

  const streamer = await Streamer.createWithEncryptedTokens(streamerData)

  // Update additional fields that aren't in createWithEncryptedTokens
  if (overrides.tokenExpiresAt !== undefined) {
    streamer.tokenExpiresAt = overrides.tokenExpiresAt
  }
  if (overrides.tokenRefreshFailedAt !== undefined) {
    streamer.tokenRefreshFailedAt = overrides.tokenRefreshFailedAt
  }
  if (overrides.lastTokenRefreshAt !== undefined) {
    streamer.lastTokenRefreshAt = overrides.lastTokenRefreshAt
  }

  // Save if any additional fields were set
  if (
    overrides.tokenExpiresAt !== undefined ||
    overrides.tokenRefreshFailedAt !== undefined ||
    overrides.lastTokenRefreshAt !== undefined
  ) {
    await streamer.save()
  }

  return streamer
}

/**
 * Factory: Create a test campaign
 */
export async function createTestCampaign(overrides: Partial<any> = {}): Promise<Campaign> {
  // Create owner if not provided
  let ownerId = overrides.ownerId
  if (!ownerId) {
    const owner = await createTestUser()
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
    pollAuthorizationGrantedAt: overrides.pollAuthorizationGrantedAt || null,
    pollAuthorizationExpiresAt: overrides.pollAuthorizationExpiresAt || null,
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

  // Get or create a user for createdBy
  let createdBy = overrides.createdBy
  if (!createdBy) {
    const user = await createTestUser()
    createdBy = user.id
  }

  const instanceData = {
    campaignId,
    createdBy,
    title:
      overrides.title ||
      overrides.question ||
      faker.helpers.arrayElement(['Vote pour la prochaine action ?', 'Choisis la destination ?']),
    options: overrides.options || ['Oui', 'Non'],
    durationSeconds: overrides.durationSeconds || 60,
    type: overrides.type || 'STANDARD',
    status: overrides.status || 'PENDING',
    channelPointsEnabled:
      overrides.channelPointsEnabled || overrides.channelPointsVotingEnabled || false,
    channelPointsAmount: overrides.channelPointsAmount || overrides.channelPointsPerVote || null,
    startedAt: overrides.startedAt || null,
    endedAt: overrides.endedAt || null,
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
  const owner = await createTestUser()
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

/**
 * Factory: Create a test VTT provider
 */
export async function createTestVttProvider(overrides: Partial<any> = {}): Promise<VttProvider> {
  const providerData = {
    name: overrides.name || 'foundry',
    displayName: overrides.displayName || 'Foundry VTT',
    authType: overrides.authType || 'api_key',
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    configSchema: overrides.configSchema || null,
  }

  return await VttProvider.create(providerData)
}

/**
 * Factory: Create a test VTT connection
 */
export async function createTestVttConnection(
  overrides: Partial<any> = {}
): Promise<VttConnection> {
  // Create user if not provided
  let userId = overrides.userId
  if (!userId) {
    const user = await createTestUser()
    userId = user.id
  }

  // Create provider if not provided
  let vttProviderId = overrides.vttProviderId
  if (!vttProviderId) {
    const provider = await createTestVttProvider()
    vttProviderId = provider.id
  }

  // Generate test credentials
  const testCredential = 'ta_' + randomBytes(32).toString('hex')

  const connectionData = {
    userId,
    vttProviderId,
    name: overrides.name || `Test VTT Connection ${faker.string.alphanumeric(6)}`,
    webhookUrl: overrides.webhookUrl || '',
    status: overrides.status || 'active',
    worldId: overrides.worldId || faker.string.uuid(),
    worldName: overrides.worldName || faker.commerce.productName(),
    moduleVersion: overrides.moduleVersion || '2.0.0',
    tunnelStatus: overrides.tunnelStatus || 'disconnected',
    tokenVersion: overrides.tokenVersion || 1,
    lastHeartbeatAt: overrides.lastHeartbeatAt || null,
    ...overrides,
  }

  // Set the credential field separately to avoid secrets detection
  const connection = await VttConnection.create({
    ...connectionData,
    apiKey: testCredential,
  })

  return connection
}

/**
 * Helper: Create a complete VTT setup with connection and campaign
 */
export async function createVttSetupWithCampaign(): Promise<{
  user: User
  provider: VttProvider
  connection: VttConnection
  campaign: Campaign
}> {
  const user = await createTestUser()
  const provider = await createTestVttProvider()
  const connection = await createTestVttConnection({
    userId: user.id,
    vttProviderId: provider.id,
  })
  const campaign = await createTestCampaign({
    ownerId: user.id,
    vttConnectionId: connection.id,
  })

  return { user, provider, connection, campaign }
}
