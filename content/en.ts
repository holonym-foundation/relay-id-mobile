const en = {
  common: {
    welcome: "Welcome to the application!",
    submit: "Submit",
    cancel: "Cancel",
    copied: "Copied",
    unknown: "Unknown",
    login: "Login",
    logout: "Logout",
    loggingIn: "Logging in...",
    clickToCopyAddress: "Click to copy your RelayID",
    addressCopied: "RelayID copied to clipboard",
    accountDisconnected: "Account disconnected",
    loading: "Loading...",
    success: "Success",
    error: "Error",
    notAllowed: "Not allowed",
    allowed: "Allowed",
    copyLink: "Copy link",
    shareWhatsApp: "Share on WhatsApp",
    inviteExpires: "Invite link expires in 24 hours",
    generating: "Generating...",
    generateInvite: "Generate invite link",
    joinMe: "Join me on the RelayID Network! Use this invite link: ",
    failedToGenerate: "Failed to generate invite",
    failedToGenerateLink: "Failed to generate invite link",
    invalidAddress: "Invalid address: ",
    errorWhileScanning: "Error while scanning",
    unknownError: "An unknown error occurred",
    addLeader: "Add leader",
    addingLeader: "Adding leader...",
    sendingTx: "Sending ",
    transactionsPleaseWait: " transactions. Please keep this page open...",
    checkingPermissions: "Checking permissions...",
    theirAddress: "Their RelayID",
    inviteCopied: "Invite link copied to clipboard",
    copiedExclamation: "Copied!",
  },
  home: {
    title: "Home Page",
    description: "This is the home page of the application.",
  },
  profile: {
    myAccount: "My RelayID",
    relayIdTitle: "Your RelayID",
    relayIdDescription:
      "This is your unique RelayID that you can share with other leaders. They can use it to add you as a leader.",
  },
  status: {
    status: "Status",
    networkStatus: "Network Status",
    networkStatusDescription:
      "Your status shows whether you're connected to the RelayID network. To get onboarded, you'll need to be added by an existing network member.",
    onboardingTitle: "How to get onboarded",
    onboardingSteps: [
      "Share your RelayID with another leader",
      "They will need to add you to the network using your RelayID",
      "Once added, your status will update automatically",
    ],
    errorLoadingStatus: "Error loading status",
    youAreALeader: "You are a leader",
    notALeader: "Not a leader",
    gettingStartedSteps: [
      {
        title: "Share your RelayID with a leader",
        description: "Send them your RelayID so they can add you",
      },
      {
        title: "Wait for them to add you",
        description: "They'll use your RelayID to connect you to the network",
      },
      {
        title: "You'll be notified when ready",
        description: "Your status will update automatically",
      },
    ],
    howToGetConnectedTitle: "How to Get Connected",
    joinCommunitySteps: "Join the community in 3 simple steps",
    shareRelayIDTitle: "Share your RelayID",
    shareRelayIDDescription:
      "Send your RelayID to someone who's already a network leader. They can add you to the network.",
    waitForAddTitle: "Wait for them to add you",
    waitForAddDescription:
      "The leader will use your RelayID to connect you to the RelayID network.",
    notifiedWhenReadyTitle: "Confirm the onboarding",
    notifiedWhenReadyDescription:
      "Your status will update automatically once you're connected to the RelayID network.",
    gotIt: "Got it",
  },
  share: {
    shareAccountInfo: "Add me as a leader via",
    shareWithMembersTitle: "Share with other leaders",
    shareWithMembersDescription:
      "Share your RelayID with another leader to join the network. They can scan your QR code or use WhatsApp to get your RelayID.",
    requestOnboardingMessage:
      "Hi! I'd like to join the RelayID Network. My RelayID is: ",
    inviteLinkMessage:
      "Join me on the RelayID Network! RelayID is a decentralized identity system that gives refugees control over their personal data while unlocking access to critical resources like aid, jobs, and financial services. Use this invite link to join: ",
  },
  qrCodeDialog: {
    shareQrCode: "Share QR Code",
    loginToViewQr: "Log in to view QR code",
    showQrInstruction:
      "Show this QR code to another community leader and let them scan it to add you to the network",
    scanInstruction: "They can scan this code on the ",
    addLeaderPage: "Add Leader",
    pageSuffix: " page.",
  },
  header: {
    nav: {
      myAccount: "My RelayID",
      addLeader: "Add Leader",
    },
    menu: {
      open: "Open menu",
      close: "Close menu",
    },
  },
  page: {
    myAccountTitle: "My RelayID",
    loginPrompt: "Please log in to view your RelayID.",
    addAnotherLeader: "Add another leader",
    noPermission: "You don't have permission to add another leader.",
    gettingStarted: "Getting Started",
    notConnectedYet: "You're not connected to the RelayID network yet",
    shareMyRelayID: "Share My RelayID",
    howToGetConnected: "How to Get Connected",
    youAreLeader: "You're a Community Leader",
    canInviteOthers: "You can invite others and manage the network",
    inviteSomeone: "Invite another leader",
    manage: "Manage",
    yourRelayID: "Your RelayID",
    leaderActions: "Leader Actions",
    getStarted: "Get Started",
    addNewMember: "Add New Member",
    viewNetwork: "View Network",
    networkStats: "Network Stats",
    settingsAndHelp: "Settings & Help",
    giveFeedback: "Give Feedback",
    helpCenter: "Help Center",
    disconnect: "Sign out",
    loginScreen: {
      heading: "Welcome to RelayID",
      subtitle: "Sign in to get started",
      buttonLabel: "Sign in to RelayID",
    },
  },
  addPage: {
    headings: {
      addLeaderToNetwork: "Add leader to the network",
      addLeaderToNetworkShort: "Add leader to network",
      sendInviteLink: "Send invite link",
      addNewMember: "Add New Member",
      inviteToNetwork: "Invite someone to join the community network",
      howToAddSomeone: "How to Add Someone",
      shareYourID: "Share Your ID",
    },
    prompts: {
      loginToAdd: "Please log in to add a leader.",
      two: "two",
      singleUseInvite:
        "This invite link can only be used for one successful onboarding.",
      reservationInfo:
        "When a user opens this invite link, it will be reserved for them for a limited time.",
      notAllowed: "You are not allowed to add leaders to the network.",
      getBadge: "Get your leadership badge from another leader.",
      signInToInvite: "Sign in to invite others to the community",
    },
    steps: {
      getTheirID: {
        title: "Get their RelayID",
        description: "Ask them to share their RelayID with you",
      },
      enterID: {
        title: "Enter their ID below",
        description: "Paste their RelayID in the input field",
      },
      confirmInvitation: {
        title: "Confirm the invitation",
        description: "Sign the transaction to add them to the network",
      },
    },
    form: {
      relayIDLabel: "RelayID",
      relayIDPlaceholder: "Paste their RelayID here (0x...)",
      addToNetwork: "Add to Network",
    },
    toasts: {
      successAdded: "Successfully added leader ",
      errorAdding: "Error adding leader:",
      errorQr: "Error in QR code",
      copied: "Your RelayID has been copied to clipboard",
      comingSoon: "Member addition feature will be implemented soon",
      whatsAppShare: "This would open WhatsApp with your ID",
    },
  },
  invitePage: {
    headings: {
      success: "Success!",
      verifying: "Verifying invite...",
      invalid: "Invalid Invite",
      accept: "Accept Invite",
      alreadyOnboarded: "Already Onboarded",
      expired: "Invite Expired",
      used: "Invite Already Used",
      reserved: "Invite In Use",
      error: "Error",
    },
    prompts: {
      onboarded: "You have been successfully onboarded as a leader!",
      viewAccount: "View your RelayID",
      invalid: "This invite is no longer valid.",
      login: "Please login or sign up to be accepted as a leader.",
      accept: "Please accept the invite to join the Relay Network as a leader.",
      processing: "Processing...",
      acceptInvite: "Accept Invite",
      reserved:
        "This invite is currently being used. Please try again later or request a new invite.",
      singleUse: "This invite link can only be used once.",
      alreadyOnboarded:
        "The connected account is already onboarded and cannot use this invite link.",
      checkingWalletStatus: "Checking account status…",
      expired: "Please request a new invite from another leader.",
      used: "This invite has already been used.",
      error: "Something went wrong. Please try again later.",
    },
    toasts: {
      errorAccepting: "Error accepting invite:",
      failedToAccept: "Failed to accept invite",
    },
  },
};

export default en;
