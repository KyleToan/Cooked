import Svg, { Circle, Ellipse, Line, Path, Polyline, Rect } from 'react-native-svg';

import { color, size as sizes, type ColorName } from '@/theme';
import { iconData, type IconName } from './icon-data';

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

/** One of the 20 Cooked icons from design/system/icons. */
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
      accessible={!!label}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    >
      {iconData[name].map(({ tag, props }, i) => {
        if (parts && !parts.includes(i)) return null;
        const Shape = SHAPES[tag as keyof typeof SHAPES];
        return <Shape key={i} {...props} />;
      })}
    </Svg>
  );
}
