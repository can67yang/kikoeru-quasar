import { defineStore } from 'pinia'
import { Dark, LocalStorage } from 'quasar'
import { WorkListMode } from 'src/utils.js'

export const SWAP_SEEK_BUTTON_KEY = 'swap_seek_button'
export const ENABLE_VISUALIZER_KEY = 'enable_visualizer'
export const ENABLE_PIP_LYRICS = 'enable_pip_lyrics'
export const ENABLE_VIDEO_SOURCE_KEY = 'enable_video_source'
export const AI_SERVER_URL_KEY = 'ai_server_url'
export const OLD_WORK_CARD_UI_STYLE_KEY = 'old_work_card_ui_style_key'
export const DARK_MODE_KEY = 'dark_mode_key'
export const WORK_LIST_MODE_KEY = 'work_list_mode_key'
export const ENABLE_SHOW_RECENT_KEY = 'enable_show_recent_key'
export const OLD_SLEEP_TIMER_UI_STYLE_KEY = 'old_sleep_timer_ui_style_key'
export const TRANSCODE_OPTION_KEY = 'transcode_option_key'
export const TRANSCODE_FROM_TYPES_KEY = 'transcode_from_types_key'

// 转码选项枚举
export const TranscodeOption = {
  OFF: 'off',
  AAC_128: 'aac 128',
  AAC_320: 'aac 320',
}

function loadDarkMode () {
  let mode = LocalStorage.has(DARK_MODE_KEY) ? LocalStorage.getItem(DARK_MODE_KEY) : 'auto';
  if (![true, false, 'auto'].includes(mode)) mode = 'auto';
  Dark.set(mode);
  return mode;
}

function loadWorkListMode () {
  let mode = LocalStorage.has(WORK_LIST_MODE_KEY) ? LocalStorage.getItem(WORK_LIST_MODE_KEY) : WorkListMode.WATERFALL;
  if (![WorkListMode.WATERFALL, WorkListMode.PAGINATION].includes(mode)) mode = WorkListMode.WATERFALL;
  return mode;
}

// 深色模式循环顺序：深色 -> 浅色 -> 跟随系统 -> 深色
const DARK_MODE_CYCLE = {
  true: false,
  false: 'auto',
  auto: true,
}

