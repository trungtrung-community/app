/**
 * @fileoverview The share seam's own rules: web gets no sharing at all, a device gets
 * the exporter, and an exporter failure never reaches the screen. The module is
 * re-imported per test because `canShareCard` is decided at import, which is the point
 * — the platform answer is a constant, not a check every caller repeats.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {CardShot} from '../infra/share/card-image-exporter';

const {platform} = vi.hoisted(() => ({platform: {OS: 'ios'}}));

vi.mock('react-native', () => ({Platform: platform}));

vi.mock('../infra/share/card-image-exporter', () => ({
  exportCardImage: vi.fn(async () => {}),
}));

vi.mock('expo-clipboard', () => ({
  setStringAsync: vi.fn(async () => true),
}));

const shot = {current: null} as CardShot;

async function seam() {
  return import('./share');
}

describe('the share seam', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    platform.OS = 'ios';
  });

  it('hands the capture to the exporter on a device', async () => {
    // Given
    const {shareCardImage, canShareCard} = await seam();
    const {exportCardImage} = await import('../infra/share/card-image-exporter');

    // When
    await shareCardImage(shot, 'story', 'the tea churn');

    // Then
    expect(canShareCard).toBe(true);
    expect(exportCardImage).toHaveBeenCalledWith(shot, 'story', 'the tea churn');
  });

  it('offers nothing on web', async () => {
    // Given
    platform.OS = 'web';
    const {shareCardImage, canShareCard} = await seam();
    const {exportCardImage} = await import('../infra/share/card-image-exporter');

    // When
    await shareCardImage(shot, 'square', 'x');

    // Then
    expect(canShareCard).toBe(false);
    expect(exportCardImage).not.toHaveBeenCalled();
  });

  it('swallows an exporter failure', async () => {
    // Given
    const {shareCardImage} = await seam();
    const {exportCardImage} = await import('../infra/share/card-image-exporter');
    vi.mocked(exportCardImage).mockRejectedValueOnce(new Error('capture died'));

    // When
    const attempt = shareCardImage(shot, 'square', 'x');

    // Then
    await expect(attempt).resolves.toBeUndefined();
  });

  it('writes the Tibetan to the clipboard', async () => {
    // Given
    const {copyTibetan} = await seam();
    const clipboard = await import('expo-clipboard');

    // When
    await copyTibetan('སྡོང་མོ');

    // Then
    expect(clipboard.setStringAsync).toHaveBeenCalledWith('སྡོང་མོ');
  });

  it('lets a clipboard failure reject, unlike the image path', async () => {
    // Given
    const {copyTibetan} = await seam();
    const clipboard = await import('expo-clipboard');
    vi.mocked(clipboard.setStringAsync).mockRejectedValueOnce(new Error('no clipboard'));

    // When
    const attempt = copyTibetan('x');

    // Then
    await expect(attempt).rejects.toThrow('no clipboard');
  });
});
