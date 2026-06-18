import { createHash } from "crypto";

export function hashLookupToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getTokenLookupCandidates(token: string) {
  const tokenHash = hashLookupToken(token);

  if (tokenHash === token) {
    return [tokenHash];
  }

  // Mantém compatibilidade temporária com tokens antigos que já estavam salvos
  // em texto puro antes da migração para hash.
  return [tokenHash, token];
}
