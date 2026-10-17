import { useEffect, useState, type ReactNode } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { PLACE_LABEL } from '@/data/helpers';
import type { ToBuyItem } from '@/data/types';
import { haptics } from '@/hooks/haptics';
import { makeStyles, useColors, size, space, type } from '@/theme';
import { AddBox, Checkbox, ROW_LAYOUT } from './Controls';
import { SectionHeader } from './Header';
import { Tap } from './Tap';
import { Text } from './Text';

type Props = {
  items: ToBuyItem[];
  /** Counted over the whole list, which can be longer than what's shown (Home shows what's still to get). */
  done: number;
  total: number;
  onToggle: (id: string) => void;
  onAdd: (name: string) => void;
  /** "See all 6" on Home; the Share pill on the Kitchen tab. */
  right?: ReactNode;
  /** The helper line on the Kitchen tab ("Sam sees this list too…"). */
  helper?: string;
  addLabel?: string;
};

/** The shared To Buy list: progress, flat rows with checkboxes, and an add row. */
export function TodoList({ items, done, total, onToggle, onAdd, right, helper, addLabel = 'Add an item' }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <SectionHeader title="To Buy" meta={total ? `${done} of ${total} done` : undefined} right={right} />
        {helper ? (
          <Text variant="caption" color="inkMuted">
            {helper}
          </Text>
        ) : null}
      </View>
      {/* An empty list has no progress to show. */}
      {total ? <ProgressBar value={done / total} /> : null}
      <View>
        {items.map((item) => (
          <Animated.View key={item.id} layout={ROW_LAYOUT}>
            <TodoRow item={item} onToggle={() => onToggle(item.id)} />
          </Animated.View>
        ))}
        <Animated.View layout={ROW_LAYOUT}>
          <AddRow placeholder="Add an item…" label={addLabel} onSubmit={onAdd} />
        </Animated.View>
      </View>
    </View>
  );
}

/** Critically damped, about 0.3s; instant when the person has asked for less motion. */
const FILL_SPRING = { duration: 300, dampingRatio: 1, reduceMotion: ReduceMotion.System } as const;

export function ProgressBar({ value }: { value: number }) {
  const styles = useStyles();
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  // Starts where it is, so the first render doesn't animate; later changes spring.
  const width = useSharedValue(pct);
  useEffect(() => {
    width.set(withSpring(pct, FILL_SPRING));
  }, [pct, width]);
  const fill = useAnimatedStyle(() => ({ width: `${width.get()}%` }));
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityLabel="To Buy progress"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <Animated.View style={[styles.fill, fill]} />
    </View>
  );
}

/** The whole row is the checkbox: one tap target and one VoiceOver stop. */
export function TodoRow({ item, onToggle }: { item: ToBuyItem; onToggle: () => void }) {
  const styles = useStyles();
  const note = item.done ? 'Got it' : item.note;
  return (
    <Tap
      accessibilityRole="checkbox"
      accessibilityLabel={[item.name, note, PLACE_LABEL[item.place]].filter(Boolean).join(', ')}
      accessibilityState={{ checked: item.done }}
      onPress={() => {
        haptics.select();
        onToggle();
      }}
      style={styles.row}
    >
      <Checkbox checked={item.done} />
      <View style={styles.rowText}>
        <Text color={item.done ? 'inkMuted' : 'ink'} strike={item.done}>
          {item.name}
        </Text>
        <Text variant="micro" color="inkMuted" weight="regular">
          {note}
        </Text>
      </View>
      <Text variant="caption" color="inkMuted">
        {PLACE_LABEL[item.place]}
      </Text>
    </Tap>
  );
}

/** The dashed box and a plain input: "Add an item…", "Add to the fridge…". */
export function AddRow({ placeholder, label, onSubmit }: { placeholder: string; label: string; onSubmit: (text: string) => void }) {
  const color = useColors();
  const styles = useStyles();
  const [text, setText] = useState('');
  return (
    <View style={styles.add}>
      <AddBox />
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={color.inkMuted}
        accessibilityLabel={label}
        returnKeyType="done"
        submitBehavior="submit"
        onSubmitEditing={() => {
          if (text.trim()) onSubmit(text.trim());
          setText('');
        }}
        style={styles.addInput}
      />
    </View>
  );
}

const useStyles = makeStyles((color) => ({
  section: { gap: space.s3 },
  head: { gap: space.s1 },
  track: { height: space.s1, borderRadius: space.s1, backgroundColor: color.lineSoft, overflow: 'hidden' },
  fill: { height: space.s1, borderRadius: space.s1, backgroundColor: color.progress },
  row: {
    minHeight: size.rowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
  },
  rowText: { flex: 1, minWidth: 0, gap: 2, paddingVertical: space.s2 },
  add: { minHeight: size.rowHeight, paddingVertical: space.s2, flexDirection: 'row', alignItems: 'center', gap: space.roomy },
  addInput: { ...type.body, flex: 1, minWidth: 0, color: color.ink, paddingVertical: 0, outlineWidth: 0 },
}));
