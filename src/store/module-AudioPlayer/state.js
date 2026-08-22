import { Dark, LocalStorage } from 'quasar'
import { WorkListMode } from 'src/utils'

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

export default function () {
  return {
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

    // 是否启用画中画歌词（桌面歌词）
    // 注意android chrome不支持画中画，firefox估计也不支持，因此在android设备上禁用这一功能
    enablePIPLyrics: LocalStorage.has(ENABLE_PIP_LYRICS) && LocalStorage.getItem(ENABLE_PIP_LYRICS) && !(navigator.userAgent.toLowerCase().indexOf('android') > -1), 

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
  }
}
