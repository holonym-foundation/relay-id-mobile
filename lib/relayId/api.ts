import { DeviceInfo } from "../database/types";
import { apiEndpoints } from "./apiEndpoints";
import { RELAYID_APP_API_TOKEN } from "../constants";
import { z } from "zod";
import { TypedDataDefinition } from "viem";

// ============================================================================
// Authenticated Fetch Wrapper
// ============================================================================

/**
 * Wrapped fetch that automatically includes Bearer token authentication
 * @throws Error if RELAYID_APP_API_TOKEN is not set in environment
 */
async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  if (!RELAYID_APP_API_TOKEN) {
    throw new Error(
      "RELAYID_APP_API_TOKEN environment variable is not set. Please configure it in your .env file.",
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${RELAYID_APP_API_TOKEN}`,
    ...((options.headers as Record<string, string>) || {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

// ============================================================================
// Zod Schemas for Request/Response Validation
// ============================================================================

const deviceInfoSchema = z.custom<DeviceInfo>();

// Health Check
const healthResponseSchema = z.object({
  status: z.literal("ok"),
});

// Create Invite
const createInviteRequestSchema = z.object({
  inviterAddress: z.string(),
  signature: z.string(),
  nonce: z.string(),
  typedData: z.any(),
  deviceInfo: deviceInfoSchema,
});

const createInviteResponseSchema = z.object({
  inviteCode: z.string(),
  success: z.boolean(),
});

// Verify Invite
const verifyInviteRequestSchema = z.object({
  code: z.string(),
});

const verifyInviteResponseSchema = z.object({
  valid: z.boolean(),
  typedData: z.any().optional(),
});

// Onboard Direct
const onboardDirectRequestSchema = z.object({
  recipient: z.string(),
  typedData: z
    .object({
      message: z
        .object({
          recipient: z.string(),
        })
        .passthrough(),
    })
    .passthrough(),
  signature: z.string(),
  deviceInfo: deviceInfoSchema,
});

const onboardResponseSchema = z.object({
  success: z.boolean(),
  transactionHash: z.string(),
});

// Onboard Via Invite
const onboardViaInviteRequestSchema = z.object({
  recipient: z.string(),
  typedData: z.any(),
  signature: z.string(),
  deviceInfo: deviceInfoSchema,
});

// Verify Reservation
const verifyReservationRequestSchema = z.object({
  reservationId: z.string(),
  signature: z.string(),
  typedData: z.any(),
  recipient: z.string(),
  inviterAddress: z.string(),
});

const verifyReservationResponseSchema = z.object({
  valid: z.boolean(),
  reservationId: z.string(),
  recipient: z.string(),
  inviterAddress: z.string(),
  flowType: z.enum(["invite", "direct"]),
  expiresAt: z.string(),
});

// Feedback
const feedbackRequestSchema = z.object({
  sentiment: z.enum(["up", "down"]),
  feedback: z.string(),
  user: z.string(),
  page: z.string(),
  deviceInfo: deviceInfoSchema,
});

const feedbackResponseSchema = z.object({
  success: z.boolean(),
});

// Metrics
const metricsResponseSchema = z.object({
  completions: z.object({ count: z.number() }),
  reservedInvites: z.object({ count: z.number() }),
  invitations: z.object({ count: z.number() }),
  relayerBalance: z.object({ balance: z.string() }),
  hatsWearers: z.object({ count: z.number() }),
});

// Error Response
const errorResponseSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
});

// ============================================================================
// TypeScript Types
// ============================================================================

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export type CreateInviteRequest = z.infer<typeof createInviteRequestSchema>;
export type CreateInviteResponse = z.infer<typeof createInviteResponseSchema>;

export type VerifyInviteRequest = z.infer<typeof verifyInviteRequestSchema>;
export type VerifyInviteResponse = z.infer<typeof verifyInviteResponseSchema>;

export type OnboardDirectRequest = z.infer<typeof onboardDirectRequestSchema>;
export type OnboardViaInviteRequest = z.infer<
  typeof onboardViaInviteRequestSchema
>;
export type OnboardResponse = z.infer<typeof onboardResponseSchema>;

export type VerifyReservationRequest = z.infer<
  typeof verifyReservationRequestSchema
>;
export type VerifyReservationResponse = z.infer<
  typeof verifyReservationResponseSchema
>;

export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;
export type FeedbackResponse = z.infer<typeof feedbackResponseSchema>;

export type MetricsResponse = z.infer<typeof metricsResponseSchema>;

export type ApiErrorResponse = z.infer<typeof errorResponseSchema>;

// ============================================================================
// API Functions
// ============================================================================

/**
 * Health check endpoint
 */
export async function healthCheck(): Promise<
  HealthResponse | ApiErrorResponse
> {
  try {
    const response = await fetch(apiEndpoints.health, {
      method: "GET",
    });

    const data = await response.json();

    if (!response.ok) {
      return errorResponseSchema.parse(data);
    }

    return healthResponseSchema.parse(data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Create a new invitation with signature verification
 */
export async function createInvite(
  body: CreateInviteRequest,
): Promise<CreateInviteResponse | ApiErrorResponse> {
  try {
    const validatedBody = createInviteRequestSchema.parse(body);

    const response = await authenticatedFetch(apiEndpoints.createInvite, {
      method: "POST",
      body: JSON.stringify(validatedBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return errorResponseSchema.parse(data);
    }

    return createInviteResponseSchema.parse(data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Verify an invitation code
 */
export async function verifyInvite(
  body: VerifyInviteRequest,
): Promise<VerifyInviteResponse | ApiErrorResponse> {
  try {
    const validatedBody = verifyInviteRequestSchema.parse(body);

    const response = await authenticatedFetch(apiEndpoints.verifyInvite, {
      method: "POST",
      body: JSON.stringify(validatedBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return errorResponseSchema.parse(data);
    }

    return verifyInviteResponseSchema.parse(data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Onboard a new leader directly (recipient in typedData)
 */
export async function onboardDirect(
  body: OnboardDirectRequest,
): Promise<OnboardResponse | ApiErrorResponse> {
  try {
    const validatedBody = onboardDirectRequestSchema.parse(body);

    const response = await authenticatedFetch(apiEndpoints.onboardDirect, {
      method: "POST",
      body: JSON.stringify(validatedBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return errorResponseSchema.parse(data);
    }

    return onboardResponseSchema.parse(data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Onboard a new leader via invite code (no recipient in typedData)
 */
export async function onboardViaInvite(
  body: OnboardViaInviteRequest,
): Promise<OnboardResponse | ApiErrorResponse> {
  try {
    const validatedBody = onboardViaInviteRequestSchema.parse(body);

    const response = await authenticatedFetch(apiEndpoints.onboardViaInvite, {
      method: "POST",
      body: JSON.stringify(validatedBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return errorResponseSchema.parse(data);
    }

    return onboardResponseSchema.parse(data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Verify a reservation with signature validation (requires authentication)
 */
export async function verifyReservation(
  body: VerifyReservationRequest,
): Promise<VerifyReservationResponse | ApiErrorResponse> {
  try {
    const validatedBody = verifyReservationRequestSchema.parse(body);

    const response = await authenticatedFetch(apiEndpoints.verifyReservation, {
      method: "POST",
      body: JSON.stringify(validatedBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return errorResponseSchema.parse(data);
    }

    return verifyReservationResponseSchema.parse(data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Submit user feedback with sentiment analysis
 */
export async function submitFeedback(
  body: FeedbackRequest,
): Promise<FeedbackResponse | ApiErrorResponse> {
  try {
    const validatedBody = feedbackRequestSchema.parse(body);

    const response = await authenticatedFetch(apiEndpoints.feedback, {
      method: "POST",
      body: JSON.stringify(validatedBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return errorResponseSchema.parse(data);
    }

    return feedbackResponseSchema.parse(data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Get dashboard metrics
 */
export async function getMetrics(): Promise<
  MetricsResponse | ApiErrorResponse
> {
  try {
    const response = await fetch(apiEndpoints.metrics, {
      method: "GET",
    });

    const data = await response.json();

    if (!response.ok) {
      return errorResponseSchema.parse(data);
    }

    return metricsResponseSchema.parse(data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}
