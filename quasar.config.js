/* eslint-env node */

import { configure } from 'quasar/wrappers'

export default configure(function (/* ctx */) {
  return {
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: [
      'pinia',
      'axios',
      'socket.io'
    ],

    // https://v2.quasar.dev/quasar-cli-vite/handling-css
    css: [
      'app.scss'
    ],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      'roboto-font',
      'material-icons'
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file
    framework: {
      iconSet: 'material-icons',
      lang: 'en-us',

      plugins: [
        'LocalStorage',
        'SessionStorage',
        'Notify',
        'Dialog'
      ],
      config: {
        dark: 'auto'
      }
    },

    // https://v2.quasar.dev/quasar-cli-vite/building-vite
    build: {
      sourcemap: true,
      extendViteConf (viteConf) {
        // vite 配置扩展入口（替代旧的 extendWebpack）
      }
    },

    // https://v2.quasar.dev/quasar-cli-vite/dev-server-commands
    devServer: {
      https: false,
      port: 8080,
      open: true,
      proxy: {
        '/api': { target: 'http://localhost:8888' },
        '/socket.io': {
          target: 'http://localhost:8888',
          ws: true
        },
        '/workbox': { target: 'http://localhost:8888' }
      }
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    pwa: {
      workboxMode: 'GenerateSW',
      workboxOptions: {
        skipWaiting: true,
        clientsClaim: true,
        exclude: [
          /manifest\.json$/,
          /.*\.js\.map$/
        ],
        navigateFallbackDenylist: [
          /^\/api\/.*$/,
          /\/media\/.*$/
        ]
      },
    }
  }
})
