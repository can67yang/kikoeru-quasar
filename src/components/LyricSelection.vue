<template>
  <q-card flat class="no-border-radius shadow-0 lyric-selection-card column no-wrap">
    <!-- 头部：歌词文件选择 + 关闭 -->
    <q-separator />
    <div class="lyric-header row items-center justify-between q-px-sm bg-white text-black">
      <q-select
        v-model="selectedLyric"
        :options="lyricOptions"
        dense
        outlined
        options-dense
        emit-value
        map-options
        class="col lyric-file-select"
        :loading="loadingLyricOptions"
        @input="selectLyricOption"
      >
        <template v-slot:selected-item="scope">
          <span class="ellipsis">{{ scope.opt.label }}</span>
        </template>
        <template v-slot:option="scope">
          <q-item v-bind="scope.itemProps" v-on="scope.itemEvents">
            <q-item-section>
              <q-item-label>{{ scope.opt.label }}</q-item-label>
              <q-item-label caption>
                {{ scope.opt.isPlaying ? '正在播放' : `相似度 ${scope.opt.sim}%` }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </q-select>
      <q-btn flat round dense icon="close" color="black" v-close-popup />
    </div>
    <q-separator />

    <!-- 主体：歌词行列表（原生滚动区，右侧预留 15px 滚动条槽位，参照 asmr.one） -->
    <div class="col relative-position lyric-scroll-wrap">
      <div class="scroll lyric-content">
        <q-list>
        <q-item
          v-for="(line, index) in lyricLines"
          :key="index"
          clickable
          :id="index === currentLyricLineNumber ? 'currentLyricEl' : ''"
          :class="{ 'text-bold text-purple bg-purple-1': index === currentLyricLineNumber }"
          @click.prevent="SET_NEW_CURRENT_TIME(line.time / 1000)"
        >
          <q-item-section>
            <q-item-label>
              <div class="text-caption text-grey-7">{{ formatTimestamp(line.time) }}</div>
              <span :class="{ deleteText: line.deleted }">{{ line.text }}</span>
            </q-item-label>
          </q-item-section>
        </q-item>
        </q-list>
      </div>
    </div>

    <!-- 底部：歌词偏移调节 -->
    <q-separator />
    <div class="lyric-footer row items-center bg-white text-black">
      <a
        v-show="lyricOffsetSeconds !== 0"
        class="text-weight-bold cursor-pointer q-pl-md text-black"
        @click="setLyricOffset(0)"
      >重置偏移</a>
      <div class="q-space"></div>
      <a class="text-weight-bold cursor-pointer q-pr-md text-black" @click="setLyricOffset(lyricOffsetSeconds - 0.3)">-0.3s</a>
      <div class="ant-number">
        <div class="ant-number-handler-wrap">
          <span role="button" class="ant-number-handler" unselectable="unselectable" @click="setLyricOffset(lyricOffsetSeconds + 0.1)">
            <q-icon name="expand_less" />
          </span>
          <span role="button" class="ant-number-handler ant-number-handler-down" unselectable="unselectable" @click="setLyricOffset(lyricOffsetSeconds - 0.1)">
            <q-icon name="expand_more" />
          </span>
        </div>
        <div class="ant-number-input-wrap">
          <input
            class="ant-number-input"
            type="text"
            :value="offsetDisplay"
            @change="onOffsetInput"
            @keyup.enter="onOffsetInput"
          >
        </div>
      </div>
      <a class="text-weight-bold cursor-pointer q-pl-md q-pr-md text-black" @click="setLyricOffset(lyricOffsetSeconds + 0.3)">+0.3s</a>
    </div>
    <q-separator />
  </q-card>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex';
import { ServerApi } from '../utils.js';

export default {
  name: 'LyricSelection',

  data() {
    return {
      selectedLyric: null,
      lyricOptions: [],
      loadingLyricOptions: false,
    };
  },

  watch: {
    currentLyricLineNumber() {
      this.scrollToCurrentLine();
    },
    lyricLines() {
      this.scrollToCurrentLine();
    },
    'currentPlayingFile.hash'() {
      // 切换音轨时重新加载歌词文件列表
      this.loadLyricOptions();
    },
  },

  computed: {
    ...mapState('AudioPlayer', [
      'lyricLines', 'currentLyricLineNumber', 'lyricOffsetSeconds', 'playWorkId',
    ]),
    ...mapGetters('AudioPlayer', ['currentPlayingFile']),

    offsetDisplay() {
      return `${this.lyricOffsetSeconds}s`;
    },
  },

  methods: {
    ...mapMutations('AudioPlayer', [
      'SET_NEW_CURRENT_TIME',
      'SET_HAS_LYRIC',
      'SET_LYRIC_LINES',
      'SET_CURRENT_LYRIC',
    ]),
    ...mapMutations('AudioPlayer', {
      setLyricOffsetSeconds: 'SET_LYRIC_OFFSET_SECONDS',
    }),

    // asmr.one 风格时间戳：[m:ss.cc]，分钟数为 0 时不补零
    formatTimestamp(ms) {
      const totalSeconds = ms / 1000;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.floor(totalSeconds % 60);
      const centis = Math.round((totalSeconds % 1) * 100);
      const mm = minutes < 1 ? '0' : String(minutes).padStart(2, '0');
      return `[${mm}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}]`;
    },

    setLyricOffset(value) {
      const v = Math.round((Number(value) || 0) * 10) / 10;
      this.setLyricOffsetSeconds(v);
    },

    onOffsetInput(event) {
      const raw = String(event.target.value || '').replace(/s$/i, '').trim();
      this.setLyricOffset(raw === '' ? 0 : parseFloat(raw));
      event.target.value = this.offsetDisplay;
    },

    scrollToCurrentLine() {
      const currentLine = document.querySelector('#currentLyricEl');
      if (currentLine) {
        currentLine.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });
      }
    },

    async loadLyricOptions() {
      if (!this.currentPlayingFile || !this.currentPlayingFile.hash) return;
      this.loadingLyricOptions = true;
      try {
        const lyricList = await ServerApi.queryLyric(this.currentPlayingFile.hash);
        const playingHash = this.currentPlayingFile.hash;
        const audioStem = this.stripMediaExt(this.currentPlayingFile.title);
        this.lyricOptions = lyricList
          .map(lyric => ({
            label: lyric.title,
            value: lyric.hash,
            isAI: lyric.isAI,
            isPlaying: lyric.hash === playingHash,
            sim: this.nameSimilarity(audioStem, lyric.title),
          }))
          .sort((a, b) => b.sim - a.sim);
        // 默认选中当前正在播放（或相似度最高）的歌词文件
        const current = this.lyricOptions.find(o => o.isPlaying) || this.lyricOptions[0];
        this.selectedLyric = current ? current.value : null;
      } finally {
        this.loadingLyricOptions = false;
      }
    },

    // 剥掉歌词扩展名（.lrc/.srt/.vtt）后，再剥掉内层媒体扩展名（.mp3/.wav 等），
    // 得到用于比较的文件名词干，例如 "X.mp3.vtt" 与 "X.wav.vtt" 的词干同为 "X"
    stripMediaExt(name) {
      let n = String(name || '');
      const lyricExts = ['.lrc', '.srt', '.vtt'];
      const mediaExts = ['.mp3', '.wav', '.flac', '.m4a', '.mp4', '.ogg', '.opus', '.aac', '.wma'];
      const lower = n.toLowerCase();
      for (const ext of lyricExts) {
        if (lower.endsWith(ext)) { n = n.slice(0, -ext.length); break; }
      }
      const lower2 = n.toLowerCase();
      for (const ext of mediaExts) {
        if (lower2.endsWith(ext)) { n = n.slice(0, -ext.length); break; }
      }
      return n;
    },

    levenshtein(a, b) {
      const m = a.length;
      const n = b.length;
      if (m === 0) return n;
      if (n === 0) return m;
      let prev = Array.from({ length: n + 1 }, (_, j) => j);
      let curr = new Array(n + 1);
      for (let i = 1; i <= m; i++) {
        curr[0] = i;
        for (let j = 1; j <= n; j++) {
          const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
          curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        }
        [prev, curr] = [curr, prev];
      }
      return prev[n];
    },

    // 文件名相似度百分比（保留 1 位小数）：
    // 词干完全相同记 99.9%；其余按 Levenshtein 相似度计算，最高 99.7%
    nameSimilarity(audioStem, lyricTitle) {
      const lyricStem = this.stripMediaExt(lyricTitle);
      if (audioStem === lyricStem) return 99.9;
      const maxLen = Math.max(audioStem.length, lyricStem.length);
      if (maxLen === 0) return 99.9;
      const sim = 1 - this.levenshtein(audioStem, lyricStem) / maxLen;
      return Math.round(Math.max(0, sim) * 997) / 10;
    },

    async selectLyricOption(hash) {
      const option = this.lyricOptions.find(o => o.value === hash);
      if (!option) return;
      const lyric = await ServerApi.fetchLyric(
        option.isAI ? `${this.playWorkId}/${hash}/1` : `${hash}/0`
      );
      this.SET_HAS_LYRIC(true);
      this.SET_LYRIC_LINES(lyric);
    },
  },

  mounted() {
    this.loadLyricOptions();
  },
};
</script>

