// Learn more https://docs.expo.dev/guides/customizing-metro
const {getDefaultConfig} = require('expo/metro-config');
const {withUniwindConfig} = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// withUniwindConfig must stay the OUTERMOST wrapper — any config wrapper applied
// after it does not see Uniwind's transformer and classNames silently stop working.
// cssEntryFile must be a relative path string, never path.resolve().
module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  dtsFile: './src/uniwind-types.d.ts',
});
