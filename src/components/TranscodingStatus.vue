<template>
  <div>
    {{ showMsg }}
  </div>
</template>

<script>
import { ServerApi } from '../utils.js'
import { mapState } from 'vuex'

export default {
  name: 'TranscodingStatus',

  props: {
    trackHash: {
      type: String,
      required: true
    }
  },

  computed: {
    ...mapState('AudioPlayer', [
      'transcodeBitRate'
    ]),

    isIndeterminate() {
      return !this.serverStatus.ready && !this.serverStatus.progress;
    },

    showMsg() {
      if (this.serverStatus.ready) {
        return 'AAC';
      }
      if (this.serverStatus.progress === null || this.serverStatus.progress === undefined) {
        return '等待转码';
      }
      const percent = this.serverStatus.progress.percent;
      if (typeof percent !== 'number') {
        return '转码错误';
      }
      return `转码: ${percent.toFixed(0)}%`;
    },

    color() {
      if (this.serverStatus.ready) {
        return 'positive';
      }
      if (this.serverStatus.progress === null || this.serverStatus.progress === undefined) {
        return 'negative';
      }
      const percent = this.serverStatus.progress.percent;
      if (typeof percent !== 'number') {
        return 'negative';
      }
      return 'secondary';
    },

    value() {
      if (this.serverStatus.progress === null || this.serverStatus.progress === undefined) {
        return 0;
      }
      const percent = this.serverStatus.progress.percent;
      if (typeof percent !== 'number') {
        return 0;
      }
      return percent;
    }
  },

  data () {
    return {
      serverStatus: {
        ready: false,
        hash: '',
        progress: null
      },
      intervalId: 0
    }
  },

  watch: {
    trackHash() {
      this.resetChecker();
    }
  },

  methods: {
    async checkStatus() {
      const status = await ServerApi.getTranscodingStatus(this.trackHash, this.transcodeBitRate);
      this.serverStatus = {
        ...status,
        hash: this.trackHash
      };
    },

    resetChecker() {
      this.checkStatus();

      this.intervalId = setInterval(() => {
        if (this.trackHash == this.serverStatus.hash && this.serverStatus.ready) {
          console.log('server transcoding finished, clear interval check', this.intervalId);
          clearInterval(this.intervalId);
          return;
        }
        this.checkStatus();
      }, 1000);

      console.log('start transcoding interval check', this.trackHash, this.intervalId);
    }
  },

  mounted() {
    this.resetChecker();
  },

  beforeDestroy() {
    clearInterval(this.intervalId);
    this.intervalId = 0;
  }
}
</script>
