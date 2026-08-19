/**
 * @fileoverview The feel testbed — every cue, both switches, and the motion curves.
 *
 * The design system's board can draw a state. It cannot draw a sound, a vibration, or the
 * travel between two states, so none of this layer can be reviewed the way a component is
 * reviewed — by opening a `.card.html` beside it. This screen is the substitute: hold the
 * phone, fire each cue, and decide.
 *
 * It exists to answer three questions that only a device can answer:
 *
 * - **Is the level right?** A cue has to sit under speech. The gain steppers write into
 *   the live player, and the number they land on is what goes into
 *   `src/infra/cues/clips.ts`.
 * - **Is it fast enough?** Feel is mostly latency. `Fire 10×` is the stress: cues should
 *   arrive separately rather than smearing into one drone or dropping.
 * - **Does the reduce-motion path stay legible?** Turn the setting on and the sampler's
 *   dots should jump rather than travel — and still land somewhere that reads.
 *
 * It obeys the same adherence rules as shipping code, because a testbed that is allowed
 * raw values is a place where raw values get invented.
 *
 * **Unreachable in production since 2026-08-19, still bundled.** The 2026-08-18 check
 * found this screen's copy in a web export's entry bundle, with nothing anywhere gating
 * `_ds` on `__DEV__`. The group's `_layout.tsx` now redirects a production build to the
 * journey — one fix for the whole group rather than per file, as the gap predicted — and
 * the bundle-size half stays open as `docs/09` gap 18.
 */

