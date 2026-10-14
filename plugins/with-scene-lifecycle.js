// Opts the iOS app into the scene-based life cycle, which iOS 27 requires: without it the app
// stops at launch (UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption).
//
// Expo ships the scene delegate (`ExpoAppSceneDelegate`, Objective-C name `EXExpoAppSceneDelegate`),
// but the SDK 57 template doesn't use it yet. This plugin:
// 1. names it as the scene delegate in Info.plist (UIApplicationSceneManifest), and
// 2. makes AppDelegate an `ExpoReactNativeFactoryProvider` and stops it creating its own window,
//    because the scene delegate now creates the window and starts React Native in it.
// Remove this plugin once Expo's template adopts scenes itself.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const CLASS_LINE = 'class AppDelegate: ExpoAppDelegate {';
const PROVIDER_LINE = 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {';
// The template's own window: the scene delegate does this now.
const WINDOW_BLOCK = /#if os\(iOS\) \|\| os\(tvOS\)\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*factory\.startReactNative\([\s\S]*?\)\s*#endif/;

function adoptScenes(contents) {
  if (contents.includes(PROVIDER_LINE)) return contents;
  if (!contents.includes(CLASS_LINE) || !WINDOW_BLOCK.test(contents)) {
    // Fail the build loudly rather than ship an app that stops at launch.
    throw new Error(
      'with-scene-lifecycle: AppDelegate.swift no longer matches the SDK 57 template. ' +
        'Check whether Expo adopts scenes itself now, and update or remove plugins/with-scene-lifecycle.js.',
    );
  }
  return contents
    .replace(CLASS_LINE, PROVIDER_LINE)
    .replace(WINDOW_BLOCK, '    // The scene delegate (EXExpoAppSceneDelegate) creates the window and starts React Native.');
}

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          { UISceneConfigurationName: 'Default Configuration', UISceneDelegateClassName: 'EXExpoAppSceneDelegate' },
        ],
      },
    };
    return c;
  });
  return withAppDelegate(config, (c) => {
    if (c.modResults.language !== 'swift') throw new Error('with-scene-lifecycle: expected a Swift AppDelegate.');
    c.modResults.contents = adoptScenes(c.modResults.contents);
    return c;
  });
};
