/**
 * Canonical EIP-4361 (SIWE) message construction for Last Human Standing.
 *
 * Extracted from src/world/WorldProvider.jsx so the browser client, the
 * exhibition-agent runner (scripts/exhibition-agents.mjs), and tests all
 * produce byte-identical messages. server/routes/auth.js verifies these
 * with @worldcoin/minikit-js's verifySiweMessage — the domain/uri/chainId
 * are NOT server-checked, but the nonce, statement, requestId, signature,
 * and expiration are.
 */
export function constructSiweMessage({ domain, address, statement, uri, nonce, chainId, requestId, issuedAt, expirationTime }) {
  const issued = issuedAt ?? new Date().toISOString();
  const expires = expirationTime ?? new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const lines = [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    "",
    statement,
    "",
    `URI: ${uri}`,
    "Version: 1",
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issued}`,
    `Expiration Time: ${expires}`,
  ];
  if (requestId) {
    lines.push(`Request ID: ${requestId}`);
  }
  return lines.join("\n");
}
