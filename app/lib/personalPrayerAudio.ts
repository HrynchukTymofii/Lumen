import { Platform } from "react-native";

// Offline copies of personal prayer audio. The server signs each audio link for an hour; the file name in the link
// (<prayerId>-<textHash>.mp3) changes whenever the prayer is recorded again, so it doubles as the cache key.

const supported = Platform.OS !== "web";

function fileName(url: string) {
  const path = url.split("?")[0];
  return path.slice(path.lastIndexOf("/") + 1);
}

/** The downloaded copy's uri, if there is one. */
export async function localPrayerAudio(url: string) {
  if (!supported) return null;
  const { Directory, File, Paths } = await import("expo-file-system");
  const file = new File(new Directory(Paths.document, "personal-prayers"), fileName(url));
  return file.exists ? file.uri : null;
}

/** Saves the audio for offline listening. Errors are swallowed: it just plays from the network next time. */
export async function savePrayerAudio(url: string) {
  if (!supported) return;
  try {
    const { Directory, File, Paths } = await import("expo-file-system");
    const dir = new Directory(Paths.document, "personal-prayers");
    if (!dir.exists) dir.create({ intermediates: true });
    await File.downloadFileAsync(url, new File(dir, fileName(url)), { idempotent: true });
  } catch {
    // not worth bothering the person about
  }
}

/** Removes every saved copy of one prayer (after it is deleted). */
export async function removePrayerAudio(prayerId: string) {
  if (!supported) return;
  try {
    const { Directory, File, Paths } = await import("expo-file-system");
    const dir = new Directory(Paths.document, "personal-prayers");
    if (!dir.exists) return;
    for (const item of dir.list()) if (item instanceof File && item.name.startsWith(`${prayerId}-`)) item.delete();
  } catch {
    // ignore
  }
}
