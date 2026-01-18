import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { campaign as Campaign } from '#models/campaign'
import VttConnection from '#models/vtt_connection'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import { poll as Poll } from '#models/poll'
import { pollResult as PollResult } from '#models/poll_result'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    // Ne s'exécute qu'en développement
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    // Récupérer la connexion VTT mockée (créée lors du pairing test)
    const vttConnection = await VttConnection.query()
      .where('world_id', 'mock-world-dev-123')
      .preload('user', (userQuery) => {
        userQuery.preload('streamer')
      })
      .first()

    if (!vttConnection) {
      console.log('⚠️  No VTT connection found, skipping campaign seeding')
      console.log('   Run the pairing flow first with the mock JWT URL')
      return
    }

    const gmUser = vttConnection.user
    if (!gmUser.streamer) {
      console.log('⚠️  GM user has no streamer profile, skipping campaign seeding')
      return
    }

    // Campagne 1 : Campagne active avec sondages
    const campaign1 = await Campaign.updateOrCreate(
      { name: 'Les Mines de Phandelver' },
      {
        ownerId: gmUser.id,
        name: 'Les Mines de Phandelver',
        description:
          'Une aventure classique de D&D 5e où les héros doivent sauver la ville de Phandalin des brigands et découvrir le secret de la mine perdue.',
        vttConnectionId: vttConnection.id,
        vttCampaignId: 'foundry-phandelver-001',
        vttCampaignName: 'Les Mines de Phandelver',
        lastVttSyncAt: DateTime.now(),
      }
    )

    // Membership pour le GM
    await CampaignMembership.updateOrCreate(
      {
        campaignId: campaign1.id,
        streamerId: gmUser.streamer.id,
      },
      {
        campaignId: campaign1.id,
        streamerId: gmUser.streamer.id,
        status: 'ACTIVE',
        invitedAt: DateTime.now(),
        acceptedAt: DateTime.now(),
        pollAuthorizationGrantedAt: DateTime.now(),
        pollAuthorizationExpiresAt: DateTime.now().plus({ years: 1 }),
      }
    )

    // Poll 1.1 : Que faire du gobelin ?
    const pollGoblin = await Poll.updateOrCreate(
      { campaignId: campaign1.id, question: 'Que faire du gobelin capturé ?' },
      {
        campaignId: campaign1.id,
        question: 'Que faire du gobelin capturé ?',
        type: 'STANDARD',
        options: [
          "L'interroger pour obtenir des informations",
          'Le libérer en échange de sa coopération',
          "L'éliminer pour éviter qu'il alerte ses alliés",
          "L'attacher et le ramener en ville",
        ],
        durationSeconds: 60,
        orderIndex: 1,
        channelPointsEnabled: false,
      }
    )

    // Result du poll 1.1 (lancé et terminé)
    await PollResult.updateOrCreate(
      { pollId: pollGoblin.id, status: 'COMPLETED' },
      {
        pollId: pollGoblin.id,
        campaignId: campaign1.id,
        status: 'COMPLETED',
        startedAt: DateTime.now().minus({ hours: 1, minutes: 30 }),
        endedAt: DateTime.now().minus({ hours: 1, minutes: 29 }),
        totalVotes: 127,
        votesByOption: {
          '0': 65, // Option 1: Interroger
          '1': 32, // Option 2: Libérer
          '2': 18, // Option 3: Éliminer
          '3': 12, // Option 4: Attacher
        },
        twitchPolls: {},
      }
    )

    // Poll 1.2 : Direction à prendre
    const pollDirection = await Poll.updateOrCreate(
      { campaignId: campaign1.id, question: 'Quelle direction explorer ensuite ?' },
      {
        campaignId: campaign1.id,
        question: 'Quelle direction explorer ensuite ?',
        type: 'STANDARD',
        options: [
          'Le tunnel nord (bruits étranges)',
          'Le tunnel est (lumière au loin)',
          'Le tunnel ouest (odeur de soufre)',
          'Retourner en arrière',
        ],
        durationSeconds: 45,
        orderIndex: 2,
        channelPointsEnabled: false,
      }
    )

    await PollResult.updateOrCreate(
      { pollId: pollDirection.id, status: 'COMPLETED' },
      {
        pollId: pollDirection.id,
        campaignId: campaign1.id,
        status: 'COMPLETED',
        startedAt: DateTime.now().minus({ hours: 1 }),
        endedAt: DateTime.now().minus({ hours: 1 }).plus({ seconds: 45 }),
        totalVotes: 143,
        votesByOption: {
          '0': 78, // Tunnel nord
          '1': 41, // Tunnel est
          '2': 19, // Tunnel ouest
          '3': 5, // Retourner
        },
        twitchPolls: {},
      }
    )

    // Poll 2.1 : Comment affronter le dragon ? (campagne 1, poll historique)
    const pollDragon = await Poll.updateOrCreate(
      { campaignId: campaign1.id, question: 'Comment affronter le dragon ?' },
      {
        campaignId: campaign1.id,
        question: 'Comment affronter le dragon ?',
        type: 'STANDARD',
        options: ['Attaque frontale', 'Négociation', 'Piège et embuscade', 'Fuite stratégique'],
        durationSeconds: 60,
        orderIndex: 3,
        channelPointsEnabled: false,
      }
    )

    await PollResult.updateOrCreate(
      { pollId: pollDragon.id, status: 'COMPLETED' },
      {
        pollId: pollDragon.id,
        campaignId: campaign1.id,
        status: 'COMPLETED',
        startedAt: DateTime.now().minus({ days: 7, hours: -2 }),
        endedAt: DateTime.now().minus({ days: 7, hours: -2, minutes: -1 }),
        totalVotes: 156,
        votesByOption: {
          '0': 34, // Attaque frontale
          '1': 23, // Négociation
          '2': 89, // Piège et embuscade
          '3': 10, // Fuite stratégique
        },
        twitchPolls: {},
      }
    )

    // Campagne 2 : Curse of Strahd
    const campaign2 = await Campaign.updateOrCreate(
      { name: 'Curse of Strahd' },
      {
        ownerId: gmUser.id,
        name: 'Curse of Strahd',
        description:
          "Une campagne d'horreur gothique dans le royaume vampirique de Barovie, où les héros doivent affronter le comte Strahd von Zarovich.",
        vttConnectionId: vttConnection.id,
        vttCampaignId: 'foundry-strahd-002',
        vttCampaignName: 'Curse of Strahd',
        lastVttSyncAt: DateTime.now(),
      }
    )

    await CampaignMembership.updateOrCreate(
      {
        campaignId: campaign2.id,
        streamerId: gmUser.streamer.id,
      },
      {
        campaignId: campaign2.id,
        streamerId: gmUser.streamer.id,
        status: 'ACTIVE',
        invitedAt: DateTime.now(),
        acceptedAt: DateTime.now(),
        pollAuthorizationGrantedAt: DateTime.now(),
        pollAuthorizationExpiresAt: DateTime.now().plus({ years: 1 }),
      }
    )

    // Poll 3.1 : Où chercher refuge ? (campagne 2)
    const pollRefuge = await Poll.updateOrCreate(
      { campaignId: campaign2.id, question: 'Où chercher refuge pour la nuit ?' },
      {
        campaignId: campaign2.id,
        question: 'Où chercher refuge pour la nuit ?',
        type: 'STANDARD',
        options: [
          "L'auberge du village",
          "L'église abandonnée",
          'Camper dans la forêt',
          'Demander asile au bourgmestre',
        ],
        durationSeconds: 90,
        orderIndex: 1,
        channelPointsEnabled: false,
      }
    )

    await PollResult.updateOrCreate(
      { pollId: pollRefuge.id, status: 'COMPLETED' },
      {
        pollId: pollRefuge.id,
        campaignId: campaign2.id,
        status: 'COMPLETED',
        startedAt: DateTime.now().minus({ days: 3, hours: -3 }),
        endedAt: DateTime.now().minus({ days: 3, hours: -3, minutes: -1, seconds: -30 }),
        totalVotes: 98,
        votesByOption: {
          '0': 12, // L'auberge du village
          '1': 54, // L'église abandonnée
          '2': 8, // Camper dans la forêt
          '3': 24, // Demander asile au bourgmestre
        },
        twitchPolls: {},
      }
    )

    // Campagne 3 : Waterdeep Dragon Heist
    const campaign3 = await Campaign.updateOrCreate(
      { name: 'Waterdeep: Dragon Heist' },
      {
        ownerId: gmUser.id,
        name: 'Waterdeep: Dragon Heist',
        description:
          'Une aventure urbaine palpitante dans la grande cité de Waterdeep, où les héros recherchent un trésor caché.',
        vttConnectionId: vttConnection.id,
        vttCampaignId: 'foundry-waterdeep-003',
        vttCampaignName: 'Waterdeep: Dragon Heist',
        lastVttSyncAt: DateTime.now(),
      }
    )

    await CampaignMembership.updateOrCreate(
      {
        campaignId: campaign3.id,
        streamerId: gmUser.streamer.id,
      },
      {
        campaignId: campaign3.id,
        streamerId: gmUser.streamer.id,
        status: 'ACTIVE',
        invitedAt: DateTime.now(),
        acceptedAt: DateTime.now(),
        pollAuthorizationGrantedAt: DateTime.now(),
        pollAuthorizationExpiresAt: DateTime.now().plus({ years: 1 }),
      }
    )

    // Poll 4.1 : Accepter la mission de Volo ? (campagne 3, poll non lancé)
    await Poll.updateOrCreate(
      { campaignId: campaign3.id, question: 'Accepter la mission de Volo ?' },
      {
        campaignId: campaign3.id,
        question: 'Accepter la mission de Volo ?',
        type: 'STANDARD',
        options: [
          'Oui, accepter immédiatement',
          'Négocier une meilleure récompense',
          'Demander plus de détails',
          'Refuser poliment',
        ],
        durationSeconds: 75,
        orderIndex: 1,
        channelPointsEnabled: false,
      }
    )

    console.log('✅ Dev campaigns seeded successfully!')
    console.log(`   - Campaign 1: ${campaign1.name} (3 polls with instances)`)
    console.log(`   - Campaign 2: ${campaign2.name} (1 poll with instance)`)
    console.log(`   - Campaign 3: ${campaign3.name} (1 poll, no instance yet)`)
  }
}
