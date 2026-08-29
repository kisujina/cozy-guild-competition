import type { NextConfig } from "next";
import TerserPlugin from "terser-webpack-plugin";

const nextConfig: NextConfig = {
  /* config options here */
  // 프로덕션 빌드 시 브라우저 소스맵 생성 차단
  productionBrowserSourceMaps: false,

  webpack: (config, { dev, isServer }) => {
    // 프로덕션 환경(운영 빌드)에서만 난독화 적용
    if (!dev && !isServer) {
      config.optimization.minimizer.push(
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true, // 운영 환경에서 console.log 제거
            },
            mangle: {
              toplevel: true, // 변수 및 함수명을 의미 없는 문자로 난독화
            },
            format: {
              comments: false, // 주석 제거
            },
          },
        })
      );
    }
    return config;
  },
};

export default nextConfig;
