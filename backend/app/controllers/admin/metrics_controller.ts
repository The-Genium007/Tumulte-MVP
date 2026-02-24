import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

/**
 * Controller for admin dashboard metrics
 *
 * Provides aggregated statistics about platform usage:
 * - User counts by tier
 * - Campaign statistics
 * - Poll activity
 * - Growth trends
 */
export default class MetricsController {
  /**
   * Get overview metrics for the admin dashboard
   */
  async overview({ response }: HttpContext) {
    const [users, campaigns, polls, pollInstances, streamers] = await Promise.all([
      this.getUserMetrics(),
      this.getCampaignMetrics(),
      this.getPollMetrics(),
      this.getPollInstanceMetrics(),
      this.getStreamerMetrics(),
    ])

    return response.ok({
      users,
      campaigns,
      polls,
      pollInstances,
      streamers,
      generatedAt: DateTime.now().toISO(),
    })
  }

  /**
   * Get user-related metrics
   */
  private async getUserMetrics() {
    const totalUsers = await db.from('users').count('* as count').first()

    const usersByTier = await db.from('users').select('tier').count('* as count').groupBy('tier')

    const verifiedUsers = await db
      .from('users')
      .whereNotNull('email_verified_at')
      .count('* as count')
      .first()

    const usersWithPassword = await db
      .from('users')
      .whereNotNull('password')
      .count('* as count')
      .first()

    // New users in last 7 days
    const newUsersLast7Days = await db
      .from('users')
      .where('created_at', '>=', DateTime.now().minus({ days: 7 }).toSQL())
      .count('* as count')
      .first()

    // New users in last 30 days
    const newUsersLast30Days = await db
      .from('users')
      .where('created_at', '>=', DateTime.now().minus({ days: 30 }).toSQL())
      .count('* as count')
      .first()

    return {
      total: Number(totalUsers?.count ?? 0),
      byTier: usersByTier.reduce(
        (acc, row) => {
          acc[row.tier] = Number(row.count)
          return acc
        },
        {} as Record<string, number>
      ),
      verified: Number(verifiedUsers?.count ?? 0),
      withPassword: Number(usersWithPassword?.count ?? 0),
      newLast7Days: Number(newUsersLast7Days?.count ?? 0),
      newLast30Days: Number(newUsersLast30Days?.count ?? 0),
    }
  }

  /**
   * Get campaign-related metrics
   */
  private async getCampaignMetrics() {
    const totalCampaigns = await db.from('campaigns').count('* as count').first()

    const activeCampaigns = await db
      .from('campaigns')
      .where('is_active', true)
      .count('* as count')
      .first()

    // Campaigns with VTT integration
    const campaignsWithVtt = await db
      .from('campaigns')
      .whereNotNull('vtt_connection_id')
      .count('* as count')
      .first()

    // Average members per campaign
    const avgMembers = await db
      .from('campaign_memberships')
      .select(db.raw('AVG(member_count) as avg'))
      .from(
        db
          .from('campaign_memberships')
          .select('campaign_id')
          .count('* as member_count')
          .groupBy('campaign_id')
          .as('subquery')
      )
      .first()

    return {
      total: Number(totalCampaigns?.count ?? 0),
      active: Number(activeCampaigns?.count ?? 0),
      withVtt: Number(campaignsWithVtt?.count ?? 0),
      avgMembersPerCampaign: Number(avgMembers?.avg ?? 0).toFixed(1),
    }
  }

  /**
   * Get poll template metrics
   */
  private async getPollMetrics() {
    const totalPolls = await db.from('polls').count('* as count').first()

    return {
      total: Number(totalPolls?.count ?? 0),
    }
  }

