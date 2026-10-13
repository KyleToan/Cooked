#!/usr/bin/env bash
# Builds Cooked for the iPhone Simulator and opens it there. No Apple Developer account needed.
# Google ML Kit has no arm64 simulator slice, so it is left out of this build: Scan shows the
# sample receipt, as in Expo Go. `npx expo run:ios` brings ML Kit back and fails to sign.
set -euo pipefail
cd "$(dirname "$0")/.."
SIM="${1:-iPhone 18 Pro}"

# Leave ML Kit out of autolinking only while the pods install, then put package.json back.
cp package.json package.json.sim-bak
trap '[ -f package.json.sim-bak ] && mv package.json.sim-bak package.json' EXIT
node -e '
const fs = require("fs");
const p = JSON.parse(fs.readFileSync("package.json"));
p.expo = { ...p.expo, autolinking: { exclude: ["@infinitered/react-native-mlkit-text-recognition", "@infinitered/react-native-mlkit-core"] } };
fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n");'
npx expo prebuild --platform ios --no-install
(cd ios && pod install)
mv package.json.sim-bak package.json

xcrun simctl boot "$SIM" 2>/dev/null || true
open -b com.apple.iphonesimulator 2>/dev/null || echo "Couldn't open the Simulator window; the app still runs on $SIM."
xcodebuild -workspace ios/Cooked.xcworkspace -scheme Cooked -configuration Debug \
  -destination "platform=iOS Simulator,name=$SIM" -derivedDataPath ios/build -quiet
APP=ios/build/Build/Products/Debug-iphonesimulator/Cooked.app
xcrun simctl install booted "$APP"
xcrun simctl launch booted "$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$APP/Info.plist")"
echo "Running on $SIM. Start the dev server with 'npm start' if it isn't running."
