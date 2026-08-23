<template>
  <div
    v-show="enablePIPLyrics"
    ref="pipWindow"
    :class="['bilibili-pip', { dragging: isDragging, 'docpip-mode': isDocPip }]"
    :style="pipStyle"
    @pointerdown="onDragPointerDown"
  >
    <canvas ref="canvas"></canvas>
    <div class="pip-controls" @pointerdown.stop>
      <q-btn
        flat
        round
        dense
        size="sm"
        color="white"
        :icon="playing ? 'pause' : 'play_arrow'"
        @click="togglePlay"
      >
        <q-tooltip>{{ playing ? '暂停' : '播放' }}</q-tooltip>
      </q-btn>
      <q-btn flat round dense size="sm" color="white" icon="close" @click="close">
        <q-tooltip>关闭桌面歌词</q-tooltip>
      </q-btn>
    </div>
    <div v-if="!isDocPip" class="pip-resize-handle" @pointerdown.stop="onResizePointerDown"></div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'pinia'
import { useAudioPlayerStore } from 'stores/audioPlayer.js'

const POSITION_KEY = 'pip_lyrics_position'
const DEFAULT_WIDTH = 360
const DEFAULT_HEIGHT = 72
const MIN_WIDTH = 200
const MIN_HEIGHT = 48
const EDGE_MARGIN = 8

