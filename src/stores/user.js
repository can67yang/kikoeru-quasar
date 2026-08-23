import { defineStore } from 'pinia'

export const useUserStore = defineStore('User', {
  state: () => ({
    auth: false, // 是否启用用户验证
    name: '',
    group: ''
  }),

  actions: {
    INIT (user) {
      this.name = user.name
      this.group = user.group
    },

    SET_AUTH (flag) {
      this.auth = flag
    }
  }
})
