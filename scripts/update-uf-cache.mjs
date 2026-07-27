import { readFileSync, writeFileSync } from "node:fs";

const outputPath = new URL("../data/uf-cache.json", import.meta.url);

const sources = [
  {
    name: "mindicador-diario",
    url: "https://mindicador.cl/api",
    parse: (data) => ({
      value: Number(data?.uf?.valor),
      date: data?.uf?.fecha || data?.fecha || null,
    }),
  },
  {
    name: "mindicador-uf",
    url: "https://mindicador.cl/api/uf",
    parse: (data) => ({
      value: Number(data?.serie?.[0]?.valor),
      date: data?.serie?.[0]?.fecha || null,
    }),
  },
];

async function fetchJson(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return source.parse(await response.json());
  } finally {
    clearTimeout(timeout);
  }
}

let lastError;

for (const source of sources) {
  try {
    const parsed = await fetchJson(source);
    if (Number.isFinite(parsed.value)) {
      writeFileSync(
        outputPath,
        `${JSON.stringify(
          {
            value: parsed.value,
            date: parsed.date,
            source: source.name,
            updatedAt: new Date().toISOString(),
          },
          null,
          2,
        )}\n`,
      );
      process.exit(0);
    }
  } catch (error) {
    lastError = error;
  }
}

const fallback = JSON.parse(readFileSync(outputPath, "utf8"));
writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      ...fallback,
      updateError: lastError?.message || "No se pudo actualizar",
      updatedAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
);
