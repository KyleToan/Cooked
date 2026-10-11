import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { amountLabel, joinAnd, PLACE_LABEL } from '@/data/helpers';
import type { Item, Place, Recipe, ScanLine } from '@/data/types';
import { color, radius, size, space, type } from '@/theme';
import { Chevron } from './Chevron';
import { Stepper } from './Controls';
import { Icon } from './Icon';
import { PAPER } from './StickyNote';
import { Tap } from './Tap';
import { Text } from './Text';

/* ---------- Kitchen row ---------- */

type KitchenRowProps = {
  item: Item;
  /** The amount it started with, so "About 1 cup" shows until the count changes. */
  startQty?: number;
  /** In the Use soon section: the meta line turns `bronze-ink`. */
  soon?: boolean;
  open: boolean;
  onToggleOpen: () => void;
  /** The `sage-ink` action on the left when open. */
  actionLabel: string;
  onAction: () => void;
  onQty: (qty: number) => void;
};

/** Name, meta line, amount and a chevron. Opens in place to a stepper. */
export function KitchenRow({ item, startQty, soon, open, onToggleOpen, actionLabel, onAction, onQty }: KitchenRowProps) {
  const amount = amountLabel(item, startQty);
  return (
    <View style={styles.divider}>
      <Tap
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.meta}, ${amount}`}
        accessibilityHint={open ? 'Closes the amount' : 'Opens the amount'}
        accessibilityState={{ expanded: open }}
        onPress={onToggleOpen}
        style={styles.kitchenRow}
      >
        <View style={styles.grow}>
          <Text>{item.name}</Text>
          <Text variant="caption" color={soon ? 'bronzeInk' : 'inkMuted'} weight={soon ? 'semibold' : undefined}>
            {item.meta}
          </Text>
        </View>
        <Text variant="button" color="inkMuted">
          {amount}
        </Text>
        <Chevron direction={open ? 'up' : 'down'} />
      </Tap>
      {open ? (
        <View style={styles.open}>
          <Tap accessibilityRole="button" onPress={onAction} style={styles.action}>
            <Text variant="link" color="sageInk">
              {actionLabel}
            </Text>
          </Tap>
          <Stepper value={item.qty} onChange={onQty} />
        </View>
      ) : null}
    </View>
  );
}

/* ---------- Check-items row ---------- */

const PLACES: (Place | 'skip')[] = ['fridge', 'pantry', 'freezer', 'skip'];
const placeLabel = (p: Place | 'skip') => (p === 'skip' ? 'Skip' : PLACE_LABEL[p]);
const TAG_CHEVRON = 12;

type CheckRowProps = {
  line: ScanLine;
  open: boolean;
  onToggleOpen: () => void;
  onChange: (line: ScanLine) => void;
};

/** A scanned line: an editable name, price, a place tag that opens the place picker and a stepper. */
export function CheckItemRow({ line, open, onToggleOpen, onChange }: CheckRowProps) {
  const [focused, setFocused] = useState(false);
  const skip = line.place === 'skip';
  const where = placeLabel(line.place);
  const detail = skip || line.qty === 1 ? line.price : `${line.qty} · ${line.price}`;
  return (
    <View style={styles.divider}>
      <View style={styles.checkRow}>
        <View style={styles.grow}>
          <TextInput
            value={line.name}
            onChangeText={(name) => onChange({ ...line, name })}
            accessibilityLabel={`Item name, ${line.name}`}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            returnKeyType="done"
            style={[styles.nameInput, { color: skip ? color.inkSubtle : color.ink, borderBottomColor: focused ? color.sageInk : 'transparent' }]}
          />
          <Text variant="micro" color="inkMuted" weight="regular">
            {detail}
          </Text>
        </View>
        <Tap
          accessibilityRole="button"
          accessibilityLabel={`${line.name} goes to ${where}. Change place or amount.`}
          accessibilityState={{ expanded: open }}
          onPress={onToggleOpen}
          style={styles.tagHit}
        >
          <View style={[styles.tag, skip ? styles.tagSkip : { backgroundColor: color[PAPER[line.place as Place]] }]}>
            <Text variant="caption" weight="semibold" color={skip ? 'inkMuted' : 'ink'}>
              {where}
            </Text>
            <Chevron direction={open ? 'up' : 'down'} size={TAG_CHEVRON} color={skip ? 'inkMuted' : 'ink'} />
          </View>
        </Tap>
      </View>
      {open ? (
        <View style={styles.picker}>
          <View accessibilityRole="radiogroup" accessibilityLabel="Where it goes" style={styles.places}>
            {PLACES.map((p) => {
              const on = p === line.place;
              const paper = p === 'skip' ? color.surface : color[PAPER[p]];
              return (
                <Tap
                  key={p}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => onChange({ ...line, place: p })}
                  style={[styles.place, on ? [styles.placeOn, { backgroundColor: paper }] : styles.placeOff]}
                >
                  <Text variant="caption" weight={on ? 'semibold' : 'medium'} color={on ? 'ink' : 'inkMuted'}>
                    {placeLabel(p)}
                  </Text>
                </Tap>
              );
            })}
          </View>
          <View style={styles.howMany}>
            <Text variant="caption" color="inkMuted">
              How many
            </Text>
            <Stepper
              value={line.qty}
              min={1}
              onChange={(qty) => onChange({ ...line, qty })}
              decLabel="One fewer"
              incLabel="One more"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/* ---------- Recipe row ---------- */

type RecipeRowProps = {
  recipe: Recipe;
  onOpen: () => void;
  onToggleToBuy: () => void;
};

/** Name and time, what you have, the source, and "Add N to To Buy" when something's missing. */
export function RecipeRow({ recipe, onOpen, onToggleToBuy }: RecipeRowProps) {
  const n = recipe.missing.length;
  const have =
    n === 0
      ? `You have all ${recipe.need} things.`
      : `You have ${recipe.have} of ${recipe.need}. Missing ${joinAnd(recipe.missing.map((m) => m.toLowerCase()))}.`;
  return (
    <View style={[styles.divider, styles.recipe]}>
      <Tap accessibilityRole="link" onPress={onOpen} style={styles.recipeText}>
        <View style={styles.recipeTop}>
          <Text weight="semibold" style={styles.grow}>
            {recipe.title}
          </Text>
          <Text variant="caption" color="inkMuted">
            {recipe.time}
          </Text>
        </View>
        <Text variant="caption" color="inkMuted">
          {have}
        </Text>
        <Text variant="micro" color="inkMuted" weight="regular">
          {recipe.sourceLine}
        </Text>
      </Tap>
      {n > 0 ? <ToBuyToggle added={recipe.onToBuy} count={n} addedLabel="Added to To Buy" onPress={onToggleToBuy} /> : null}
    </View>
  );
}

/** The grey "Add 2 to To Buy" pill that turns white with a check once added. */
export function ToBuyToggle({
  added,
  count,
  addedLabel,
  onPress,
  icon = true,
}: {
  added: boolean;
  count: number;
  addedLabel: string;
  onPress: () => void;
  /** The plus and check on Recipes. The Recipe screen's pill has no icon. */
  icon?: boolean;
}) {
  return (
    <Tap accessibilityRole="button" accessibilityState={{ selected: added }} onPress={onPress} style={styles.toggleHit}>
      <View style={[styles.toggle, added ? styles.toggleOn : styles.toggleOff]}>
        {icon ? <Icon name={added ? 'check' : 'add'} size={TOGGLE_ICON} color={added ? 'sageInk' : 'ink'} /> : null}
        <Text variant={icon ? 'caption' : 'link'} weight="semibold" color={added ? 'sageInk' : 'ink'}>
          {added ? addedLabel : `Add ${count} to To Buy`}
        </Text>
      </View>
    </Tap>
  );
}

const TOGGLE_ICON = 14;

const styles = StyleSheet.create({
  divider: { borderBottomWidth: 1, borderBottomColor: color.lineSoft },
  grow: { flex: 1, minWidth: 0, gap: 2 },
  kitchenRow: {
    minHeight: size.rowHeight + space.s1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2 + 2,
    paddingVertical: space.s2,
  },
  open: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: space.s3 },
  action: { minHeight: size.targetMin, justifyContent: 'center' },
  checkRow: { minHeight: size.rowHeight + space.s1, flexDirection: 'row', alignItems: 'center', gap: space.s3 },
  nameInput: { ...type.body, paddingVertical: 2, paddingHorizontal: 0, borderBottomWidth: 1, outlineWidth: 0 },
  tagHit: { height: size.targetMin, justifyContent: 'center' },
  tag: {
    height: size.targetMin - space.s2 - 2,
    paddingHorizontal: space.s3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
  },
  tagSkip: { backgroundColor: color.surface },
  picker: { gap: space.s2 + 2, paddingBottom: space.s3 + 2 },
  places: { flexDirection: 'row', gap: space.s1 + 2 },
  place: { flex: 1, height: size.targetMin, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  placeOn: { borderWidth: 1.5, borderColor: color.sageInk },
  placeOff: { backgroundColor: color.surfaceSunken },
  howMany: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recipe: { gap: space.s1, paddingTop: space.s3 + 2, paddingBottom: space.s2 + 2 },
  recipeText: { gap: space.s1 + 2 },
  recipeTop: { flexDirection: 'row', alignItems: 'baseline', gap: space.s3 },
  toggleHit: { alignSelf: 'flex-start', height: size.targetMin, justifyContent: 'center' },
  toggle: {
    height: size.targetMin - space.s2,
    paddingHorizontal: space.s3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1 + 2,
    borderRadius: radius.pill,
  },
  toggleOff: { backgroundColor: color.surfaceSunken },
  toggleOn: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
});
