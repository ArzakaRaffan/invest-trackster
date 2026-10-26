const path = require('node:path');
// Use the same security headers as Trackster, without inheriting its product routes.
const trackster = require('../frontend/next.config.js');
/** @type {import('next').NextConfig} */
module.exports = {
  poweredByHeader: false,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  outputFileTracingIncludes: { '/track-mascot.js': ['../frontend/public/track-mascot.js'] },
  experimental: { cpus: 1 },
  headers: trackster.headers,
  webpack(config) {
    // Shared views live in frontend/. Resolve hooks to this app's single React instance.
    config.resolve.alias['react$'] = require.resolve('react');
    config.resolve.alias['react-dom$'] = require.resolve('react-dom');
    return config;
  },
};
