import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { parseIranianMobile, maskMsisdn } from "../src/features/auth/phone.js";
import { startHarness, type Harness } from "./helpers.js";

let h: Harness;

before(async () => {
  h = await startHarness();
});
after(async () => {
  await h.close();
});

const json = (body: unknown) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

async function requestCode(phone: string) {
  return fetch(`${h.baseUrl}/api/v1/auth/otp/request`, json({ phone }));
}

/** Pulls the cookie jar out of a Set-Cookie list, ignoring the attributes. */
function cookieJar(res: Response): Record<string, string> {
  const jar: Record<string, string> = {};
  for (const raw of res.headers.getSetCookie()) {
    const [pair] = raw.split(";");
    const [name, ...rest] = (pair ?? "").split("=");
    if (name) jar[name] = rest.join("=");
  }
  return jar;
}

describe("phone normalisation", () => {
  it("accepts every spelling of the same number", () => {
    const spellings = ["09123456789", "+989123456789", "00989123456789", "989123456789", "0912 345 6789", "۰۹۱۲۳۴۵۶۷۸۹"];
    for (const raw of spellings) {
      const parsed = parseIranianMobile(raw);
      assert.equal(parsed.ok, true, `${raw} should parse`);
      assert.equal(parsed.ok && parsed.msisdn, "+989123456789");
    }
  });

  it("rejects bad lengths and unknown operator prefixes", () => {
    assert.equal(parseIranianMobile("091234567").ok, false);
    assert.equal(parseIranianMobile("09991234567").ok, false);
    assert.equal(parseIranianMobile("08123456789").ok, false);
    assert.equal(parseIranianMobile("").ok, false);
  });

  it("masks the middle digits", () => {
    assert.equal(maskMsisdn("+989123456789"), "0912***6789");
  });
});

describe("otp sign-in", () => {
  it("issues a code and signs an existing user in", async () => {
    const phone = "09123456789";
    const asked = await requestCode(phone);
    assert.equal(asked.status, 200);
    const body = (await asked.json()) as { expiresIn: number; masked: string };
    assert.equal(body.expiresIn, 120);
    assert.equal(body.masked, "0912***6789");

    const code = h.sms.lastCodeFor("+989123456789");
    const res = await fetch(`${h.baseUrl}/api/v1/auth/otp/verify`, json({ phone, code }));
    assert.equal(res.status, 200);

    const session = (await res.json()) as {
      accessToken: string;
      csrfToken: string;
      principal: { id: string; role: string; threads: string[] };
    };
    assert.equal(session.principal.id, "u_1");
    assert.equal(session.principal.role, "client");
    assert.deepEqual(session.principal.threads, ["th_1"]);

    const jar = cookieJar(res);
    assert.ok(jar.hf_rt, "refresh cookie is set");
    assert.equal(jar.hf_csrf, session.csrfToken);

    const rawRefresh = res.headers.getSetCookie().find((c) => c.startsWith("hf_rt="));
    assert.match(rawRefresh ?? "", /HttpOnly/i);
    assert.match(rawRefresh ?? "", /SameSite=Strict/i);
  });

  it("never returns the code in the response body", async () => {
    const asked = await requestCode("09351234567");
    const body = (await asked.json()) as Record<string, unknown>;
    // The capturing provider is not `console`, so no echo is allowed.
    assert.equal(body.devCode, undefined);
  });

  it("refuses a wrong code and reports the attempts left", async () => {
    const phone = "09011234567";
    await requestCode(phone);
    const res = await fetch(`${h.baseUrl}/api/v1/auth/otp/verify`, json({ phone, code: "00000" }));
    const body = (await res.json()) as { error: { code: string; details: { attemptsLeft: number } } };
    assert.equal(res.status, 400);
    assert.ok(["code_mismatch", "code_locked"].includes(body.error.code));
  });

  it("burns a code after one success", async () => {
    const phone = "09121112233";
    await requestCode(phone);
    const code = h.sms.lastCodeFor("+989121112233");
    const first = await fetch(`${h.baseUrl}/api/v1/auth/otp/verify`, json({ phone, code }));
    assert.equal(first.status, 200);

    const replay = await fetch(`${h.baseUrl}/api/v1/auth/otp/verify`, json({ phone, code }));
    assert.equal(replay.status, 400);
    const body = (await replay.json()) as { error: { code: string } };
    assert.equal(body.error.code, "no_challenge");
  });

  it("holds a resend inside the cooldown", async () => {
    const phone = "09129999999";
    assert.equal((await requestCode(phone)).status, 200);
    const again = await requestCode(phone);
    assert.equal(again.status, 429);
    assert.ok(Number(again.headers.get("retry-after")) > 0);
  });

  it("rejects a malformed number before any code is sent", async () => {
    const before = h.sms.sent.length;
    const res = await requestCode("0912345");
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: { code: string } };
    assert.equal(body.error.code, "invalid_input");
    assert.equal(h.sms.sent.length, before);
  });

  it("creates a client account on a first sign-in", async () => {
    const phone = "09141234567";
    await requestCode(phone);
    const code = h.sms.lastCodeFor("+989141234567");
    const res = await fetch(`${h.baseUrl}/api/v1/auth/otp/verify`, json({ phone, code }));
    assert.equal(res.status, 200);
    const session = (await res.json()) as { principal: { id: string; role: string } };
    assert.equal(session.principal.role, "client");

    const stored = await h.repo.getUserByPhone("+989141234567");
    assert.equal(stored?.id, session.principal.id);
  });
});

describe("session refresh", () => {
  it("mints a fresh access token from the cookie, but only with the CSRF header", async () => {
    const phone = "09153456789";
    await requestCode(phone);
    const code = h.sms.lastCodeFor("+989153456789");
    const signedIn = await fetch(`${h.baseUrl}/api/v1/auth/otp/verify`, json({ phone, code }));
    const jar = cookieJar(signedIn);
    const { csrfToken } = (await signedIn.json()) as { csrfToken: string };
    const cookieHeader = `hf_rt=${jar.hf_rt}; hf_csrf=${jar.hf_csrf}`;

    const noCsrf = await fetch(`${h.baseUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { cookie: cookieHeader },
    });
    assert.equal(noCsrf.status, 403);

    const ok = await fetch(`${h.baseUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { cookie: cookieHeader, "x-csrf-token": csrfToken },
    });
    assert.equal(ok.status, 200);
    const body = (await ok.json()) as { accessToken: string };
    assert.ok(body.accessToken.length > 20);
  });

  it("refuses a refresh with no cookie at all", async () => {
    const res = await fetch(`${h.baseUrl}/api/v1/auth/refresh`, { method: "POST" });
    assert.equal(res.status, 401);
  });

  it("clears both cookies on logout", async () => {
    const res = await fetch(`${h.baseUrl}/api/v1/auth/logout`, { method: "POST" });
    assert.equal(res.status, 204);
    const cleared = res.headers.getSetCookie();
    assert.ok(cleared.some((c) => c.startsWith("hf_rt=")));
    assert.ok(cleared.some((c) => c.startsWith("hf_csrf=")));
  });
});
