import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { color, radius, size, space, type } from '@/theme';
import { Icon } from './Icon';

type Props = {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
};

/** One white, outlined field with the magnifier on the right. No shadow. Focus: `sage-ink`, like Field. */
export function SearchField({ placeholder, value, onChangeText }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, focused ? styles.focused : styles.idle]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.inkMuted}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        clearButtonMode="while-editing"
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.input}
      />
      <Icon name="search" size={size.iconSm + 2} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: size.fieldHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingVertical: space.s2,
    paddingHorizontal: space.s4,
    borderRadius: radius.field,
    backgroundColor: color.surface,
  },
  idle: { borderWidth: 1, borderColor: color.controlLine },
  focused: { borderWidth: 1.5, borderColor: color.sageInk },
  input: { ...type.body, flex: 1, minWidth: 0, color: color.ink, paddingVertical: 0, outlineWidth: 0 },
});
