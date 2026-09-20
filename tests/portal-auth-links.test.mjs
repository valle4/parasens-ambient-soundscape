import assert from "node:assert/strict";
import test from "node:test";
import { parsePortalEmailLink, isHiddenInvitationError } from "../src/lib/portal-auth-links.ts";

const token = "a".repeat(56);

test("accepts one-time sign-in and invitation tokens from a fragment", () => {
  for (const type of ["email", "invite"]) {
    assert.deepEqual(parsePortalEmailLink(`#token_hash=${token}&type=${type}`), { tokenHash: token, type });
  }
});

test("rejects malformed, ambiguous, and unsupported authentication links", () => {
  for (const input of [
    "",
    `?token_hash=${token}&type=email`,
    `#token_hash=${token}&type=recovery`,
    "#token_hash=bad&type=email",
    `#token_hash=${"a".repeat(513)}&type=email`,
    "#token_hash=%3Cscript%3E&type=email",
    `#token_hash=${token}&type=email&type=invite`,
    `#token_hash=${token}&token_hash=${token}&type=email`,
  ]) assert.equal(parsePortalEmailLink(input), null);
});

test("conceals invitation eligibility errors without concealing delivery failures", () => {
  for (const code of ["otp_disabled", "user_not_found", "signup_disabled"]) {
    assert.equal(isHiddenInvitationError(code), true);
  }
  for (const code of ["over_email_send_rate_limit", "unexpected_failure", undefined]) {
    assert.equal(isHiddenInvitationError(code), false);
  }
});