<style scoped>
.lyric-selection-card {
  width: 700px;
  max-width: 90vw;
  height: 80vh;
}

/* 复刻 asmr.one 底部的 ant-input-number 步进控件 */
.ant-number {
  position: relative;
  width: 60px;
  height: 32px;
  margin: 4px 0;
  color: rgba(0, 0, 0, 0.65);
  font-size: 14px;
  background-color: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  overflow: hidden;
}

.ant-number-input-wrap {
  height: 30px;
}

.ant-number-input {
  width: 100%;
  height: 30px;
  padding: 0 11px;
  border: 0;
  outline: 0;
  text-align: left;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
  background: transparent;
}

.ant-number-handler-wrap {
  position: absolute;
  top: 0;
  right: 0;
  width: 22px;
  height: 100%;
  background: #fff;
  border-left: 1px solid #d9d9d9;
  opacity: 0;
  transition: opacity 0.24s linear 0.1s;
}

.ant-number:hover .ant-number-handler-wrap {
  opacity: 1;
}

.ant-number-handler {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 15px;
  line-height: 15px;
  width: 100%;
  color: rgba(0, 0, 0, 0.45);
  cursor: pointer;
}

.ant-number-handler:hover {
  color: rgba(0, 0, 0, 0.88);
}

.ant-number-handler-down {
  border-top: 1px solid #d9d9d9;
  margin-top: 2px;
}

.lyric-header {
  min-height: 52px;
}

.lyric-file-select {
  max-width: calc(100% - 48px);
}

.lyric-footer {
  height: 40px;
}

/* 滚动区整体右侧留出 15px 槽位，滚动条落在槽位内，不与歌词内容重叠 */
.lyric-scroll-wrap {
  margin-right: 15px;
}

.lyric-content {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: -15px;
  width: calc(100% + 15px);
  overflow: auto;
}

.deleteText {
  text-decoration: line-through;
  opacity: 0.5;
}
</style>
