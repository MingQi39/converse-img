/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
      bodySizeLimit: "2mb",
    },
    serverComponentsExternalPackages: ["fluent-ffmpeg", "@ffmpeg-installer/ffmpeg"],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "fluent-ffmpeg": "fluent-ffmpeg",
    };
    config.externals = [
      ...config.externals,
      {
        "fluent-ffmpeg": "commonjs fluent-ffmpeg",
        "@ffmpeg-installer/ffmpeg": "commonjs @ffmpeg-installer/ffmpeg",
      },
    ];
    return config;
  },
};

module.exports = nextConfig;
