import * as path from 'path'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import pkg from './package.json'
import vueI18n from '@intlify/vite-plugin-vue-i18n'
import svgLoader from 'vite-svg-loader'
import VitePluginHtmlEnv from 'vite-plugin-html-env'
  import Icons from 'unplugin-icons/vite'
import AutoImport from 'unplugin-auto-import/vite'
 import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'
 import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import inject from '@rollup/plugin-inject'
import stdLibBrowser from 'node-stdlib-browser'
import { viteExternalsPlugin } from 'vite-plugin-externals'
import nodePolyfills from 'rollup-plugin-polyfill-node'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'
// import { sentryVitePlugin } from '@sentry/vite-plugin'
import type { ViteSentryPluginOptions } from 'vite-plugin-sentry'
import viteSentry from 'vite-plugin-sentry'
import VueDevTools from 'vite-plugin-vue-devtools'
import { createHtmlPlugin } from 'vite-plugin-html'

// import dns from 'dns'
// dns.setDefaultResultOrder('verbatim')
const pathSrc = path.resolve(__dirname, 'src')
const productionEnvs = ['mainnet']

export default ({ mode, command }) => {
  // 加载环境配置文件
  const env = loadEnv(mode, process.cwd())
  const sentryConfig: ViteSentryPluginOptions = {
    url: env.VITE_SENTRY_URL,
    authToken: env.VITE_SENTRY_AUTH_TOKEN,
    org: env.VITE_SENTRY_ORG,
    project: env.VITE_SENTRY_PROJECT,
    release: env.VITE_COMMIT_ID,
    deploy: {
      env: 'production'
    },
    setCommits: {
      auto: true
    },
    sourceMaps: {
      include: ['./dist/assets'],
      ignore: ['node_modules'],
      urlPrefix: '~/assets'
    }
  }
  // const isProduction = productionEnvs.includes(mode) && command === 'build' ? true : false
  const isProduction = command === 'build'
  
  return defineConfig({
    //base: process.env.NODE_ENV === 'production' ? '/chat/' : '/',
    plugins: [
      command === 'serve' &&
        nodePolyfills({
          include: ['node_modules/**/*.js', new RegExp('node_modules/.vite/.*js')],
        }),
      {
        ...inject({
          global: [require.resolve('node-stdlib-browser/helpers/esbuild/shim'), 'global'],
          process: [require.resolve('node-stdlib-browser/helpers/esbuild/shim'), 'process'],
          Buffer: [require.resolve('node-stdlib-browser/helpers/esbuild/shim'), 'Buffer'],
        }),
        enforce: 'post',
      },
    //      createHtmlPlugin({
    //   inject: {
    //     data: {
    //       basePath: '/chat/'
    //     }
    //   },
    //   template: 'index.html'
    // }),
//          {
//       name: 'force-base-path',
//       transformIndexHtml(html) {
//        return process.env.NODE_ENV === 'production' ?  html.replace(/(src|href)="\/assets\//g, '$1="/chat/assets/') : html
    
       
//       },
//    generateBundle(options, bundle) {
//   if (process.env.NODE_ENV === 'production') {
//     Object.keys(bundle).forEach(key => {
//       const file = bundle[key]
//       // 处理所有资源文件（JS/CSS/图片等）
//       if (file.type === 'asset') {
//         // 方案1：直接修改文件名（推荐）
//         if (file.fileName.startsWith('assets/')) {
//           file.fileName = `chat/assets/${file.fileName}`
//         }

//         if (file.fileName.startsWith('chat/chat/')) {
//           file.fileName = file.fileName.replace('chat/chat/', 'chat/')
//           }
        
//         // 方案2：修改文件内容中的路径引用（适用于CSS/HTML等）
//         if (file.source) {
//           file.source = file.source.toString()
//             // 处理 url() 引用
//             .replace(/(url\(['"]?)(\/?assets\/)/g, '$1/chat/$2')
//             // 处理 src/href 引用
//             .replace(/(src|href)=(['"])(\/?assets\/)/g, '$1=$2/chat/$3')
//         }
//       }
      
//       // 处理JS chunk文件
//       if (file.type === 'chunk') {
//         file.code = file.code.replace(
//           /(from|import)\(?['"](\/?assets\/)/g, 
//           '$1$2/chat/$3'
//         )
//       }
//     })
//   }
// }
//     },
      VueDevTools(),
      vue({
        template: {
          compilerOptions: {
            isCustomElement: tag => tag.includes('show-'),
          },
        },
      }),
     
      // element-plus 按需加载
      AutoImport({
        resolvers: [
          ElementPlusResolver(),
          // IconsResolver({
          //   prefix: 'Icon',
          // }),
        ],
        dts: path.resolve(pathSrc, 'auto-imports.d.ts'),
      }),
      Components({
        resolvers: [
          ElementPlusResolver(),
          // IconsResolver({
          //   enabledCollections: ['ep'],
          // }),
        ],
        dts: path.resolve(pathSrc, 'components.d.ts'),
      }),
      // Icons({
      //   autoInstall: true,
      // }),
      // 多语言加载
      vueI18n({
        // if you want to use Vue I18n Legacy API, you need to set `compositionOnly: false`
        // compositionOnly: false,

        // you need to set i18n resource including paths !
        include: path.resolve(__dirname, './src/languages/**'),
      }),
      svgLoader(),
      VitePluginHtmlEnv(),
      createSvgIconsPlugin({
        // 指定需要缓存的图标文件夹
        iconDirs: [path.resolve(process.cwd(), 'src/assets/icons')],
        // 指定symbolId格式
        symbolId: 'icon-[dir]-[name]',

        /**
         * 自定义插入位置
         * @default: body-last
         */
        // inject?: 'body-last' | 'body-first'

        /**
         * custom dom id
         * @default: __svg__icons__dom__
        //  */
        customDomId: '__svg__icons__dom__',
      }),
      // viteExternalsPlugin({
      //   'mvc-lib': 'mvc',
      //   'mvc-lib/ecies': 'ECIES',
      //   'mvc-lib/mnemonic': 'Mnemonic',
      //   bip39: 'bip39',
      // }),

      // VitePWA({
      //   registerType: 'autoUpdate',
      //   includeAssets: ['favicon.ico'],
      //   devOptions: {
      //     enabled: true,
      //     navigateFallbackAllowlist: [/^index.html$/],
      //   },
      //   manifest: {
      //     name: 'ShowNow',
      //     short_name: 'ShowNow',
      //     description:
      //       "ShowNow",
      //     theme_color: '#ffffff',
      //     icons: [
      //       {
      //         src: 'pwa-48x48.png',
      //         sizes: '48x48',
      //         type: 'image/png',
      //       },
      //       {
      //         src: 'pwa-72x72.png',
      //         sizes: '72x72',
      //         type: 'image/png',
      //       },
      //       {
      //         src: 'pwa-96x96.png',
      //         sizes: '96x96',
      //         type: 'image/png',
      //       },
      //       {
      //         src: 'pwa-144x144.png',
      //         sizes: '144x144',
      //         type: 'image/png',
      //       },
      //       {
      //         src: 'pwa-168x168.png',
      //         sizes: '168x168',
      //         type: 'image/png',
      //       },
      //       {
      //         src: 'pwa-192x192.png',
      //         sizes: '192x192',
      //         type: 'image/png',
      //       },
      //       {
      //         src: 'pwa-512x512.png',
      //         sizes: '512x512',
      //         type: 'image/png',
      //       },
      //       {
      //         src: 'pwa-512x512.png',
      //         sizes: '512x512',
      //         type: 'image/png',
      //         purpose: 'any maskable',
      //       },
      //     ],
      //   },
      // }),
      // basicSsl(),

      // sentryVitePlugin({
      //   include: '.',
      //   ignore: ['node_modules', 'vite.config.ts'],
      //   org: env.VITE_SENTRY_ORG,
      //   project: env.VITE_SENTRY_PROJECT,
      //   authToken: env.VITE_SENTRY_AUTH_TOKEN,
      // }),
      viteSentry(sentryConfig)
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        ...stdLibBrowser,
      },
    },
    optimizeDeps: {
      include: ['buffer', 'process'],
      // disabled: true
    },
    define: {
      _APP_VERSION: JSON.stringify(pkg.version),
    },
    server: {
      host: true,
      // port: 8080,

      https: false,
      // open: true,
      // proxy: {
      //   '^/metasv/': {
      //     target: 'https://192.168.168.147:443',
      //     changeOrigin: true,
      //     rewrite: path => path.replace(/^\/metasv/, ''),
      //   },
      // },
    },
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
      

    },
    build: {
      // outDir: 'dist',
      // assetsDir: 'assets',
      //  manifest: true,
      target: isProduction ? 'es2015' : 'modules',
      minify: isProduction,
      sourcemap: isProduction ? false : 'inline',
      // sourcemap: true,
      rollupOptions: {
        // @ts-ignore
        plugins: [nodePolyfills()],
        output: {
          sourcemap: isProduction ? false : 'inline',
        //    assetFileNames: 'chat/assets/[name].[hash].[ext]',
        //    chunkFileNames: 'chat/assets/[name].[hash].js',
        // entryFileNames: 'chat/assets/[name].[hash].js'
        },
      },
      commonjsOptions: {
        transformMixedEsModules: true,
        
      },
    },
    sourcemap: isProduction ? false : 'inline',
  })
}
