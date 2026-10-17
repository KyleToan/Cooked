import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Share, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInLeft,
  FadeInRight,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  ZoomIn,
} from 'react-native-reanimated';

import { finalIndex, pick, pruned, ranked, rival, scores, scoreText, skip, startPlacing, type Band, type Placing } from '@/data/ranking';
import { useStore } from '@/data/store';
import type { Recipe } from '@/data/types';
import { haptics } from '@/hooks/haptics';
import { makeStyles, useColors, radius, shadow, size, space, type ColorName } from '@/theme';
import { ActionPill } from './ActionPill';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { ScoreRing } from './ScoreRing';
import { BigNote } from './StickyNote';
import { Tap } from './Tap';
import { Text } from './Text';
import { TextLink } from './TextLink';

/** The three feelings, as round paper magnets on the fridge door. Paper colours mean "a picked choice". */
const FEELINGS: { band: Band; label: string; paper: ColorName }[] = [
  { band: 'loved', label: 'Loved it', paper: 'sage' },
  { band: 'fine', label: 'It was fine', paper: 'cornsilk' },
  { band: 'disliked', label: 'Not for me', paper: 'papaya' },
];

const MAGNET = 72;
const CHECK = 30;
const DIMMED = 0.45;
const CARD_HEIGHT = 176;
const THUMB = 56;
const OR_BADGE = 32;
const PRESSED = 0.96;
const RESULT_TILT = -1.5;
/** When a feeling places the recipe outright, the check lands before the score replaces the step. */
const BEAT_MS = 350;

/** Critically damped, Apple's 0.3s response: no bounce on taps. */
const SPRING = { duration: 300, dampingRatio: 1, reduceMotion: ReduceMotion.System } as const;
const pop = (reduced: boolean) => (reduced ? FadeIn.duration(200) : ZoomIn.springify().duration(SPRING.duration).dampingRatio(1));
/** A new rival comes in from the right; Undo brings the last one back from the left, the way it went. */
const slideIn = (reduced: boolean, back: boolean) =>
  reduced ? FadeIn.duration(200) : (back ? FadeInLeft : FadeInRight).springify().duration(SPRING.duration).dampingRatio(1);

type Props = { recipe: Recipe; visible: boolean; onClose: () => void };

/**
 * Beli-style rating (design/recipe-ranking.md): How was it?, then Which do you prefer? until the
 * recipe's place in that feeling is found, then the score on a sticky note. Nothing is saved
 * until the place is found, so closing early changes nothing.
 */
