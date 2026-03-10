import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react.tsx',
    nextjs: 'src/nextjs.ts',
    node: 'src/node.ts',
    express: 'src/express.ts',
    nestjs: 'src/nestjs.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: false,
  minify: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom', 'next', 'express', '@nestjs/common'],
})
