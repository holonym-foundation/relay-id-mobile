import { RELAYID_API_URL } from "../constants";

export const apiEndpoints = {
  health: `${RELAYID_API_URL}/health`,
  createInvite: `${RELAYID_API_URL}/invites`,
  verifyInvite: `${RELAYID_API_URL}/invites/verify`,
  verifyReservation: `${RELAYID_API_URL}/reservations/verify`,
  feedback: `${RELAYID_API_URL}/messages/feedback`,
  onboardDirect: `${RELAYID_API_URL}/onboarding/direct`,
  onboardViaInvite: `${RELAYID_API_URL}/onboarding/invite`,
  metrics: `${RELAYID_API_URL}/metrics`,
  cleanupSystem: `${RELAYID_API_URL}/system/cleanup`,
};
