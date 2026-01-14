// Mock data for polls (directly linked to campaigns)
// This folder is gitignored and will never be pushed to GitHub

import type { Poll } from "~/types/api";

export type MockPoll = Poll;

// Helper pour créer des dates relatives au moment actuel
const now = Date.now();
const hoursAgo = (hours: number) =>
  new Date(now - hours * 60 * 60 * 1000).toISOString();
const daysAgo = (days: number) =>
  new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

// ==========================================
// Polls pour "Les Chroniques de l'Ombre" (mock-campaign-001)
// ==========================================

// Standard poll - choix de chemin (jamais lancé)
export const mockPollStandard: MockPoll = {
  id: "mock-poll-001",
  campaignId: "mock-campaign-001",
  question: "Quel chemin prendre ?",
  options: ["La foret sombre", "Le pont suspendu", "La caverne mysterieuse"],
  type: "STANDARD",
  durationSeconds: 60,
  orderIndex: 0,
  channelPointsPerVote: null,
  channelPointsEnabled: false,
  lastLaunchedAt: null,
  createdAt: daysAgo(7),
  updatedAt: daysAgo(7),
};

// Binary yes/no poll - confiance (lancé il y a 2 heures)
export const mockPollBinary: MockPoll = {
  id: "mock-poll-002",
  campaignId: "mock-campaign-001",
  question: "Faire confiance au marchand ?",
  options: ["Oui", "Non"],
  type: "STANDARD",
  durationSeconds: 30,
  orderIndex: 1,
  channelPointsPerVote: null,
  channelPointsEnabled: false,
  lastLaunchedAt: hoursAgo(2),
  createdAt: daysAgo(7),
  updatedAt: hoursAgo(2),
};

// Poll with channel points - choix d'arme (lancé il y a 30 min)
export const mockPollChannelPoints: MockPoll = {
  id: "mock-poll-003",
  campaignId: "mock-campaign-001",
  question: "Quelle arme choisir ?",
  options: ["Epee legendaire", "Arc elfique", "Baton de mage", "Dague furtive"],
  type: "STANDARD",
  durationSeconds: 90,
  orderIndex: 2,
  channelPointsPerVote: 100,
  channelPointsEnabled: true,
  lastLaunchedAt: hoursAgo(0.5),
  createdAt: daysAgo(5),
  updatedAt: hoursAgo(0.5),
};

// Unique vote poll - sacrifice (lancé hier)
export const mockPollUnique: MockPoll = {
  id: "mock-poll-004",
  campaignId: "mock-campaign-001",
  question: "Qui sacrifier ?",
  options: ["Le guerrier", "Le mage", "Le voleur"],
  type: "UNIQUE",
  durationSeconds: 120,
  orderIndex: 3,
  channelPointsPerVote: null,
  channelPointsEnabled: false,
  lastLaunchedAt: hoursAgo(24),
  createdAt: daysAgo(5),
  updatedAt: hoursAgo(24),
};

// Poll with long question (jamais lancé)
export const mockPollLongQuestion: MockPoll = {
  id: "mock-poll-005",
  campaignId: "mock-campaign-001",
  question: "Que faire avec le tresor maudit ?",
  options: ["Le garder", "Le detruire", "Le cacher", "Le donner"],
  type: "STANDARD",
  durationSeconds: 60,
  orderIndex: 4,
  channelPointsPerVote: null,
  channelPointsEnabled: false,
  lastLaunchedAt: null,
  createdAt: daysAgo(3),
  updatedAt: daysAgo(3),
};

// ==========================================
// Polls pour "Space Opera: Les Confins" (mock-campaign-002)
// ==========================================

export const mockPollSpaceDecision: MockPoll = {
  id: "mock-poll-006",
  campaignId: "mock-campaign-002",
  question: "Quelle planete explorer ?",
  options: ["Kepler-442b", "Proxima Centauri b", "TRAPPIST-1e"],
  type: "STANDARD",
  durationSeconds: 45,
  orderIndex: 0,
  channelPointsPerVote: null,
  channelPointsEnabled: false,
  lastLaunchedAt: hoursAgo(5),
  createdAt: daysAgo(10),
  updatedAt: hoursAgo(5),
};

export const mockPollAlienContact: MockPoll = {
  id: "mock-poll-007",
  campaignId: "mock-campaign-002",
  question: "Comment reagir face aux aliens ?",
  options: ["Attaquer", "Negocier", "Fuir", "Observer"],
  type: "STANDARD",
  durationSeconds: 60,
  orderIndex: 1,
  channelPointsPerVote: 50,
  channelPointsEnabled: true,
  lastLaunchedAt: hoursAgo(1),
  createdAt: daysAgo(10),
  updatedAt: hoursAgo(1),
};

// ==========================================
// Polls pour "Donjons & Dragons: La Quête" (mock-campaign-003)
// ==========================================

export const mockPollDnDClass: MockPoll = {
  id: "mock-poll-008",
  campaignId: "mock-campaign-003",
  question: "Quelle classe pour le PNJ ?",
  options: ["Guerrier", "Mage", "Clerc", "Voleur", "Barde"],
  type: "STANDARD",
  durationSeconds: 90,
  orderIndex: 0,
  channelPointsPerVote: null,
  channelPointsEnabled: false,
  lastLaunchedAt: daysAgo(2),
  createdAt: daysAgo(14),
  updatedAt: daysAgo(2),
};

// ==========================================
// Collections exportées
// ==========================================

// All polls for campaign "Les Chroniques de l'Ombre"
export const mockPollsCampaign001: MockPoll[] = [
  mockPollStandard,
  mockPollBinary,
  mockPollChannelPoints,
  mockPollUnique,
  mockPollLongQuestion,
];

// All polls for campaign "Space Opera"
export const mockPollsCampaign002: MockPoll[] = [
  mockPollSpaceDecision,
  mockPollAlienContact,
];

// All polls for campaign "D&D"
export const mockPollsCampaign003: MockPoll[] = [mockPollDnDClass];

// All mock polls (flat array)
export const mockPolls: MockPoll[] = [
  ...mockPollsCampaign001,
  ...mockPollsCampaign002,
  ...mockPollsCampaign003,
];

// Helper to get polls by campaign ID
export function getMockPollsByCampaign(campaignId: string): MockPoll[] {
  return mockPolls.filter((poll) => poll.campaignId === campaignId);
}
