import { Platform } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Polyline, Rect } from 'react-native-svg';

import { color, size as sizes, type ColorName } from '@/theme';
import { iconData, type IconName } from './icon-data';

/** Name an icon-only button's icon; hide decorative icons from screen readers. */
function a11y(label?: string): object {
  if (Platform.OS === 'web') return label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return label
    ? { accessible: true, accessibilityLabel: label }
    : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' };
}

const SHAPES = { path: Path, circle: Circle, rect: Rect, line: Line, polyline: Polyline, ellipse: Ellipse };

type Props = {
  name: IconName;
  /** 24 by default (`icon-md`); 18 inside pills and next to captions (`icon-sm`). */
  size?: number;
  color?: ColorName;
  /** Only the Home icon is ever filled, and only on its active tab. */
  filled?: boolean;
  /** Required for icon-only buttons. Leave out when the icon sits next to text. */
  label?: string;
  /** Draw only these shapes of the icon (the loaders animate their parts separately). */
  parts?: number[];
};

/** One of the 22 Cooked icons from design/system/icons. */
export function Icon({ name, size = sizes.iconMd, color: tint = 'ink', filled = false, label, parts }: Props) {
  const stroke = color[tint];
  const strokeWidth = size <= sizes.iconSm ? 2 : sizes.iconStroke;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? stroke : 'none'}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...a11y(label)}
    >
      {iconData[name].map(({ tag, props }, i) => {
        if (parts && !parts.includes(i)) return null;
        const Shape = SHAPES[tag as keyof typeof SHAPES];
        return <Shape key={i} {...props} />;
      })}
    </Svg>
  );
}
