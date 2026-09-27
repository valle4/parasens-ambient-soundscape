import test from "node:test";
import assert from "node:assert/strict";
import { createAdminHandler } from "../supabase/functions/portal-admin/handler.ts";
const origin = "https://development.parasens-ambient-soundscape.pages.dev";
const rid = "10000000-0000-0000-0000-000000000001";
const request = (body) =>
  new Request(origin, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const base = {
  origin,
  configured: true,
  authorize: async () => true,
  invite: async () => "",
  claim: async () => [],
  send: async () => "",
  finish: async () => {},
};
test("artists cannot invoke email, invitation or status actions", async () => {
  let calls = 0;
  const handler = createAdminHandler({
    ...base,
    authorize: async () => false,
    invite: async () => {
      calls++;
    },
  });
  for (const action of ["invite", "notify", "status"])
    assert.equal(
      (
        await handler(
          request({ action, email: "test@example.com", releaseId: rid }),
        )
      ).status,
      403,
    );
  assert.equal(calls, 0);
});
test("notification dispatch sends only claimed server jobs, ignoring supplied recipients and bodies", async () => {
  const jobs = [
    {
      id: "job1",
      recipient: "assigned@example.com",
      subject: "Review",
      body: "Artist-facing reason",
    },
  ];
  let sent, finished;
  const handler = createAdminHandler({
    ...base,
    claim: async () => jobs,
    send: async (job) => {
      sent = job;
      return "receipt";
    },
    finish: async (...args) => {
      finished = args;
    },
  });
  const response = await handler(
    request({
      action: "notify",
      releaseId: rid,
      recipient: "intruder@example.com",
      body: "Private note",
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(sent, jobs[0]);
  assert.equal(finished[2], "receipt");
});
test("failed delivery is surfaced and tracked without claiming it was sent", async () => {
  let receipt = "not-called";
  const handler = createAdminHandler({
    ...base,
    claim: async () => [
      {
        id: "job1",
        recipient: "a@example.com",
        subject: "Review",
        body: "Reason",
      },
    ],
    send: async () => {
      throw Error("provider");
    },
    finish: async (j, c, r) => {
      receipt = r;
    },
  });
  const body = await (
    await handler(request({ action: "notify", releaseId: rid }))
  ).json();
  assert.equal(body.failed, 1);
  assert.equal(body.sent, 0);
  assert.equal(receipt, null);
});
test("missing sender fails clearly without trying to send", async () => {
  const handler = createAdminHandler({ ...base, configured: false });
  assert.equal(
    (await handler(request({ action: "notify", releaseId: rid }))).status,
    503,
  );
});
