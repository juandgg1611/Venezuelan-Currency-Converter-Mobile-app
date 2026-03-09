// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Para animaciones con reanimated
      "react-native-reanimated/plugin",
    ],
  };
};
