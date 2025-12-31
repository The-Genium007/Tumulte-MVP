import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Renommer les colonnes de la table users
    this.schema.alterTable('users', (table) => {
      table.renameColumn('display_name', 'displayName')
    })

    // Renommer les colonnes de la table streamers
    this.schema.alterTable('streamers', (table) => {
      table.renameColumn('user_id', 'userId')
      table.renameColumn('twitch_user_id', 'twitchUserId')
      table.renameColumn('twitch_login', 'twitchLogin')
      table.renameColumn('twitch_display_name', 'twitchDisplayName')
      table.renameColumn('profile_image_url', 'profileImageUrl')
      table.renameColumn('broadcaster_type', 'broadcasterType')
      table.renameColumn('access_token_encrypted', 'accessTokenEncrypted')
      table.renameColumn('refresh_token_encrypted', 'refreshTokenEncrypted')
      table.renameColumn('is_active', 'isActive')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    // Renommer les colonnes de la table campaigns
    this.schema.alterTable('campaigns', (table) => {
      table.renameColumn('owner_id', 'ownerId')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    // Renommer les colonnes de la table campaign_memberships
    this.schema.alterTable('campaign_memberships', (table) => {
      table.renameColumn('campaign_id', 'campaignId')
      table.renameColumn('streamer_id', 'streamerId')
      table.renameColumn('invited_at', 'invitedAt')
      table.renameColumn('accepted_at', 'acceptedAt')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    // Renommer les colonnes de la table poll_templates
    this.schema.alterTable('poll_templates', (table) => {
      table.renameColumn('campaign_id', 'campaignId')
      table.renameColumn('is_default', 'isDefault')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    // Renommer les colonnes de la table poll_sessions
    this.schema.alterTable('poll_sessions', (table) => {
      table.renameColumn('campaign_id', 'campaignId')
      table.renameColumn('started_at', 'startedAt')
      table.renameColumn('ended_at', 'endedAt')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    // Renommer les colonnes de la table poll_instances
    this.schema.alterTable('poll_instances', (table) => {
      table.renameColumn('campaign_id', 'campaignId')
      table.renameColumn('session_id', 'sessionId')
      table.renameColumn('template_id', 'templateId')
      table.renameColumn('voting_options', 'votingOptions')
      table.renameColumn('aggregated_results', 'aggregatedResults')
      table.renameColumn('started_at', 'startedAt')
      table.renameColumn('ended_at', 'endedAt')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    // Renommer les colonnes de la table polls
    this.schema.alterTable('polls', (table) => {
      table.renameColumn('instance_id', 'instanceId')
      table.renameColumn('streamer_id', 'streamerId')
      table.renameColumn('twitch_poll_id', 'twitchPollId')
      table.renameColumn('channel_points_voting_enabled', 'channelPointsVotingEnabled')
      table.renameColumn('channel_points_per_vote', 'channelPointsPerVote')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    // Renommer les colonnes de la table poll_channel_links
    this.schema.alterTable('poll_channel_links', (table) => {
      table.renameColumn('instance_id', 'instanceId')
      table.renameColumn('streamer_id', 'streamerId')
      table.renameColumn('twitch_poll_id', 'twitchPollId')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    // Renommer les colonnes de la table poll_results
    this.schema.alterTable('poll_results', (table) => {
      table.renameColumn('poll_id', 'pollId')
      table.renameColumn('twitch_poll_id', 'twitchPollId')
      table.renameColumn('started_at', 'startedAt')
      table.renameColumn('ended_at', 'endedAt')
      table.renameColumn('cancelled_by', 'cancelledBy')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    // Renommer les colonnes de la table remember_me_tokens
    this.schema.alterTable('remember_me_tokens', (table) => {
      table.renameColumn('tokenable_id', 'tokenableId')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
      table.renameColumn('expires_at', 'expiresAt')
    })
  }

  async down() {
    // Rollback: renommer les colonnes en snake_case
    this.schema.alterTable('users', (table) => {
      table.renameColumn('displayName', 'display_name')
    })

    this.schema.alterTable('streamers', (table) => {
      table.renameColumn('userId', 'user_id')
      table.renameColumn('twitchUserId', 'twitch_user_id')
      table.renameColumn('twitchLogin', 'twitch_login')
      table.renameColumn('twitchDisplayName', 'twitch_display_name')
      table.renameColumn('profileImageUrl', 'profile_image_url')
      table.renameColumn('broadcasterType', 'broadcaster_type')
      table.renameColumn('accessTokenEncrypted', 'access_token_encrypted')
      table.renameColumn('refreshTokenEncrypted', 'refresh_token_encrypted')
      table.renameColumn('isActive', 'is_active')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
    })

    this.schema.alterTable('campaigns', (table) => {
      table.renameColumn('ownerId', 'owner_id')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
    })

    this.schema.alterTable('campaign_memberships', (table) => {
      table.renameColumn('campaignId', 'campaign_id')
      table.renameColumn('streamerId', 'streamer_id')
      table.renameColumn('invitedAt', 'invited_at')
      table.renameColumn('acceptedAt', 'accepted_at')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
    })

    this.schema.alterTable('poll_templates', (table) => {
      table.renameColumn('campaignId', 'campaign_id')
      table.renameColumn('isDefault', 'is_default')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
    })

    this.schema.alterTable('poll_sessions', (table) => {
      table.renameColumn('campaignId', 'campaign_id')
      table.renameColumn('startedAt', 'started_at')
      table.renameColumn('endedAt', 'ended_at')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
    })

    this.schema.alterTable('poll_instances', (table) => {
      table.renameColumn('campaignId', 'campaign_id')
      table.renameColumn('sessionId', 'session_id')
      table.renameColumn('templateId', 'template_id')
      table.renameColumn('votingOptions', 'voting_options')
      table.renameColumn('aggregatedResults', 'aggregated_results')
      table.renameColumn('startedAt', 'started_at')
      table.renameColumn('endedAt', 'ended_at')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
    })

    this.schema.alterTable('polls', (table) => {
      table.renameColumn('instanceId', 'instance_id')
      table.renameColumn('streamerId', 'streamer_id')
      table.renameColumn('twitchPollId', 'twitch_poll_id')
      table.renameColumn('channelPointsVotingEnabled', 'channel_points_voting_enabled')
      table.renameColumn('channelPointsPerVote', 'channel_points_per_vote')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
    })

    this.schema.alterTable('poll_channel_links', (table) => {
      table.renameColumn('instanceId', 'instance_id')
      table.renameColumn('streamerId', 'streamer_id')
      table.renameColumn('twitchPollId', 'twitch_poll_id')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
    })

    this.schema.alterTable('poll_results', (table) => {
      table.renameColumn('pollId', 'poll_id')
      table.renameColumn('twitchPollId', 'twitch_poll_id')
      table.renameColumn('startedAt', 'started_at')
      table.renameColumn('endedAt', 'ended_at')
      table.renameColumn('cancelledBy', 'cancelled_by')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
    })

    this.schema.alterTable('remember_me_tokens', (table) => {
      table.renameColumn('tokenableId', 'tokenable_id')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
      table.renameColumn('expiresAt', 'expires_at')
    })
  }
}
