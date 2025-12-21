import type User from '#models/user'

export class UserDto {
  id!: string
  displayName!: string
  email!: string | null
  role!: 'MJ' | 'STREAMER'
  createdAt!: string
  updatedAt!: string

  static fromModel(user: User): UserDto {
    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISO() || '',
      updatedAt: user.updatedAt.toISO() || '',
    }
  }

  static fromModelArray(users: User[]): UserDto[] {
    return users.map((user) => UserDto.fromModel(user))
  }
}

export default UserDto
