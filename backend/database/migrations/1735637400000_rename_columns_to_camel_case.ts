import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Table: users
    this.schema.alterTable('users', (table) => {
      table.renameColumn('display_name', 'displayName')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    // Table: streamers
    this.schema.alterTable('streamers', (table) => {
      table.renameColumn('user_id', 'userId')
      table.renameColumn('twitch_user_id', 'twitchUserId')
      table.renameColumn('twitch_login', 'twitchLogin')
      table.renameColumn('twitch_display_name', 'twitchDisplayName')
      table.renameColumn('access_token_encrypted', 'accessTokenEncrypted')
      table.renameColumn('refresh_token_encrypted', 'refreshTokenEncrypted')
      table.renameColumn('is_active', 'isActive')
      table.renameColumn('profile_image_url', 'profileImageUrl')
      table.renameColumn('broadcaster_type', 'broadcasterType')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    // Table: campaigns
    this.schema.alterTable('campaigns', (table) => {
      table.renameColumn('owner_id', 'ownerId')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    // Table: campaign_memberships
    this.schema.alterTable('campaign_memberships', (table) => {
      table.renameColumn('campaign_id', 'campaignId')
      table.renameColumn('streamer_id', 'streamerId')
      table.renameColumn('invited_at', 'invitedAt')
      table.renameColumn('accepted_at', 'acceptedAt')
      table.renameColumn('poll_authorization_granted_at', 'pollAuthorizationGrantedAt')
      table.renameColumn('poll_authorization_expires_at', 'pollAuthorizationExpiresAt')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    // Table: poll_templates
    this.schema.alterTable('poll_templates', (table) => {
      table.renameColumn('owner_id', 'ownerId')
      table.renameColumn('duration_seconds', 'durationSeconds')
      table.renameColumn('is_default', 'isDefault')
      table.renameColumn('campaign_id', 'campaignId')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    // Table: poll_sessions
    this.schema.alterTable('poll_sessions', (table) => {
      table.renameColumn('owner_id', 'ownerId')
      table.renameColumn('campaign_id', 'campaignId')
      table.renameColumn('default_duration_seconds', 'defaultDurationSeconds')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    // Table: poll_instances
    this.schema.alterTable('poll_instances', (table) => {
      table.renameColumn('template_id', 'templateId')
      table.renameColumn('duration_seconds', 'durationSeconds')
      table.renameColumn('started_at', 'startedAt')
      table.renameColumn('ended_at', 'endedAt')
      table.renameColumn('created_by', 'createdBy')
      table.renameColumn('campaign_id', 'campaignId')
      table.renameColumn('channel_points_enabled', 'channelPointsEnabled')
      table.renameColumn('channel_points_amount', 'channelPointsAmount')
      table.renameColumn('final_total_votes', 'finalTotalVotes')
      table.renameColumn('final_votes_by_option', 'finalVotesByOption')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    // Table: polls
    this.schema.alterTable('polls', (table) => {
      table.renameColumn('session_id', 'sessionId')
      table.renameColumn('order_index', 'orderIndex')
      table.renameColumn('channel_points_enabled', 'channelPointsEnabled')
      table.renameColumn('channel_points_amount', 'channelPointsAmount')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    // Table: poll_channel_links
    this.schema.alterTable('poll_channel_links', (table) => {
      table.renameColumn('poll_instance_id', 'pollInstanceId')
      table.renameColumn('streamer_id', 'streamerId')
      table.renameColumn('twitch_poll_id', 'twitchPollId')
      table.renameColumn('total_votes', 'totalVotes')
      table.renameColumn('votes_by_option', 'votesByOption')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    // Table: poll_results
    this.schema.alterTable('poll_results', (table) => {
      table.renameColumn('poll_id', 'pollId')
      table.renameColumn('campaign_id', 'campaignId')
      table.renameColumn('twitch_polls', 'twitchPolls')
      table.renameColumn('total_votes', 'totalVotes')
      table.renameColumn('votes_by_option', 'votesByOption')
      table.renameColumn('started_at', 'startedAt')
      table.renameColumn('ended_at', 'endedAt')
      table.renameColumn('cancelled_by', 'cancelledBy')
      table.renameColumn('cancelled_at', 'cancelledAt')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    // Table: remember_me_tokens
    this.schema.alterTable('remember_me_tokens', (table) => {
      table.renameColumn('tokenable_id', 'tokenableId')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
      table.renameColumn('expires_at', 'expiresAt')
    })
  }

  async down() {
    // Table: users
    this.schema.alterTable('users', (table) => {
      table.renameColumn('displayName', 'display_name')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
    })

    // Table: streamers
    this.schema.alterTable('streamers', (table) => {
      table.renameColumn('userId', 'user_id')
      table.renameColumn('twitchUserId', 'twitch_user_id')
      table.renameColumn('twitchLogin', 'twitch_login')
      table.renameColumn('twitchDisplayName', 'twitch_display_name')
      table.renameColumn('accessTokenEncrypted', 'access_token_encrypted')
      table.renameColumn('refreshTokenEncrypted', 'refresh_token_encrypted')
      table.renameColumn('isActive', 'is_active')
      table.renameColumn('profileImageUrl', 'profile_image_url')
      table.renameColumn('broadcasterType', 'broadcaster_type')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
    })

    // Table: campaigns
    this.schema.alterTable('campaigns', (table) => {
      table.renameColumn('ownerId', 'owner_id')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
    })

    // Table: campaign_memberships
    this.schema.alterTable('campaign_memberships', (table) => {
      table.renameColumn('campaignId', 'campaign_id')
      table.renameColumn('streamerId', 'streamer_id')
      table.renameColumn('invitedAt', 'invited_at')
      table.renameColumn('acceptedAt', 'accepted_at')
      table.renameColumn('pollAuthorizationGrantedAt', 'poll_authorization_granted_at')
      table.renameColumn('pollAuthorizationExpiresAt', 'poll_authorization_expires_at')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
    })

    // Table: poll_templates
    this.schema.alterTable('poll_templates', (table) => {
      table.renameColumn('ownerId', 'owner_id')
      table.renameColumn('durationSeconds', 'duration_seconds')
      table.renameColumn('isDefault', 'is_default')
      table.renameColumn('campaignId', 'campaign_id')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
    })

    // Table: poll_sessions
    this.schema.alterTable('poll_sessions', (table) => {
      table.renameColumn('ownerId', 'owner_id')
      table.renameColumn('campaignId', 'campaign_id')
      table.renameColumn('defaultDurationSeconds', 'default_duration_seconds')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
    })

    // Table: poll_instances
    this.schema.alterTable('poll_instances', (table) => {
      table.renameColumn('templateId', 'template_id')
      table.renameColumn('durationSeconds', 'duration_seconds')
      table.renameColumn('startedAt', 'started_at')
      table.renameColumn('endedAt', 'ended_at')
      table.renameColumn('createdBy', 'created_by')
      table.renameColumn('campaignId', 'campaign_id')
      table.renameColumn('channelPointsEnabled', 'channel_points_enabled')
      table.renameColumn('channelPointsAmount', 'channel_points_amount')
      table.renameColumn('finalTotalVotes', 'final_total_votes')
      table.renameColumn('finalVotesByOption', 'final_votes_by_option')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
    })

    // Table: polls
    this.schema.alterTable('polls', (table) => {
      table.renameColumn('sessionId', 'session_id')
      table.renameColumn('orderIndex', 'order_index')
      table.renameColumn('channelPointsEnabled', 'channel_points_enabled')
      table.renameColumn('channelPointsAmount', 'channel_points_amount')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
    })

    // Table: poll_channel_links
    this.schema.alterTable('poll_channel_links', (table) => {
      table.renameColumn('pollInstanceId', 'poll_instance_id')
      table.renameColumn('streamerId', 'streamer_id')
      table.renameColumn('twitchPollId', 'twitch_poll_id')
      table.renameColumn('totalVotes', 'total_votes')
      table.renameColumn('votesByOption', 'votes_by_option')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
    })

    // Table: poll_results
    this.schema.alterTable('poll_results', (table) => {
      table.renameColumn('pollId', 'poll_id')
      table.renameColumn('campaignId', 'campaign_id')
      table.renameColumn('twitchPolls', 'twitch_polls')
      table.renameColumn('totalVotes', 'total_votes')
      table.renameColumn('votesByOption', 'votes_by_option')
      table.renameColumn('startedAt', 'started_at')
      table.renameColumn('endedAt', 'ended_at')
      table.renameColumn('cancelledBy', 'cancelled_by')
      table.renameColumn('cancelledAt', 'cancelled_at')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
    })

    // Table: remember_me_tokens
    this.schema.alterTable('remember_me_tokens', (table) => {
      table.renameColumn('tokenableId', 'tokenable_id')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
      table.renameColumn('expiresAt', 'expires_at')
    })
  }
}
