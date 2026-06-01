import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    // @ts-ignore
    appIsrStatus: false,
    // @ts-ignore
    buildActivity: false,
  },
};

export default nextConfig;
