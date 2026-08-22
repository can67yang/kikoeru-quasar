import axios from "axios";
/**
 * 格式化 id，适配 8 位、6 位 id
 * @param {number} id
 * @return {string}
 */
export function formatID(id) {
  if (id >= 1000000) {
    // 大于 7 位数，则补全为 8 位
    id = `0${id}`.slice(-8);
  } else {
    // 否则补全为 6 位
    id = `000000${id}`.slice(-6);
  }

  return id;
}

export function formatSeconds(seconds) {
  let h = Math.floor(seconds / 3600) < 10
    ? '0' + Math.floor(seconds / 3600)
    : Math.floor(seconds / 3600)

  let m = Math.floor((seconds / 60 % 60)) < 10
    ? '0' + Math.floor((seconds / 60 % 60))
    : Math.floor((seconds / 60 % 60))

  let s = Math.floor((seconds % 60)) < 10
    ? '0' + Math.floor((seconds % 60))
    : Math.floor((seconds % 60))

  return h === "00"
    ? m + ":" + s
    : h + ":" + m + ":" + s
}

// 解决字符串到正则当中的问题
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

export function basenameWithoutExt(string) {
  const extIdx = string.lastIndexOf('.');
  return extIdx >= 0 ? string.substr(0, extIdx) : string;
}

export function extname(string) {
  const extIdx = string.lastIndexOf('.');
  return extIdx >= 0 ? string.substr(extIdx) : "";
}


export const AILyricTaskStatus = {
  NONE: 0, // 非法状态
  PENDING: 1, // 任务待申领
  TRASCRIPTING: 2, // 任务已被申领，并等待执行完成
  SUCCESS: 3, // 翻译成功
  ERROR: 4, // 翻译失败
  COUNT: 5, // 状态总数
}

