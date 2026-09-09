import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Client-side Router Cache: reuse an already-fetched route for a short
    // window so back/forward and re-clicks are instant instead of making a
    // fresh round-trip to the (US-East) function on every navigation. Dynamic
    // (auth'd) pages are cached 30s; prefetched static shells 5 min.
    staleTimes: { dynamic: 30, static: 300 },
  },
};

export default nextConfig;
