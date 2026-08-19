/**
 * @fileoverview The adapter's translation duties, against mocked expo modules.
 *
 * Like `expo-reminder-scheduler.test.ts`, a mock rather than a fake: the
 * adapter has no rules of its own, only the call shape — file written before
 * the sheet opens, the given name kept exactly, a cancelled pick answered as
 * null rather than an error.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';

import {ExpoBackupFiles} from './expo-backup-files';

const {order, textByUri} = vi.hoisted(() => ({
  order: [] as string[],
  textByUri: new Map<string, string>(),
}));

vi.mock('expo-file-system', () => {
  class File {
    readonly uri: string;

    constructor(...parts: string[]) {
      this.uri = parts.join('/');
    }

    write(contents: string): void {
      order.push('write');
      textByUri.set(this.uri, contents);
    }

    text(): Promise<string> {
      return Promise.resolve(textByUri.get(this.uri) ?? '');
    }
  }
  return {File, Paths: {cache: 'file:///cache'}};
});

vi.mock('expo-sharing', () => ({
  shareAsync: vi.fn(async () => {
    order.push('share');
  }),
}));

vi.mock('expo-document-picker', () => ({getDocumentAsync: vi.fn()}));

const Sharing = vi.mocked(await import('expo-sharing'));
const DocumentPicker = vi.mocked(await import('expo-document-picker'));

describe('ExpoBackupFiles', () => {
  const files = new ExpoBackupFiles();

  beforeEach(() => {
    vi.clearAllMocks();
    order.length = 0;
    textByUri.clear();
  });

  describe('writeAndShare', () => {
    it('writes the cache file under the given name, then opens the share sheet', async () => {
      // When
      await files.writeAndShare('Trungtrung backup — 2026-08-19.json', '{"walkedOn":[]}');

      // Then
      expect(order).toEqual(['write', 'share']);
      expect(textByUri.get('file:///cache/Trungtrung backup — 2026-08-19.json')).toBe(
        '{"walkedOn":[]}',
      );
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        'file:///cache/Trungtrung backup — 2026-08-19.json',
        {mimeType: 'application/json', UTI: 'public.json'},
      );
    });
  });

  describe('pick', () => {
    it('asks the picker for JSON and reads the chosen file back', async () => {
      // Given
      textByUri.set('file:///cache/picked', '{"items":{}}');
      DocumentPicker.getDocumentAsync.mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file:///cache/picked',
            name: 'walk.json',
            size: 12,
            mimeType: 'application/json',
            lastModified: 0,
          },
        ],
      });

      // When
      const picked = await files.pick();

      // Then
      expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledWith({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      expect(picked).toEqual({name: 'walk.json', contents: '{"items":{}}'});
    });

    it('answers a cancelled pick with null, not an error', async () => {
      // Given
      DocumentPicker.getDocumentAsync.mockResolvedValue({canceled: true, assets: null});

      // When
      const picked = await files.pick();

      // Then
      expect(picked).toBeNull();
    });
  });
});
