import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { UndoBar } from '@/components/Controls';
import { BackButton, PushedHeader, SectionHeader } from '@/components/Header';
import { ToBuyToggle } from '@/components/ListRows';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { count, isUseSoon, PLACE_LABEL, recipeMeta } from '@/data/helpers';
import { matches, usedWhenMade } from '@/data/match';
import { STAPLES } from '@/data/seed';
import { useStore, useUndo } from '@/data/store';
import { color, radius, shadow, size, space } from '@/theme';

const PHOTO_HEIGHT = 260;

export default function RecipeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, actions } = useStore();
  const recipe = state.recipes.find((r) => r.id === id);
  const made = useUndo(`recipe:${id}`);
  // A photo that won't load hides its block rather than leaving a grey box.
  const [photoFailed, setPhotoFailed] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/recipes'));

  if (!recipe) {
    return (
      <Screen>
        <PushedHeader
          title="Recipe not found"
          onBack={back}
          backLabel="Back to recipes"
          below={
            <Text color="inkMuted">It may have been deleted by someone in your kitchen.</Text>
          }
        />
        <TextLink label="Back to recipes" onPress={back} />
      </Screen>
    );
  }

  const soon = state.items.filter(isUseSoon);
  const isSoon = (name: string) => soon.some((i) => matches(name, i.name));
  // Counted from the kitchen as it was before "I made this", so the number doesn't shrink after.
  const used = usedWhenMade(recipe, made?.snapshot.items ?? state.items, STAPLES).length;
  const canMake = recipe.ingredients.length > 0;

  // While the undo bar shows, the footer steps aside so the bar floats at the bottom on its own.
  const footer = canMake && !made ? (
    <>
      <ActionPill label="I made this" variant="primary" height="bottom" onPress={() => actions.madeRecipe(recipe.id)} />
      <Text variant="micro" color="inkMuted" weight="regular" style={styles.center}>
        We’ll take what you used out of your kitchen.
      </Text>
    </>
  ) : undefined;
  const photo = recipe.photo && !photoFailed ? recipe.photo : undefined;

  return (
    <Screen
      footer={footer}
      gap={space.s5 + 2}
      raised={!!made}
      overlay={made ? <UndoBar island={false} text={used ? `Took ${count(used, 'thing')} out of your kitchen` : 'Marked as made'} onUndo={actions.undo} onDismiss={() => actions.clearUndo(made.scope)} /> : null}
    >
      {photo ? (
        <View>
          <Image
            source={{ uri: photo }}
            contentFit="cover"
            transition={150}
            accessible
            accessibilityRole="image"
            accessibilityLabel={`Photo of ${recipe.title}`}
            onError={() => setPhotoFailed(true)}
            style={styles.photo}
          />
          {/* With a photo on top, the back button floats over it and the title sits below. */}
          <View style={styles.floatingBack}>
            <BackButton onPress={() => router.back()} label="Back to recipes" />
          </View>
        </View>
      ) : null}

      <PushedHeader
        title={recipe.title}
        onBack={photo ? undefined : () => router.back()}
        backLabel="Back to recipes"
        below={
          <Text variant="caption" color="inkMuted">
            {recipeMeta(recipe)}
          </Text>
        }
      />

      {recipe.missing.length ? (
        <View style={styles.list}>
          <SectionHeader
            title="Missing"
            right={
              <ToBuyToggle
                added={recipe.onToBuy}
                count={recipe.missing.length}
                addedLabel="On To Buy"
                icon={false}
                onPress={() => actions.toggleRecipeToBuy(recipe.id)}
              />
            }
          />
          {recipe.missing.map((m) => (
            <View key={m} style={styles.row}>
              <View style={styles.grow}>
                <Text>{m}</Text>
                {recipe.onToBuy ? (
                  <Text variant="caption" weight="semibold" color="sageInk">
                    On To Buy
                  </Text>
                ) : null}
              </View>
              <Amount value={recipe.missingAmounts?.[m]} />
            </View>
          ))}
        </View>
      ) : null}

      {recipe.ingredients.length ? (
        <View style={styles.list}>
          <SectionHeader title="You have" />
          {recipe.ingredients.map((g) => (
            <View key={g.name} style={styles.row}>
              <View style={styles.grow}>
                <Text>{g.name}</Text>
                <Text variant="caption" color="inkMuted">
                  {PLACE_LABEL[g.place]}
                  {isSoon(g.name) ? (
                    <Text variant="caption" weight="semibold" color="bronzeInk">
                      {' · Use soon'}
                    </Text>
                  ) : null}
                </Text>
              </View>
              <Amount value={g.amount} />
            </View>
          ))}
        </View>
      ) : null}

      {recipe.steps.length || recipe.url ? (
        <View style={styles.steps}>
          {recipe.steps.length ? <SectionHeader title="Steps" /> : null}
          {recipe.steps.map((step, i) => (
            <View key={i} style={styles.step}>
              <Text style={styles.stepNo}>{i + 1}.</Text>
              <Text style={styles.grow}>{step}</Text>
            </View>
          ))}
          {recipe.url ? (
            <TextLink label={recipe.sourceLink} onPress={() => Linking.openURL(recipe.url!)} />
          ) : (
            <Text variant="caption" color="inkMuted">
              {recipe.sourceLink}
            </Text>
          )}
        </View>
      ) : null}
    </Screen>
  );
}

/** How much the recipe uses, on the right of an ingredient row. */
function Amount({ value }: { value?: string }) {
  return value ? (
    <Text color="inkMuted" style={styles.amount}>
      {value}
    </Text>
  ) : null;
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: 1 },
  center: { textAlign: 'center' },
  // Full bleed: out past the 20pt gutter on both sides, square at the screen edges.
  photo: { height: PHOTO_HEIGHT, marginHorizontal: -space.s5 },
  floatingBack: {
    position: 'absolute',
    top: space.s3,
    left: 0,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    ...shadow.island,
  },
  list: { gap: space.s1 },
  row: {
    minHeight: size.rowHeight,
    paddingVertical: space.s2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s3,
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
  },
  amount: { flexShrink: 0, maxWidth: '45%', textAlign: 'right' },
  steps: { gap: space.s3 },
  step: { flexDirection: 'row', gap: space.s2 },
  stepNo: { minWidth: space.s5 },
});
