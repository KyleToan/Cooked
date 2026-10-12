// Runs after npm install. ML Kit's text recognition module (5.0.1) names `Text` bare, which SDK 57's
// ExpoModulesCore makes ambiguous with SwiftUI.Text, so the iOS build fails. Qualify it with ML Kit's module.
// shortcut: patches node_modules in place; drop it once the package ships a fix.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const file = 'node_modules/@infinitered/react-native-mlkit-text-recognition/ios/RNMLKitTextRecord.swift';
const bare = 'func mapTextToRecord(_ text: Text)';
const fixed = 'func mapTextToRecord(_ text: MLKitTextRecognitionCommon.Text)';

if (existsSync(file)) {
  let src = readFileSync(file, 'utf8');
  if (src.includes(bare)) {
    src = src.replace('import MLKitTextRecognition\n', 'import MLKitTextRecognition\nimport MLKitTextRecognitionCommon\n').replace(bare, fixed);
    writeFileSync(file, src);
    console.log('patch-mlkit: qualified ML Kit Text');
  } else if (!src.includes(fixed)) {
    console.warn('patch-mlkit: RNMLKitTextRecord.swift changed; check whether the patch is still needed');
  }
}
