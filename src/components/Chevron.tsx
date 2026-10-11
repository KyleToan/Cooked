import { View } from 'react-native';

import type { ColorName } from '@/theme';
import { Icon } from './Icon';

const TURN = { left: '0deg', up: '90deg', right: '180deg', down: '-90deg' } as const;

/** The back arrow from the icon set, turned to point any way: row chevrons and the place tag. */
export function Chevron({
  direction,
  size = 16,
  color = 'inkSubtle',
}: {
  direction: keyof typeof TURN;
  size?: number;
  color?: ColorName;
}) {
  return (
    <View style={{ transform: [{ rotate: TURN[direction] }] }}>
      <Icon name="back" size={size} color={color} />
    </View>
  );
}
