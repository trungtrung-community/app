/**
 * @fileoverview build-sounds — the interface cues, in a format that can actually ship.
 *
 *   node scripts/build-sounds.ts            transcode
 *   node scripts/build-sounds.ts --check    fail if transcoding would change anything
 *
 * The four clips arrived as **Ogg Vorbis**, which could never have played. Two separate
 * reasons, either one fatal: this project's resolved Metro `assetExts` holds 31
 * extensions and `ogg` is not among them, so the files would not be bundled at all — and
 * iOS ships no Vorbis decoder, so they would be silent on iPhone even if they were.
 *
 * Output is **mono 44.1 kHz 16-bit WAV**. m4a would be roughly seven times smaller, and
 * that is the wrong trade here: the four total ~350 KB as WAV against ~50 KB as AAC, and
 * 0.3 MB is a tenth of one percent of the smallest bundle estimate in `docs/05`. WAV has
 * no decoder to spin up, and latency is what a cue is made of.
 *
 * Each clip is **peak-normalised to −1 dBFS** rather than left where the pack put it —
 * they arrive between −5.0 and −16.8 dB, which would make the per-cue gain table in
 * `src/infra/cues/clips.ts` a set of unrelated numbers instead of a set of comparable
 * ones. Loudness normalisation is deliberately *not* used: `loudnorm` measures over a
 * window and these clips are 0.3–1.6 s transients, so it would guess.
 *
 * **`--check` never runs ffmpeg.** It compares recorded hashes — of the inputs, of the
 * outputs, and of the recipe below — so it is portable to a machine that has no ffmpeg
 * and cannot pass merely because a transcoder happened to be missing. `-bitexact` is
 * what makes the comparison meaningful: without it the WAV carries a `LIST/INFO` chunk
 * naming the libavformat version, and the same input would hash differently on two
 * machines.
 *
 * Output keeps the source's basename. The mapping from a *cue* to a file is a product
 * decision and lives in `src/infra/cues/clips.ts`; this script only changes the format.
 * That is why `notification.wav` is produced with no cue pointing at it — it is reserved
 * for the local notification (N1/N2), which is a different mechanism entirely.
 */

import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = path.join(REPO, 'sounds');
const OUT_DIR = path.join(REPO, 'assets', 'sounds');
const LOCK = path.join(OUT_DIR, 'sounds.lock.json');

const CHECK = process.argv.includes('--check');

/** Where every clip's loudest sample is put, in dBFS. Below zero so nothing clips. */
const PEAK_TARGET_DB = -1;

const SAMPLE_RATE = 44100;

/**
 * The recipe, as a string, so a change to it invalidates the lock.
 *
 * `{gain}` is the only part that varies per clip. Everything else is fixed, which is the
 * point: two clips that went through different filters are not comparable, and the gain
 * table downstream assumes they are.
 */
const FILTER = `volume={gain}dB,aformat=sample_fmts=s16:channel_layouts=mono,aresample=${SAMPLE_RATE}`;

type Clip = {
  /** The basename, shared by input and output. */
  readonly name: string;
  readonly sourceSha256: string;
  readonly outputSha256: string;
  /** The clip's loudest sample before normalisation, in dBFS. */
  readonly peakDb: number;
  /** What was added to reach the target. */
  readonly gainDb: number;
  readonly bytes: number;
};

type Lock = {
  readonly $comment: string;
  readonly recipe: string;
  readonly peakTargetDb: number;
  readonly clips: readonly Clip[];
};

function fail(message: string): never {
  console.error(`build-sounds: ${message}`);
  process.exit(1);
}

