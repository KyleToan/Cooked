import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { ErrorLine, Field } from '@/components/Controls';
import { OnbScreen } from '@/components/Onboarding';
import { Text } from '@/components/Text';
import { failText, type Failure } from '@/data/errors';
import * as api from '@/data/kitchenApi';
import { useStore } from '@/data/store';
import { hasBackend } from '@/data/supabase';
import { makeStyles, radius, space } from '@/theme';

const PREVIEW_BOX = 20;

/** First name, with a preview of how it shows up on a To Buy row. */
export default function Name() {
  const styles = useStyles();
  const router = useRouter();
  const { state, actions } = useStore();
  const [name, setName] = useState(state.user.name);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<Failure | null>(null);
  const shown = name.trim() || 'you';

  const next = async () => {
    if (!name.trim() || busy) return;
    if (hasBackend) {
      setBusy(true);
      const r = await api.saveProfile({ name: name.trim() });
      setBusy(false);
      setFailed(api.failure(r));
      if (r !== 'ok') return;
    }
    actions.setName(name);
    router.push('/appearance');
  };

  return (
    <OnbScreen
      onBack={() => router.back()}
      title="What should we call you?"
      bottom={
        <>
          {failed ? <ErrorLine text={failText('save your name', failed)} /> : null}
          <ActionPill label="Next" variant="primary" height="bottom" onPress={next} disabled={!name.trim()} busy={busy} />
        </>
      }
    >
      <Field
        label="First name"
        value={name}
        onChangeText={setName}
        autoFocus
        textContentType="givenName"
        autoComplete="name-given"
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={next}
      />
      <View style={styles.preview}>
        <Text variant="caption" weight="semibold" color="inkMuted">
          How it shows up
        </Text>
        <View style={styles.card}>
          <View style={styles.box} />
          <View>
            <Text variant="button" weight="regular">
              Tomatoes
            </Text>
            <Text variant="micro" weight="regular" color="inkMuted">
              Added by {shown}
            </Text>
          </View>
        </View>
      </View>
    </OnbScreen>
  );
}

const useStyles = makeStyles((color) => ({
  preview: { gap: space.s2 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingVertical: space.s3,
    paddingHorizontal: space.roomy,
    borderRadius: radius.control,
    backgroundColor: color.surfaceSunken,
  },
  box: { width: PREVIEW_BOX, height: PREVIEW_BOX, borderRadius: radius.check - 1, borderWidth: 1.5, borderColor: color.controlLine },
}));
