import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { PLACE_LABEL } from '@/data/helpers';
import type { ToBuyItem } from '@/data/types';
import { useLayoutMotion } from '@/hooks/useLayoutMotion';
import { color, size, space, type } from '@/theme';
import { AddBox, Checkbox } from './Controls';
import { SectionHeader } from './Header';
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
  const animate = useLayoutMotion();
  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <SectionHeader title="To Buy" meta={`${done} of ${total} done`} right={right} />
        {helper ? (
          <Text variant="caption" color="inkMuted">
            {helper}
          </Text>
        ) : null}
      </View>
      <ProgressBar value={total ? done / total : 0} />
      <View>
        {items.map((item) => (
          <TodoRow
            key={item.id}
            item={item}
            onToggle={() => {
              animate();
              onToggle(item.id);
            }}
          />
        ))}
        <AddRow
          placeholder="Add an item…"
          label={addLabel}
          onSubmit={(name) => {
            animate();
            onAdd(name);
          }}
        />
      </View>
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityLabel="To Buy progress"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

export function TodoRow({ item, onToggle }: { item: ToBuyItem; onToggle: () => void }) {
  return (
    <View style={styles.row}>
      <Checkbox checked={item.done} onPress={onToggle} label={item.name} />
      <View style={styles.rowText}>
        <Text color={item.done ? 'inkOff' : 'ink'} strike={item.done}>
          {item.name}
        </Text>
        <Text variant="micro" color="inkMuted" weight="regular">
          {item.done ? 'Got it' : item.note}
        </Text>
      </View>
      <Text variant="caption" color="inkMuted">
        {PLACE_LABEL[item.place]}
      </Text>
    </View>
  );
}

/** The dashed box and a plain input: "Add an item…", "Add to the fridge…". */
export function AddRow({ placeholder, label, onSubmit }: { placeholder: string; label: string; onSubmit: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <View style={styles.add}>
      <AddBox />
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={color.inkSubtle}
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

const styles = StyleSheet.create({
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
  add: { minHeight: size.rowHeight, paddingVertical: space.s2, flexDirection: 'row', alignItems: 'center', gap: space.s3 + 2 },
  addInput: { ...type.body, flex: 1, minWidth: 0, color: color.ink, paddingVertical: 0, outlineWidth: 0 },
});
