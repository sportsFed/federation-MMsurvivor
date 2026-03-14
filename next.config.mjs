/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevents firebase-admin (a Node.js-only package) from being bundled in Server Components
  serverExternalPackages: ['firebase-admin'],
};

export default nextConfig;
