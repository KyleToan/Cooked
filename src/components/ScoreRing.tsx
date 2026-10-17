import { View } from 'react-native';

import { scoreText } from '@/data/ranking';
import { makeStyles } from '@/theme';
import { Text } from './Text';

const RING = { sm: 36, md: 44, lg: 60 } as const;

/** A score out of 10 in a sage-ink ring, the way Beli shows it. */
export function ScoreRing({ score, size: s = 'md' }: { score: number; size?: keyof typeof RING }) {
  const styles = useStyles();
  const d = RING[s];
  return (
    <View
      accessible
      accessibilityLabel={`Score ${scoreText(score)} out of 10`}
      style={[styles.ring, { width: d, height: d, borderRadius: d / 2 }]}
    >
      <Text
        variant={s === 'lg' ? 'sectionTitle' : s === 'md' ? 'body' : 'link'}
        weight="semibold"
        color="sageInk"
        maxFontSizeMultiplier={1.2}
      >
        {scoreText(score)}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((color) => ({
  ring: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: color.sageInk },
}));
