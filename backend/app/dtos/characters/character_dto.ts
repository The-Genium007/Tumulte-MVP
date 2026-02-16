import type Character from '#models/character'
import type { SpellInfo, FeatureInfo } from '#models/character'

export class CharacterDto {
  id!: string
  name!: string
  avatarUrl!: string | null
  characterType!: 'pc' | 'npc' | 'monster'
  vttCharacterId!: string
  spells!: SpellInfo[] | null
  features!: FeatureInfo[] | null

  static fromModel(character: Character): CharacterDto {
    return {
      id: character.id,
      name: character.name,
      avatarUrl: character.avatarUrl,
      characterType: character.characterType,
      vttCharacterId: character.vttCharacterId,
      spells: character.spells ?? null,
      features: character.features ?? null,
    }
  }

  static fromModelArray(characters: Character[]): CharacterDto[] {
    return characters.map((character) => CharacterDto.fromModel(character))
  }
}

export default CharacterDto
