import { mkdir, readFile, writeFile } from "node:fs/promises";

// Reproduce the bundled photographs from their credited Commons sources.
const directory = new URL("../public/images/cocktails/", import.meta.url);
const photos = JSON.parse(
  await readFile(new URL("credits.json", directory), "utf8"),
);
await mkdir(directory, { recursive: true });

for (const photo of photos) {
  const filename = photo.src.split("/").at(-1);
  if (!/^[a-z-]+\.jpg$/.test(filename))
    throw new Error("Invalid photo filename");
  const target = new URL(filename, directory);
  try {
    await readFile(target);
    console.log(`${photo.name}: already downloaded`);
    continue;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const response = await fetch(photo.download, {
    headers: {
      "User-Agent": "BarManagerDev/1.0 (local development photo attribution)",
    },
    signal: AbortSignal.timeout(30000),
  });
  if (
    !response.ok ||
    !response.headers.get("content-type")?.startsWith("image/jpeg")
  ) {
    throw new Error(
      `${photo.name}: unexpected image response (${response.status})`,
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Photo exceeds 5 MB");
  await writeFile(target, bytes, { flag: "wx" });
  console.log(`${photo.name}: ${Math.round(bytes.byteLength / 1024)} KB`);
}