export function RateSheet({ recipe, visible, onClose }: Props) {
  const styles = useStyles();
  const { state, actions } = useStore();
  const reduced = useReducedMotion();
  const [band, setBand] = useState<Band | null>(null);
  // Every comparison asked so far; the last one is on screen. Undo pops it.
  const [asked, setAsked] = useState<Placing[]>([]);
  const [done, setDone] = useState(false);
  const [back, setBack] = useState(false);
  // Saved already, showing the check for a beat before the score.
  const [landing, setLanding] = useState(false);
  useEffect(() => {
    if (!landing) return;
    const t = setTimeout(() => setDone(true), BEAT_MS);
    return () => clearTimeout(t);
  }, [landing]);
  const ids = state.recipes.map((r) => r.id);
  const placing = asked[asked.length - 1];
  const other = placing ? state.recipes.find((r) => r.id === rival(placing)) : undefined;
  const score = scores(state.ranks, ids);

  const finish = (p: Placing, beat = false) => {
    actions.rankRecipe(recipe.id, p.band, finalIndex(p));
    haptics.success();
    if (beat && !reduced) setLanding(true);
    else setDone(true);
  };
  const next = (p: Placing) => {
    setBack(false);
    if (rival(p) === null) finish(p);
    else setAsked((a) => [...a, p]);
  };
  const feel = (b: Band) => {
    haptics.select();
    setBand(b);
    const p = startPlacing(pruned(state.ranks, ids), b, recipe.id);
    if (rival(p) === null) finish(p, true);
    else setAsked([p]);
  };
  const answer = (p: Placing) => {
    haptics.select();
    next(p);
  };
  const undo = () => {
    setBack(true);
    if (asked.length > 1) return setAsked((a) => a.slice(0, -1));
    setBand(null);
    setAsked([]);
  };

  const mineP = paperOf(recipe.id);
  const meta = [recipe.time, recipe.servings].filter(Boolean).join(' · ');

  if (done) {
    const order = ranked(state.ranks, ids);
    const mine = score.get(recipe.id);
    const place = order.indexOf(recipe.id) + 1;
    const line = order.length > 1 ? `#${place} of the ${order.length} recipes you’ve ranked` : 'Your first ranked recipe';
    const share = () => {
      if (mine === undefined) return;
      Share.share({ message: `I gave ${recipe.title} a ${scoreText(mine)} on Cooked.` }).catch(() => undefined);
    };
    return (
      <Sheet visible={visible} onClose={onClose} title={recipe.title} subtitle={meta || undefined}>
        <Animated.View entering={pop(reduced)} style={styles.result}>
          <BigNote paper="cornsilk" tilt={RESULT_TILT}>
            <View
              style={styles.noteRow}
              accessible
              accessibilityLabel={`${mine !== undefined ? `Your score, ${scoreText(mine)} out of 10. ` : ''}${line}.`}
            >
              <View style={styles.grow}>
                <Text variant="noteTitle" color="noteInk">
                  Your score
                </Text>
                <Text variant="noteBody" color="noteInkSoft">
                  {line}
                </Text>
              </View>
              {mine !== undefined ? <ScoreRing score={mine} size="lg" /> : null}
            </View>
          </BigNote>
        </Animated.View>
        <View style={styles.resultActions}>
          <ActionPill label="Done" variant="primary" height="bottom" onPress={onClose} />
          <TextLink label="Share" align="center" onPress={share} />
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={recipe.title} subtitle={meta || undefined}>
      <View style={[styles.step, styles.first]}>
        <Text variant="sectionTitle" accessibilityRole="header">
          How was it?
        </Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="How was it?" style={styles.magnets}>
          {FEELINGS.map((f) => (
            <Magnet key={f.band} {...f} picked={band === f.band} dimmed={band !== null && band !== f.band} onPress={() => feel(f.band)} />
          ))}
        </View>
      </View>

      {placing && other ? (
        <Animated.View entering={reduced ? FadeIn.duration(200) : FadeIn.duration(250)} style={styles.step}>
          <Text variant="sectionTitle" accessibilityRole="header">
            Which do you prefer?
          </Text>
          <View style={styles.cards}>
            <ChoiceCard recipe={recipe} paper={mineP} onPress={() => answer(pick(placing, 'better'))} />
            {/* Keyed by the rival, so each new rival slides in while this recipe's card stays put. */}
            <Animated.View key={other.id} entering={slideIn(reduced, back)} style={styles.grow}>
              <ChoiceCard recipe={other} paper={rivalPaper(mineP, other.id)} score={score.get(other.id)} onPress={() => answer(pick(placing, 'worse'))} />
            </Animated.View>
            <View style={styles.or} pointerEvents="none" importantForAccessibility="no-hide-descendants">
              <Text variant="caption" weight="semibold" color="inkMuted">
                or
              </Text>
            </View>
          </View>
          <View style={styles.controls}>
            <TextLink label="Undo" onPress={undo} accessibilityLabel="Undo the last answer" />
            <ActionPill label="Can’t decide" height="header" onPress={() => answer(pick(placing, 'tie'))} accessibilityLabel="Can’t decide. Rank them together" />
            <TextLink label="Skip" align="end" onPress={() => next(skip(placing))} accessibilityLabel={`Skip ${other.title}`} />
          </View>
        </Animated.View>
      ) : null}
    </Sheet>
  );
}

/** A round paper magnet with its label underneath. Picked: a check pops in and the others step back. */
function Magnet({ label, paper, picked, dimmed, onPress }: { label: string; paper: ColorName; picked: boolean; dimmed: boolean; onPress: () => void }) {
  const color = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const fade = useSharedValue(1);
  useEffect(() => {
    fade.set(withSpring(dimmed ? DIMMED : 1, SPRING));
  }, [dimmed, fade]);
  const press = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  // Only the disc steps back: the label stays readable (4.5:1), since it can still be picked.
  const disc = useAnimatedStyle(() => ({ opacity: fade.get() }));
  return (
    <Tap
      accessibilityRole="radio"
      accessibilityState={{ checked: picked }}
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => {
        if (!reduced) scale.set(withSpring(PRESSED, SPRING));
      }}
      onPressOut={() => scale.set(withSpring(1, SPRING))}
      style={styles.magnetHit}
    >
      <Animated.View style={[styles.magnetBody, press]}>
        <Animated.View style={[styles.magnet, { backgroundColor: color[paper] }, picked && styles.magnetPicked, disc]}>
          {picked ? (
            <Animated.View entering={pop(reduced)}>
              <Icon name="check" size={CHECK} color="noteInk" />
            </Animated.View>
          ) : null}
        </Animated.View>
        <Text variant="button" weight={picked ? 'semibold' : 'medium'} color={picked ? 'ink' : 'inkMuted'} style={styles.center}>
          {label}
        </Text>
      </Animated.View>
    </Tap>
  );
}

