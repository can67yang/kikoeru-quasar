import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes.js'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 */

export default function (/* { store, ssrContext } */) {
  const Router = createRouter({
    scrollBehavior(to, from, savedPosition) {
      if (savedPosition) {
        return savedPosition
      } else {
        return { left: 0, top: 0 }
      }
    },
    routes,

    // Leave these as they are and change in quasar.config.js instead!
    // quasar.config.js -> build -> vueRouterMode
    // quasar.config.js -> build -> publicPath
    history: createWebHistory(
      process.env.VUE_ROUTER_BASE
    )
  })

  return Router
}
