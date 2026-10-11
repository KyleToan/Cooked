import { View } from 'react-native';

import { Text } from '@/components/Text';

// Stub for Phase 1; built in a later phase.
export default function Screen() {
  return (
    <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'center', padding: 20 }}>
      <Text variant="titleLg">Recipes</Text>
    </View>
  );
}