import {useCallback, useRef, useState} from 'react';
import {ScrollView, Text, View, type TextStyle, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {useAnimatedStyle, type EasingFunctionFactory} from 'react-native-reanimated';

import {Button} from '../../src/components/core/button';
import {Divider} from '../../src/components/core/divider';
import {duration, easing} from '../../src/components/core/motion';
import {useToggleProgress} from '../../src/components/core/toggle-progress';
import {Confetti} from '../../src/components/feedback/confetti';
import {Switch} from '../../src/components/forms/switch';
import {SectionHeader} from '../../src/components/learning/section-header';
import {
  cue,
  setCueGain,
  setCuePreferences,
  CUE_CLIPS,
  type BoundCue,
} from '../../src/composition/cue';
import {CUES, CUE_NAMES, DEFAULT_CUE_PREFERENCES, type Cue} from '../../src/domain/cue';
import {
  color,
  fontFamily,
  fontSize,
  leading,
  radius,
  space,
} from '../../src/theme/tokens.generated';

/** How much one press of a gain stepper moves the level. */
const GAIN_STEP = 0.05;

/** How many cues the rapid-fire button sends, and how far apart. */
const BURST_COUNT = 10;
const BURST_GAP_MS = 120;

/** The log is a window, not a history — the last few fires are the ones being judged. */
const LOG_LIMIT = 12;

const BOUND = Object.keys(CUE_CLIPS) as BoundCue[];

function isBound(name: Cue): name is BoundCue {
  return (BOUND as Cue[]).includes(name);
}

type LogLine = {
  readonly id: number;
  readonly text: string;
  /** Milliseconds since the previous line, so a burst's spacing is visible. */
  readonly gap: number | null;
};

export default function FeelTestbed() {
  const insets = useSafeAreaInsets();
  const [preferences, setPreferences] = useState(DEFAULT_CUE_PREFERENCES);
  // A counter rather than a boolean: re-keying the burst is what makes a second press
  // restart it. A plain boolean already true would leave the first burst mid-fall.
  const [celebration, setCelebration] = useState<number | null>(null);
  const [gains, setGains] = useState<Record<string, number>>(() =>
    Object.fromEntries(BOUND.map(name => [name, CUE_CLIPS[name].gain])),
  );
  const [log, setLog] = useState<readonly LogLine[]>([]);
  const lastAt = useRef<number | null>(null);
  const nextId = useRef(0);

  const note = useCallback((text: string) => {
    const at = Date.now();
    const gap = lastAt.current === null ? null : at - lastAt.current;
    lastAt.current = at;
    nextId.current += 1;
    const line: LogLine = {id: nextId.current, text, gap};
    setLog(lines => [line, ...lines].slice(0, LOG_LIMIT));
  }, []);

  const fire = useCallback(
    (name: Cue) => {
      cue(name);
      // S12 is the one moment in the product that gets confetti (`docs/01`, signed
      // exception). The cue player deliberately does not do this: it fires sound and
      // haptics, and confetti is drawn. A screen composes the two, which is what S12 will
      // do for real.
      if (name === 'stop-complete') {
        setCelebration(current => (current ?? 0) + 1);
      }
      note(name);
    },
    [note],
  );

  const burst = useCallback(() => {
    note(`burst of ${BURST_COUNT}`);
    for (let i = 0; i < BURST_COUNT; i += 1) {
      setTimeout(() => cue('correct'), i * BURST_GAP_MS);
    }
  }, [note]);

  const changePreference = useCallback(
    (key: 'sound' | 'haptics', on: boolean) => {
      const next = {...preferences, [key]: on};
      setPreferences(next);
      void setCuePreferences(next);
      note(`${key} ${on ? 'on' : 'off'}`);
    },
    [preferences, note],
  );

  const changeGain = useCallback(
    (name: BoundCue, delta: number) => {
      // Clamped so a stepper cannot silence a clip or push it past the peak the build
      // normalised it to — both of which look like a broken cue rather than a setting.
      const next = Math.min(Math.max((gains[name] ?? 0) + delta, 0.05), 1);
      const rounded = Math.round(next * 100) / 100;
      setGains(current => ({...current, [name]: rounded}));
      void setCueGain(name, rounded);
      cue(name);
      note(`${name} at ${rounded}`);
    },
    [gains, note],
  );

  return (
    // The confetti is a sibling of the scroll view, not a child of its content: absolutely
    // positioned inside the content it would be sized to the content and would scroll with
    // it, so a burst fired at the top would be somewhere above the frame by the time it
    // fell.
    <View className="flex-1 bg-surface-app">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-5 gap-6"
        // The Dynamic Island and the home indicator. On the content container rather than
        // through a wrapping SafeAreaView: content should scroll *under* the island with
        // an inset in front of it, which is what iOS does everywhere else — a SafeAreaView
        // would cut the scroll off at the inset line and leave a dead band above it.
        // `SafeAreaProvider` has been mounted in `app/_layout.tsx` since the port and
        // nothing consumed it until 2026-08-18.
        contentContainerStyle={{paddingTop: insets.top, paddingBottom: insets.bottom}}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-1">
          <Text className="type-title text-fg-heading">Feel</Text>
          <Text className="type-caption text-fg-muted">
            Cues, switches and curves. Everything the board cannot draw.
          </Text>
        </View>

        <View className="gap-3">
          <SectionHeader align="start">Cues</SectionHeader>
          <View className="rounded-card bg-surface-card p-4 gap-4">
            {CUE_NAMES.map((name, index) => (
              <View key={name} className="gap-3">
                {index === 0 ? null : <Divider />}
                <View className="gap-1">
                  <View className="flex-row items-center justify-between gap-3">
                    <Text style={CUE_NAME}>{name}</Text>
                    <Text style={CUE_TRAITS}>
                      {[
                        isBound(name) ? 'sound' : 'no clip',
                        CUES[name].haptic ? 'haptic' : 'no haptic',
                        // The confetti is drawn by the screen rather than fired by the cue
                        // player, so nothing in the cue vocabulary knows about it. Naming
                        // it here is the only place a reader finds out that pressing this
                        // row does two things.
                        ...(name === 'stop-complete' ? ['confetti'] : []),
                      ].join(' · ')}
                    </Text>
                  </View>
                  <Text style={CUE_MOMENT}>{CUES[name].moment}</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Button size="sm" variant="ghost" onPress={() => fire(name)}>
                    {name === 'stop-complete' ? 'Play · confetti' : 'Play'}
                  </Button>
                  {isBound(name) ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => changeGain(name, -GAIN_STEP)}
                      >
                        Softer
                      </Button>
                      <Button size="sm" variant="ghost" onPress={() => changeGain(name, GAIN_STEP)}>
                        Louder
                      </Button>
                      <Text style={GAIN_READOUT}>{gains[name]?.toFixed(2)}</Text>
                    </>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
          <Button variant="ghost" iconLeft="shuffle" onPress={burst}>
            {`Fire ${BURST_COUNT}×`}
          </Button>
        </View>

        <View className="gap-3">
          <SectionHeader align="start">P2 switches</SectionHeader>
          <View className="rounded-card bg-surface-card p-4 gap-3">
            <Switch
              label="Sound"
              description="Interface sounds only. Recordings are never affected."
              checked={preferences.sound}
              onChange={on => changePreference('sound', on)}
            />
            <Divider />
            <Switch
              label="Vibration"
              description="One soft tick, on a correct answer and nowhere else."
              checked={preferences.haptics}
              onChange={on => changePreference('haptics', on)}
            />
          </View>
        </View>

        <View className="gap-3">
          <SectionHeader align="start">Motion</SectionHeader>
          <Text className="type-caption text-fg-muted">
            The same tokens every component animates with. Turn Reduce Motion on and these should
            jump rather than travel.
          </Text>
          <View className="rounded-card bg-surface-card p-4 gap-4">
            <Sampler label="out · fast" curve={easing.out} ms={duration.fast} />
            <Sampler label="out · base" curve={easing.out} ms={duration.base} />
            <Sampler label="inOut · base" curve={easing.inOut} ms={duration.base} />
            <Sampler label="settle · base" curve={easing.settle} ms={duration.base} />
            <Sampler label="out · slow" curve={easing.out} ms={duration.slow} />
          </View>
        </View>

        <View className="gap-3">
          <SectionHeader align="start">What fired</SectionHeader>
          <View className="rounded-card bg-surface-card p-4 gap-2">
            {log.length === 0 ? (
              <Text className="type-caption text-fg-muted">Nothing yet. Press a cue above.</Text>
            ) : (
              log.map(line => (
                <View key={line.id} className="flex-row items-center justify-between gap-3">
                  <Text style={LOG_TEXT}>{line.text}</Text>
                  <Text style={LOG_GAP}>{line.gap === null ? 'first' : `+${line.gap} ms`}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
      {celebration === null ? null : (
        <Confetti key={celebration} onDone={() => setCelebration(null)} />
      )}
    </View>
  );
}

/**
 * One curve, as a dot that travels and comes back.
 *
 * A dot rather than a graph: the question this screen answers is what a curve *feels*
 * like, and a plotted bezier is exactly the thing a token already states precisely.
 *
 * Through `useToggleProgress` rather than a local shared value, and that is not only
 * reuse — it is the same code path `Switch`, `Checkbox` and `Radio` animate on, so what
 * this screen shows is what those controls do rather than an imitation of it. Reduce
 * Motion is honoured without being named: Reanimated treats an absent `reduceMotion` as
 * `ReduceMotion.System`, which is why the hook has never needed to pass it.
 *
 * No clamp on the dot's travel. `easing.settle` overshoots deliberately and this is one
 * of the few places that should be *visible* — `clamp01` exists for colours, where
 * leaving the range produces a value that is not in the palette.
 */
function Sampler({label, curve, ms}: {label: string; curve: EasingFunctionFactory; ms: number}) {
  const [away, setAway] = useState(false);
  const progress = useToggleProgress(away, {durationMs: ms, curve});

  const run = useCallback(() => {
    setAway(current => !current);
  }, []);

  const dot = useAnimatedStyle(() => ({
    transform: [{translateX: progress.value * TRACK_TRAVEL}],
  }));

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-3">
        <Text style={SAMPLER_LABEL}>{label}</Text>
        <Text style={SAMPLER_MS}>{`${ms} ms`}</Text>
      </View>
      <View className="flex-row items-center gap-3">
        <View style={TRACK}>
          <Animated.View style={[DOT, dot]} />
        </View>
        <Button size="sm" variant="ghost" onPress={run}>
          Run
        </Button>
      </View>
    </View>
  );
}

/** How far the sampler's dot travels. Its track is the same width, less the dot. */
const TRACK_TRAVEL = 180;
const DOT_SIZE = 20;

const TRACK: ViewStyle = {
  width: TRACK_TRAVEL + DOT_SIZE,
  height: DOT_SIZE,
  justifyContent: 'center',
  borderRadius: radius.pill,
  backgroundColor: color.ground200,
};

const DOT: ViewStyle = {
  width: DOT_SIZE,
  height: DOT_SIZE,
  borderRadius: radius.pill,
  backgroundColor: color.surfaceAccent,
};

const CUE_NAME: TextStyle = {
  fontFamily: fontFamily.bodyBold,
  fontSize: fontSize.md,
  color: color.textHeading,
};

const CUE_TRAITS: TextStyle = {
  fontFamily: fontFamily.bodyMedium,
  fontSize: fontSize.xs,
  color: color.textSubtle,
};

const CUE_MOMENT: TextStyle = {
  fontFamily: fontFamily.bodyRegular,
  fontSize: fontSize.sm,
  lineHeight: fontSize.sm * leading.latin,
  color: color.textMuted,
};

const GAIN_READOUT: TextStyle = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.sm,
  color: color.textAccent,
  paddingLeft: space['1'],
};

const SAMPLER_LABEL: TextStyle = {
  fontFamily: fontFamily.bodySemibold,
  fontSize: fontSize.sm,
  color: color.textHeading,
};

const SAMPLER_MS: TextStyle = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.xs,
  color: color.textSubtle,
};

const LOG_TEXT: TextStyle = {
  fontFamily: fontFamily.bodyMedium,
  fontSize: fontSize.sm,
  color: color.textHeading,
};

const LOG_GAP: TextStyle = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.xs,
  color: color.textSubtle,
};
