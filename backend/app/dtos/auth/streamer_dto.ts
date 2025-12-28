import type { streamer as Streamer } from '#models/streamer'

export class StreamerDto {
  id!: string
  userId!: string
  twitchUserId!: string
  twitchDisplayName!: string
  twitchLogin!: string
  profileImageUrl!: string | null
  broadcasterType!: string
  isActive!: boolean
  scopes!: string[]
  createdAt!: string
  updatedAt!: string

  static fromModel(streamer: Streamer): StreamerDto {
    return {
      id: streamer.id,
      userId: streamer.userId || '',
      twitchUserId: streamer.twitchUserId,
      twitchDisplayName: streamer.twitchDisplayName,
      twitchLogin: streamer.twitchLogin,
      profileImageUrl: streamer.profileImageUrl,
      broadcasterType: streamer.broadcasterType,
      isActive: streamer.isActive,
      scopes: Array.isArray(streamer.scopes)
        ? streamer.scopes
        : JSON.parse(streamer.scopes || '[]'),
      createdAt: streamer.createdAt.toISO() || '',
      updatedAt: streamer.updatedAt.toISO() || '',
    }
  }

  static fromModelArray(streamers: Streamer[]): StreamerDto[] {
    return streamers.map((streamer) => StreamerDto.fromModel(streamer))
  }
}

export default StreamerDto
