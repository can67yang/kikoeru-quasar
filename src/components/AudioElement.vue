<template>

  <!--在进度条周围监听mouseup、mousedown事件，辅助进度条状态切换-->
  <div class="q-px-md"
      @mousedown.capture="onPanSlider('start')"
      @mouseup.capture="onPanSlider('end')"
  >
    <q-slider v-model="changeCurrentTime"
      @change="onChangeSlider"
      @pan="onPanSlider"
      :min="0" :max="duration" :step="0.01"
      label
      :label-value="formatSeconds(displayCurrentTime)"
      />
    <vue-plyr
      ref="plyr"
      :hideControls="false"
      class="vue-plyr"
      :emit="['canplay', 'timeupdate', 'ended', 'seeked', 'playing', 'waiting', 'pause']" @canplay="onCanplay()"
      @timeupdate="onTimeupdate()"
      @ended="onEnded()"
      @seeked="onSeeked()"
      @playing="onPlaying()"
      @waiting="onWaiting()"
      @pause="onPause()"
    >
      <!--使用video组件来播放音频和视频文件，同时隐藏原生的vue-plyr组件，这里的组件只会留下一个进度条的功能
      之所以用video，是因为video可以设置mp3等音频文件，也可以播放mp4等视频文件，在播放视频的时候，还能够用该video元素作为canvas绘制来源，
      反之，audio虽然可以播放video的音频，但是将其作为canvas的绘制源，因此倾向于使用video来播放所有媒体元素-->
      <!--注意，这里video设置了一个id，因为需要被其他组件通过document.querySelector方式进行查找引用-->
      <video v-if="enableVideoSource" class="hide-in-global-page-for-pip" id="mediaVideo" crossorigin="anonymous" playsinline controls="controls" style="display: inline;">
        <source v-if="source" :src="source" />
      </video>
      <audio v-else crossorigin="anonymous">
        <source v-if="source" :src="source" />
      </audio>
    </vue-plyr>
  </div>
</template>

<script>
import Lyric from 'src/utils/lrc-file-parser'
import { mapState, mapGetters, mapMutations } from 'vuex'
import NotifyMixin from '../mixins/Notification.js'
import { formatSeconds, getExtensionWithoutDot, ServerApi } from '../utils'
import { TranscodeOption } from 'src/store/module-AudioPlayer/getters'
import { debounce } from 'quasar';

