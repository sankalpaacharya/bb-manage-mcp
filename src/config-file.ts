import {
  lstat,
  readFile,
  writeFile,
  rename,
  unlink,
  mkdir,
  link,
} from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
const active = new Set<string>();
export async function updateConfig(
  path: string,
  edit: (text: string) => string,
  allowCreate = false,
): Promise<void> {
  if (active.has(path))
    throw new Error("Configuration is being updated. Try again.");
  active.add(path);
  const temporary = path + "." + randomUUID() + ".tmp";
  try {
    const before = await lstat(path).catch((error) => {
      if (allowCreate && error.code === "ENOENT") return null;
      throw error;
    });
    if (
      before &&
      (!before.isFile() || before.isSymbolicLink() || before.size > 1048576)
    )
      throw new Error("Unsupported configuration file");
    const original = before ? await readFile(path, "utf8") : "";
    const updated = edit(original);
    if (Buffer.byteLength(updated) > 1048576)
      throw new Error("Configuration exceeds 1 MiB.");
    if (before)
      await writeFile(path + ".backup-" + randomUUID(), original, {
        flag: "wx",
        mode: 0o600,
      });
    else await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await writeFile(temporary, updated, {
      flag: "wx",
      mode: before ? before.mode & 0o777 : 0o600,
    });
    if (before) {
      const current = await lstat(path);
      if (
        current.ino !== before.ino ||
        current.mtimeMs !== before.mtimeMs ||
        (await readFile(path, "utf8")) !== original
      )
        throw new Error("Configuration changed. Refresh and try again.");
      await rename(temporary, path);
    } else await link(temporary, path); // Atomic creation refuses a concurrently created file.
  } finally {
    active.delete(path);
    await unlink(temporary).catch(() => {});
  }
}
