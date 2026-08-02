// @vitest-environment node
import { describe, expect, it } from "vitest";
import { verifySiweMessage } from "@worldcoin/minikit-js/siwe";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { constructSiweMessage } from "../server/lib/siweMessage.js";
import { annotateAgentReveals } from "../server/index.js";

describe("exhibition agent SIWE (runner auth path)", () => {
  it("a viem personal_sign SIWE payload passes the server's verifySiweMessage", async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const nonce = "deadbeefcafe";
    const statement = "Sign in to Last Human Standing";
    const message = constructSiweMessage({
      domain: "lasthumanstanding.thisyearnofear.com",
      address: account.address,
      statement,
      uri: "https://lasthumanstanding.thisyearnofear.com",
      nonce,
      chainId: 480,
    });
    const signature = await account.signMessage({ message });
    const result = await verifySiweMessage(
      { status: "success", message, signature, address: account.address, version: 1 },
      nonce,
      statement,
      undefined,
    );
    expect(result.isValid).toBe(true);
    expect(result.siweMessageData.address.toLowerCase()).toBe(account.address.toLowerCase());
  });

  it("throws on a wrong nonce (server catches → 400 siwe_verification_failed)", async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const message = constructSiweMessage({
      domain: "x", address: account.address, statement: "s", uri: "https://x", nonce: "right", chainId: 480,
    });
    const signature = await account.signMessage({ message });
    await expect(
      verifySiweMessage(
        { status: "success", message, signature, address: account.address, version: 1 },
        "wrong",
        "s",
        undefined,
      ),
    ).rejects.toThrow(/[Nn]once/);
  });
});

describe("annotateAgentReveals", () => {
  const AGENT = "0xaA00000000000000000000000000000000000001";
  const HUMAN = "0xbB00000000000000000000000000000000000002";
  const subs = [
    { id: 1, day: 1, address: AGENT },
    { id: 2, day: 1, address: HUMAN },
    { id: 3, day: 2, address: AGENT },
    { id: 4, day: 2, address: HUMAN },
  ];

  it("reveals labels only for closed days, case-insensitively", () => {
    const out = annotateAgentReveals(subs, [AGENT.toLowerCase()], 2);
    expect(out[0].agentRevealed).toBe(true);   // day 1 agent, closed
    expect(out[1].agentRevealed).toBe(false);  // day 1 human, closed
    expect(out[2].agentRevealed).toBe(null);   // day 2 is the live day — hidden
    expect(out[3].agentRevealed).toBe(null);
  });

  it("hides everything when the current day is unknown", () => {
    const out = annotateAgentReveals(subs, [AGENT], null);
    expect(out.every((s) => s.agentRevealed === null)).toBe(true);
  });

  it("never marks non-listed addresses as agents", () => {
    const out = annotateAgentReveals(subs, [], 3);
    expect(out.every((s) => s.agentRevealed === false)).toBe(true);
  });
});