export default {
  name: 'FloatingLyricsWindow',

  computed: {
    ...mapState(useAudioPlayerStore, [
      'currentLyric',
      'enablePIPLyrics',
      'playing',
    ]),

    ...mapState(useAudioPlayerStore, [
      'isQueueEmpty',
    ]),

    canvas() {
      return this.$refs.canvas
    },

    // Document Picture-in-Picture：系统级置顶窗口，可跨标签页、浏览器外显示
    isDocPip() {
      return !!this.pipDoc
    },

    pipStyle() {
      if (this.isDocPip) {
        // 在系统 PiP 窗口内铺满整个窗口，尺寸由用户拖拽窗口边缘调节
        return {}
      }
      const pos = this.position
      return {
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${this.windowWidth}px`,
        height: `${this.windowHeight}px`,
      }
    },
  },

  data() {
    return {
      ctx: null,
      pixelRatio: window.devicePixelRatio,
      position: { x: 0, y: 0 },
      windowWidth: DEFAULT_WIDTH,
      windowHeight: DEFAULT_HEIGHT,
      // 'drag' 移动窗口 | 'resize' 调节大小 | null 空闲
      dragMode: null,
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      resizeStart: { w: 0, h: 0 },
      pointerId: null,
      pipDoc: null,
      originalParent: null,
      resizeObserver: null,
    }
  },

  methods: {
    ...mapActions(useAudioPlayerStore, {
      setEnablePIPLyrics: 'SET_ENABLE_PIP_LYRICS',
      playAudio: 'PLAY',
      pauseAudio: 'PAUSE',
    }),

    async open() {
      // 优先使用 Document PiP（Chrome/Edge，系统置顶、跨标签页），
      // 不支持时回退为页内浮动小窗（Firefox/Safari）
      if ('documentPictureInPicture' in window) {
        try {
          await this.openDocumentPiP()
          return
        } catch (e) {
          console.warn('document pip open failed, fallback to in-page window:', e)
        }
      }
      this.restorePosition()
      this.$nextTick(() => this.resizeCanvas())
    },

    async openDocumentPiP() {
      const pipWin = await window.documentPictureInPicture.requestWindow({
        width: Math.max(this.windowWidth, DEFAULT_WIDTH),
        height: Math.max(this.windowHeight, DEFAULT_HEIGHT) + 40,
      })
      this.pipDoc = pipWin.document
      this.originalParent = this.$refs.pipWindow.parentElement

      // 把主页面的全部样式规则复制进 PiP 文档，保证组件样式不变
      for (const sheet of document.styleSheets) {
        try {
          const css = [...sheet.cssRules].map(r => r.cssText).join('\n')
          const style = this.pipDoc.createElement('style')
          style.textContent = css
          this.pipDoc.head.appendChild(style)
        } catch (e) { /* 跨域样式表无法读取，跳过 */ }
      }
      this.pipDoc.body.style.margin = '0'
      this.pipDoc.body.style.overflow = 'hidden'
      this.pipDoc.body.appendChild(this.$refs.pipWindow)

      // 用户直接关闭 PiP 窗口时复位功能状态
      pipWin.addEventListener('pagehide', () => {
        this.detachDocumentPiP()
        this.setEnablePIPLyrics(false)
      })

      // PiP 窗口尺寸变化时重设画布
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas())
      this.resizeObserver.observe(this.$refs.pipWindow)
      this.$nextTick(() => this.resizeCanvas())
    },

    detachDocumentPiP() {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect()
        this.resizeObserver = null
      }
      if (this.pipDoc) {
        // 把组件移回主页面文档，再关闭 PiP 窗口
        if (this.originalParent) this.originalParent.appendChild(this.$refs.pipWindow)
        try { this.pipDoc.defaultView.close() } catch (e) { /* 已关闭 */ }
        this.pipDoc = null
        this.originalParent = null
      }
    },

    close() {
      this.setEnablePIPLyrics(false)
    },

    restorePosition() {
      let x = window.innerWidth - this.windowWidth - EDGE_MARGIN
      let y = Math.round(window.innerHeight * 0.15)
      let w = DEFAULT_WIDTH
      let h = DEFAULT_HEIGHT
      try {
        const saved = JSON.parse(localStorage.getItem(POSITION_KEY))
        if (saved) {
          if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
            x = saved.x
            y = saved.y
          }
          if (Number.isFinite(saved.w)) w = Math.max(MIN_WIDTH, saved.w)
          if (Number.isFinite(saved.h)) h = Math.max(MIN_HEIGHT, saved.h)
        }
      } catch (e) { /* 忽略损坏的存储数据，使用默认值 */ }
      this.windowWidth = w
      this.windowHeight = h
      this.position = this.clampPosition(x, y)
    },

    savePosition() {
      localStorage.setItem(POSITION_KEY, JSON.stringify({
        x: this.position.x,
        y: this.position.y,
        w: this.windowWidth,
        h: this.windowHeight,
      }))
    },

    clampPosition(x, y) {
      // 允许拖到任意位置，只保证小窗不会完全移出可视区域
      return {
        x: Math.min(Math.max(x, -this.windowWidth + 40), Math.max(0, window.innerWidth - 40)),
        y: Math.min(Math.max(y, 0), Math.max(0, window.innerHeight - 40)),
      }
    },

    onDragPointerDown(event) {
      if (this.isDocPip) return // PiP 窗口由系统拖动/调节大小
      if (event.button !== 0) return
      this.startDrag('drag', event)
      // 记录按下时的窗口位置，拖动时按偏移量计算，避免跳跃
      this.dragStart = {
        x: event.clientX - this.position.x,
        y: event.clientY - this.position.y,
      }
      event.target.setPointerCapture && event.target.setPointerCapture(event.pointerId)
    },

    onResizePointerDown(event) {
      if (event.button !== 0) return
      this.startDrag('resize', event)
      this.resizeStart = { w: this.windowWidth, h: this.windowHeight }
      this.dragStart = { x: event.clientX, y: event.clientY }
      event.target.setPointerCapture && event.target.setPointerCapture(event.pointerId)
    },

    startDrag(mode, event) {
      this.dragMode = mode
      this.isDragging = true
      this.pointerId = event.pointerId
    },

    onPointerMove(event) {
      if (!this.dragMode || event.pointerId !== this.pointerId) return
      if (this.dragMode === 'drag') {
        this.position = this.clampPosition(
          event.clientX - this.dragStart.x,
          event.clientY - this.dragStart.y
        )
      } else {
        this.windowWidth = Math.max(MIN_WIDTH, Math.min(
          this.resizeStart.w + event.clientX - this.dragStart.x,
          window.innerWidth
        ))
        this.windowHeight = Math.max(MIN_HEIGHT, Math.min(
          this.resizeStart.h + event.clientY - this.dragStart.y,
          window.innerHeight
        ))
        this.resizeCanvas()
      }
    },

    onPointerUp() {
      if (!this.dragMode) return
      this.dragMode = null
      this.isDragging = false
      this.savePosition()
    },

    onWindowResize() {
      if (this.isDocPip) return
      this.position = this.clampPosition(this.position.x, this.position.y)
      this.resizeCanvas()
    },

    resizeCanvas() {
      if (!this.canvas) return
      // 两种模式下都按元素实际显示尺寸取值（PiP 模式即窗口尺寸）
      const rect = this.canvas.getBoundingClientRect()
      const w = Math.max(1, Math.round(rect.width)) || this.windowWidth
      const h = Math.max(1, Math.round(rect.height)) || this.windowHeight
      this.canvas.width = Math.round(w * this.pixelRatio)
      this.canvas.height = Math.round(h * this.pixelRatio)
      this.drawLyric(this.currentLyric)
    },

    drawLyric(str) {
      if (!this.ctx) return
      str = str || ''
      const fontScale = 0.7
      const expectCharCount = 30
      const cvs = this.canvas
      const ctx = this.ctx

      const fontSize = fontScale * Math.round(Math.sqrt((cvs.width * cvs.height) / expectCharCount))

      // 背景透明，深色底由外层容器提供
      ctx.clearRect(0, 0, cvs.width, cvs.height)

      ctx.font = `bold ${fontSize}px "-apple-system", "BlinkMacSystemFont", "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", "Helvetica", "Arial", "sans-serif", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
      ctx.shadowBlur = fontSize * 0.08

      const padWidth = 5
      const padHeight = 0

      const allowedLines = Math.floor((cvs.height - padHeight * 2) / fontSize)
      const allowedWidth = cvs.width - padWidth * 2

      const allTxt = ctx.measureText(str)
      const neededLines = Math.ceil(allTxt.width / allowedWidth)
      const drawLines = Math.min(neededLines, allowedLines)
      const restLineHeight = cvs.height - drawLines * fontSize
      let readCharIdx = 0

      const chars = str.split("")

      for (let line = 0; line < drawLines && readCharIdx < chars.length; line++) {
        let lineStr = ""
        let lineStrMetric = null
        while (readCharIdx < str.length) {
          lineStr += chars[readCharIdx]
          lineStrMetric = ctx.measureText(lineStr)
          if (lineStrMetric.width > allowedWidth) {
            lineStr = lineStr.substr(0, lineStr.length - 1)
            break
          } else {
            readCharIdx++
          }
        }

        if (line == drawLines - 1 && readCharIdx < chars.length) {
          lineStr = lineStr.substr(0, lineStr.length - 3) + "..."
        }

        lineStrMetric = ctx.measureText(lineStr)

        const drawX = padWidth + (cvs.width - lineStrMetric.width) / 2
        const drawY = restLineHeight / 2 + line * fontSize + lineStrMetric.actualBoundingBoxAscent
        ctx.fillText(lineStr, drawX, drawY)
      }

      ctx.shadowBlur = 0
    },

    togglePlay() {
      if (this.playing) this.pauseAudio()
      else this.playAudio()
    },
  },

  watch: {
    enablePIPLyrics(value) {
      if (value) {
        this.open()
      } else if (this.isDocPip) {
        this.detachDocumentPiP()
      }
    },

    currentLyric(newLyric) {
      if (!this.enablePIPLyrics) return
      this.drawLyric(newLyric)
    },

    playing() {
      if (!this.enablePIPLyrics) return
      this.drawLyric(this.currentLyric)
    },

    '$q.dark.isActive'() {
      this.drawLyric(this.currentLyric)
    },
  },

  mounted() {
    this.ctx = this.canvas.getContext('2d')
    this.restorePosition()
    this.resizeCanvas()
    window.addEventListener('resize', this.onWindowResize)
    window.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('pointerup', this.onPointerUp)
    window.addEventListener('pointercancel', this.onPointerUp)
    if (this.enablePIPLyrics) this.open()
  },

  beforeUnmount() {
    this.detachDocumentPiP()
    window.removeEventListener('resize', this.onWindowResize)
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('pointercancel', this.onPointerUp)
  },
}
</script>

<style lang="scss" scoped>
.bilibili-pip {
  position: fixed;
  z-index: 3000;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.75);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  cursor: move;
  user-select: none;
  touch-action: none;

  &.dragging {
    transition: none;
  }

  &.docpip-mode {
    // 在系统 PiP 窗口内铺满整个窗口
    inset: 0;
    width: 100%;
    height: 100%;
    cursor: default;
    border-radius: 0;
    box-shadow: none;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .pip-controls {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    gap: 2px;
    padding: 2px 4px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.5);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover .pip-controls {
    opacity: 1;
  }

  .pip-resize-handle {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
    // 斜线纹理指示可拖拽调节大小
    background: linear-gradient(135deg, transparent 50%, rgba(255, 255, 255, 0.45) 50%, rgba(255, 255, 255, 0.45) 60%, transparent 60%, transparent 70%, rgba(255, 255, 255, 0.45) 70%, rgba(255, 255, 255, 0.45) 80%, transparent 80%);
    opacity: 0.6;
    touch-action: none;
  }
}
</style>