/** One side of This or that?: the photo (or handwritten initials), the title, and its time and score. */
function ChoiceCard({ recipe, paper, score, onPress }: { recipe: Recipe; paper: ColorName; score?: number; onPress: () => void }) {
  const color = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const [down, setDown] = useState(false);
  const press = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const [photoFailed, setPhotoFailed] = useState(false);
  const photo = recipe.photo && !photoFailed ? recipe.photo : undefined;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={[recipe.title, recipe.time, score !== undefined ? `your score ${scoreText(score)}` : ''].filter(Boolean).join(', ')}
      accessibilityHint="Picks this one"
      onPress={onPress}
      onPressIn={() => {
        setDown(true);
        if (!reduced) scale.set(withSpring(PRESSED, SPRING));
      }}
      onPressOut={() => {
        setDown(false);
        scale.set(withSpring(1, SPRING));
      }}
      style={styles.grow}
    >
      <Animated.View style={[styles.card, down && styles.cardDown, press]}>
        {photo ? (
          <Image source={{ uri: photo }} contentFit="cover" transition={150} onError={() => setPhotoFailed(true)} style={styles.thumb} />
        ) : (
          <View style={[styles.initials, { backgroundColor: color[paper] }]}>
            <Text variant="noteBody" color="noteInk">
              {initialsOf(recipe.title)}
            </Text>
          </View>
        )}
        <Text weight="semibold" numberOfLines={3} style={styles.center}>
          {recipe.title}
        </Text>
        <Text variant="caption" color="inkMuted" style={styles.center}>
          {recipe.time}
          {score !== undefined ? (
            <Text variant="caption" weight="semibold" color="sageInk">
              {` · ${scoreText(score)}`}
            </Text>
          ) : null}
        </Text>
      </Animated.View>
    </Tap>
  );
}

const PAPERS: ColorName[] = ['cornsilk', 'papaya', 'beige'];
/** The same paper for a recipe every time, so a placeholder note is recognisable from one pick to the next. */
const paperOf = (id: string) => PAPERS[[...id].reduce((n, ch) => n + ch.charCodeAt(0), 0) % PAPERS.length];
/** The rival's paper, never the same as the card beside it. */
const rivalPaper = (beside: ColorName, id: string) => {
  const p = paperOf(id);
  return p !== beside ? p : PAPERS[(PAPERS.indexOf(p) + 1) % PAPERS.length];
};

/** "Spinach & chicken pasta" → "SC": the handwritten placeholder when there's no photo. */
const initialsOf = (title: string) =>
  title
    .split(/\s+/)
    .filter((w) => /^[a-z0-9]/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

const useStyles = makeStyles((color) => ({
  grow: { flex: 1 },
  center: { textAlign: 'center' },
  step: { gap: space.s4 },
  first: { marginTop: space.section - space.s4 },
  magnets: { flexDirection: 'row', justifyContent: 'space-between' },
  magnetHit: { flex: 1, alignItems: 'center' },
  magnetBody: { alignItems: 'center', gap: space.cozy },
  magnet: {
    width: MAGNET,
    height: MAGNET,
    borderRadius: MAGNET / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color.line,
    ...shadow.note,
  },
  // Pressed flat against the door: the lift goes, the edge firms up.
  magnetPicked: { borderColor: color.sageInk, borderWidth: 1.5, boxShadow: 'none' },
  cards: { flexDirection: 'row', gap: space.s3 },
  card: {
    minHeight: CARD_HEIGHT,
    padding: space.s3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s2,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
  },
  cardDown: { backgroundColor: color.beige, borderColor: color.sageInk, borderWidth: 1.5 },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.control },
  initials: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.note,
    borderBottomRightRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-3deg' }],
    ...shadow.note,
  },
  or: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: OR_BADGE,
    height: OR_BADGE,
    marginLeft: -OR_BADGE / 2,
    marginTop: -OR_BADGE / 2,
    borderRadius: OR_BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
  },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: size.targetMin },
  result: { paddingHorizontal: space.s5, paddingTop: space.s2 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  resultActions: { gap: space.s1 },
}));
