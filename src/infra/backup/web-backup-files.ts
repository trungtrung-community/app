/**
 * @fileoverview The browser's backup file adapter — blob download, file input.
 *
 * The web build has no share sheet and no document picker module, but the
 * browser's own doors do the same jobs honestly: `writeAndShare` hands the
 * export to the download manager as a named blob, and `pick` opens the file
 * chooser through a detached `<input type="file">`. Chosen over an unavailable
 * no-op because `docs/06-testing.md` runs the whole end-to-end suite against
 * the Expo web build, and a restore flow that cannot run there cannot be
 * walked by Playwright either.
 *
 * Reached only through the container's web branch — the same shape as the
 * silent cue player, not the `.web.ts` Metro override that
 * `open-content-database.web.ts` needed: the expo backup modules bundle
 * cleanly for web, so nothing has to be kept out of the graph.
 */

import type {BackupFiles} from '../../ports/backup-files';

export class WebBackupFiles implements BackupFiles {
  async writeAndShare(name: string, contents: string): Promise<void> {
    const url = URL.createObjectURL(new Blob([contents], {type: 'application/json'}));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    // Revoking immediately can cancel the download in some browsers; a minute
    // is far past any download start, and the page unloading revokes anyway.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  pick(): Promise<{name: string; contents: string} | null> {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (file === undefined) {
          resolve(null);
          return;
        }
        file.text().then(
          contents => resolve({name: file.name, contents}),
          () => resolve(null),
        );
      });
      // Fired by browsers that close the chooser without a choice; a cancelled
      // pick is a normal outcome, the port says, not an error.
      input.addEventListener('cancel', () => resolve(null));
      input.click();
    });
  }
}
