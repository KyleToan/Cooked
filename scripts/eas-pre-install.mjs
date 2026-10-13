// EAS runs this before installing packages (the `eas-build-pre-install` npm hook).
// For the `development-simulator` profile it leaves Google ML Kit out of autolinking:
// ML Kit has no arm64 Simulator slice, so the build can't link with it. Scan then shows
// the sample receipt, as in Expo Go. Other profiles are left alone. Same list as ios-sim.sh.
import { readFileSync, writeFileSync } from 'node:fs';

if (process.env.EAS_BUILD_PROFILE === 'development-simulator') {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  pkg.expo = {
    ...pkg.expo,
    autolinking: {
      exclude: ['@infinitered/react-native-mlkit-text-recognition', '@infinitered/react-native-mlkit-core'],
    },
  };
  writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  console.log('Left ML Kit out of autolinking for the Simulator build.');
}
