import { boot } from 'quasar/wrappers'
import { io } from 'socket.io-client'

const socket = io({
  autoConnect: false,
  query: {
    auth_token: ''
  }
})

export default boot(({ app }) => {
  app.config.globalProperties.$socket = socket

  // 兼容旧 vue-socket.io 的 `sockets: { ... }` 组件选项：
  // 组件创建时自动把 sockets 内的处理器绑定到 socket 事件，销毁时自动解绑
  app.mixin({
    created () {
      const sockets = this.$options.sockets
      if (!sockets) return
      this._socketHandlers = {}
      for (const [event, handler] of Object.entries(sockets)) {
        const bound = handler.bind(this)
        this._socketHandlers[event] = bound
        socket.on(event, bound)
      }
    },
    beforeUnmount () {
      if (!this._socketHandlers) return
      for (const [event, handler] of Object.entries(this._socketHandlers)) {
        socket.off(event, handler)
      }
      this._socketHandlers = null
    }
  })
})