  /**
   * Get poll instance (launched polls) metrics
   */
  private async getPollInstanceMetrics() {
    const totalInstances = await db.from('poll_instances').count('* as count').first()

    const instancesByStatus = await db
      .from('poll_instances')
      .select('status')
      .count('* as count')
      .groupBy('status')

    // Poll instances in last 7 days
    const instancesLast7Days = await db
      .from('poll_instances')
      .where('created_at', '>=', DateTime.now().minus({ days: 7 }).toSQL())
      .count('* as count')
      .first()

    // Poll instances in last 30 days
    const instancesLast30Days = await db
      .from('poll_instances')
      .where('created_at', '>=', DateTime.now().minus({ days: 30 }).toSQL())
      .count('* as count')
      .first()

    return {
      total: Number(totalInstances?.count ?? 0),
      byStatus: instancesByStatus.reduce(
        (acc, row) => {
          acc[row.status] = Number(row.count)
          return acc
        },
        {} as Record<string, number>
      ),
      last7Days: Number(instancesLast7Days?.count ?? 0),
      last30Days: Number(instancesLast30Days?.count ?? 0),
    }
  }

  /**
   * Get streamer-related metrics
   */
  private async getStreamerMetrics() {
    const totalStreamers = await db.from('streamers').count('* as count').first()

    const activeStreamers = await db
      .from('streamers')
      .where('is_active', true)
      .count('* as count')
      .first()

    // Streamers by broadcaster type
    const byBroadcasterType = await db
      .from('streamers')
      .select('broadcaster_type')
      .count('* as count')
      .groupBy('broadcaster_type')

    return {
      total: Number(totalStreamers?.count ?? 0),
      active: Number(activeStreamers?.count ?? 0),
      byBroadcasterType: byBroadcasterType.reduce(
        (acc, row) => {
          const type = row.broadcaster_type || 'none'
          acc[type] = Number(row.count)
          return acc
        },
        {} as Record<string, number>
      ),
    }
  }

  /**
   * Get daily growth data for charts
   */
  async growth({ request, response }: HttpContext) {
    const days = Math.min(Math.max(Number(request.input('days', 30)), 1), 365)
    const startDate = DateTime.now().minus({ days })

    // Users per day
    const userGrowth = await db
      .from('users')
      .select(db.raw('DATE(created_at) as date'))
      .count('* as count')
      .where('created_at', '>=', startDate.toSQL())
      .groupByRaw('DATE(created_at)')
      .orderBy('date', 'asc')

    // Poll instances per day
    const pollGrowth = await db
      .from('poll_instances')
      .select(db.raw('DATE(created_at) as date'))
      .count('* as count')
      .where('created_at', '>=', startDate.toSQL())
      .groupByRaw('DATE(created_at)')
      .orderBy('date', 'asc')

    return response.ok({
      users: userGrowth.map((row) => ({
        date: row.date,
        count: Number(row.count),
      })),
      pollInstances: pollGrowth.map((row) => ({
        date: row.date,
        count: Number(row.count),
      })),
    })
  }

  /**
   * Get subscription metrics (for future Lemon Squeezy integration)
   */
  async subscriptions({ response }: HttpContext) {
    const totalSubscriptions = await db.from('subscriptions').count('* as count').first()

    const subscriptionsByStatus = await db
      .from('subscriptions')
      .select('status')
      .count('* as count')
      .groupBy('status')

    const subscriptionsByTier = await db
      .from('subscriptions')
      .select('tier')
      .count('* as count')
      .groupBy('tier')

    const manualSubscriptions = await db
      .from('subscriptions')
      .where('is_manual', true)
      .count('* as count')
      .first()

    return response.ok({
      total: Number(totalSubscriptions?.count ?? 0),
      byStatus: subscriptionsByStatus.reduce(
        (acc, row) => {
          acc[row.status] = Number(row.count)
          return acc
        },
        {} as Record<string, number>
      ),
      byTier: subscriptionsByTier.reduce(
        (acc, row) => {
          acc[row.tier] = Number(row.count)
          return acc
        },
        {} as Record<string, number>
      ),
      manual: Number(manualSubscriptions?.count ?? 0),
    })
  }
}
