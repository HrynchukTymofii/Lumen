// Text embeddings with Voyage AI (Anthropic has no embeddings model; Voyage is the one it recommends).
// Plain fetch, no SDK. Without VOYAGE_API_KEY, search falls back to keywords + the topic map.

export const EMBED_MODEL = "voyage-4";
export const EMBED_DIMENSIONS = 1024; // must match vector(1024) in search.verse_embedding

export const embeddingsConfigured = () => Boolean(process.env.VOYAGE_API_KEY);

type VoyageResponse = { data: { embedding: number[]; index: number }[]; usage: { total_tokens: number } };

// `document` for Bible text being indexed, `query` for what the user wrote
export async function embed(texts: string[], inputType: "document" | "query") {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input: texts, model: EMBED_MODEL, input_type: inputType, output_dimension: EMBED_DIMENSIONS }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Voyage embeddings: HTTP ${res.status} ${await res.text()}`);
  const json = (await res.json()) as VoyageResponse;
  return {
    vectors: json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding),
    tokens: json.usage.total_tokens,
  };
}

// pgvector's text form: "[0.1,0.2,…]"
export const toVector = (v: number[]) => `[${v.join(",")}]`;
