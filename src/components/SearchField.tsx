import { StyleSheet, TextInput, View } from 'react-native';

import { color, radius, size, space, type } from '@/theme';
import { Icon } from './Icon';

type Props = {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
};

/** One white, outlined field with the magnifier on the right. No shadow. */
export function SearchField({ placeholder, value, onChangeText }: Props) {
  return (
    <View style={styles.field}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.inkSubtle}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        clearButtonMode="while-editing"
        autoCorrect={false}
        style={styles.input}
      />
      <Icon name="search" size={size.iconSm + 2} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: size.fieldHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingHorizontal: space.s4,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
  },
  input: { ...type.body, flex: 1, minWidth: 0, color: color.ink, paddingVertical: 0 },
});
