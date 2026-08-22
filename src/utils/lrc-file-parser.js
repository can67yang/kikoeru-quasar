// vendored fork of lrc-file-parser
// 在原版基础上新增：无参构造、setLyricObject(lines)、updateTime(seconds)（带缓存区间与二分定位）、
// getCurrentLyric(seconds)、支持行属性 timeEnd / deleted（AI 翻译歌词使用）
// 逆向自 kikoeru-quasar 闭源版本的编译产物

const timeTags = /^(?:\[[\d:.]+\])+/g
const timeMatch = /\d{1,3}(:\d{1,3}){0,2}(?:\.\d{1,3})/g
const tagNames = {
  title: 'ti',
  artist: 'ar',
  album: 'al',
  offset: 'offset',
  by: 'by'
}
const now = (typeof performance === 'object' && performance.now) ? performance.now.bind(performance) : Date.now.bind(Date)
const noop = function () {}

// 定时器：临近 invokeTime 时用 requestAnimationFrame 精确触发，否则 setTimeout
const timer = {
  invokeTime: 0,
  animationFrameId: null,
  timeoutId: null,
  callback: null,
  thresholdTime: 200,
  run () {
    this.animationFrameId = window.requestAnimationFrame(() => {
      this.animationFrameId = null
      const remainingTime = this.invokeTime - now()
      if (remainingTime > 0) {
        if (remainingTime < this.thresholdTime) {
          this.run()
        } else {
          this.timeoutId = setTimeout(() => {
            this.timeoutId = null
            this.run()
          }, remainingTime - this.thresholdTime)
        }
        return
      }
      this.callback(remainingTime)
    })
  },
  start (callback = noop, offset = 0) {
    this.callback = callback
    this.invokeTime = now() + offset
    this.run()
  },
  clear () {
    if (this.animationFrameId) {
      window.cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    this.callback = null
  }
}

const leadingZeroTime = /^0+(\d+)/
const middleZeroTime = /:0+(\d+)/g
const fractZeroTime = /\.0+(\d+)/
const trimZero = str => str
  .replace(leadingZeroTime, '$1')
  .replace(middleZeroTime, ':$1')
  .replace(fractZeroTime, '.$1')

// 解析翻译歌词（多语言 extended lyrics）
function parseExtendedLyric (linesMap, lyric) {
  const lyricLines = lyric.split(/\r\n|\n|\r/)
  for (let i = 0; i < lyricLines.length; i++) {
    const line = lyricLines[i].trim()
    const timeTagResult = timeTags.exec(line)
    if (timeTagResult) {
      const timeTag = timeTagResult[0]
      const text = line.replace(timeTags, '').trim()
      if (text) {
        const matchTimes = timeTag.match(timeMatch)
        if (matchTimes == null) continue
        for (const m of matchTimes) {
          const time = trimZero(m)
          const lineInfo = linesMap[time]
          if (lineInfo) lineInfo.extendedLyrics.push(text)
        }
      }
    }
  }
}

const initTags = {
  title: '',
  artist: '',
  album: '',
  offset: 0,
  by: ''
}

export default class Lyric {
  constructor (onSetLyricLines = noop, onPlay = noop, lyric = '', extendedLyrics = [], offset = 0, playbackRate = 1, isRemoveBlankLine = true) {
    this.lyric = lyric
    this.extendedLyrics = extendedLyrics
    this.tags = { ...initTags }
    this.lines = []
    this.onPlay = onPlay
    this.onSetLyricLines = onSetLyricLines
    this.isPlay = false
    this.curLineNum = 0
    this.maxLine = 0
    this.offset = offset
    this.isRemoveBlankLine = isRemoveBlankLine
    this._playbackRate = playbackRate
    this._performanceTime = 0
    this._startTime = 0
    this._precomputed_offset = 0
    this._init()
  }

  _initTimeStates () {
    this.currentSeconds = -1
    this.currentLineNumber = 0
    this.minBoundSeconds = Infinity
    this.maxBoundSeconds = -Infinity
  }

  _init () {
    this._initTimeStates()
    if (this.lyric == null) this.lyric = ''
    if (this.extendedLyrics == null) this.extendedLyrics = []
    this._initTag()
    this._initLines()
    this.onSetLyricLines(this.lines)
  }

  _initTag () {
    this.tags = { ...initTags }
    for (const tag of Object.keys(initTags)) {
      const result = this.lyric.match(new RegExp(`\\[${tagNames[tag]}:([^\\]]*)]`, 'i'))
      if (result) this.tags[tag] = result[1]
    }
    if (this.tags.offset) {
      const offset = parseInt(this.tags.offset)
      this.tags.offset = Number.isNaN(offset) ? 0 : offset
    } else this.tags.offset = 0
    this._precomputed_offset = Math.trunc(this.tags.offset + this.offset)
  }

  _initLines () {
    this.lines = []
    const lines = this.lyric.split(/\r\n|\n|\r/)
    const linesMap = {}
    const linesLength = lines.length
    for (let i = 0; i < linesLength; i++) {
      const line = lines[i].trim()
      const timeTagResult = timeTags.exec(line)
      if (timeTagResult) {
        const timeTag = timeTagResult[0]
        const text = line.replace(timeTags, '').trim()
        if (text || !this.isRemoveBlankLine) {
          const matchTimes = timeTag.match(timeMatch)
          if (matchTimes == null) continue
          for (const m of matchTimes) {
            const timeStr = trimZero(m)
            if (linesMap[timeStr]) {
              linesMap[timeStr].extendedLyrics.push(text)
              continue
            }
            const t = timeStr.split(':')
            if (t.length > 3) continue
            if (t.length < 3) {
              for (let n = 3 - t.length; n--;) t.unshift('0')
            }
            if (t[2].includes('.')) {
              t.splice(2, 1, ...t[2].split('.'))
            }
            linesMap[timeStr] = {
              time: 60 * parseInt(t[0]) * 60 * 1000 + 60 * parseInt(t[1]) * 1000 + 1000 * parseInt(t[2]) + parseInt(t[3] || '0'),
              text,
              extendedLyrics: []
            }
          }
        }
      }
    }
    for (const extendedLyric of this.extendedLyrics) {
      parseExtendedLyric(linesMap, extendedLyric)
    }
    this.lines = Object.values(linesMap)
    this.lines.sort((a, b) => a.time - b.time)
    this.maxLine = this.lines.length - 1
  }

  _currentTime () {
    return (now() - this._performanceTime) * this._playbackRate + this._startTime
  }

  _findCurLineNum (time, curLineNum = 0) {
    if (time <= 0) return 0
    const linesLength = this.lines.length
    for (let i = curLineNum; i < linesLength; i++) {
      if (time <= this.lines[i].time) return i === 0 ? 0 : i - 1
    }
    return linesLength - 1
  }

  _handleMaxLine () {
    this.onPlay(this.curLineNum, this.lines[this.curLineNum].text)
    this.pause()
  }

  _refresh () {
    this.curLineNum++
    if (this.curLineNum >= this.maxLine) return this._handleMaxLine()
    const currentLine = this.lines[this.curLineNum]
    const currentTime = this._currentTime()
    const diff = currentTime - currentLine.time
    if (diff >= 0 || this.curLineNum === 0) {
      const nextLine = this.lines[this.curLineNum + 1]
      const delay = (nextLine.time - currentLine.time - diff) / this._playbackRate
      if (delay > 0) {
        if (this.isPlay) {
          timer.start(() => {
            if (this.isPlay) this._refresh()
          }, delay)
        }
        this.onPlay(this.curLineNum, currentLine.text)
      } else {
        const newLineNum = this._findCurLineNum(currentTime, this.curLineNum + 1)
        if (newLineNum > this.curLineNum) this.curLineNum = newLineNum - 1
        this._refresh()
      }
    } else {
      this.curLineNum = this._findCurLineNum(currentTime, this.curLineNum) - 1
      this._refresh()
    }
  }

  play (time = 0) {
    if (!this.lines.length) return
    this.pause()
    this.isPlay = true
    this._performanceTime = now() - Math.trunc(this.tags.offset + this.offset)
    this._startTime = time
    this.curLineNum = this._findCurLineNum(this._currentTime()) - 1
    this._refresh()
  }

  pause () {
    if (!this.isPlay) return
    this.isPlay = false
    timer.clear()
    if (this.curLineNum === this.maxLine) return
    const newLineNum = this._findCurLineNum(this._currentTime())
    if (this.curLineNum !== newLineNum) {
      this.curLineNum = newLineNum
      this.onPlay(newLineNum, this.lines[newLineNum].text)
    }
  }

  setPlaybackRate (playbackRate) {
    this._playbackRate = playbackRate
    if (this.lines.length && this.isPlay) this.play(this._currentTime())
  }

  setLyric (lyric, extendedLyrics = []) {
    if (this.isPlay) this.pause()
    this.lyric = lyric
    this.extendedLyrics = extendedLyrics
    this._init()
  }

  // 直接使用服务端解析好的歌词行数组（AI 翻译歌词走此入口）
  setLyricObject (lines) {
    this._initTimeStates()
    this.tags = { ...initTags }
    this._precomputed_offset = Math.trunc(this.tags.offset + this.offset)
    this.lines = lines.slice(0)
  }

  // 按播放进度更新当前行号；落在缓存区间内则返回 false 表示无变化
  updateTime (seconds) {
    if (this.lines.length === 0) return false
    if (this.minBoundSeconds <= seconds && seconds < this.maxBoundSeconds) return false
    const time = 1000 * seconds + this._precomputed_offset
    const startLine = this.currentLineNumber > 0 && seconds > this.maxBoundSeconds ? this.currentLineNumber : 0
    const curLine = this._findCurLineNum(time, startLine)
    const currentLine = this.lines[curLine]
    if (time < currentLine.time) {
      this.minBoundSeconds = curLine === 0 ? 0 : this.lines[curLine - 1].time / 1000
      this.maxBoundSeconds = currentLine.time / 1000
    } else if (curLine + 1 < this.lines.length) {
      if (currentLine.timeEnd !== undefined) {
        if (time < currentLine.timeEnd) {
          this.minBoundSeconds = currentLine.time / 1000
          this.maxBoundSeconds = currentLine.timeEnd / 1000
        } else {
          this.minBoundSeconds = currentLine.timeEnd / 1000
          this.maxBoundSeconds = this.lines[curLine + 1].time / 1000
        }
      } else {
        this.minBoundSeconds = currentLine.time / 1000
        this.maxBoundSeconds = this.lines[curLine + 1].time / 1000
      }
    } else {
      this.minBoundSeconds = currentLine.time / 1000
      this.maxBoundSeconds = (currentLine.timeEnd || Infinity) / 1000
    }
    this.currentLineNumber = curLine
    return true
  }

  getCurrentLyric (seconds) {
    const emptyText = '...'
    if (this.lines.length === 0) return emptyText
    if (seconds) {
      const time = 1000 * seconds + this._precomputed_offset
      const currentLine = this.lines[this.currentLineNumber]
      return currentLine.time <= time && time <= (currentLine.timeEnd || Infinity)
        ? currentLine.text
        : emptyText
    }
    return this.lines[this.currentLineNumber].text
  }
}
