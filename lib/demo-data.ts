/**
 * Demo data generators for demo mode
 * These functions generate fake but realistic-looking data for reviewers
 */

export function generateDemoAddress(): string {
  return "0xDemo1234567890123456789012345678901234";
}

export function generateDemoInviteLink(): string {
  const randomId = Math.random().toString(36).substring(2, 15);
  return `https://relayid.refunite.org/invite?code=${randomId}`;
}

export function generateDemoWhatsAppMessage(): string {
  const inviteLink = generateDemoInviteLink();
  return `Hi! I'd like to invite you to join our RelayID network. Click this link to get started: ${inviteLink}\n\nThis is a demo invitation - in real mode, this would create an actual invitation.`;
}

export function generateDemoQRCodeData(): string {
  return generateDemoInviteLink();
}

export function generateDemoRelayID(): string {
  // Generate a realistic-looking Ethereum address for demo purposes
  const chars = "0123456789abcdef";
  let address = "0xDemo";
  for (let i = 0; i < 36; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

export function generateDemoMemberName(): string {
  const firstNames = [
    "Alice",
    "Bob",
    "Charlie",
    "Diana",
    "Eve",
    "Frank",
    "Grace",
    "Henry",
  ];
  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
  ];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${firstName} ${lastName}`;
}

export const DEMO_DATA = {
  userAddress: "0xDemo1234567890abcdef1234567890abcdef1234",
  hasHat: true, // In demo mode, user is always a leader
  members: [
    {
      id: "1",
      name: "Alice Johnson",
      address: "0xDemo111111111111111111111111111111111111",
      joinedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "2",
      name: "Bob Smith",
      address: "0xDemo222222222222222222222222222222222222",
      joinedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "3",
      name: "Charlie Brown",
      address: "0xDemo333333333333333333333333333333333333",
      joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  invitations: [
    {
      id: "inv1",
      recipientAddress: "0xDemo444444444444444444444444444444444444",
      status: "pending",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "inv2",
      recipientAddress: "0xDemo555555555555555555555555555555555555",
      status: "accepted",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};
