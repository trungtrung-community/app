/**
 * @fileoverview You — your data (U1), with the U2 export behind its row.
 *
 * One screen holds the whole conversation, in the board's order: where the
 * walk lives (the local-only truth, stated first), the backup door, the
 * restore door, and the delete door. The backup is U2 — one dated JSON file
 * through the `BackupFiles` port and the platform share sheet; its name never
 * wraps, so the display line middle-truncates. Restore is its own screen (U3),
 * one push away.
 */

import {useRouter} from 'expo-router';
import {useState} from 'react';
import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button} from '../../../src/components/core/button';
import {ListRow} from '../../../src/components/core/list-row';
import {Dialog} from '../../../src/components/feedback/dialog';

import {backup, progress as progressStore} from '../../../src/composition/container';
import {toIsoDate} from '../../../src/domain/date';
import {useProgress} from '../../../src/store/progress';

/** What the share sheet was handed, echoed so the learner can find it again. */
type SharedBackup = {readonly name: string; readonly kilobytes: number};

export default function YourData() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [shared, setShared] = useState<SharedBackup | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function makeBackup(): Promise<void> {
    setFailed(false);
    try {
      const store = await progressStore();
      const exported = await store.export();
      const name = `Trungtrung backup — ${toIsoDate(new Date())}.json`;
      await (await backup()).writeAndShare(name, exported);
      setShared({name, kilobytes: Math.max(1, Math.round(exported.length / 1024))});
    } catch {
      setShared(null);
      setFailed(true);
    }
  }

  async function clearProgress(): Promise<void> {
    const store = await progressStore();
    await store.clear();
    useProgress.getState().apply(await store.load());
    setConfirming(false);
  }

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="gap-2 px-5 pb-8" style={{paddingTop: insets.top}}>
        <Text className="type-body text-fg-body">
          Your walk is saved on this device. Nothing is sent anywhere. If you change phones, make a
          backup first.
        </Text>
        <ListRow
          label="Make a backup"
          sub="One file, named so you can find it a year later."
          onPress={() => {
            void makeBackup();
          }}
          chevron={false}
        />
        {shared !== null ? (
          <View>
            <Text className="type-caption text-fg-body" numberOfLines={1} ellipsizeMode="middle">
              {shared.name}
            </Text>
            <Text className="type-caption text-fg-muted">
              {`Backup ready · ${shared.kilobytes} KB · your walk, your ratings and your found cards`}
            </Text>
          </View>
        ) : null}
        {failed ? (
          <Text className="type-caption text-fg-muted">
            The backup could not be made. Nothing was changed.
          </Text>
        ) : null}
        <ListRow
          label="Restore from a backup"
          sub="Bring a walk back from a backup file."
          onPress={() => router.push('/you/restore')}
          chevron={false}
        />
        <ListRow
          label="Delete everything"
          sub="Erase what is stored on this device."
          tone="danger"
          onPress={() => setConfirming(true)}
          chevron={false}
        />
      </View>
      <Dialog
        open={confirming}
        title="Clear your progress?"
        onClose={() => setConfirming(false)}
        footer={
          <>
            <Button variant="danger" onPress={() => void clearProgress()}>
              Clear
            </Button>
            <Button variant="ghost" onPress={() => setConfirming(false)}>
              Keep it
            </Button>
          </>
        }
      >
        <Text className="type-body text-fg-body">
          {"Days walking, and every word's status, are erased from this device. A backup " +
            'made before now still has them.'}
        </Text>
      </Dialog>
    </ScrollView>
  );
}
