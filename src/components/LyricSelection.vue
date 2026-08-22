<template>
  <q-card style="width: 90vw; max-width: 90vw; height: 80vh; max-height: 80vh">
    <q-card-section class="row justify-between items-center full-width">
      <div class="text-h5">歌词选择</div>
      <q-btn v-close-popup flat round icon="close" />
    </q-card-section>

    <q-card-section class="row justify-between">
      <q-btn color="warning" @click="uploadData">保存歌词</q-btn>
      <q-btn color="secondary" @click="fetchOtherLyricFiles">选择其他歌词</q-btn>
      <q-btn color="negative" @click="closeLyric">关闭歌词</q-btn>
      <q-btn color="primary" @click="showCurrentLyric">转到当前段落</q-btn>
      <q-toggle v-model="autoTrackCurrentLine" label="自动跟踪当前歌词" />
    </q-card-section>

    <q-card-section>
      <q-list class="scroll" style="max-height: calc(80vh - 250px)" separator>
        <q-item
          v-for="(line, index) in lyricLines"
          :key="index"
          v-ripple
          clickable
          :active="index === currentLyricLineNumber"
          active-class="bg-green-6"
          :id="`lyric_line${index}`"
          @click.prevent="SET_NEW_CURRENT_TIME(line.time / 1000)"
        >
          <q-item-section side>
            <div>
              <q-chip size="xs" color="primary" text-color="white">
                {{ formatSeconds(line.time / 1000) }}
              </q-chip>
            </div>
          </q-item-section>
          <q-item-section>
            <div class="row full-width justify-between">
              <div class="col-10 text-weight-bold" :class="{ deleteText: line.deleted }">
                {{ line.text }}
              </div>
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>

    <q-dialog v-model="openLyricFileSelection">
      <q-card style="width: 80vw">
        <q-card-section class="row items-center justify-between">
          <div class="text-h5">选择其他歌词文件</div>
          <q-btn v-close-popup flat round icon="close" />
        </q-card-section>
        <q-card-section>
          <q-list class="scroll" separator>
            <q-item
              v-for="(option, index) in lyricOptionList"
              :key="index"
              v-ripple
              clickable
              @click="selectLyricOption(option)"
            >
              <q-item-section>
                <q-item-label>{{ option.title }}</q-item-label>
                <q-item-label caption lines="2">{{ option.subtitle }}</q-item-label>
              </q-item-section>
              <q-item-section v-if="option.isAI" avatar>
                <q-chip color="primary">AI</q-chip>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex';
import { ServerApi, formatSeconds } from '../utils.js';
import NotifyMixin from '../mixins/Notification.js';

