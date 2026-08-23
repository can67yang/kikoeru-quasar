import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'

export default [
  {
    ignores: ['dist/**', '.quasar/**', 'node_modules/**', 'src-pwa/custom-service-worker.js']
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.{js,mjs,vue}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Quasar CLI 注入的环境变量
        process: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'off',
      'vue/multi-word-component-names': 'off'
    }
  }
]
