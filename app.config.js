import { ExpoConfig } from '@expo/config-types';

// Get the base config from app.json
const config = require('./app.json');

// Generate the final config object
module.exports = ({ config: inputConfig }) => {
  return {
    ...config.expo,
    ...inputConfig,
    // Override plugins to remove expo-sqlite
    plugins: (config.expo.plugins || []).filter(plugin => plugin !== 'expo-sqlite'),
    extra: {
      ...config.expo.extra,
      ...inputConfig.extra,
      // Add any additional runtime configuration here
      useSupabaseDatabase: true,
    },
  };
};