export default {
  name: 'LyricSelection',

  mixins: [NotifyMixin],

  data() {
    return {
      openPanel: true,
      autoTrackCurrentLine: true,
      openEditor: false,
      editLyricLineNumber: 0,
      editLyricText: '',
      openLyricFileSelection: false,
      lyricOptionList: [],
    };
  },

  watch: {
    openPanel() {
      setTimeout(() => {
        this.showCurrentLyric();
      }, 50);
    },
    lyricLines() {
      this.autoShowCurrentLine();
    },
    currentLyricLineNumber() {
      this.autoShowCurrentLine();
    },
    autoTrackCurrentLine(v) {
      if (v) this.showCurrentLyric();
    },
    'currentPlayingFile.hash'() {
      this.showCurrentLyric();
      console.log("changing track");
    },
  },

  computed: {
    ...mapState('AudioPlayer', [
      'playing', 'hide', 'currentTime', 'duration', 'queueIndex', 'playMode',
      'rewindSeekTime', 'forwardSeekTime', 'swapSeekButton', 'enableVisualizer',
      'enableVideoSource', 'enableVideoSourcePIP', 'enablePIPLyrics', 'playWorkId',
      'rewindSeekMode', 'forwardSeekMode', 'hasLyric', 'lyricOffsetSeconds',
      'lyricLines', 'currentLyricLineNumber', 'aiLabelMediaServer', 'aiLabelDbServer',
    ]),
    ...mapGetters('AudioPlayer', ['currentPlayingFile']),

    editLyric() {
      return this.lyricLines[this.editLyricLineNumber];
    },

    currentLyric() {
      return this.lyricLines[this.currentLyricLineNumber];
    },
  },

  methods: {
    ...mapMutations('AudioPlayer', [
      'SET_NEW_CURRENT_TIME',
      'SET_HAS_LYRIC',
      'SET_LYRIC_LINES',
      'SET_CURRENT_LYRIC',
    ]),

    formatSeconds: seconds => formatSeconds(seconds),

    autoShowCurrentLine() {
      if (this.autoTrackCurrentLine) this.showCurrentLyric();
    },

    showCurrentLyric() {
      const currentLine = document.querySelector(`#lyric_line${this.currentLyricLineNumber}`);
      if (currentLine) {
        currentLine.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }
    },

    enterEditLyric(lineNumber) {
      this.openEditor = true;
      this.editLyricLineNumber = lineNumber;
      this.editLyricText = this.lyricLines[lineNumber].text;
    },

    setEndTime() {
      const lineNumber = this.currentLyricLineNumber;
      const lyricLines = this.lyricLines.map(line => ({ ...line }));
      lyricLines[lineNumber].timeEnd = 1000 * this.currentTime;
      this.$store.commit("AudioPlayer/SET_LYRIC_LINES", lyricLines);
    },

    deleteEndTime() {
      const lineNumber = this.currentLyricLineNumber;
      const lyricLines = this.lyricLines.map(line => ({ ...line }));
      delete lyricLines[lineNumber].timeEnd;
      this.$store.commit("AudioPlayer/SET_LYRIC_LINES", lyricLines);
    },

    confirmLyricChange() {
      const lineNumber = this.editLyricLineNumber;
      const lyricLines = this.lyricLines.map(line => ({ ...line }));
      lyricLines[lineNumber].text = this.editLyricText;
      this.$store.commit("AudioPlayer/SET_LYRIC_LINES", lyricLines);
      this.openEditor = false;
      this.editLyricLineNumber = 0;
    },

    async uploadData() {
      const subtitle = this.currentPlayingFile.subtitle ? `${this.currentPlayingFile.subtitle}/` : "";
      const writePath = `${subtitle}${this.currentPlayingFile.title}.vtt`;
      this.$q.dialog({
        title: "保存歌词文件",
        message: "请输入保存文件路径，路径以.vtt结束，相对于当前作品的根文件夹：",
        prompt: {
          model: writePath,
          isValid: path => path.endsWith(".vtt"),
          type: "text",
        },
        cancel: true,
        persistent: true,
      }).onOk(async path => {
        const result = await ServerApi.saveLyric(this.playWorkId, path, this.lyricLines);
        if (result.result) {
          this.showToast("保存歌词成功（由于文件变动，如果播放历史无法正常播放以往记录，需要删除当前作品的历史播放记录来恢复）", 8000);
        }
      });
    },

    deleteLyricLine(lineNumber) {
      const lyricLines = this.lyricLines.map(line => ({ ...line }));
      lyricLines[lineNumber].deleted = true;
      this.$store.commit("AudioPlayer/SET_LYRIC_LINES", lyricLines);
    },

    recoverDeletedLyricLine(lineNumber) {
      const lyricLines = this.lyricLines.map(line => ({ ...line }));
      delete lyricLines[lineNumber].deleted;
      this.$store.commit("AudioPlayer/SET_LYRIC_LINES", lyricLines);
    },

    async fetchOtherLyricFiles() {
      const lyricList = await ServerApi.queryLyric(this.currentPlayingFile.hash);
      const unmatchList = lyricList.filter(lyric => lyric.matchLevel < 0);
      const matchList = lyricList.filter(lyric => lyric.matchLevel >= 0);
      const options = [...matchList, ...unmatchList];
      console.log("other lyrics: ", options);
      this.lyricOptionList = options;
      this.openLyricFileSelection = true;
    },

    async selectLyricOption(option) {
      const lyric = await ServerApi.fetchLyric(
        option.isAI ? `${this.playWorkId}/${option.hash}/1` : `${option.hash}/0`
      );
      this.SET_HAS_LYRIC(true);
      this.SET_LYRIC_LINES(lyric);
      this.openLyricFileSelection = false;
    },

    async closeLyric() {
      this.SET_HAS_LYRIC(false);
      this.SET_CURRENT_LYRIC("");
      this.SET_LYRIC_LINES([]);
    },

    showToast(message, timeout = 3000) {
      this.$q.notify({ message, timeout });
    },
  },
};
</script>

<style scoped>
.deleteText {
  text-decoration: line-through;
  opacity: 0.5;
}
</style>
