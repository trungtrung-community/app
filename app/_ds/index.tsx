/**
 * @fileoverview The specimen gallery index — all 51 components, ported or not.
 *
 * The list is generated from the design system's manifest, so it cannot quietly
 * disagree with the board about which components exist. Anything without a specimen
 * entry shows as pending, which makes the port's progress a fact on screen rather
 * than a note somewhere.
 *
 * Dev-only. `app/_layout.tsx` does not register this group in a production build.
 */

import {Link} from 'expo-router';
import {ScrollView, Text, View} from 'react-native';

import {DS_ROSTER, type DsGroup} from '../../src/components/ds-roster.generated';
import {PORTED} from '../../src/components/specimens';

const GROUP_ORDER: DsGroup[] = ['core', 'forms', 'feedback', 'learning'];

export default function GalleryIndex() {
  const ported = DS_ROSTER.filter(entry => PORTED[entry.name]).length;

  return (
    <ScrollView className="flex-1 bg-surface-app" contentContainerClassName="p-5 gap-6">
      <View className="gap-1">
        <Text className="type-title text-fg-heading">Design system</Text>
        <Text className="type-caption text-fg-muted">
          {`${ported} of ${DS_ROSTER.length} ported`}
        </Text>
      </View>

      {GROUP_ORDER.map(group => {
        const entries = DS_ROSTER.filter(entry => entry.group === group);
        return (
          <View key={group} className="gap-2">
            <Text className="type-label uppercase text-fg-subtle">
              {`${group} · ${entries.filter(e => PORTED[e.name]).length}/${entries.length}`}
            </Text>
            <View className="rounded-card bg-surface-card overflow-hidden">
              {entries.map((entry, index) => (
                <Row key={entry.name} entry={entry} first={index === 0} />
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function Row({entry, first}: {entry: (typeof DS_ROSTER)[number]; first: boolean}) {
  const done = Boolean(PORTED[entry.name]);

  const label = (
    <View className={`flex-row items-center gap-3 px-4 py-3 ${first ? '' : 'border-t-0'}`}>
      {/* A status dot always carries a text equivalent — colour alone is never a signal. */}
      <View className={`h-2 w-2 rounded-pill ${done ? 'bg-surface-accent' : 'bg-ground-300'}`} />
      <Text className={`type-body flex-1 ${done ? 'text-fg-heading' : 'text-fg-subtle'}`}>
        {entry.name}
      </Text>
      <Text className="type-caption text-fg-subtle">
        {done ? 'ported' : entry.hasSpecimen ? 'has specimen' : 'no specimen'}
      </Text>
    </View>
  );

  return done ? (
    <Link href={{pathname: '/_ds/[name]', params: {name: entry.name}}}>{label}</Link>
  ) : (
    label
  );
}
