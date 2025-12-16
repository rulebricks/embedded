const DEFAULT_BASE_URL = "https://rulebricks.com";

/**
 * Generate an embed token for a Rulebricks rule.
 * Call this from your backend server, never expose your API key to the client.
 */
export async function createEmbedToken({
  apiKey,
  ruleId,
  baseUrl = DEFAULT_BASE_URL,
  expiresIn = 3600,
}) {
  if (!apiKey) throw new Error("apiKey is required");
  if (!ruleId) throw new Error("ruleId is required");

  const response = await fetch(`${baseUrl}/api/embed/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ ruleId, expiresIn }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error || `Failed to create token: ${response.status}`
    );
  }

  const data = await response.json();
  return {
    token: data.token,
    expiresAt: data.expiresAt,
    rule: {
      id: data.ruleId,
      name: data.ruleName,
    },
  };
}
