const baseConfig = require("./app.json");

const isDevelopmentClient = process.env.APP_VARIANT === "development";

module.exports = () => {
  const config = baseConfig.expo;

  if (!isDevelopmentClient) {
    return config;
  }

  // Keep the local development client separate from the Play Store app so a
  // QR link can never open the production install by mistake.
  return {
    ...config,
    name: "IIE Pulse Dev",
    // Keep the existing EAS project slug; only the installed Android app differs.
    slug: config.slug,
    scheme: "iiepulse-dev",
    android: {
      ...config.android,
      package: "com.wingroo.iiepulse.dev",
    },
  };
};