export const useAudioPlayerStore = defineStore('AudioPlayer', {
  state: () => ({
    hide: false,
    playing: false, // 播放状态 (true/false)
    playingTranscode: false,
    currentTime: 0, // 单位: 秒
    newCurrentTime: -1, // 单位：秒，<0 的负数表示当前无需更改媒体的currentTime，>=0 表示需要更改媒体的currentTime
    duration: 0,
    source: "",
    queue: [
      // list of tracks. object format:
      /*
        hash: null, // unique identifier for the file
        title: null, // title to show in UI
        workTitle: null // workTitle to show in UI
       */
    ],
    queueIndex: 0, // which track in the queue is currently selected
    playMode: {
      id: 0,
      name: "order"
    }, // 顺序播放("order"), 循环播放("all repeat"), 单曲循环("repeat once") or 随机播放("shuffle")
    muted: false,
    volume: 0, // 音量 (0.0-1.0)
    hasLyric: false,
    currentLyric: '',
    currentLyricLineNumber: 0,
    lyricLines: [],
    lyricOffsetSeconds: 0,
    sleepTime: null,
    sleepMode: false,
    rewindSeekTime: 5,
    forwardSeekTime: 30,
    rewindSeekMode: false,
    forwardSeekMode: false,
    swapSeekButton: LocalStorage.has(SWAP_SEEK_BUTTON_KEY) && LocalStorage.getItem(SWAP_SEEK_BUTTON_KEY), // 交换进度按钮与切换按钮
    enableVisualizer: LocalStorage.has(ENABLE_VISUALIZER_KEY) && LocalStorage.getItem(ENABLE_VISUALIZER_KEY), // 是否开启音频可视化
    enableVideoSource: LocalStorage.has(ENABLE_VIDEO_SOURCE_KEY) && LocalStorage.getItem(ENABLE_VIDEO_SOURCE_KEY), // 是否开启视频元素作为媒体源，用于在网页中播放视频格式的音频作品
    enableVideoSourcePIP: false, // 让videoSource进入画中画模式，每一次需要单独设置
    visualPlayerCoverUrl: '', // 可视化播放器的封面图
    playWorkId: 0, // 当前播放作品的id

    audioAnalyser: null, // 全局 audio 音频解析对象
    // audioAnalyzerData: null, // 解析音频信息，可视化展示

    // 是否启用浮动歌词小窗（桌面歌词，B站风格页内自绘小窗，所有平台可用）
    enablePIPLyrics: LocalStorage.has(ENABLE_PIP_LYRICS) && LocalStorage.getItem(ENABLE_PIP_LYRICS),

    // 当从历史记录播放时，这里记录当前queue[queueIndex]应当恢复到的seconds时间，
    // -1表示无需恢复，其他大于等于0的数字需要在onCanplay时间触发并完成时间跳转之后，再次设置为-1
    resumeHistroySeconds: -1,

    // 是否切换回旧式的作品卡片，某些人需要直接展示所有tag，保留旧式UI的选项
    oldWorkCardUIStyle: LocalStorage.has(OLD_WORK_CARD_UI_STYLE_KEY) && LocalStorage.getItem(OLD_WORK_CARD_UI_STYLE_KEY),

    // 是否使用旧式的睡眠定时 UI（设定停止时间点），否则使用倒计时式
    oldSleepTimerUIStyle: LocalStorage.has(OLD_SLEEP_TIMER_UI_STYLE_KEY) && LocalStorage.getItem(OLD_SLEEP_TIMER_UI_STYLE_KEY),

    // 深色模式：true / false / 'auto'（跟随系统）
    darkMode: loadDarkMode(),

    // 首页是否展示最近作品
    enableShowRecent: !LocalStorage.has(ENABLE_SHOW_RECENT_KEY) || LocalStorage.getItem(ENABLE_SHOW_RECENT_KEY),

    // 作品列表展示模式：瀑布流 / 分页
    workListMode: loadWorkListMode(),

    // 转码选项
    transcodeOption: LocalStorage.has(TRANSCODE_OPTION_KEY) ? LocalStorage.getItem(TRANSCODE_OPTION_KEY) : 'off',
    transcodeFromTypes: LocalStorage.has(TRANSCODE_FROM_TYPES_KEY) ? LocalStorage.getItem(TRANSCODE_FROM_TYPES_KEY) : 'flac,wav',
  }),

  getters: {
    currentPlayingFile: (state) => {
      return state.queue[state.queueIndex] || {
        hash: '',
        title: '',
        subtitle: null,
        workTitle: ''
      }
    },

    isCurrentPlayingFileVideo: (state) => {
      const title = (state.queue[state.queueIndex] || { title: '' }).title;
      return title.endsWith("mp4");
    },

    resumeHistroyDone: (state) => {
      return state.resumeHistroySeconds < 0
    },

    isQueueEmpty: (state) => {
      return state.queue.length == 0
    },

    transcodeBitRate: (state) => {
      return {
        [TranscodeOption.AAC_128]: 128,
        [TranscodeOption.AAC_320]: 320,
        [TranscodeOption.OFF]: 0,
      }[state.transcodeOption]
    },
  },

  actions: {
    TOGGLE_HIDE () {
      this.hide = !this.hide
    },

    PLAY () {
      this.playing = true
    },
    PAUSE () {
      this.playing = false
    },
    TOGGLE_PLAYING () {
      this.playing = !this.playing
    },

    SET_NEW_CURRENT_TIME (value) {
      this.newCurrentTime = value;
    },

    // Play a specific file from the queue.
    SET_TRACK (index) {
      if (index >= this.queue.length || index < 0) {
        return; // Invalid index, bail.
      }

      this.playing = true
      this.queueIndex = index
    },
    NEXT_TRACK () {
      if (this.queueIndex < this.queue.length - 1) {
        // Go to next track only if it exists.
        this.playing = true
        this.queueIndex += 1
      }
    },
    PREVIOUS_TRACK () {
      if (this.queueIndex > 0) {
        // Go to previous track only if it exists.
        this.playing = true
        this.queueIndex -= 1
      }
    },

    SET_QUEUE (payload) {
      this.queue = payload.queue
      this.queueIndex = payload.index

      if (payload.resetPlaying) {
        this.playing = true
      }

      const workId = payload.workId
      // 设置workId，然后配置封面，从浏览器本地Storage查找是否曾经手动配置过封面，
      // 如果没有则使用默认的封面路径
      if (workId !== this.playWorkId) {
        const localStorageName = `visual_cover_${workId}`
        let coverUrl = LocalStorage.getItem(localStorageName)
        if (!coverUrl) {
          const hash = this.currentPlayingFile.hash
          coverUrl = `/api/cover/${hash.split('/')[0]}`
        }
        this.visualPlayerCoverUrl = coverUrl
      }
      this.playWorkId = workId
      if (Object.prototype.hasOwnProperty.call(payload, "resumeHistroySeconds")) {
        this.resumeHistroySeconds = payload.resumeHistroySeconds
      }
    },
    EMPTY_QUEUE () {
      this.playing = false
      this.queue = []
      this.queueIndex = 0
    },
    ADD_TO_QUEUE (file) {
      this.queue.push(file)
    },
    REMOVE_FROM_QUEUE (index) {
      this.queue.splice(index, 1)

      if (index === this.queueIndex) {
        this.playing = false
        this.queueIndex = 0
      } else if (index < this.queueIndex) {
        this.queueIndex -= 1
      }
    },

    SET_DURATION (second) {
      this.duration = second
    },

    SET_CURRENT_TIME (second) {
      this.currentTime = second
    },

    // Add a file after the current playing item in the queue.
    PLAY_NEXT (file) {
      this.queue.splice(this.queueIndex + 1, 0, file);
    },

    CHANGE_PLAY_MODE () {
      const playModes = [
        {
          id: 0,
          name: "order"
        },
        {
          id: 1,
          name: "all repeat"
        },
        {
          id: 2,
          name: "repeat once"
        },
        {
          id: 3,
          name: "shuffle"
        }
      ]
      const index = (this.playMode.id >= playModes.length - 1) ? 0 : (this.playMode.id + 1)

      this.playMode = playModes[index]
    },

    TOGGLE_MUTED () {
      this.muted = !this.muted
    },

    SET_VOLUME (val) {
      if (val < 0 || val > 1) {
        return
      }
      this.volume = val
    },
    SET_REWIND_SEEK_TIME (value) {
      this.rewindSeekTime = value
    },
    SET_FORWARD_SEEK_TIME (value) {
      this.forwardSeekTime = value
    },
    SET_REWIND_SEEK_MODE (value) {
      this.rewindSeekMode = value
    },
    SET_FORWARD_SEEK_MODE (value) {
      this.forwardSeekMode = value
    },
    SET_HAS_LYRIC (value) {
      this.hasLyric = value;
    },
    SET_CURRENT_LYRIC (line) {
      this.currentLyric = line
    },
    SET_CURRENT_LYRIC_LINE_NUMBER (value) {
      this.currentLyricLineNumber = value
    },
    SET_LYRIC_LINES (value) {
      this.lyricLines = value
    },
    SET_LYRIC_OFFSET_SECONDS (value) {
      this.lyricOffsetSeconds = value;
    },
    SET_SLEEP_TIMER (time) {
      this.sleepTime = time
      this.sleepMode = true
    },

    CLEAR_SLEEP_MODE () {
      this.sleepTime = null
      this.sleepMode = false
    },

    SET_VISUAL_PLAYER_COVER_URL (value) {
      const localStorageName = `visual_cover_${this.playWorkId}`
      this.visualPlayerCoverUrl = value
      LocalStorage.set(localStorageName, this.visualPlayerCoverUrl)
    },

    TOGGLE_SWAP_SEEK_BUTTON () {
      this.swapSeekButton = !this.swapSeekButton
      LocalStorage.set(SWAP_SEEK_BUTTON_KEY, this.swapSeekButton)
    },

    TOGGLE_ENABLE_VISUALIZER () {
      this.enableVisualizer = !this.enableVisualizer
      LocalStorage.set(ENABLE_VISUALIZER_KEY, this.enableVisualizer)
    },

    SET_ENABLE_VISUALIZER (value) {
      this.enableVisualizer = value
      LocalStorage.set(ENABLE_VISUALIZER_KEY, value)
    },

    SET_AUDIO_ANALYSER (value) {
      this.audioAnalyser = value;
    },

    SET_ENABLE_PIP_LYRICS (value) {
      this.enablePIPLyrics = value
      LocalStorage.set(ENABLE_PIP_LYRICS, this.enablePIPLyrics)
    },

    SET_RESUME_HISTROY_SECONDS (value) {
      this.resumeHistroySeconds = value
    },

    RESUME_HISTROY_SECONDS_DONE () {
      this.resumeHistroySeconds = -1
    },

    TOGGLE_ENABLE_VIDEO_SOURCE () {
      this.enableVideoSource = !this.enableVideoSource
      LocalStorage.set(ENABLE_VIDEO_SOURCE_KEY, this.enableVideoSource)
    },

    SET_ENABLE_VIDEO_SOURCE (value) {
      this.enableVideoSource = value
      LocalStorage.set(ENABLE_VIDEO_SOURCE_KEY, value)
    },

    SET_ENABLE_VIDEO_SOURCE_PIP (value) {
      this.enableVideoSourcePIP = value
    },

    SET_OLD_WORK_CARD_UI_STYLE (value) {
      this.oldWorkCardUIStyle = value
      LocalStorage.set(OLD_WORK_CARD_UI_STYLE_KEY, value)
    },

    SET_OLD_SLEEP_TIMER_UI_STYLE (value) {
      this.oldSleepTimerUIStyle = value
      LocalStorage.set(OLD_SLEEP_TIMER_UI_STYLE_KEY, value)
    },

    SET_DARK_MODE (value) {
      this.darkMode = value
      LocalStorage.set(DARK_MODE_KEY, value)
      Dark.set(value)
    },

    TOGGLE_DARK_MODE () {
      const next = DARK_MODE_CYCLE[this.darkMode]
      this.darkMode = next
      LocalStorage.set(DARK_MODE_KEY, next)
      Dark.set(next)
    },

    SET_WORK_LIST_MODE (value) {
      this.workListMode = value
      LocalStorage.set(WORK_LIST_MODE_KEY, value)
    },

    SET_ENABLE_SHOW_RECENT (value) {
      this.enableShowRecent = value
      LocalStorage.set(ENABLE_SHOW_RECENT_KEY, value)
    },

    SET_TRANSCODE_OPTION (value) {
      this.transcodeOption = value
      LocalStorage.set(TRANSCODE_OPTION_KEY, value)
    },

    SET_TRANSCODE_FROM_TYPES (value) {
      this.transcodeFromTypes = value
      LocalStorage.set(TRANSCODE_FROM_TYPES_KEY, value)
    },

    SET_PLAYING_TRANSCODE (value) {
      this.playingTranscode = value
    },
  }
})
