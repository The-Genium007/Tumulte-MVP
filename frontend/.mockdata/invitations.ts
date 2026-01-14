import type { CampaignInvitation } from "@/types";

// Invitation récente (30 minutes)
export const mockInvitationRecent: CampaignInvitation = {
  id: "mock-invitation-001",
  campaign: {
    id: "mock-campaign-ext-001",
    name: "Donjons & Dragons: La Quête du Graal",
    description: null,
    ownerName: "DungeonMaster_Pro",
  },
  invitedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
};

// Invitation de quelques heures
export const mockInvitationHours: CampaignInvitation = {
  id: "mock-invitation-002",
  campaign: {
    id: "mock-campaign-ext-002",
    name: "Space Opera: Les Confins de l'Univers",
    description:
      "Explorez les galaxies lointaines, combattez des aliens et découvrez les mystères de l'espace profond.",
    ownerName: "GM_Cosmos",
  },
  invitedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
};

// Invitation ancienne (2 jours)
export const mockInvitationOld: CampaignInvitation = {
  id: "mock-invitation-003",
  campaign: {
    id: "mock-campaign-ext-003",
    name: "Campagne des Ombres Perdues",
    description:
      "Une aventure épique dans un monde de fantasy sombre où les héros doivent retrouver les fragments d'une ancienne relique.",
    ownerName: "MaitreJeu_Epic",
  },
  invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
};

export const mockInvitations: CampaignInvitation[] = [
  mockInvitationRecent,
  mockInvitationHours,
  mockInvitationOld,
];
