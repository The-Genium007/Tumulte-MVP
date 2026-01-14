import type { Campaign } from "@/types";

// Campagne avec beaucoup de membres actifs
export const mockCampaignLarge: Campaign = {
  id: "mock-campaign-001",
  name: "Les Chroniques de l'Ombre",
  description:
    "Une aventure épique dans un monde de fantasy sombre où les héros doivent retrouver les fragments d'une ancienne relique pour sauver le royaume.",
  memberCount: 8,
  activeMemberCount: 6,
  ownerName: "MaitreJeu_Epic",
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
};

// Campagne nouvelle avec peu de membres
export const mockCampaignSmall: Campaign = {
  id: "mock-campaign-002",
  name: "Space Opera: Les Confins",
  description:
    "Explorez les galaxies lointaines, combattez des aliens et découvrez les mystères de l'espace profond.",
  memberCount: 3,
  activeMemberCount: 2,
  ownerName: "MaitreJeu_Epic",
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
};

// Campagne avec membres en attente
export const mockCampaignPending: Campaign = {
  id: "mock-campaign-003",
  name: "Donjons & Dragons: La Quête",
  description:
    "Une campagne classique D&D5 avec des donjons, des dragons et beaucoup de dés.",
  memberCount: 5,
  activeMemberCount: 2,
  ownerName: "MaitreJeu_Epic",
  createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
};

// Campagne sans description
export const mockCampaignNoDesc: Campaign = {
  id: "mock-campaign-004",
  name: "Campagne Test",
  description: null,
  memberCount: 1,
  activeMemberCount: 1,
  ownerName: "MaitreJeu_Epic",
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
};

export const mockCampaigns: Campaign[] = [
  mockCampaignLarge,
  mockCampaignSmall,
  mockCampaignPending,
  mockCampaignNoDesc,
];
