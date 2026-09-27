// Shared client helpers for mentor invitations. The raw token only ever lives in the link and,
// briefly, in this tab's sessionStorage while the invited person signs up or signs in.

const PENDING_KEY = "concord.pendingMentorInvite";

export type InvitationStatus =
  | "draft"
  | "ready_to_share"
  | "sent"
  | "opened"
  | "accepted"
  | "declined"
  | "expired"
  | "revoked";

export type Invitation = {
  id: string;
  safe_display_name: string;
  organization_or_field: string | null;
  invitation_message: string | null;
  inviter_display_name: string | null;
  status: InvitationStatus;
  expires_at: string | null;
  created_at: string;
};

// Neutral wording: nothing here pressures or judges the invited person.
export const STATUS_LABELS: Record<InvitationStatus, string> = {
  draft: "Draft",
  ready_to_share: "Ready to share",
  sent: "Sent",
  opened: "Opened",
  accepted: "Accepted",
  declined: "Not accepted",
  expired: "Expired",
  revoked: "Revoked",
};

export const ACTIVE_STATUSES: InvitationStatus[] = ["ready_to_share", "sent", "opened"];

export function inviteUrl(linkPath: string) {
  return `${window.location.origin}${linkPath}`;
}

export function rememberPendingInvite(token: string) {
  try {
    sessionStorage.setItem(PENDING_KEY, token);
  } catch {
    // Storage blocked: the invited person can reopen the link after signing in.
  }
}

export function takePendingInvite(): string | null {
  try {
    const token = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    return token;
  } catch {
    return null;
  }
}

export function hasPendingInvite(): boolean {
  try {
    return sessionStorage.getItem(PENDING_KEY) !== null;
  } catch {
    return false;
  }
}

export const OPEN_ENROLLMENT_COPY =
  "Concord is open for people to join, but matching is limited to registered participants. Potential mentors must create an account, complete their profile, and choose to participate before they can be ranked or matched.";
