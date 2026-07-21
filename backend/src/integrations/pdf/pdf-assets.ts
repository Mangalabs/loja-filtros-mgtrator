import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const assetRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../assets",
);
const dataUriCache = new Map<string, string>();

export function pdfAssetDataUri(filename: string, mimeType: string) {
  const cached = dataUriCache.get(filename);

  if (cached) {
    return cached;
  }

  const data = readFileSync(path.join(assetRoot, filename)).toString("base64");
  const dataUri = `data:${mimeType};base64,${data}`;

  dataUriCache.set(filename, dataUri);

  return dataUri;
}