export default {
  name: 'AudioElement',

  mixins: [NotifyMixin],

  data() {
    return {
      lrcObj: null,

      // 音频播放器进度条实现有些trick，普通的slider不能直接用，
      // 因为time的更新源有两个【audio播放】【用户输入】，
      // 两个更新源回导致进度条跳转出错，需要在【用户输入时】关闭【audio播放】发出的time更新（slider上）
      isChangingCurrentTime: false,
      changeCurrentTime: 0,
    }
  },

  computed: {
    player () {
      return this.$refs.plyr.player
    },

    source () {
      // 从 LocalStorage 中读取 token
      const token = this.$q.localStorage.getItem('jwt-token') || ''
      // 当前文件需要转码播放时，使用转码流
      if (this.currentPlayingFile.hash && this.checkCurrentPlayingFileShouldUseTranscoding()) {
        const bitRate = this.transcodeBitRate;
        return `/api/media/transcode/${this.currentPlayingFile.hash}?token=${token}&bitRate=${bitRate}`
      }
      // New API
      if (this.currentPlayingFile.mediaStreamUrl) {
        return `${this.currentPlayingFile.mediaStreamUrl}?token=${token}`
      } else if (this.currentPlayingFile.hash) {
        // Fallback to be compatible with old backend
        return `/api/media/stream/${this.currentPlayingFile.hash}?token=${token}`
      } else {
        return ""
      }
    },

    ...mapState('AudioPlayer', [
      'playing',
      'queue',
      'queueIndex',
      'playMode',
      'muted',
      'volume',
      'sleepTime',
      'sleepMode',
      'rewindSeekTime',
      'forwardSeekTime',
      'rewindSeekMode',
      'forwardSeekMode',
      'enableVisualizer',
      'resumeHistroySeconds',
      'playWorkId',
      'visualPlayerCoverUrl',
      'duration',
      'currentTime',
      'newCurrentTime',
      'enableVideoSource',
      'lyricOffsetSeconds',
      'enablePIPLyrics',
      'lyricLines',
      'hasLyric',
      'transcodeOption',
      'transcodeFromTypes',
    ]),

    ...mapGetters('AudioPlayer', [
      'currentPlayingFile',
      'resumeHistroyDone',
      'transcodeBitRate',
    ]),

    displayCurrentTime() {
      if (this.isChangingCurrentTime) return this.changeCurrentTime;
      else return this.currentTime;
    }
  },

  watch: {
    playing (flag) {
      if (this.player.duration) {
        // 缓冲至可播放状态
        flag ? this.player.play() : this.player.pause()
      }
    },

    // watch source -> media.load() -> canPlay -> player.play()
    source (url) {
      if (url) {
        // 加载新音频/视频文件
        this.player.media.load();
        this.loadLrcFile();
        this.updateMediaSessionMetadata();
        this.SET_PLAYING_TRANSCODE(this.checkCurrentPlayingFileShouldUseTranscoding())
      }
    },

    muted (flag) {
      // 切换静音状态
      this.player.muted = flag
    },

    volume (val) {
      // 屏蔽非法数值
      if (val < 0 || val > 1) {
        return
      }

      // 调节音量
      this.player.volume = val
    },
    rewindSeekMode(rewind) {
      if (rewind) {
        this.player.rewind(this.rewindSeekTime);
        this.SET_REWIND_SEEK_MODE(false);
      }
    },
    forwardSeekMode(forward) {
      if (forward) {
        this.player.forward(this.forwardSeekTime);
        this.SET_FORWARD_SEEK_MODE(false);
      }
    },
    currentTime(v) {
      if (this.isChangingCurrentTime) return;
      else this.changeCurrentTime = this.currentTime;
    },
    newCurrentTime(v) {
      if (v < 0) return;
      this.player.currentTime = v;
      this.SET_NEW_CURRENT_TIME(-1); // 标记时间已经更新到media上了
    },
    lyricOffsetSeconds() {
      this.updateLyric() // 强制更新一下歌词时间
    },
    lyricLines(lines) {
      // 歌词行被外部（编辑器等）修改时，重新载入歌词行
      this.lrcObj.setLyricObject(lines)
    }
  },

  created() {
    this.updateLyric = debounce(this.updateLyric, 100, true /* 首次更改应当立即生效，对后续更改防抖动 */); // 防抖动
  },

  methods: {
    formatSeconds,

    /**
     * 当 外部暂停（线控暂停、软件切换）、用户控制暂停、seek 时会触发本事件
     */
    onPause() {
      this.updateLyric()
      this.PAUSE()
    },
    /**
     * 当播放器真正开始播放时会触发本事件
     */
    onPlaying() {
      this.updateLyric()
      this.PLAY()
      // 播放稳定后，提前为下一个文件请求转码，避免切换时等待
      const currentSource = this.source;
      setTimeout(() => {
        if (this.source === currentSource) {
          this.checkNextPlayingFileShouldUseTranscodingAndPreTranscode()
        } else {
          console.log("source changed, cancel this pre transcoding request")
        }
      }, 30 * 1000)
    },
    /**
     * 当播放器缓冲区空，被迫暂停加载时会触发本事件
     */
    onWaiting() {
      this.updateLyric()
      this.PLAY()
    },
    ...mapMutations('AudioPlayer', [
      'SET_DURATION',
      'SET_CURRENT_TIME',
      'PAUSE',
      'PLAY',
      'SET_TRACK',
      'NEXT_TRACK',
      'PREVIOUS_TRACK',
      'SET_CURRENT_LYRIC',
      'SET_CURRENT_LYRIC_LINE_NUMBER',
      'SET_LYRIC_LINES',
      'SET_VOLUME',
      'CLEAR_SLEEP_MODE',
      'SET_REWIND_SEEK_MODE',
      'SET_FORWARD_SEEK_MODE',
      'SET_AUDIO_ANALYSER',
      'RESUME_HISTROY_SECONDS_DONE',
      'SET_HAS_LYRIC',
      'SET_NEW_CURRENT_TIME',
      'SET_PLAYING_TRANSCODE',
    ]),

    onCanplay () {
      // 缓冲至可播放状态时触发 (只有缓冲至可播放状态, 才能获取媒体文件的播放时长)
      this.SET_DURATION(this.player.duration)

      // 播放
      if (this.playing && this.player.currentTime !== this.player.duration) {
        this.player.play()
      }

      // 当音频文件在网页中加载完毕，可以播放时
      // 检查此前是否有需要恢复的历史进度，如果尚未恢复
      // 则设置currentTime到指定的时间点，然后标记已经恢复历史播放记录
      if (!this.resumeHistroyDone) {
        this.player.currentTime = this.resumeHistroySeconds;
        this.RESUME_HISTROY_SECONDS_DONE()
        this.$q.notify({message: "已恢复播放历史", timeout: 1000})
      }
    },

    onTimeupdate () {
      // 当目前的播放位置已更改时触发
      this.SET_CURRENT_TIME(this.player.currentTime)
      if (this.hasLyric) this.updateLyric() // 用媒体的time更新事件驱动歌词更新
      if (this.sleepMode && this.sleepTime) {
        if (Date.now() > this.sleepTime) {
          this.$q.sessionStorage.set('sleepTime', null)
          this.$q.sessionStorage.set('sleepMode', false)
          this.PAUSE()
          this.CLEAR_SLEEP_MODE()
        }
      }
    },

    onEnded () {
      // 当前文件播放结束时触发
      switch (this.playMode.name) {
        case "all repeat":
          // 循环播放
          if (this.queueIndex === this.queue.length - 1) {
            this.SET_TRACK(0)
          } else {
            this.NEXT_TRACK()
          }
          break
        case "repeat once":
          // 单曲循环
          this.player.currentTime = 0
          this.player.play()
          this.PLAY()
          break
        case "shuffle": {
          // 随机播放
          const index = Math.floor(Math.random()*this.queue.length)
          this.SET_TRACK(index)
          if (index === this.queueIndex) {
            this.player.currentTime = 0
          }
          break
        }
        default:
          // 顺序播放
          if (this.queueIndex === this.queue.length - 1) {
            this.PAUSE()
          } else {
            this.NEXT_TRACK()
          }
      }
    },

    onSeeked() {
      this.updateLyric()
    },

    // 根据当前播放时间更新歌词状态，返回true表示歌词行发生了变化
    updateLyric() {
      const seconds = this.player.currentTime + this.lyricOffsetSeconds;
      if (this.lrcObj.updateTime(seconds)) {
        this.SET_CURRENT_LYRIC(this.lrcObj.getCurrentLyric(seconds))
        this.SET_CURRENT_LYRIC_LINE_NUMBER(this.lrcObj.currentLineNumber)
      }
    },

    createLrcObj () {
        this.lrcObj = new Lyric()
    },

    async loadLrcFile () {
      const token = this.$q.localStorage.getItem('jwt-token') || '';
      const fileHash = this.queue[this.queueIndex].hash;
      const url = `/api/media/check-lrc/${fileHash}?token=${token}`;

      try {
        // 向服务器查询歌词，服务端直接返回解析好的歌词行
        const response = await this.$axios.get(url)
        if (!response.data.result) {
          // 无歌词
          console.log("无歌词")
          this.resetToNoLyricStatus()
          return;
        }

        console.log("读入歌词");
        const lyricLines = response.data.lrc;
        this.SET_LYRIC_LINES(lyricLines)
        this.$nextTick(() => {
          this.updateLyric()
          this.SET_HAS_LYRIC(true)
        })
      } catch(error) {
        if (error.response) {
          // 请求已发出，但服务器响应的状态码不在 2xx 范围内
          if (error.response.status !== 401) {
            console.error(error);
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`);
          }
        } else {
          console.error(error)
          this.showErrNotif(error.message || error);
        }
        this.SET_HAS_LYRIC(false)
      }
    },

    resetToNoLyricStatus() {
      // 无歌词文件
      this.lrcObj.setLyric('')
      this.SET_CURRENT_LYRIC('')
      this.SET_LYRIC_LINES([])
      this.SET_HAS_LYRIC(false)
    },

    updateMediaSessionMetadata() {
      console.log("try update media session")
      try {
        if (this.playWorkId == 0) {
          navigator.mediaSession.metadata = null;
        } else {
          navigator.mediaSession.metadata = new window.MediaMetadata({
            title: this.currentPlayingFile.title,
            artist: "",
            album: this.currentPlayingFile.workTitle,
            artwork: [
              {
                src: this.genCoverUrl(this.playWorkId, "main"),
                sizes: "560x560",
                type: "image/jpeg",
              },
              {
                src: this.genCoverUrl(this.playWorkId, "240x240"),
                sizes: "240x240",
                type: "image/jpeg",
              },
              {
                src: this.genCoverUrl(this.playWorkId, "sam"),
                sizes: "100x100",
                type: "image/jpeg",
              },
            ]
          })
        }
      } catch (e) {
        console.warn("set mediasession failed, because: ", e)
      }
    },

    // type: in 'visualPlayerCover', 'main', 'sam', '240x240', # warning '360x360' is almost not exist in dlsite, do not use 360x360
    // 'visualPlayerCover' 默认是 'main'，如果用户有手动设置过可视化封面的话，则使用用户设置过的那个图片
    genCoverUrl(workId, type) {
      const token = this.$q.localStorage.getItem('jwt-token') || ''

      if (type == "visualPlayerCover") {
        return this.visualPlayerCoverUrl
          ? `${this.visualPlayerCoverUrl}?token=${token}`
          : ""
      } else if (workId != 0) {
        return `/api/cover/${workId}?type=${type}&token=${token}`
      } else {
        return ""
      }
    },

    onChangeSlider(v) {
      console.log("player current time is ", this.player.currentTime)
      console.log("slider change value to ", v)
      console.log("global current time is ", this.currentTime)
      this.player.currentTime = v;
    },
     onPanSlider(phase) {
      console.warn(" pan with phase = ", phase)
      if (phase == 'start') {
        this.isChangingCurrentTime = true;
        this.changeCurrentTime = this.currentTime;
      } else {
        // 延时一下，避免音频状态的值立即被更新到slider上
        setTimeout(() => {
          this.isChangingCurrentTime = false;
        }, 100);
      }
     },

    // 判断当前播放的文件是否需要使用转码播放
    checkCurrentPlayingFileShouldUseTranscoding() {
      return this.transcodeOption !== TranscodeOption.OFF
        && this.transcodeFromTypes.includes(getExtensionWithoutDot(this.currentPlayingFile.title).toLowerCase())
    },

    // 播放稳定后，检查下一个文件是否需要转码，如果需要则提前向服务器发起转码请求
    async checkNextPlayingFileShouldUseTranscodingAndPreTranscode() {
      if (this.transcodeOption === TranscodeOption.OFF) return;
      const nextTrack = this.queue[this.queueIndex + 1];
      if (nextTrack && this.transcodeFromTypes.includes(getExtensionWithoutDot(nextTrack.title).toLowerCase())) {
        console.log("pre transcode next file:", nextTrack.title)
        const result = await ServerApi.askForTranscoding(nextTrack.hash, this.transcodeBitRate);
        console.log("pre transcode request: ", result)
      }
    },
  },

  mounted () {
    // 初始化音量
    this.SET_VOLUME(this.player.volume);

    const initAudio = () => {
      document.removeEventListener('click', initAudio);
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = {
        left: audioCtx.createAnalyser(),
        right: audioCtx.createAnalyser(),
        audioCtx,
        splitter: null,
        merger: null,
        audioSrc: null,
        gain: null, // 增益节点，用于在开启可视化时提供大于1的音量
      };

      analyser.audioSrc = audioCtx.createMediaElementSource(this.player.media);
      analyser.splitter = audioCtx.createChannelSplitter(2);
      analyser.merger = audioCtx.createChannelMerger(2);
      analyser.gain = audioCtx.createGain();
      analyser.audioSrc.connect(analyser.splitter);
      analyser.splitter.connect(analyser.left, 0);
      analyser.splitter.connect(analyser.right, 1);
      analyser.audioSrc.connect(analyser.gain)
      analyser.gain.connect(audioCtx.destination)
      this.SET_AUDIO_ANALYSER(analyser)
    }

    if (this.enableVisualizer) {
      document.addEventListener('click', initAudio);
      if (this.$q.platform.is.safari && this.$q.platform.is.mobile) {
        this.$q.notify({
          message: "监测到safari平台上开启了音频可视化功能，注意移动端safari有bug，如果没有声音的话，请关闭音频可视化功能",
          timeout: 5000
        })
      }
    }

    this.createLrcObj();
    if (this.source) {
      this.loadLrcFile();
    }
  },
}
</script>

<style scoped>
.vue-plyr {
  /* visibility: hidden; */
  /*display: none;*/
  width: 1px;
    height: 1px;
    overflow: hidden;
    top: 0px;
    left: 0px;
    position: absolute;
}

</style>
