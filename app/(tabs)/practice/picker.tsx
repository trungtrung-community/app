/**
 * @fileoverview The practice picker — Q8, V3, E3 and Q8·stop as one screen.
 *
 * One machine with arguments (docs/03 §4.6): the route's `pool` names what the
 * set is drawn from, the switch narrows it to the still-getting selection, and
 * each mode card names its own count in its own unit. The pool is resolved
 * once per focus; the selection is applied locally through the same pure
 * `selectSet` the runner uses, so flipping the switch refreshes every count in
 * place without blanking the screen. A mode the set cannot fill is absent —
 * never greyed, never explained. A set of 1–2 never shows this screen: the
 * route decision replaces straight to the flashcard runner at 1 of 1. An
 * emptied set is said in one line with one way out (Q8·empty).
 */

import {useFocusEffect, useLocalSearchParams, useRouter} from 'expo-router';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {ScrollView, Text, View, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {IconButton} from '../../../src/components/core/icon-button';
import {EmptyState} from '../../../src/components/feedback/empty-state';
import {Skeleton} from '../../../src/components/feedback/skeleton';
import {ModeCard} from '../../../src/components/learning/mode-card';
import {StatPill} from '../../../src/components/learning/stat-pill';
import {Switch} from '../../../src/components/forms/switch';
import type {IconName} from '../../../src/components/core/icon';

import {toIsoDate} from '../../../src/domain/date';
import {useDrillSession} from '../../../src/store/drill';
import {useProgress} from '../../../src/store/progress';
import {useContent} from '../../../src/store/use-content';
import {availableModes, type DrillMode, type DrillModeId} from '../../../src/usecases/drill-modes';
import {parsePoolParam, type DrillPoolRef} from '../../../src/usecases/drill-pool';
import {routeForSet, selectSet, type DrillSelection} from '../../../src/usecases/drill-plan';

/** One line each, the board's own words (V3/E3/Q8). */
const BODIES: Record<DrillModeId, string> = {
  flashcards: 'See it, say it, turn it over.',
  'word-recognise': 'Hear it. Choose what it means.',
  'phrase-recognise': 'Hear the phrase. Choose what it means.',
  'pair-match': 'Five words, five meanings. Clear the board.',
};

const ICONS: Record<DrillModeId, IconName> = {
  flashcards: 'columns-2',
  'word-recognise': 'volume-2',
  'phrase-recognise': 'message-circle',
  'pair-match': 'shuffle',
};

/** The count in the mode's own unit, abbreviated as the board abbreviates it. */
function countLabel(mode: DrillMode, count: number): string {
  switch (mode.unit) {
    case 'cards':
      return `${count} cards`;
    case 'questions':
      return `${count} quest.`;
    case 'boards':
      return `${count} boards`;
    default:
      return `${count}`;
  }
}

/** The pool's display name, for the scope pill. */
function useScopeName(ref: DrillPoolRef | null): string {
  const load = useContent(
    async source => {
      if (ref === null) {
        return '';
      }
      switch (ref.kind) {
        case 'everything':
          return 'Everything';
        case 'district': {
          const district = await source.getDistrict(ref.slug);
          return district.name;
        }
        case 'stop': {
          const stop = await source.getStop(ref.stopId);
          return stop.name;
        }
        case 'section':
          return 'This section';
        default:
          return '';
      }
    },
    [ref === null ? '' : JSON.stringify(ref)],
  );
  return load.status === 'ready' ? load.data : '';
}

export default function Picker() {
  const params = useLocalSearchParams<{pool?: string; selection?: string; entry?: string}>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const slice = useDrillSession();
  const progress = useProgress(state => state.progress);

  const ref = useMemo<DrillPoolRef | null>(() => {
    try {
      return parsePoolParam(params.pool ?? '');
    } catch {
      return null;
    }
  }, [params.pool]);

  const [selection, setSelection] = useState<DrillSelection>(
    params.selection === 'still-getting' ? 'still-getting' : 'all',
  );
  const entry = params.entry ?? 'practice';
  const scopeName = useScopeName(ref);

  // The pool once per focus; the selection is a local filter over it.
  useFocusEffect(
    useCallback(() => {
      if (ref !== null) {
        void useDrillSession.getState().start(ref, 'all', null);
      }
    }, [ref]),
  );

  const pool = slice.pool;
  const set = useMemo(
    () => (pool === null ? null : selectSet(pool, selection, progress, toIsoDate(new Date()))),
    [pool, selection, progress],
  );
  const route = set === null ? null : routeForSet(set);

  const runnerParams = `pool=${params.pool ?? ''}&selection=${selection}&entry=${entry}`;

  // §4's rule: a set of 1–2 skips the picker. The runner replaces this screen
  // so leaving the drill does not land back on a picker it never really saw.
  const redirect = route === 'flashcards';
  useEffect(() => {
    if (redirect) {
      router.replace(`/drill/flashcards?${runnerParams}`);
    }
  }, [redirect, router, runnerParams]);

  if (ref === null) {
    return (
      <View className="flex-1 bg-surface-app px-5 pt-6" style={{paddingTop: insets.top}}>
        <EmptyState title="That practice set is off the map" />
      </View>
    );
  }

  const words = set?.itemIds.filter(itemId => pool?.itemKinds.get(itemId) === 'vocab').length ?? 0;
  const phrases = (set?.itemIds.length ?? 0) - words;

  return (
    <View className="flex-1 bg-surface-app" style={{paddingTop: insets.top}}>
      <View className="flex-row items-center gap-3 px-5 py-2">
        {/* The design system has no chevron-left; the down one rotates, as ListRow's does. */}
        <IconButton
          icon="chevron-down"
          label="Back"
          style={BACK_ROTATION}
          onPress={() => router.back()}
        />
        <Text accessibilityRole="header" className="type-title text-fg-heading flex-1">
          Practise
        </Text>
        {scopeName ? <StatPill tone="accent" value={scopeName} label={scopeName} /> : null}
      </View>
      {slice.status === 'error' ? (
        <View className="px-5 pt-6">
          <EmptyState title="Try opening practice again" />
        </View>
      ) : slice.status !== 'ready' || set === null || redirect ? (
        <View className="gap-2 px-5 pt-4">
          <Skeleton shape="block" height={72} />
          <Skeleton shape="block" height={72} />
          <Skeleton shape="block" height={72} />
        </View>
      ) : route === 'empty' ? (
        <Empty selection={selection} onUnfiltered={() => setSelection('all')} />
      ) : (
        <ScrollView>
          <View className="gap-3 px-5 pb-8">
            <Text className="type-body text-fg-muted">
              {`${words} ${words === 1 ? 'word' : 'words'} · ${phrases} ${
                phrases === 1 ? 'phrase' : 'phrases'
              }`}
            </Text>
            <Switch
              label="Only the ones I'm still getting"
              checked={selection === 'still-getting'}
              onChange={on => setSelection(on ? 'still-getting' : 'all')}
            />
            {availableModes(set).map(({mode, count}) => (
              <ModeCard
                key={mode.id}
                title={mode.title}
                body={BODIES[mode.id]}
                icon={ICONS[mode.id]}
                count={countLabel(mode, count)}
                onPress={() => router.push(`/drill/${mode.id}?${runnerParams}`)}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

type EmptyProps = {
  selection: DrillSelection;
  onUnfiltered: () => void;
};

/**
 * Q8·empty — the filter emptied the set. One line, no counts, one way out:
 * the button IS the switch turning off, so the switch is not offered again.
 * An unfiltered pool with nothing taught has no way out to offer; the same
 * register simply points back at the walk.
 */
function Empty({selection, onUnfiltered}: EmptyProps) {
  if (selection === 'still-getting') {
    return (
      <View className="px-5 pt-6">
        <EmptyState
          title="You're getting all of these"
          action="Practise all of it"
          onAction={onUnfiltered}
        />
      </View>
    );
  }
  return (
    <View className="px-5 pt-6">
      <EmptyState title="Practice grows as you walk" />
    </View>
  );
}

const BACK_ROTATION: ViewStyle = {transform: [{rotate: '90deg'}]};
