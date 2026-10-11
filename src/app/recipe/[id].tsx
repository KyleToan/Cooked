import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { PushedHeader, SectionHeader } from '@/components/Header';
import { Icon } from '@/components/Icon';
import { ToBuyToggle } from '@/components/ListRows';
import { Screen } from '@/components/Screen';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { isUseSoon, PLACE_LABEL, recipeMeta } from '@/data/helpers';
import { STAPLES } from '@/data/seed';
import { useStore, useUndo } from '@/data/store';
import { color, radius, size, space } from '@/theme';

const PHOTO_HEIGHT = 200;

export default function RecipeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, actions } = useStore();
  const recipe = state.recipes.find((r) => r.id === id);
  const made = useUndo(`recipe:${id}`);

  if (!recipe) {
    return (
      <Screen>
        <PushedHeader title="Recipes" onBack={() => router.back()} backLabel="Back to recipes" />
      </Screen>
    );
  }

  const soonNames = new Set(state.items.filter(isUseSoon).map((i) => i.name.toLowerCase()));
  const used = recipe.ingredients.filter((g) => g.have && !STAPLES.includes(g.name)).length;
  const canMake = recipe.ingredients.length > 0;

  const footer = canMake ? (
    <>
      {made ? (
        <View accessibilityRole="alert" style={styles.made}>
          <Text variant="button" style={styles.grow}>
            Took {used} things out of your kitchen
          </Text>
          <Tap accessibilityRole="button" accessibilityLabel="Undo: I made this" onPress={actions.undo} style={styles.undo}>
            <Text variant="button" weight="semibold" color="sageInk">
              Undo
            </Text>
          </Tap>
        </View>
      ) : (
        <ActionPill label="I made this" variant="primary" height="bottom" onPress={() => actions.madeRecipe(recipe.id)} />
      )}
      <Text variant="micro" color="inkMuted" weight="regular" style={styles.center}>
        {made ? 'Oil and spices stay in the pantry.' : 'We’ll take what you used out of your kitchen.'}
      </Text>
    </>
  ) : undefined;

  return (
    <Screen footer={footer} gap={space.s5 + 2}>
      <PushedHeader
        title={recipe.title}
        onBack={() => router.back()}
        backLabel="Back to recipes"
        below={
          <Text variant="caption" color="inkMuted">
            {recipeMeta(recipe)}
          </Text>
        }
      />

      {recipe.photo ? (
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Photo of ${recipe.title} from the recipe page`}
          style={styles.photo}
        >
          <Icon name="recipes" color="tabMark" />
        </View>
      ) : null}

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
              <Text>{m}</Text>
              {recipe.onToBuy ? (
                <Text variant="caption" weight="semibold" color="sageInk">
                  On To Buy
                </Text>
              ) : null}
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
                {soonNames.has(g.name.toLowerCase()) ? (
                  <Text variant="micro" weight="semibold" color="bronzeInk">
                    Use soon
                  </Text>
                ) : null}
              </View>
              <Text variant="caption" color="inkMuted">
                {PLACE_LABEL[g.place]}
              </Text>
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

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: 1 },
  center: { textAlign: 'center' },
  photo: {
    height: PHOTO_HEIGHT,
    borderRadius: radius.field,
    backgroundColor: color.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: space.s1 },
  row: {
    minHeight: size.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s3,
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
  },
  steps: { gap: space.s3 },
  step: { flexDirection: 'row', gap: space.s2 },
  stepNo: { minWidth: space.s5 },
  made: {
    height: size.controlHeight + space.s1,
    paddingLeft: space.s4 + 2,
    paddingRight: space.s1 + 2,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
  },
  undo: { height: size.targetMin, paddingHorizontal: space.s3 + 2, justifyContent: 'center' },
});
