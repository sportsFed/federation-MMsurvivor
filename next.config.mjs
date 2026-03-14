/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['undici', 'firebase'],
  // Prevents firebase-admin (a Node.js-only package) from being bundled in Server Components
  serverExternalPackages: ['firebase-admin'],
};

export default nextConfig;
