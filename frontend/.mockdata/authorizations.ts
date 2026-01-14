import type { AuthorizationStatus } from "@/types";

// Owner - autorisation permanente
export const mockAuthOwner: AuthorizationStatus = {
  campaignId: "mock-campaign-001",
  campaignName: "Les Chroniques de l'Ombre",
  isOwner: true,
  isAuthorized: true,
  expiresAt: null,
  remainingSeconds: null,
};

// Autorisé avec beaucoup de temps restant (10h)
export const mockAuthLongTime: AuthorizationStatus = {
  campaignId: "mock-campaign-002",
  campaignName: "Space Opera: Les Confins",
  isOwner: false,
  isAuthorized: true,
  expiresAt: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
  remainingSeconds: 10 * 60 * 60,
};

// Autorisé avec peu de temps restant (45 min)
export const mockAuthShortTime: AuthorizationStatus = {
  campaignId: "mock-campaign-003",
  campaignName: "Donjons & Dragons: La Quête",
  isOwner: false,
  isAuthorized: true,
  expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
  remainingSeconds: 45 * 60,
};

// Non autorisé
export const mockAuthNotAuthorized: AuthorizationStatus = {
  campaignId: "mock-campaign-004",
  campaignName: "Campagne Test",
  isOwner: false,
  isAuthorized: false,
  expiresAt: null,
  remainingSeconds: null,
};

export const mockAuthorizationStatuses: AuthorizationStatus[] = [
  mockAuthOwner,
  mockAuthLongTime,
  mockAuthShortTime,
  mockAuthNotAuthorized,
];
