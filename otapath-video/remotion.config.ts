/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);

// Remotion's default Chrome Headless Shell build crashed on this machine
// (macOS 26.5, arm64: "icudtl.dat not found in bundle" → "GPU process isn't
// usable"), so renders use Remotion's other managed browser, Chrome for
// Testing. Remove this line to go back to the default headless shell.
Config.setChromeMode("chrome-for-testing");
