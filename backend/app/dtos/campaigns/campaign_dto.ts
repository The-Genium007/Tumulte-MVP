import type { campaign as Campaign } from '#models/campaign'
import { StreamerDto } from '#dtos/auth/streamer_dto'

export class CampaignDto {
  id!: string
  ownerId!: string
  name!: string
  description!: string | null
  memberCount!: number
  activeMemberCount!: number
  createdAt!: string
  updatedAt!: string

  static fromModel(campaign: Campaign): CampaignDto {
    return {
      id: campaign.id,
      ownerId: campaign.ownerId,
      name: campaign.name,
      description: campaign.description,
      memberCount: campaign.memberships?.length || 0,
      activeMemberCount: campaign.memberships?.filter((m) => m.status === 'ACTIVE').length || 0,
      createdAt: campaign.createdAt.toISO() || '',
      updatedAt: campaign.updatedAt.toISO() || '',
    }
  }

  static fromModelArray(campaigns: Campaign[]): CampaignDto[] {
    return campaigns.map((campaign) => CampaignDto.fromModel(campaign))
  }
}

export class CampaignDetailDto extends CampaignDto {
  members!: CampaignMemberDto[]

  static override fromModel(campaign: Campaign): CampaignDetailDto {
    const base = CampaignDto.fromModel(campaign)

    return {
      ...base,
      members: campaign.memberships
        ? campaign.memberships.map((membership) =>
            CampaignMemberDto.fromModel(membership, campaign.ownerId)
          )
        : [],
    }
  }
}

export class CampaignMemberDto {
  id!: string
  status!: 'PENDING' | 'ACTIVE'
  isOwner!: boolean
  streamer!: StreamerDto
  invitedAt!: string
  acceptedAt!: string | null
  pollAuthorizationGrantedAt!: string | null
  pollAuthorizationExpiresAt!: string | null
  isPollAuthorized!: boolean
  authorizationRemainingSeconds!: number | null

  static fromModel(membership: any, ownerId: string): CampaignMemberDto {
    return {
      id: membership.id,
      status: membership.status,
      isOwner: membership.streamerId === ownerId,
      streamer: StreamerDto.fromModel(membership.streamer),
      invitedAt: membership.invitedAt?.toISO() || membership.createdAt?.toISO() || '',
      acceptedAt: membership.acceptedAt?.toISO() || null,
      pollAuthorizationGrantedAt: membership.pollAuthorizationGrantedAt?.toISO() || null,
      pollAuthorizationExpiresAt: membership.pollAuthorizationExpiresAt?.toISO() || null,
      isPollAuthorized: membership.isPollAuthorizationActive || false,
      authorizationRemainingSeconds: membership.authorizationRemainingSeconds || null,
    }
  }
}

export class CampaignInvitationDto {
  id!: string
  campaign!: CampaignDto
  status!: 'PENDING' | 'ACTIVE'
  invitedAt!: string

  static fromModel(membership: any): CampaignInvitationDto {
    return {
      id: membership.id,
      campaign: CampaignDto.fromModel(membership.campaign),
      status: membership.status,
      invitedAt: membership.invitedAt?.toISO() || membership.createdAt?.toISO() || '',
    }
  }

  static fromModelArray(memberships: any[]): CampaignInvitationDto[] {
    return memberships.map((membership) => CampaignInvitationDto.fromModel(membership))
  }
}

export default CampaignDto
