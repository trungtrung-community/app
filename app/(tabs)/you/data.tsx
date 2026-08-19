/**
 * @fileoverview You — your data (Y6).
 *
 * Two doors onto local storage: a plain-text backup of everything walked so
 * far, and a way to erase it. Sharing the backup file is not wired yet, so this
 * screen only proves the export exists and states it is ready.
 */

import {useState} from 'react';
import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button} from '../../../src/components/core/button';
import {ListRow} from '../../../src/components/core/list-row';
import {Dialog} from '../../../src/components/feedback/dialog';

import {progress as progressStore} from '../../../src/composition/container';
import {useProgress} from '../../../src/store/progress';

export default function YourData() {
  const insets = useSafeAreaInsets();
  const [backupLength, setBackupLength] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function makeBackup(): Promise<void> {
    const store = await progressStore();
    const exported = await store.export();
    setBackupLength(exported.length);
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
        <ListRow
          label="Make a backup"
          sub="A plain-text copy of what you have walked so far."
          onPress={() => {
            void makeBackup();
          }}
          chevron={false}
        />
        {backupLength !== null ? (
          <Text className="type-caption text-fg-muted">{`Backup ready · ${backupLength} characters`}</Text>
        ) : null}
        <ListRow
          label="Clear progress"
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
