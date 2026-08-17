/**
 * @fileoverview One component's specimens, each state on its own card.
 *
 * This is how a port is verified: open the design system's `.card.html` beside it and
 * compare state for state. Cheaper than building 296 screens to find out whether a
 * component is right, and it catches the states a screen happens not to exercise.
 */

import {useLocalSearchParams} from 'expo-router';
import {ScrollView, Text, View} from 'react-native';

import {DS_ROSTER} from '../../src/components/ds-roster.generated';
import {mixedTibetan} from '../../src/components/learning/tibetan-text';
import {PORTED} from '../../src/components/specimens';

export default function ComponentSpecimens() {
  const {name} = useLocalSearchParams<{name: string}>();
  const entry = DS_ROSTER.find(candidate => candidate.name === name);
  const ported = name ? PORTED[name] : undefined;

  if (!entry) {
    return <Missing message={`${name} is not in the design system's manifest.`} />;
  }
  if (!ported) {
    return <Missing message={`${name} has not been ported yet.`} />;
  }

  return (
    <ScrollView className="flex-1 bg-surface-app" contentContainerClassName="p-5 gap-5">
      <View className="gap-1">
        <Text className="type-title text-fg-heading">{entry.name}</Text>
        <Text className="type-caption text-fg-muted">
          {`${entry.group} · ${entry.hasSource ? 'ported from source' : 'ported from the bundle'}` +
            `${entry.hasSpecimen ? ' · has a drawn specimen' : ' · no drawn specimen'}`}
        </Text>
      </View>

      {ported.specimens.map(specimen => (
        <View key={specimen.label} className="gap-2">
          <Text className="type-label uppercase text-fg-subtle">{specimen.label}</Text>
          {specimen.note ? (
            // Through mixedTibetan: a note explaining a Tibetan rule tends to quote
            // Tibetan, and the gallery is not exempt from the rule it documents. Left as a
            // plain string it rendered ར་བཏགས་ at caption metrics, stacks colliding.
            <Text className="type-caption text-fg-muted">{mixedTibetan(specimen.note)}</Text>
          ) : null}
          <View className="rounded-card bg-surface-card p-4">{specimen.render()}</View>
        </View>
      ))}
    </ScrollView>
  );
}

function Missing({message}: {message: string}) {
  return (
    <View className="flex-1 items-center justify-center bg-surface-app p-5">
      {/* Empty states point forward and state the limitation plainly. */}
      <Text className="type-body text-fg-muted text-center">{message}</Text>
    </View>
  );
}
