module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['@babel/plugin-transform-react-jsx', {
        // This can help with key prop warnings
        useBuiltIns: true
      }]
    ]
  };
};
