const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Code shared with the website, imported as @website/... (tsconfig paths). Only these two folders, so Metro
// doesn't watch the whole website. Files in them must not import anything outside themselves.
const website = path.resolve(__dirname, '../website');
config.watchFolders = [...(config.watchFolders ?? []), path.join(website, 'funnels'), path.join(website, 'lib/kit')];

module.exports = withNativeWind(config, { input: './global.css' });
