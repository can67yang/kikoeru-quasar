// 转码选项枚举
export const TranscodeOption = {
  OFF: 'off',
  AAC_128: 'aac 128',
  AAC_320: 'aac 320',
}

const getters = {
  currentPlayingFile: (state) => {
    return state.queue[state.queueIndex] || {
      hash: '',
      title: '',
      subtitle: null,
      workTitle: ''
    }
  },

  isCurrentPlayingFileVideo: (state) => {
    const title = (state.queue[state.queueIndex] || {title: ''}).title;
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
}

export default getters
