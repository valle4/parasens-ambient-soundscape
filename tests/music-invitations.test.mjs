import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
const source = (
  await readFile(
    new URL(
      "../supabase/functions/invite-music-admin/index.ts",
      import.meta.url,
    ),
    "utf8",
  )
).replace(/^import .*?;\s*/s, "");
const code = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
function handler(options = {}) {
  const calls = [];
  let serve;
  const client = {
    auth: {
      getUser: async () => ({
        data: {
          user: options.signedOut
            ? null
            : { id: "owner", email_confirmed_at: "2026-09-20" },
        },
        error: null,
      }),
    },
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === "music_admin_role") return { data: options.role ?? "owner" };
      return {
        data: options.granted ?? true,
        error:
          options.rollbackFails && args.p_remove ? new Error("Failed") : null,
      };
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: options.exists ? { email: "admin@example.com" } : null,
          }),
        }),
      }),
    }),
  };
  const service = {
    auth: {
      admin: {
        inviteUserByEmail: async (email) => {
          calls.push({ email });
          return { error: options.inviteError ?? null };
        },
      },
    },
  };
  runInNewContext(code, {
    Deno: {
      serve: (fn) => {
        serve = fn;
      },
      env: {
        get: (key) =>
          ({
            SUPABASE_URL: "https://test.supabase.co",
            SUPABASE_ANON_KEY: "public-key",
            SUPABASE_SERVICE_ROLE_KEY: "server-only",
          })[key],
      },
    },
    createClient: (_, key) => (key === "server-only" ? service : client),
    Response,
    Request,
  });
  return {
    calls,
    send: async (body = { email: "admin@example.com" }, headers = {}) =>
      serve(
        new Request(
          "https://test.supabase.co/functions/v1/invite-music-admin",
          {
            method: "POST",
            headers: {
              Origin:
                "https://development.parasens-ambient-soundscape.pages.dev",
              Authorization: "Bearer test",
              "Content-Type": "application/json",
              ...headers,
            },
            body: JSON.stringify(body),
          },
        ),
      ),
  };
}
test("administrator invitations reject unauthorized calls before granting access or sending mail", async () => {
  for (const options of [
    { signedOut: true },
    { role: "admin" },
    { role: "artist" },
  ]) {
    const h = handler(options);
    const r = await h.send();
    assert.ok([401, 403].includes(r.status));
    assert.equal(
      h.calls.filter((c) => c.email || c.name === "music_manage_admin").length,
      0,
    );
  }
  const h = handler();
  assert.equal(
    (
      await h.send(
        { email: "admin@example.com" },
        { Origin: "https://evil.example" },
      )
    ).status,
    403,
  );
  assert.equal(h.calls.length, 0);
  assert.equal((await h.send({ email: "invalid" })).status, 400);
  assert.equal(h.calls.filter((c) => c.email).length, 0);
});
test("owner invitations send exactly once; duplicate grants cannot cause a rollback race", async () => {
  const h = handler();
  assert.equal((await h.send()).status, 200);
  assert.equal(h.calls.filter((c) => c.email).length, 1);
  assert.equal(
    h.calls.find((c) => c.name === "music_manage_admin").args.p_email,
    "admin@example.com",
  );
  for (const options of [{ exists: true }, { granted: false }]) {
    const h = handler(options);
    assert.equal((await h.send()).status, 409);
    assert.equal(h.calls.filter((c) => c.email).length, 0);
    assert.equal(h.calls.filter((c) => c.args?.p_remove).length, 0);
  }
});
test("existing portal users keep their access grant while failed deliveries roll it back", async () => {
  const existing = handler({ inviteError: { code: "email_exists" } });
  assert.equal((await existing.send()).status, 200);
  assert.equal(existing.calls.filter((c) => c.args?.p_remove).length, 0);
  const failure = handler({ inviteError: { code: "unexpected_failure" } });
  assert.equal((await failure.send()).status, 502);
  assert.equal(failure.calls.filter((c) => c.args?.p_remove).length, 1);
  const rollback = handler({
    inviteError: { code: "unexpected_failure" },
    rollbackFails: true,
  });
  const result = await rollback.send();
  assert.match((await result.json()).error, /access was granted/);
});
