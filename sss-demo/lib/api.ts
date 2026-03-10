const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function call(method: string, path: string, body?: object) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? "Unknown error");
  return data;
}

export const api = {
  health: () => call("GET", "/health"),

  mint: {
    config: (mint: string) => call("GET", `/mint/${mint}/config`),
    transferAuthority: (mint: string, newAuthority: string) =>
      call("POST", `/mint/${mint}/transfer-authority`, { newAuthority }),
  },

  roles: {
    check: (mint: string, address: string, role: string) =>
      call("GET", `/roles/${mint}/check?address=${address}&role=${role}`),
    grant: (mint: string, address: string, role: string, quotaLimit?: string) =>
      call("POST", `/roles/${mint}/grant`, { address, role, quotaLimit }),
    revoke: (mint: string, address: string, role: string) =>
      call("POST", `/roles/${mint}/revoke`, { address, role }),
  },

  compliance: {
    check: (mint: string, address: string) =>
      call("GET", `/compliance/${mint}/check?address=${address}`),
    blacklist: (mint: string, address: string) =>
      call("POST", `/compliance/${mint}/blacklist`, { address }),
    unblacklist: (mint: string, address: string) =>
      call("POST", `/compliance/${mint}/unblacklist`, { address }),
    seize: (
      mint: string,
      source: string,
      destination: string,
      amount: string,
    ) =>
      call("POST", `/compliance/${mint}/seize`, {
        source,
        destination,
        amount,
      }),
  },

  operations: {
    pause: (mint: string) => call("POST", `/operations/${mint}/pause`),
    unpause: (mint: string) => call("POST", `/operations/${mint}/unpause`),
    freeze: (mint: string, tokenAccount: string) =>
      call("POST", `/operations/${mint}/freeze`, { tokenAccount }),
    thaw: (mint: string, tokenAccount: string) =>
      call("POST", `/operations/${mint}/thaw`, { tokenAccount }),
  },
};