export const ServerApi = {
  // page start from 1
  // workId: number, a workId like string of "01101111" should convert to number 1101111
  // fileName: string
  // status: number[] of AILyricTaskStatus.***
  // return: {
  //     "pagination": {
  //       "currentPage": 1,
  //       "pageSize": 12,
  //       "totalCount": 2
  //   },
  //   "tasks": [
  //       {
  //           "id": 10,
  //           "work_id": 1004107,
  //           "audio_path": "01_mp3/track02_小穴担当和校外学习约会.mp3",
  //           "status": 3,
  //           "worker_name": "whisper",
  //           "worker_status": "翻译进度: 100%",
  //           "title": "纯情小穴担当After"
  //       },
  //       {
  //           "id": 8,
  //           "work_id": 1004107,
  //           "audio_path": "01_mp3/track00_标题名与广告.mp3",
  //           "status": 3,
  //           "worker_name": "whisper",
  //           "worker_status": "翻译进度: 100%",
  //           "title": "纯情小穴担当After"
  //       }
  //   ]
  // }
  async searchTask(page, workId, fileName, status) {
    const url = '/api/lyric/translate';
    const params = {
      page,
      work_id: workId || 0,
      file_name: fileName || '',
      status: JSON.stringify(status || []),
    };
    const response = await axios.get(url, { params });
    return response.data;
  },

  polishTask(task) {
    const clone = Object.assign({}, task);

    const fileBasename = task.audio_path.split(/[\\/]/).pop();
    
    clone.fileName = basenameWithoutExt(fileBasename);
    clone.fileExt = extname(fileBasename);
    clone.fileBasename = fileBasename;
    return clone;
  },

  async searchWorkTask(workId, fileName, status) {
    const data = await this.searchTask(-1, workId, fileName || "", []);
    return data.tasks.map(this.polishTask);
  },

  async translateAudio(fileHash) {
    const url = `/api/lyric/translate/${fileHash}`;
    const response = await axios.put(url);
    return response.data;
  },

  async deleteTask(id, idArr) {
    const url = `/api/lyric/translate/${id}`;
    const response = await axios.delete(url, { data: { idArr } });
    return response.data;
  },

  async redoTask(id, idArr) {
    const url = `/api/lyric/translate/redo/${id}`;
    const response = await axios.post(url, { idArr });
    return response.data;
  },

  async downloadLrc(id) {
    const response = await axios.get(`/api/lyric/translate/lrc`, { params: { id } });
    return response.data.lrcContent;
  },

  async queryLyric(id) {
    const response = await axios.get(`/api/media/query-lrc/${id}`);
    return response.data.lyricList;
  },

  async fetchLyric(id) {
    const response = await axios.get(`/api/media/fetch-lrc/${id}`);
    return response.data.lrc;
  },

  async saveLyric(id, writePath, lrc) {
    const response = await axios.post(`/api/media/save-lrc/${id}`, { writePath, lrc });
    return response.data;
  },

  async saveEditMeta(id, metadata) {
    const response = await axios.post(`/api/edit/work/${id}`, metadata);
    return response.data;
  },

  async getCandidates(type) {
    const data = (await axios.get(`/api/${type}s`)).data.slice();
    return data.sort((a, b) => b.count - a.count);
  },

  async saveEditImg(id, base64, type = 'main', fileName = 'img.jpg') {
    const blob = await dataURLToBlob(base64, 'image/jpeg');
    const form = new FormData();
    form.append('file', blob, fileName);
    form.append('type', type);
    const response = await axios.post(`/api/edit/img/${id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async recoverEditImg(id, type = 'main') {
    const response = await axios.post(`/api/edit/recover/img/${id}`, { type });
    return response.data;
  },

  async askForTranscoding(id, bitRate) {
    const response = await axios.post(`/api/media/pre-transcode/${id}?bitRate=${bitRate}`);
    return response.data;
  },

  async getTranscodingStatus(id, bitRate) {
    const response = await axios.get(`/api/media/pre-transcode/${id}?bitRate=${bitRate}`);
    return response.data;
  },

  async getSyncInfo(host, metaApi, trackApi, filter) {
    const response = await axios.get('/api/syncer', {
      params: { host, metaApi, trackApi, filter }
    });
    return response.data.tracks;
  },

  async newSyncTask(host, code, rootFolderName, overwrite, treeTracks) {
    const response = await axios.post('/api/syncer', {
      host, code, rootFolderName, overwrite, treeTracks
    });
    return response.data.id;
  },

  async getSyncTaskListStatus() {
    const response = await axios.get('/api/syncer/task');
    return response.data.info;
  },

  async deleteSyncTask(id) {
    const response = await axios.delete('/api/syncer/task?id=' + id);
    return response.data.success;
  },

  async stopSyncTask(id) {
    const response = await axios.post(`/api/syncer/task/stop?id=${id}`);
    return response.data.success;
  },

  async restartSyncTask(id) {
    const response = await axios.post(`/api/syncer/task/restart?id=${id}`);
    return response.data.success;
  },

  async getServerConfig() {
    const response = await axios.get('/api/config/admin');
    return response.data.config;
  },
}

// works id 前缀表
const ID_PREFIX = ['RJ', 'BJ', 'VJ', 'CC'];
const ID_MAGIC = 1e12;

export function idPrefix(id) {
  const type = typeof id;
  switch (type) {
    case 'string': return id.substring(0, 2);
    case 'number': return Math.floor(id / ID_MAGIC);
    default: throw Error(`get id type failed, ${id} is unsupported type ${type}`);
  }
}

export function idDigit(id) {
  const type = typeof id;
  switch (type) {
    case 'string': return id.substring(2);
    case 'number': return Math.floor(id % ID_MAGIC);
    default: throw Error(`get id digit failed, ${id} is unsupported type ${type}`);
  }
}

export function prefixWithFormatID(id) {
  const digit = idDigit(id);
  const prefix = idPrefix(id);
  return `${ID_PREFIX[prefix]}${formatID(digit)}`;
}

function dataURLToBlob(base64, type = 'image/jpeg') {
  return new Promise((resolve, reject) => {
    const prefix = `data:${type};base64,`;
    const data = base64.startsWith(prefix) ? base64.slice(prefix.length) : base64;
    const binary = atob(data);
    const bytes = new Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const buffer = new Uint8Array(bytes);
    const blob = new Blob([buffer], { type });
    resolve(blob);
  });
}

export function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  var costs = new Array();
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0)
        costs[j] = j;
      else {
        if (j > 0) {
          var newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue),
              costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

// return [similarity in 0.0~1.0, editDistance]
export function similarity(s1, s2) {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  const longerLength = longer.length;
  if (longerLength == 0) {
    return 1.0;
  }

  const ed = editDistance(longer, shorter);
  return [(longerLength - ed) / parseFloat(longerLength), ed];
}

export function bidirectionSimilarity(s1, s2) {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  const longerLength = longer.length;
  const shorterLength = shorter.length;

  if (longerLength == 0) {
    return 1.0;
  }

  const buf = Array(longerLength).fill(0);
  for (let i = 0; i < shorterLength; ++i) {
    if (longer[i] == shorter[i]) buf[i]++;
    if (longer[longerLength - i - 1] == shorter[shorterLength - i - 1]) buf[longerLength - i]++;
  }

  const samePortion = buf.reduce((acc, x) => acc + (x == 0 ? 0 : 1), 0);
  const value =  samePortion / shorterLength;
  return value;
}

export function audioLyricNameMatch(aname, lname) {
  const oname = basenameWithoutExt(aname);
  const dname = lname;
  
  if (oname === dname) return true; // 完全相等
  else if (oname.includes(dname)) return true;

  // 相似性判断，要排除一种情况就是作品文件名称之间极其相似，只有数字序号不同，这个时候相似度极高，需要特殊处理
  
  // 针对SEなし SEなし 这类文件名进行处理
  if (oname.includes("あり") && oname.replace(/あり/g, "なし") === dname) {
    return true;
  }
  if (oname.includes("なし") && oname.replace(/なし/g, "あり") === dname) {
    return true;
  }

  // 去掉文件名中所有的数字后，检查字符串是否一致，
  // 如果一致，说明两个文件名只有数字不同，不进行任何相似度判断
  // 直接判定为不同的两个文件
  const digitDetector = /\d/g;
  if (digitDetector.test(oname) && digitDetector.test(dname) && oname.replace(digitDetector, "") === dname.replace(digitDetector, "")) {
    return false;
  }

  const [sim, ed] = similarity(oname, dname);
  if (oname.length == dname.length && ed <= 2) {
    // 如果两个字符串长度一样，编辑距离相差小于2，则认为两者是仅序号不同的文件，将其判定为不匹配的音频和字幕
    return false;
  }

  if (sim > 0.8) return true;
  else if (bidirectionSimilarity(oname, dname) > 0.9) return true;

  return false;
}

// 多关键字搜索子条件类型
export const AdvanceSearchCondType = {
  UNKNOWN: 0,
  FUZZY: 1, // 全文模糊搜索，包括标题，
  VA: 2,
  TAG: 3,
  CIRCLE: 4,
  CODE: 5, // 番号
}

// 作品列表展示模式
export const WorkListMode = {
  PAGINATION: 'pagination',
  WATERFALL: 'waterfall',
}

// 字节数格式化
export function formatBytes(bytes, decimals = 0) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

// 取文件扩展名（不带点），非法时返回空字符串
export function getExtensionWithoutDot(string) {
  if (!string || typeof string !== 'string') return '';
  const extIdx = string.lastIndexOf('.');
  if (extIdx === -1 || extIdx === string.length - 1 || extIdx === 0 ||
    string.indexOf('/', extIdx) !== -1 || string.indexOf('\\', extIdx) !== -1) {
    return '';
  }
  return string.slice(extIdx + 1);
}

// 简短时长格式化：1时23分 / 45分 / 30秒
export function shortHumanReadableSeconds(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds / 60) % 60;
  const sec = Math.floor(seconds) % 60;
  let result = '';
  if (h > 0) result += h + '时';
  if (m > 0) result += m + '分';
  if (h <= 0 && m <= 0) result += sec + '秒';
  return result;
}
