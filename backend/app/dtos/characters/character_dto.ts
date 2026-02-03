import type Character from '#models/character'

export class CharacterDto {
  id!: string
  name!: string
  avatarUrl!: string | null
  characterType!: 'pc' | 'npc' | 'monster'
  vttCharacterId!: string

  static fromModel(character: Character): CharacterDto {
    return {
      id: character.id,
      name: character.name,
      avatarUrl: character.avatarUrl,
      characterType: character.characterType,
      vttCharacterId: character.vttCharacterId,
    }
  }

  static fromModelArray(characters: Character[]): CharacterDto[] {
    return characters.map((character) => CharacterDto.fromModel(character))
  }
}

export default CharacterDto
