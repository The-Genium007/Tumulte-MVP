import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Cette migration corrige les colonnes qui ont été renommées en camelCase par erreur
    // Elle les renomme en snake_case (convention AdonisJS)

    // Streamers table
    const hasStreamersCamelCase = await this.schema.hasColumn('streamers', 'twitchUserId')
    if (hasStreamersCamelCase) {
      this.schema.alterTable('streamers', (table) => {
        table.renameColumn('twitchUserId', 'twitch_user_id')
        table.renameColumn('twitchLogin', 'twitch_login')
        table.renameColumn('twitchDisplayName', 'twitch_display_name')
        table.renameColumn('accessTokenEncrypted', 'access_token_encrypted')
        table.renameColumn('refreshTokenEncrypted', 'refresh_token_encrypted')
        table.renameColumn('isActive', 'is_active')
        table.renameColumn('userId', 'user_id')
        table.renameColumn('createdAt', 'created_at')
        table.renameColumn('updatedAt', 'updated_at')
      })
    }

    // Users table
    const hasUsersCamelCase = await this.schema.hasColumn('users', 'fullName')
    if (hasUsersCamelCase) {
      this.schema.alterTable('users', (table) => {
        table.renameColumn('fullName', 'full_name')
        table.renameColumn('createdAt', 'created_at')
        table.renameColumn('updatedAt', 'updated_at')
      })
    }

    // Campaigns table
    const hasCampaignsCamelCase = await this.schema.hasColumn('campaigns', 'ownerId')
    if (hasCampaignsCamelCase) {
      this.schema.alterTable('campaigns', (table) => {
        table.renameColumn('ownerId', 'owner_id')
        table.renameColumn('createdAt', 'created_at')
        table.renameColumn('updatedAt', 'updated_at')
      })
    }

    // Campaign_memberships table
    const hasMembershipsCamelCase = await this.schema.hasColumn(
      'campaign_memberships',
      'campaignId'
    )
    if (hasMembershipsCamelCase) {
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
    }

    // Poll_templates table
    const hasTemplatesCamelCase = await this.schema.hasColumn('poll_templates', 'ownerId')
    if (hasTemplatesCamelCase) {
      this.schema.alterTable('poll_templates', (table) => {
        table.renameColumn('ownerId', 'owner_id')
        table.renameColumn('sessionId', 'session_id')
        table.renameColumn('durationSeconds', 'duration_seconds')
        table.renameColumn('orderIndex', 'order_index')
        table.renameColumn('isDefault', 'is_default')
        table.renameColumn('createdAt', 'created_at')
        table.renameColumn('updatedAt', 'updated_at')
      })
    }

    // Poll_instances table
    const hasInstancesCamelCase = await this.schema.hasColumn('poll_instances', 'templateId')
    if (hasInstancesCamelCase) {
      this.schema.alterTable('poll_instances', (table) => {
        table.renameColumn('templateId', 'template_id')
        table.renameColumn('campaignId', 'campaign_id')
        table.renameColumn('durationSeconds', 'duration_seconds')
        table.renameColumn('startedAt', 'started_at')
        table.renameColumn('endedAt', 'ended_at')
        table.renameColumn('createdBy', 'created_by')
        table.renameColumn('finalTotalVotes', 'final_total_votes')
        table.renameColumn('finalVotesByOption', 'final_votes_by_option')
        table.renameColumn('channelPointsEnabled', 'channel_points_enabled')
        table.renameColumn('channelPointsAmount', 'channel_points_amount')
        table.renameColumn('createdAt', 'created_at')
        table.renameColumn('updatedAt', 'updated_at')
      })
    }

    // Poll_channel_links table
    const hasChannelLinksCamelCase = await this.schema.hasColumn(
      'poll_channel_links',
      'pollInstanceId'
    )
    if (hasChannelLinksCamelCase) {
      this.schema.alterTable('poll_channel_links', (table) => {
        table.renameColumn('pollInstanceId', 'poll_instance_id')
        table.renameColumn('streamerId', 'streamer_id')
        table.renameColumn('twitchPollId', 'twitch_poll_id')
        table.renameColumn('votesByOption', 'votes_by_option')
        table.renameColumn('totalVotes', 'total_votes')
        table.renameColumn('createdAt', 'created_at')
        table.renameColumn('updatedAt', 'updated_at')
      })
    }

    // Poll_results table
    const hasResultsCamelCase = await this.schema.hasColumn('poll_results', 'pollInstanceId')
    if (hasResultsCamelCase) {
      this.schema.alterTable('poll_results', (table) => {
        table.renameColumn('pollInstanceId', 'poll_instance_id')
        table.renameColumn('campaignId', 'campaign_id')
        table.renameColumn('totalVotes', 'total_votes')
        table.renameColumn('votesByOption', 'votes_by_option')
        table.renameColumn('createdAt', 'created_at')
        table.renameColumn('updatedAt', 'updated_at')
      })
    }

    // Poll_sessions table
    const hasSessionsCamelCase = await this.schema.hasColumn('poll_sessions', 'ownerId')
    if (hasSessionsCamelCase) {
      this.schema.alterTable('poll_sessions', (table) => {
        table.renameColumn('ownerId', 'owner_id')
        table.renameColumn('campaignId', 'campaign_id')
        table.renameColumn('defaultDurationSeconds', 'default_duration_seconds')
        table.renameColumn('createdAt', 'created_at')
        table.renameColumn('updatedAt', 'updated_at')
      })
    }
  }

  async down() {
    // Revenir en arrière (camelCase) si nécessaire
    this.schema.alterTable('streamers', (table) => {
      table.renameColumn('twitch_user_id', 'twitchUserId')
      table.renameColumn('twitch_login', 'twitchLogin')
      table.renameColumn('twitch_display_name', 'twitchDisplayName')
      table.renameColumn('access_token_encrypted', 'accessTokenEncrypted')
      table.renameColumn('refresh_token_encrypted', 'refreshTokenEncrypted')
      table.renameColumn('is_active', 'isActive')
      table.renameColumn('user_id', 'userId')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    this.schema.alterTable('users', (table) => {
      table.renameColumn('full_name', 'fullName')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    this.schema.alterTable('campaigns', (table) => {
      table.renameColumn('owner_id', 'ownerId')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

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

    this.schema.alterTable('poll_templates', (table) => {
      table.renameColumn('owner_id', 'ownerId')
      table.renameColumn('session_id', 'sessionId')
      table.renameColumn('duration_seconds', 'durationSeconds')
      table.renameColumn('order_index', 'orderIndex')
      table.renameColumn('is_default', 'isDefault')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    this.schema.alterTable('poll_instances', (table) => {
      table.renameColumn('template_id', 'templateId')
      table.renameColumn('campaign_id', 'campaignId')
      table.renameColumn('duration_seconds', 'durationSeconds')
      table.renameColumn('started_at', 'startedAt')
      table.renameColumn('ended_at', 'endedAt')
      table.renameColumn('created_by', 'createdBy')
      table.renameColumn('final_total_votes', 'finalTotalVotes')
      table.renameColumn('final_votes_by_option', 'finalVotesByOption')
      table.renameColumn('channel_points_enabled', 'channelPointsEnabled')
      table.renameColumn('channel_points_amount', 'channelPointsAmount')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    this.schema.alterTable('poll_channel_links', (table) => {
      table.renameColumn('poll_instance_id', 'pollInstanceId')
      table.renameColumn('streamer_id', 'streamerId')
      table.renameColumn('twitch_poll_id', 'twitchPollId')
      table.renameColumn('votes_by_option', 'votesByOption')
      table.renameColumn('total_votes', 'totalVotes')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    this.schema.alterTable('poll_results', (table) => {
      table.renameColumn('poll_instance_id', 'pollInstanceId')
      table.renameColumn('campaign_id', 'campaignId')
      table.renameColumn('total_votes', 'totalVotes')
      table.renameColumn('votes_by_option', 'votesByOption')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })

    this.schema.alterTable('poll_sessions', (table) => {
      table.renameColumn('owner_id', 'ownerId')
      table.renameColumn('campaign_id', 'campaignId')
      table.renameColumn('default_duration_seconds', 'defaultDurationSeconds')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
    })
  }
}
