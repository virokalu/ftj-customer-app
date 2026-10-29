import { Directory, File, Paths } from "expo-file-system";

import { ApiError, freshAccessToken } from "@/lib/api/client";
import { config } from "@/lib/config";

// Documents are downloaded with the access token (there is no public URL), cached by id,
// then shown with the system viewer (Quick Look on iOS: Done, Share, Save to Files).
// Contract §5.2 and guide §8.

const folder = () => new Directory(Paths.cache, "documents");

// Local name from the id only, never the server's file name (path-traversal safety).
const fileFor = (id: string) => new File(folder(), `${id.replace(/[^A-Za-z0-9_-]/g, "")}.pdf`);

async function isPdf(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return String.fromCharCode(...head) === "%PDF";
}

export async function openDocument(doc: { id: string; name: string }): Promise<void> {
  const file = fileFor(doc.id);
  if (!file.exists) {
    const token = await freshAccessToken();
    if (!token) throw new ApiError(401, "Session expired");
    const dir = folder();
    if (!dir.exists) dir.create({ idempotent: true });
    await File.downloadFileAsync(`${config.apiUrl}/documents/${encodeURIComponent(doc.id)}/file`, file, {
      headers: { Authorization: `Bearer ${token}` },
      idempotent: true,
    }).catch(() => {
      throw new ApiError(0, "Network request failed", "NETWORK");
    });
    // Errors come back as a JSON body, not bytes: never keep or open something that is not a PDF.
    if (!(await isPdf(file))) {
      file.delete();
      throw new ApiError(404, "File not found.", "NOT_FOUND");
    }
  }
  await File.preview(file, { title: doc.name, mimeType: "application/pdf" });
}

/** On sign-out and account deletion: no downloaded document may outlive the session. */
export function clearDocumentCache(): void {
  const dir = folder();
  if (dir.exists) dir.delete();
}
