import { Tap } from './Tap';
import { Text } from './Text';
import { size, type ColorName, type TypeName } from '@/theme';

type Props = {
  label: string;
  onPress?: () => void;
  /** `sage-ink` for links, `error-ink` for destructive text, `ink-muted` for quiet ones (Remove). */
  color?: ColorName;
  variant?: TypeName;
  align?: 'start' | 'center' | 'end';
  accessibilityLabel?: string;
  disabled?: boolean;
};

/** A text button with a 44pt hit area: "See all 6", "Make a new link", "Delete account". */
export function TextLink({
  label,
  onPress,
  color = 'sageInk',
  variant = 'link',
  align = 'start',
  accessibilityLabel,
  disabled,
}: Props) {
  const alignSelf = align === 'start' ? 'flex-start' : align === 'end' ? 'flex-end' : 'center';
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      style={{ minHeight: size.targetMin, justifyContent: 'center', alignSelf }}
    >
      <Text variant={variant} color={disabled ? 'inkSubtle' : color} weight="semibold">
        {label}
      </Text>
    </Tap>
  );
}