function sha256(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function sources(): string[] {
  if (!fs.existsSync(SOURCE_DIR)) {
    fail(`No source directory at ${path.relative(REPO, SOURCE_DIR)}`);
  }
  return fs
    .readdirSync(SOURCE_DIR)
    .filter(entry => entry.endsWith('.ogg'))
    .sort();
}

/**
 * ffmpeg's combined output.
 *
 * `spawnSync` rather than `execFileSync` because ffmpeg writes everything to **stderr**,
 * including the one number this script reads — and `execFileSync` returns stdout, which
 * for ffmpeg is empty. That mistake fails as "no max_volume reported", which reads as a
 * broken clip rather than as a broken call.
 */
function ffmpeg(args: string[]): string {
  const result = spawnSync('ffmpeg', args, {encoding: 'utf8'});
  if (result.error) {
    fail(`ffmpeg could not be run — is it installed?\n${result.error.message}`);
  }
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (result.status !== 0) {
    fail(`ffmpeg exited ${result.status}:\n${output}`);
  }
  return output;
}

/**
 * The clip's loudest sample, in dBFS.
 *
 * A first pass whose only output is this number. Doing it in one pass is not possible:
 * the gain has to be known before the filter that applies it is built.
 */
function peakDb(file: string): number {
  const output = ffmpeg(['-hide_banner', '-i', file, '-af', 'volumedetect', '-f', 'null', '-']);
  const match = /max_volume:\s*(-?[\d.]+) dB/.exec(output);
  if (!match?.[1]) {
    fail(`ffmpeg reported no max_volume for ${path.basename(file)}`);
  }
  return Number(match[1]);
}

function transcode(source: string, out: string, gainDb: number): void {
  ffmpeg([
    '-v',
    'error',
    '-y',
    '-i',
    source,
    // Drops the source's tags, and `-bitexact` drops the muxer's own LIST/INFO chunk.
    // Together they are what make two machines produce the same bytes.
    '-map_metadata',
    '-1',
    '-bitexact',
    '-af',
    FILTER.replace('{gain}', gainDb.toFixed(1)),
    '-c:a',
    'pcm_s16le',
    out,
  ]);
}

function readLock(): Lock | null {
  if (!fs.existsSync(LOCK)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(LOCK, 'utf8')) as Lock;
  } catch {
    return null;
  }
}

/**
 * Prove the committed output still matches the committed input, with no ffmpeg.
 *
 * Three things have to agree, and each catches a different mistake: the recipe (someone
 * changed the filter and did not re-run), the inputs (someone replaced a clip), and the
 * outputs (someone edited or deleted a generated file).
 */
function check(names: string[]): void {
  const lock = readLock();
  if (!lock) {
    fail(`No lock at ${path.relative(REPO, LOCK)}.\nRun: npm run sync:sounds`);
  }
  if (lock.recipe !== FILTER || lock.peakTargetDb !== PEAK_TARGET_DB) {
    fail(`the recipe changed since the last run.\nRun: npm run sync:sounds`);
  }

  const locked = new Map(lock.clips.map(clip => [clip.name, clip]));
  const problems: string[] = [];

  for (const file of names) {
    const name = path.basename(file, '.ogg');
    const clip = locked.get(name);
    if (!clip) {
      problems.push(`${name}: in sounds/ but not in the lock`);
      continue;
    }
    locked.delete(name);
    if (sha256(path.join(SOURCE_DIR, file)) !== clip.sourceSha256) {
      problems.push(`${name}: the source changed`);
      continue;
    }
    const out = path.join(OUT_DIR, `${name}.wav`);
    if (!fs.existsSync(out)) {
      problems.push(`${name}: assets/sounds/${name}.wav is missing`);
    } else if (sha256(out) !== clip.outputSha256) {
      problems.push(`${name}: assets/sounds/${name}.wav was edited`);
    }
  }
  for (const name of locked.keys()) {
    problems.push(`${name}: in the lock but no longer in sounds/`);
  }

  if (problems.length) {
    fail(`out of date:\n${problems.map(p => `  ${p}`).join('\n')}\nRun: npm run sync:sounds`);
  }
  console.log(`build-sounds: up to date (${names.length} clips)`);
}

function build(names: string[]): void {
  fs.mkdirSync(OUT_DIR, {recursive: true});

  const clips: Clip[] = names.map(file => {
    const name = path.basename(file, '.ogg');
    const source = path.join(SOURCE_DIR, file);
    const out = path.join(OUT_DIR, `${name}.wav`);

    const peak = peakDb(source);
    const gain = Number((PEAK_TARGET_DB - peak).toFixed(1));
    transcode(source, out, gain);

    return {
      name,
      sourceSha256: sha256(source),
      outputSha256: sha256(out),
      peakDb: peak,
      gainDb: gain,
      bytes: fs.statSync(out).size,
    };
  });

  const lock: Lock = {
    $comment: 'GENERATED by scripts/build-sounds.ts — do not edit.',
    recipe: FILTER,
    peakTargetDb: PEAK_TARGET_DB,
    clips,
  };
  fs.writeFileSync(LOCK, `${JSON.stringify(lock, null, 2)}\n`);

  const total = clips.reduce((sum, clip) => sum + clip.bytes, 0);
  console.log(
    `build-sounds: ${clips.length} clips → assets/sounds/ (${Math.round(total / 1024)} KB)\n` +
      clips
        .map(
          c =>
            `             ${c.name}.wav  peak ${c.peakDb} dB  ${c.gainDb >= 0 ? '+' : ''}${c.gainDb} dB`,
        )
        .join('\n'),
  );
}

function main(): void {
  const names = sources();
  if (!names.length) {
    fail(`No .ogg files in ${path.relative(REPO, SOURCE_DIR)}`);
  }
  if (CHECK) {
    check(names);
    return;
  }
  build(names);
}

main();
