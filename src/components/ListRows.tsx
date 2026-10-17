import { Image } from 'expo-image';
import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedReaction, useSharedValue, type SharedValue } from 'react-native-reanimated';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { scheduleOnRN } from 'react-native-worklets';

import { amountLabel, joinAnd, PLACE_LABEL } from '@/data/helpers';
import type { Item, Place, Recipe, ScanLine } from '@/data/types';
import { haptics } from '@/hooks/haptics';
import { color, radius, size, space, type } from '@/theme';
import { Chevron } from './Chevron';
import { ROW_OPEN, Stepper } from './Controls';
import { Icon } from './Icon';
import { ScoreRing } from './ScoreRing';
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
  /**
   * Swiping the row left shows "Use up", which sets the amount to 0 (the same
   * as stepping down to 0, so the undo bar shows). Also a VoiceOver action.
   */
  onUseUp?: () => void;
  /** More controls under the action and stepper when open (the use-by date and Use soon). */
  extra?: ReactNode;
};

/** Name, meta line, amount and a chevron. Opens in place to a stepper; swipes left to use up. */
export function KitchenRow({ item, startQty, soon, open, onToggleOpen, actionLabel, onAction, onQty, onUseUp, extra }: KitchenRowProps) {
  const amount = amountLabel(item, startQty);
  const swipe = useRef<SwipeableMethods>(null);
  const canUseUp = !!onUseUp && item.qty > 0;
  const rowWidth = useSharedValue(0);
  // Past the commit point, letting go uses the item up.
  const armed = useRef(false);
  const arm = (past: boolean) => {
    armed.current = past;
    if (past) haptics.select();
  };

  const markUsedUp = () => {
    swipe.current?.close();
    onUseUp?.();
  };

  const row = (
    <View style={[styles.divider, styles.ground]} onLayout={(e) => rowWidth.set(e.nativeEvent.layout.width)}>
      <Tap
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.meta}, ${amount}`}
        accessibilityHint={open ? 'Closes the amount' : 'Opens the amount'}
        accessibilityState={{ expanded: open }}
        accessibilityActions={canUseUp ? [{ name: 'useUp', label: 'Use up' }] : undefined}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'useUp' && markUsedUp()}
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
        <Chevron direction={open ? 'up' : 'down'} animated />
      </Tap>
      {open ? (
        <Animated.View entering={ROW_OPEN} style={styles.openArea}>
          <View style={styles.open}>
            <Tap accessibilityRole="button" onPress={onAction} style={styles.action}>
              <Text variant="link" color="sageInk">
                {actionLabel}
              </Text>
            </Tap>
            <Stepper value={item.qty} onChange={onQty} />
          </View>
          {extra}
          {/* The swipe is a shortcut; this is where people find Use up without knowing it exists. */}
          {canUseUp ? (
            <Tap accessibilityRole="button" accessibilityLabel={`Use up ${item.name}`} onPress={markUsedUp} style={styles.useAll}>
              <Text variant="link" color="inkMuted">
                Use it all up
              </Text>
            </Tap>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );

  if (!canUseUp) return row;
  return (
    <ReanimatedSwipeable
      ref={swipe}
      // Friction 1 so the row follows the finger all the way to the commit point.
      friction={1}
      rightThreshold={USE_UP_WIDTH / 2}
      overshootRight
      onSwipeableWillOpen={() => {
        haptics.select();
        if (armed.current) markUsedUp();
      }}
      renderRightActions={(_progress, translation) => (
        <>
          <CommitWatch translation={translation} rowWidth={rowWidth} onCross={arm} />
          {/* Grey behind the whole row, so a long swipe never shows a gap. */}
          <View style={styles.useUpFill} />
          <Tap
            accessibilityRole="button"
            accessibilityLabel={`Use up ${item.name}`}
            onPress={markUsedUp}
            style={styles.useUp}
          >
            <Text variant="link" color="ink">
              Use up
            </Text>
          </Tap>
        </>
      )}
    >
      {row}
    </ReanimatedSwipeable>
  );
}

const USE_UP_WIDTH = 96;
/** Dragged this far across the row, letting go uses the item up. */
const USE_UP_COMMIT = 0.6;

/** Tells the row when the swipe crosses the commit point, either way. Draws nothing. */
function CommitWatch({
  translation,
  rowWidth,
  onCross,
}: {
  translation: SharedValue<number>;
  rowWidth: SharedValue<number>;
  onCross: (past: boolean) => void;
}) {
  useAnimatedReaction(
    () => rowWidth.get() > 0 && -translation.get() > rowWidth.get() * USE_UP_COMMIT,
    (past, was) => {
      if (was !== null && past !== was) scheduleOnRN(onCross, past);
    },
  );
  return null;
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
            style={[styles.nameInput, { color: skip ? color.inkMuted : color.ink, borderBottomColor: focused ? color.sageInk : color.lineSoft }]}
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
        <Animated.View entering={ROW_OPEN} style={styles.picker}>
          <View accessibilityRole="radiogroup" accessibilityLabel="Where it goes" style={styles.places}>
            {PLACES.map((p) => {
              const on = p === line.place;
              const paper = p === 'skip' ? color.surface : color[PAPER[p]];
              return (
                <Tap
                  key={p}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => {
                    if (!on) haptics.select();
                    onChange({ ...line, place: p });
                  }}
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
        </Animated.View>
      ) : null}
    </View>
  );
}

/* ---------- Recipe row ---------- */

type RecipeRowProps = {
  recipe: Recipe;
  onOpen: () => void;
  onToggleToBuy: () => void;
  /** Your score out of 10, once ranked: a ring on the right, as on Beli. */
  score?: number;
};

/** The pill shows when this few are missing, the same as the "Missing 1–2" filter. More than that is too much to shop for. */
const MAX_MISSING_PILL = 2;

/** Name and time, what you have, the source, and "Add N to To Buy" when one or two things are missing. */
export function RecipeRow({ recipe, onOpen, onToggleToBuy, score }: RecipeRowProps) {
  const n = recipe.missing.length;
  const have =
    n === 0
      ? `You have all ${recipe.need} things.`
      : `You have ${recipe.have} of ${recipe.need}. Missing ${joinAnd(recipe.missing.map((m) => m.toLowerCase()))}.`;
  return (
    <View style={[styles.divider, styles.recipe, recipe.photo ? styles.recipeWithPhoto : null]}>
      {recipe.photo ? (
        <Image
          source={{ uri: recipe.photo }}
          contentFit="cover"
          transition={150}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={styles.thumb}
        />
      ) : null}
      <View style={[recipe.photo ? styles.grow : null, styles.recipeBody]}>
        <Tap accessibilityRole="link" onPress={onOpen} style={styles.recipeLink}>
          <View style={[styles.grow, styles.recipeText]}>
            <Text weight="semibold">{recipe.title}</Text>
            <Text variant="caption" color="inkMuted">
              {have}
            </Text>
            <Text variant="micro" color="inkMuted" weight="regular">
              {recipe.sourceLine}
            </Text>
          </View>
          {/* Time on top in every row, so it lines up; the score ring sits under it once ranked. */}
          <View style={styles.recipeSide}>
            <Text variant="caption" color="inkMuted" style={styles.recipeTime}>
              {recipe.time}
            </Text>
            {score !== undefined ? <ScoreRing score={score} size="sm" /> : null}
          </View>
        </Tap>
        {(n > 0 && n <= MAX_MISSING_PILL) || recipe.onToBuy ? (
          <ToBuyToggle
            added={recipe.onToBuy}
            count={n}
            addedLabel="Added to To Buy"
            onPress={onToggleToBuy}
            accessibilityLabel={`Add ${n} missing from ${recipe.title} to To Buy`}
          />
        ) : null}
      </View>
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
  accessibilityLabel,
}: {
  added: boolean;
  count: number;
  addedLabel: string;
  onPress: () => void;
  /** The plus and check on Recipes. The Recipe screen's pill has no icon. */
  icon?: boolean;
  /**
   * What VoiceOver reads. It's a checkbox, so the label stays the same and the
   * checked state says whether it's on the list. Name the recipe when there are several.
   */
  accessibilityLabel?: string;
}) {
  return (
    <Tap
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel ?? `Add ${count} to To Buy`}
      accessibilityState={{ checked: added }}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={styles.toggleHit}
    >
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
const THUMB = 56;

const styles = StyleSheet.create({
  useAll: { minHeight: size.targetMin, justifyContent: 'center', alignSelf: 'flex-start' },
  divider: { borderBottomWidth: 1, borderBottomColor: color.lineSoft },
  grow: { flex: 1, minWidth: 0, gap: 2 },
  kitchenRow: {
    minHeight: size.rowHeight + space.s1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.cozy,
    paddingVertical: space.s2,
  },
  ground: { backgroundColor: color.surface },
  useUpFill: { ...StyleSheet.absoluteFill, backgroundColor: color.surfaceSunken },
  useUp: {
    width: USE_UP_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surfaceSunken,
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
  },
  openArea: { gap: space.s1, paddingBottom: space.s3 },
  open: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  action: { minHeight: size.targetMin, justifyContent: 'center' },
  checkRow: { minHeight: size.rowHeight + space.s1, flexDirection: 'row', alignItems: 'center', gap: space.s3 },
  nameInput: { ...type.body, paddingVertical: 2, paddingHorizontal: 0, borderBottomWidth: 1, outlineWidth: 0 },
  tagHit: { minHeight: size.targetMin, justifyContent: 'center' },
  tag: {
    minHeight: size.targetMin - space.s2 - 2,
    paddingVertical: space.s1,
    paddingHorizontal: space.s3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
  },
  tagSkip: { backgroundColor: color.surface },
  picker: { gap: space.cozy, paddingBottom: space.roomy },
  places: { flexDirection: 'row', gap: space.tight },
  place: {
    flex: 1,
    minHeight: size.targetMin,
    paddingVertical: space.s1,
    paddingHorizontal: space.s1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOn: { borderWidth: 1.5, borderColor: color.sageInk },
  placeOff: { backgroundColor: color.surfaceSunken },
  howMany: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recipe: { gap: space.s1, paddingTop: space.roomy, paddingBottom: space.cozy },
  recipeWithPhoto: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s3 },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.control },
  recipeBody: { gap: space.s1 },
  recipeLink: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s3 },
  recipeSide: { alignItems: 'flex-end', gap: space.s2 },
  // Matches the title's line height, so the time sits on the title's line.
  recipeTime: { lineHeight: type.body.lineHeight },
  recipeText: { gap: space.tight },
  toggleHit: { alignSelf: 'flex-start', minHeight: size.targetMin, justifyContent: 'center' },
  toggle: {
    minHeight: size.targetMin - space.s2,
    paddingVertical: space.s1,
    paddingHorizontal: space.s3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.tight,
    borderRadius: radius.pill,
  },
  toggleOff: { backgroundColor: color.surfaceSunken },
  toggleOn: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
});
