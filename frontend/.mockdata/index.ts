// Export central de toutes les données mockées
// Ce dossier est gitignore et ne sera jamais push sur GitHub

export { mockUsers, mockGmUser, mockStreamerUser } from "./users";
export {
  mockCampaigns,
  mockCampaignLarge,
  mockCampaignSmall,
  mockCampaignPending,
  mockCampaignNoDesc,
} from "./campaigns";
export {
  mockMembers,
  mockMemberOwner,
  mockMemberPartnerAuthorized,
  mockMemberAffiliateShortTime,
  mockMemberNotAuthorized,
  mockMemberPending,
  mockMemberInactive,
  mockMemberLive,
  mockMemberNonAffiliate,
} from "./members";
export {
  mockInvitations,
  mockInvitationRecent,
  mockInvitationHours,
  mockInvitationOld,
} from "./invitations";
export {
  mockAuthorizationStatuses,
  mockAuthOwner,
  mockAuthLongTime,
  mockAuthShortTime,
  mockAuthNotAuthorized,
} from "./authorizations";
export { mockLiveStatus } from "./liveStatus";
export {
  mockPolls,
  mockPollStandard,
  mockPollBinary,
  mockPollChannelPoints,
  mockPollUnique,
  mockPollLongQuestion,
  mockPollSpaceDecision,
  mockPollAlienContact,
  mockPollDnDClass,
  mockPollsCampaign001,
  mockPollsCampaign002,
  mockPollsCampaign003,
  getMockPollsByCampaign,
} from "./polls";
export type { MockPoll } from "./polls";
