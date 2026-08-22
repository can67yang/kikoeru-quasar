<template>
  <q-form @submit="onSubmit">
    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>网页偏好设置（每个浏览器之间，此部分配置相互独立）</q-toolbar-title>
      </q-toolbar>

      <q-list>
        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>音频转码设置</q-item-label>
            <q-item-label>是否开启转码，以及转码的质量</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-btn-toggle
              no-caps
              rounded
              unelevated
              toggle-color="primary"
              text-color="primary"
              v-model="transcodeOptionTemp"
              :options="transcodeOptionOptions"
            />
          </q-item-section>
        </q-item>

        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>音频文件扩展名过滤</q-item-label>
            <q-item-label>只有这些扩展名的文件才会开启转码（忽略大小写），都不选的话，相当于关闭转码</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <div class="q-gutter-sm">
              <q-checkbox dense label="wav" color="teal" v-model="transcodeFromTypesDict.wav"/>
              <q-checkbox dense label="flac" color="orange" v-model="transcodeFromTypesDict.flac"/>
              <q-checkbox dense label="avi" color="cyan" v-model="transcodeFromTypesDict.avi"/>
              <q-checkbox dense label="mp4" color="pink" v-model="transcodeFromTypesDict.mp4"/>
            </div>
          </q-item-section>
        </q-item>

        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>强制标签名反和谐</q-item-label>
            <q-item-label>将目前数据库内存储dlsite标签名，反和谐，恢复原始名称</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-btn icon="restart_alt" @click="uncensorTags"/>
          </q-item-section>
        </q-item>

        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>列表展示形式</q-item-label>
            <q-item-label>可选择分页展示或者瀑布流</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-btn-toggle
              no-caps
              rounded
              unelevated
              toggle-color="primary"
              text-color="primary"
              v-model="workListModeTemp"
              :options="workListModeOptions"
            />
          </q-item-section>
        </q-item>

        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>首页显示最近播放作品</q-item-label>
            <q-item-label caption>选择是否在首页显示最近播放作品</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle :value="enableShowRecent" @input="changeEnableShowRecent" dense/>
          </q-item-section>
        </q-item>

        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>深色模式设置</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-btn-toggle
              no-caps
              rounded
              unelevated
              toggle-color="primary"
              text-color="primary"
              v-model="darkModeTemp"
              :options="[
                { label: '浅色模式', value: false },
                { label: '深色模式', value: true },
                { label: '跟随系统', value: 'auto' }
              ]"
            />
          </q-item-section>
        </q-item>

        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>高级音频模式</q-item-label>
            <q-item-label caption>支持显示音频特效、左右声道反转等音频功能，建议在桌面浏览器中开启，移动端iOS设备会有声音播放bug</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle :value="enableVisualizer" @input="changeEnableVisualizer" dense/>
          </q-item-section>
        </q-item>

        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>启用视频源作为播放格式</q-item-label>
            <q-item-label caption>开启此选项后，视频格式(mp4)用于播放音频的同时，也可以看到视频画面(大图模式下)</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle :value="enableVideoSource" @input="changeEnableVideoSource" dense/>
          </q-item-section>
        </q-item>

        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>切换回旧式作品卡片UI</q-item-label>
            <q-item-label caption>搜索页面展示作品使用旧的卡片样式，旧式卡片可以直接显示所有标签</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle :value="oldWorkCardUIStyle" @input="changeOldWorkCardUIStyle" dense/>
          </q-item-section>
        </q-item>

        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>睡眠时钟设置模式</q-item-label>
            <q-item-label caption>当前模式：{{ oldSleepTimerUIStyle ? "设定停止播放的时间点" : "按照分钟开始倒计时" }}</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle :value="oldSleepTimerUIStyle" @input="changeOldSleepTimerUIStyle" dense/>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>
    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>播放器设置</q-toolbar-title>
      </q-toolbar>

      <q-list>
        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>后退按钮跳跃秒数</q-item-label>
            <q-item-label caption>播放时后退按钮跳跃秒数</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <div class="q-gutter-sm">
              <q-radio dense v-model="rewindSeekTime" val="5" label="5 秒" />
              <q-radio dense v-model="rewindSeekTime" val="10" label="10 秒" />
              <q-radio dense v-model="rewindSeekTime" val="30" label="30 秒" />
            </div>
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>前进按钮跳跃秒数</q-item-label>
            <q-item-label caption>播放时前进按钮跳跃秒数</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <div class="q-gutter-sm">
              <q-radio dense v-model="forwardSeekTime" val="5" label="5 秒" />
              <q-radio dense v-model="forwardSeekTime" val="10" label="10 秒" />
              <q-radio dense v-model="forwardSeekTime" val="30" label="30 秒" />
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>爬虫相关设置</q-toolbar-title>
      </q-toolbar>

      <q-list>
        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>标签语言</q-item-label>
            <q-item-label caption>从 DLSite 爬取的标签元数据的语言</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <div class="q-gutter-sm">
              <q-radio dense v-model="config.tagLanguage" val="zh-cn" label="简" />
              <q-radio dense v-model="config.tagLanguage" val="zh-tw" label="繁" />
              <q-radio dense v-model="config.tagLanguage" val="ja-jp" label="日" />
              <q-radio dense v-model="config.tagLanguage" val="en-us" label="Eng" />
              <q-btn
                dense
                color="primary"
                label="刷新标签名称"
                :loading="refreshTagsLoading"
                @click="refreshTagNames"
              >
                <q-tooltip>
                按照标签语言，强制刷新数据库内标签名为选定的语言（先保存），用于修复此前的标签语言名称异常问题
              </q-tooltip>
              </q-btn>
            </div>
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>DLsite 超时时间</q-item-label>
            <q-item-label caption>默认 10000 毫秒</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.dlsiteTimeout"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>HVDB 超时时间</q-item-label>
            <q-item-label caption>默认 10000 毫秒</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.hvdbTimeout"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>重新请求间隔时间</q-item-label>
            <q-item-label caption>默认 2000 毫秒</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.retryDelay"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>请求最大尝试次数</q-item-label>
            <q-item-label caption>默认 5</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.retry"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>爬虫并行任务数量</q-item-label>
            <q-item-label caption>默认 16</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.maxParallelism"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>HTTP 代理服务主机 IP</q-item-label>
            <q-item-label caption>此项为空时默认为本机</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model="config.httpProxyHost"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>HTTP 代理服务端口号 </q-item-label>
            <q-item-label caption>此项为 0 时默认不使用代理</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.httpProxyPort"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>文件夹扫描相关设置</q-toolbar-title>
      </q-toolbar>

      <q-list>
        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>重点文件展示配置</q-item-label>
            <q-item-label caption>配置哪些是重点文件，作品详情首次展示时，自动跳转到这些文件数量最多，或者统计时长最长的文件夹</q-item-label>
          </q-item-section>

          <q-item-section>
            <div>
              <q-btn class="q-ma-sm" padding="none sm" color="primary" size="sm" @click="config.importantWorkTreeOption = 'off'">关闭</q-btn>
              <q-btn class="q-ma-sm" padding="none sm" color="primary" size="sm" @click="config.importantWorkTreeOption = 'count:mp3$'">mp3数量最多</q-btn>
              <q-btn class="q-ma-sm" padding="none sm" color="primary" size="sm" @click="config.importantWorkTreeOption = 'count:(mp3|wav)$'">mp3或wav数量最多</q-btn>
              <q-btn class="q-ma-sm" padding="none sm" color="primary" size="sm" @click="config.importantWorkTreeOption = 'time:(mp3|wav)$'">mp3或wav总计时长最长</q-btn>
              <q-btn class="q-ma-sm" padding="none sm" color="primary" size="sm" @click="config.importantWorkTreeOption = 'time:(mp3|wav|mp4)$'">mp3、wav、mp4总计时长最长</q-btn>
            </div>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              type="text"
              input-class="text-right"
              v-model="config.importantWorkTreeOption"
              :error="!isImportantWorkTreeOptionValid"
              :error-message="importantWorkTreeOptionErrorMsg"
            />
          </q-item-section>
        </q-item>

        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>最大递归扫描深度</q-item-label>
            <q-item-label caption>默认 2</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.scannerMaxRecursionDepth"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>扫描时跳过清理音声库</q-item-label>
            <q-item-label caption>是否跳过清理不存在的音声（不推荐，默认不跳过）</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-toggle v-model="config.skipCleanup" dense />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>启用文件监听（需重启服务器）</q-item-label>
            <q-item-label caption>启用后，监听文件夹变化，自动将新作品加入数据库（实验性功能）</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-toggle v-model="config.enableFileWatcher" dense />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>Web 服务器相关设置</q-toolbar-title>
        <div class="q-pr-xs">更改此设置需要重启程序</div>
      </q-toolbar>

      <q-list>
        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>用户验证</q-item-label>
            <q-item-label caption>是否启用用户验证（生产环境下无法修改此设置）</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle v-model="config.auth" dense :disable="config.production" />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>启用Gzip</q-item-label>
            <q-item-label caption>对网络传输启用Gzip压缩</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle v-model="config.enableGzip" dense/>
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>设置端口号</q-item-label>
            <q-item-label caption>服务器监听端口号</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.listenPort"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>屏蔽远程连接</q-item-label>
            <q-item-label caption>只允许本地访问，默认为false。更改此设置需要重启程序</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle v-model="config.blockRemoteConnection" dense/>
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>token 过期时间</q-item-label>
            <q-item-label caption>默认 2592000 秒</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.expiresIn"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>每页显示的音声数量</q-item-label>
            <q-item-label caption>默认 12</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.pageSize"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>安全设置</q-toolbar-title>
      </q-toolbar>

      <q-list>
        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>生产环境</q-item-label>
            <q-item-label caption>此设置无法在网页端修改，详情请查阅GitHub Wiki中关于配置文件的说明</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle v-model="config.production" dense disable />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>其它设置</q-toolbar-title>
      </q-toolbar>

      <q-list>
        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>检查更新</q-item-label>
            <q-item-label caption>打开网页时是否检查更新</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle v-model="config.checkUpdate" dense />
          </q-item-section>
        </q-item>

        <q-item v-if="config.checkUpdate">
          <q-item-section>
            <q-item-label>检查测试版更新</q-item-label>
            <q-item-label caption>是否检查测试版更新</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle v-model="config.checkBetaUpdate" dense />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>数据库使用默认路径</q-item-label>
            <q-item-label caption>使用程序所在位置下的sqlite文件夹，并忽略databaseFolderDir设置（如无必要请勿修改，更改此设置需要重启程序）</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle v-model="config.dbUseDefaultPath" dense />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>封面使用默认路径</q-item-label>
            <q-item-label caption>使用程序所在位置下的covers文件夹，并忽略封面文件夹路径设置</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle v-model="config.coverUseDefaultPath" dense />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <div class="save-btn-container-placeholder"/>
    <div class="save-btn-container">
      <q-btn :loading="loading" label="保存" type="submit" color="primary" />
    </div>
  </q-form>
