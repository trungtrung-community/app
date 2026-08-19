/**
 * @fileoverview The device's backup file adapter — cache file, share sheet, picker.
 *
 * `writeAndShare` stages the export in the cache directory under exactly the
 * name it is given, then hands it to the platform share sheet. The learner
 * decides where the backup goes; the cache copy is disposable and the system
 * reclaims it. `pick` is the way back in: the document picker filtered to JSON,
 * read through the same `File` class.
 *
 * Pure translation, no rules of its own — tested by call shape, the way
 * `expo-reminder-scheduler.test.ts` explains.
 */

import * as DocumentPicker from 'expo-document-picker';
import {File, Paths} from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type {BackupFiles} from '../../ports/backup-files';

export class ExpoBackupFiles implements BackupFiles {
  async writeAndShare(name: string, contents: string): Promise<void> {
    const file = new File(Paths.cache, name);
    file.write(contents);
    await Sharing.shareAsync(file.uri, {mimeType: 'application/json', UTI: 'public.json'});
  }

  async pick(): Promise<{name: string; contents: string} | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (result.canceled) {
      return null;
    }
    const asset = result.assets[0];
    if (asset === undefined) {
      return null;
    }
    return {name: asset.name, contents: await new File(asset.uri).text()};
  }
}
