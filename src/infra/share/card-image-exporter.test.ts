/**
 * @fileoverview The capture pipeline, proven over doubled native modules: the shot is
 * taken at the format's pixels, lands in the cache under a name worth sending, and the
 * system sheet opens on exactly that file.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';

import {captureRef} from 'react-native-view-shot';
import {shareAsync} from 'expo-sharing';

import {exportCardImage, type CardShot} from './card-image-exporter';

const {moves} = vi.hoisted(() => ({
  moves: [] as {from: string; to: string; overwrite?: boolean}[],
}));

vi.mock('react-native-view-shot', () => ({
  captureRef: vi.fn(async () => 'file:///tmp/shot-123.png'),
}));

vi.mock('expo-sharing', () => ({
  shareAsync: vi.fn(async () => {}),
}));

vi.mock('expo-file-system', () => {
  class FakeFile {
    readonly uri: string;

    constructor(...parts: ({uri: string} | string)[]) {
      this.uri = parts.map(part => (typeof part === 'string' ? part : part.uri)).join('/');
    }

    async move(destination: FakeFile, options?: {overwrite?: boolean}): Promise<void> {
      moves.push({from: this.uri, to: destination.uri, overwrite: options?.overwrite});
    }
  }
  return {File: FakeFile, Paths: {cache: {uri: 'file:///cache'}}};
});

const shot = {current: null} as CardShot;

describe('exportCardImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    moves.length = 0;
  });

  it('captures the square at 1080×1080 and shares the cache file it moved to', async () => {
    // When
    await exportCardImage(shot, 'square', 'the tea churn');

    // Then
    expect(captureRef).toHaveBeenCalledWith(shot, {
      format: 'png',
      result: 'tmpfile',
      width: 1080,
      height: 1080,
    });
    expect(moves).toEqual([
      {
        from: 'file:///tmp/shot-123.png',
        to: 'file:///cache/trungtrung-the-tea-churn-square.png',
        overwrite: true,
      },
    ]);
    expect(shareAsync).toHaveBeenCalledWith('file:///cache/trungtrung-the-tea-churn-square.png', {
      mimeType: 'image/png',
      UTI: 'public.png',
    });
  });

  it('captures the story at 1080×1920 under the story name', async () => {
    // When
    await exportCardImage(shot, 'story', 'the tea churn');

    // Then
    expect(captureRef).toHaveBeenCalledWith(
      shot,
      expect.objectContaining({width: 1080, height: 1920}),
    );
    expect(moves[0]?.to).toBe('file:///cache/trungtrung-the-tea-churn-story.png');
  });

  it('still names the file when the card name slugs away to nothing', async () => {
    // When
    await exportCardImage(shot, 'square', '…');

    // Then
    expect(moves[0]?.to).toBe('file:///cache/trungtrung-card-square.png');
  });

  it('surfaces a capture failure instead of sharing a file that was never made', async () => {
    // Given
    vi.mocked(captureRef).mockRejectedValueOnce(new Error('no surface'));

    // When
    const attempt = exportCardImage(shot, 'square', 'x');

    // Then
    await expect(attempt).rejects.toThrow('no surface');
    expect(shareAsync).not.toHaveBeenCalled();
  });
});
