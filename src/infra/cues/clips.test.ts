/**
 * @fileoverview The clip table names files that exist, and `sources.ts` agrees with it.
 *
 * This is the test that catches a renamed asset. Metro resolves `require` of an asset at
 * build time, so a wrong path is a build error on a device and nothing at all here — and
 * the gap between "I renamed a file" and "I found out" is otherwise a rebuild.
 *
 * `./sources` is read as **text** rather than imported. Importing it would `require` three
 * `.wav` files, which Metro understands and node does not, and that single fact is why
 * the table and the requires are two files instead of one.
 */

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {describe, expect, it} from 'vitest';

import {CUES, type Cue} from '../../domain/cue';

import {CLIPS} from './clips';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const SOUNDS = path.join(REPO, 'assets', 'sounds');

const BOUND = Object.keys(CLIPS) as (keyof typeof CLIPS)[];

describe('the clip table', () => {
  it('binds only cues that exist in the vocabulary', () => {
    // Then
    for (const cue of BOUND) {
      expect(CUES).toHaveProperty(cue);
    }
  });

  it('leaves the run unbound, because no clip fits it yet', () => {
    // Then — docs/07, 2026-08-18: notification.wav is 1.60 s and is reserved for N1/N2.
    expect(BOUND).not.toContain<Cue>('run');
  });

  it('names a file that build-sounds actually produced', () => {
    // Then
    for (const cue of BOUND) {
      expect(fs.existsSync(path.join(SOUNDS, `${CLIPS[cue].file}.wav`))).toBe(true);
    }
  });

  it('keeps every gain under full volume, so a cue sits below speech', () => {
    // Then
    for (const cue of BOUND) {
      expect(CLIPS[cue].gain).toBeGreaterThan(0);
      expect(CLIPS[cue].gain).toBeLessThan(1);
    }
  });
});

describe('sources.ts', () => {
  const source = fs.readFileSync(path.join(HERE, 'sources.ts'), 'utf8');

  it('requires exactly the files the table declares', () => {
    // When
    const required = [...source.matchAll(/assets\/sounds\/([\w-]+)\.wav/g)].map(match => match[1]);

    // Then
    expect(required.sort()).toEqual(BOUND.map(cue => CLIPS[cue].file).sort());
  });
});
