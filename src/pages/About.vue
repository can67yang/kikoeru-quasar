<template>
  <div class="q-pa-lg">
    <h2>GitHub</h2>
    <div class="tab">
      <a href="https://github.com/can67yang/kikoeru-go">
        <q-btn outline label="后端仓库" push color="primary" />
      </a>
      <p>如果你发现了任何bug或者体验上的任何问题，欢迎在这个仓库里提交issue反馈。</p>
      <br />
      <a href="https://github.com/can67yang/kikoeru-quasar">
        <q-btn class="q-mt-lg" outline label="前端仓库" push color="primary" />
      </a>
      <br />
      <a href="https://github.com/Number178/kikoeru-translate">
        <q-btn class="q-mt-lg" outline label="AI翻译仓库" push color="primary" />
      </a>
    </div>
  </div>
</template>

<script>
export default {
  name: 'About',

  data() {
    return {
      name: '',
      password: '',
    };
  },

  methods: {},
};
</script>

<style scoped>
.tab {
  padding-left: 2rem;
}
</style>
