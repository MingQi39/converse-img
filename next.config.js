/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
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
  serverComponentsExternalPackages: ["fluent-ffmpeg", "@ffmpeg-installer/ffmpeg"],
};

module.exports = nextConfig;
