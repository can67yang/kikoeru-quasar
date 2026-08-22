<template>
  <div class="q-pa-lg">
    <div v-if="$q.platform.is.safari && !$q.platform.is.desktop">
      <h2>iOS Bug</h2>
      <div class="tab">
        <p>
          iOS 17.3 及后续版本会出现后台无法连播音频的bug，猜测是苹果官方出于节省后台流量，
          避免非用户触发的自动播放，此bug暂无修复方案。
          <a href="https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/Device-SpecificConsiderations/Device-SpecificConsiderations.html">
            参考链接：User Control of Downloads Over Cellular Networks
          </a>
          <br />
          有碰到此问题的用户可以考虑使用下方的iOS原生客户端（无后台连播问题），
          点击“加入TestFlight测试”，并点击网页中的“开始测试”后，即可使用该客户端，app内使用方法可参考最下方的网站链接。
        </p>
      </div>
    </div>

    <h2>GitHub</h2>
    <div class="tab">
      <a href="https://github.com/Number178/kikoeru-express">
        <q-btn outline label="后端仓库" push color="primary" />
      </a>
      <p>如果你发现了任何bug或者体验上的任何问题，欢迎在这个仓库里提交issue反馈。</p>
      <br />
      <a href="https://github.com/Number178/kikoeru-quasar">
        <q-btn class="q-mt-lg" outline label="前端仓库" push color="primary" />
      </a>
      <br />
      <a href="https://github.com/Number178/kikoeru-translate">
        <q-btn class="q-mt-lg" outline label="AI翻译仓库" push color="primary" />
      </a>
    </div>

    <h2>发布</h2>
    <div class="tab">
      <a href="https://hub.docker.com/r/number17/kikoeru">
        <q-btn outline label="Docker镜像地址" push color="secondary" />
      </a>
      <br />
      <p>Docker Hub主页中会有每一次更新的功能说明，以及AI翻译工具的使用说明文档、录屏、权重等。</p>
      <br />
      <a href="https://github.com/Number178/kikoeru-express/releases">
        <q-btn class="q-mt-lg" outline label="Windows本地运行包" push color="secondary" />
      </a>
      <p>Windows包和Docker镜像同步发布，功能一致。</p>
      <br />
    </div>

    <h2>iOS客户端</h2>
    <div class="tab">
      <a href="https://testflight.apple.com/join/Zh9mreFq">
        <q-btn outline label="加入test flight测试" push color="warning" />
      </a>
      <p>解决iOS17.3以上系统，后台无法连播的bug，持续更新功能中。</p>
      <br />
      <a href="https://number17.online/docs/kikoeru-app/">
        <q-btn class="q-mt-lg" outline label="iOS客户端使用说明" push color="warning" />
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
