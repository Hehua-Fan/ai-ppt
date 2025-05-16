/** @type {import('next').NextConfig} */
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const webpack = require('webpack');

const nextConfig = {
  // Disable Turbopack
  experimental: {
    turbo: false,
  },
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Add plugin to provide polyfills
      config.plugins.push(new NodePolyfillPlugin({
        excludeAliases: ['console'],
      }));
      
      // Replace node: imports - this is what webpack 5 needs
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:fs': require.resolve('./empty-module.js'),
        'node:fs/promises': require.resolve('./empty-module.js'),
        'node:path': require.resolve('path-browserify'),
        'node:https': require.resolve('./empty-module.js'),
        'node:http': require.resolve('./empty-module.js'),
        'node:os': require.resolve('./empty-module.js'),
        'node:crypto': require.resolve('crypto-browserify'),
        'node:stream': require.resolve('stream-browserify'),
        'node:zlib': require.resolve('browserify-zlib'),
      };
      
      // Fallbacks for node.js core modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        'fs/promises': false,
        path: require.resolve('path-browserify'),
        https: false,
        http: false,
        os: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        zlib: require.resolve('browserify-zlib'),
      };
      
      // Create an empty module for the node:fs and node:fs/promises imports
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^node:(fs|https|http|fs\/promises|crypto|os|path|stream|zlib)$/,
          (resource) => {
            const mod = resource.request.replace(/^node:/, '');
            if (mod === 'fs' || mod === 'fs/promises' || mod === 'https' || mod === 'http' || mod === 'os') {
              resource.request = require.resolve('./empty-module.js');
            } else if (mod === 'path') {
              resource.request = 'path-browserify';
            } else if (mod === 'crypto') {
              resource.request = 'crypto-browserify';
            } else if (mod === 'stream') {
              resource.request = 'stream-browserify';
            } else if (mod === 'zlib') {
              resource.request = 'browserify-zlib';
            }
          }
        )
      );
    }
    
    return config;
  },
  // List packages that should only be loaded on the client
  serverExternalPackages: ['pptxgenjs']
};

module.exports = nextConfig; 