</template>

<script>
import NotifyMixin from '../../mixins/Notification.js'
import { mapState } from 'vuex'
import { WorkListMode } from '../../utils.js'
import { TranscodeOption } from 'src/store/module-AudioPlayer/getters'

export default {
  name: 'Advanced',

  mixins: [NotifyMixin],

  data () {
    return {
      config: {},
      loading: false,
      refreshTagsLoading: false,
      rewindSeekTime: '5',
      forwardSeekTime: '30',
      darkModeTemp: 'auto',
      workListModeTemp: WorkListMode.WATERFALL,
      workListModeOptions: [
        { label: '瀑布流', value: WorkListMode.WATERFALL },
        { label: '分页', value: WorkListMode.PAGINATION }
      ],
      transcodeOptionTemp: TranscodeOption.OFF,
      transcodeOptionOptions: [
        { label: '禁用转码', value: TranscodeOption.OFF },
        { label: '转码AAC(128k) 体积小，音质较低', value: TranscodeOption.AAC_128 },
        { label: '转码AAC(320k) 体积较大，音质高', value: TranscodeOption.AAC_320 }
      ],
      transcodeFromTypesDict: JSON.parse(JSON.stringify({ wav: false, flac: false, avi: false, mp4: false })),
      isImportantWorkTreeOptionValid: true,
      importantWorkTreeOptionErrorMsg: ''
    }
  },

  watch: {
    darkModeTemp (value) {
      this.$store.commit('AudioPlayer/SET_DARK_MODE', value)
    },

    workListModeTemp (value) {
      this.$store.commit('AudioPlayer/SET_WORK_LIST_MODE', value)
    },

    transcodeOptionTemp (value) {
      this.$store.commit('AudioPlayer/SET_TRANSCODE_OPTION', value)
    },

    transcodeFromTypesDict: {
      handler (newValue, oldValue) {
        this.$store.commit('AudioPlayer/SET_TRANSCODE_FROM_TYPES', this.transcodeFromTypesTemp)
      },
      deep: true
    },

    'config.importantWorkTreeOption' () {
      this.isImportantWorkTreeOptionValid = this.checkImportantWorkTreeOptionValid()
    }
  },

  computed: {
    ...mapState('AudioPlayer', [
      'oldWorkCardUIStyle',
      'enableVideoSource',
      'enableVisualizer',
      'darkMode',
      'workListMode',
      'enableShowRecent',
      'oldSleepTimerUIStyle',
      'transcodeOption',
      'transcodeFromTypes',
    ]),

    transcodeFromTypesTemp () {
      return Object.keys(this.transcodeFromTypesDict).filter(t => this.transcodeFromTypesDict[t]).join(',')
    }
  },

  methods: {
    requestConfig () {
      this.$axios.get('/api/config/admin')
        .then((response) => {
          this.config = response.data.config;
          // Integer => String
          this.rewindSeekTime = this.config.rewindSeekTime.toString()
          this.forwardSeekTime = this.config.forwardSeekTime.toString()
        })
        .catch((error) => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status !== 401) {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
            }
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    onSubmit () {
      // String => Integer
      this.config.rewindSeekTime = parseInt(this.rewindSeekTime)
      this.config.forwardSeekTime = parseInt(this.forwardSeekTime)

      this.loading = true
      this.$axios.put('/api/config/admin', {
        config: this.config
      })
        .then((response) => {
          this.loading = false
          this.showSuccNotif(response.data.message)
        })
        .catch((error) => {
          this.loading = false
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    changeOldWorkCardUIStyle(value) {
      this.$store.commit('AudioPlayer/SET_OLD_WORK_CARD_UI_STYLE', value);
    },

    changeOldSleepTimerUIStyle(value) {
      this.$store.commit('AudioPlayer/SET_OLD_SLEEP_TIMER_UI_STYLE', value);
    },

    changeEnableVideoSource(value) {
      this.$store.commit('AudioPlayer/SET_ENABLE_VIDEO_SOURCE', value);
    },

    changeEnableVisualizer(value) {
      this.$store.commit('AudioPlayer/SET_ENABLE_VISUALIZER', value);
    },

    changeEnableShowRecent(value) {
      this.$store.commit('AudioPlayer/SET_ENABLE_SHOW_RECENT', value);
    },

    async uncensorTags() {
      this.$q.dialog({
        title: '注意',
        message: '此操作无法回滚，确定要将标签名反和谐吗？',
        cancel: '取消',
        ok: '确定'
      }).onOk(async () => {
        this.$axios.post('/api/uncensor/tags')
          .then((response) => {
            this.$q.notify('修改成功')
          })
          .catch((error) => {
            this.$q.notify('修改失败', error.message)
            console.error(error)
          })
      })
    },

    refreshTagNames() {
      this.refreshTagsLoading = true
      this.$axios.post('/api/config/admin/refresh-tags')
        .then((response) => {
          this.$q.notify(response.data.message)
        })
        .catch((error) => {
          this.$q.notify('刷新失败', error.message)
          console.error(error)
        })
        .finally(() => {
          this.refreshTagsLoading = false
        })
    },

    checkImportantWorkTreeOptionValid() {
      const option = this.config.importantWorkTreeOption;
      if (option == 'off') {
        this.importantWorkTreeOptionErrorMsg = ''
        return true
      }

      const parts = option.split(':', 2)
      if (parts.length != 2) {
        this.importantWorkTreeOptionErrorMsg = '重要文件夹配置项无效，配置不全'
        return false
      }

      const mode = parts[0]
      if (!['time', 'count'].includes(mode)) {
        this.importantWorkTreeOptionErrorMsg = '重要文件夹配置项模式异常，请以 time: 或者 count: 开头'
        return false
      }

      try {
        RegExp(parts[1], 'i')
      } catch (error) {
        console.error(option, error)
        this.importantWorkTreeOptionErrorMsg = '重要文件夹配置正则匹配创建失败，请在冒号后面输入正确的正则表达式'
        return false
      }

      this.importantWorkTreeOptionErrorMsg = ''
      return true
    }
  },

  mounted () {
    this.darkModeTemp = this.darkMode
    this.workListModeTemp = this.workListMode
    this.transcodeOptionTemp = this.transcodeOption

    const dict = JSON.parse(JSON.stringify({ wav: false, flac: false, avi: false, mp4: false }))
    this.transcodeFromTypes.split(',').forEach(type => {
      if (dict[type] !== undefined) dict[type] = true
    })
    this.transcodeFromTypesDict = dict
  },

  created () {
    this.requestConfig()

  }
}
</script>

<style lang="scss" scoped>
.save-btn-container-placeholder {
  height: 60px;
}

.save-btn-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 10;
}
</style>
