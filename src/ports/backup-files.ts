/**
 * @fileoverview Moving a backup file out of and into the app.
 *
 * Two consumers, both under the You tab's backup section: U2 hands the learner a
 * dated JSON export, and U3 lets them pick one back for restore. The port stays
 * ignorant of what the file contains — serialising is `ProgressStore.export()`'s
 * job, and reading the contents back is the restore use case's.
 *
 * No adapter exists yet. The concrete one arrives with the
 * `expo-file-system` / `expo-sharing` / `expo-document-picker` dependencies and
 * will be wired, like every adapter, only by `src/composition`.
 */

/** Write a backup file where the learner can keep it, and read one back. */
export type BackupFiles = {
  /**
   * Write `contents` to a file called `name` and open the platform share sheet,
   * so the learner decides where the backup goes (Files, Drive, AirDrop, ...).
   */
  writeAndShare(name: string, contents: string): Promise<void>;
  /**
   * Let the learner pick a backup file. Resolves null when they cancel — a
   * cancelled pick is a normal outcome, not an error.
   */
  pick(): Promise<{name: string; contents: string} | null>;
};
