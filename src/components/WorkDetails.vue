<template>
  <div class="row">
      <CoverSFW
        class="col q-ma-sm row justify-start shadow-4"
        :workid="metadata.id"
        :nsfw="false"
        :release="metadata.release"
        :lyric_status="metadata.lyric_status"
        style="border-radius: 8px; overflow: hidden;"
      />

    <div class="col-md-6 col-12 q-pa-sm">
      <div class="q-px-sm q-py-none">
        <!-- 标题 -->
        <div class="text-h6 text-weight-regular text-secondary">
          {{ metadata.title }}
        </div>

        <!-- 社团名 -->
        <div class="text-subtitle1 text-weight-regular">
          <router-link :to="`/works?circleId=${metadata.circle.id}`" class="text-grey">
            {{ metadata.circle.name }}
          </router-link>
        </div>

        <!-- 评价&评论 -->
        <div class="row items-center q-gutter-xs">
          <!-- 评价 -->
          <div class="col-auto">
            <q-rating
              v-model="rating"
              @input="setRating"
              name="rating"
              size="sm"
              :color="userMarked ? 'blue' : 'amber'"
              icon="star_border"
              icon-selected="star"
              icon-half="star_half"
            />

            <!-- 评价分布明细 -->
            <q-tooltip v-if=metadata.rate_count_detail content-class="text-subtitle1">
              <div>平均: {{metadata.rate_average_2dp}}</div>
              <div v-for="(rate, index) in sortedRatings" :key=index class="row items-center">
                <div class="col"> {{rate.review_point}}星 </div>

                <!-- 评价占比 -->
                <q-linear-progress
                  :value="rate.ratio/100"
                  color="amber"
                  track-color="white"
                  style="height: 15px; width: 100px"
                  class="col-auto"
                />

                <div class="col q-mx-sm"> ({{rate.count}}) </div>
              </div>
            </q-tooltip>
          </div>

          <div class="col-auto">
            <span class="text-weight-medium text-body1 text-red">{{metadata.rate_average_2dp}}</span> <span class="text-grey"> ({{metadata.rate_count}})</span>
          </div>

          <!-- 评论数量 -->
          <div class="col-auto q-px-sm">
            <q-icon name="chat" size="xs" /> <span class="text-grey"> ({{metadata.review_count}})</span>
          </div>

          <!-- DLsite链接 -->
          <div class="col-auto">
            <q-icon name="launch" size="xs" /><a class="text-blue" :href="`https://www.dlsite.com/home/work/=/product_id/${dlsiteCode}.html`" rel="noreferrer noopener" target="_blank">DLsite</a>
          </div>
        </div>
      </div>

      <!-- 价格&售出数 -->
      <div class="q-pt-sm q-pb-none">
        <span class="q-mx-sm text-weight-medium text-h6 text-red">{{metadata.price}} 日元</span>
        <q-chip size="md" icon="sell">售出数: {{metadata.dl_count}}</q-chip>
        <q-chip v-if="totalDuration" size="md" icon="schedule">总时长: {{ humanReadableSeconds(totalDuration) }}</q-chip>
      </div>

      <!-- 标签 -->
      <div class="q-px-none q-py-sm" v-if="showTags">
        <router-link
          v-for="(tag, index) in metadata.tags"
          :to="`/works?tagId=${tag.id}`"
          :key=index
        >
          <q-chip size="md" class="shadow-4">
            {{tag.name}}
          </q-chip>
        </router-link>
      </div>

      <!-- 声优 -->
      <div class="q-px-none q-pt-sm q-py-sm">
        <router-link
          v-for="(va, index) in metadata.vas"
          :to="`/works?vaId=${va.id}`"
          :key=index
        >
          <q-chip square size="md" class="shadow-4" color="teal" text-color="white" icon="mic">
            {{va.name}}
          </q-chip>
        </router-link>
      </div>

      <q-btn dense @click="showEditMetaDialog = true" color="cyan q-mt-sm shadow-4 q-mx-xs q-px-sm" label="修改作品信息" />

      <q-btn-dropdown
        dense
        class="q-mt-sm shadow-4 q-mx-xs q-pl-sm"
        color="cyan"
        label="标记进度"
      >
        <q-list>
          <q-item clickable @click="setProgress('marked')" class="q-pa-xs">
            <q-item-section avatar>
              <q-avatar icon="headset" v-show="progress === 'marked'" />
            </q-item-section>
            <q-item-section>
              <q-item-label>想听</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable @click="setProgress('listening')" class="q-pa-xs">
            <q-item-section avatar>
              <q-avatar icon="headset" v-show="progress === 'listening'" />
            </q-item-section>
            <q-item-section>
              <q-item-label>在听</q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable @click="setProgress('listened')" class="q-pa-xs">
            <q-item-section avatar>
              <q-avatar icon="headset" v-show="progress === 'listened'" />
            </q-item-section>
            <q-item-section>
              <q-item-label>听过</q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable @click="setProgress('replay')" class="q-pa-xs">
            <q-item-section avatar>
              <q-avatar icon="headset" v-show="progress === 'replay'" />
            </q-item-section>
            <q-item-section>
              <q-item-label>重听</q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable @click="setProgress('postponed')" class="q-pa-xs">
            <q-item-section avatar>
              <q-avatar icon="headset" v-show="progress === 'postponed'" />
            </q-item-section>
            <q-item-section>
              <q-item-label>搁置</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>

      <q-btn dense @click="showReviewDialog = true" color="cyan q-mt-sm shadow-4 q-mx-xs q-px-sm" label="写评论" />

      <q-btn v-if="metadata.state && playWorkId !== metadata.id" dense @click="resumeThisHistroy" color="cyan q-mt-sm shadow-4 q-mx-xs q-px-sm" label="播放此作品的历史记录" />
      <q-btn v-if="metadata.state" dense @click="clearThisHistroy" color="cyan q-mt-sm shadow-4 q-mx-xs q-px-sm" label="删除播放记录">
        <q-tooltip>当历史记录中有已被删除的音频文件，可能会无法正确播放文件，可通过此按钮解决</q-tooltip>
      </q-btn>

      <q-btn dense @click="$emit('translateCwd')" color="cyan q-mt-sm shadow-4 q-mx-xs q-px-sm" label="翻译当前目录音频">
        <q-tooltip>不包括递归的子目录音频</q-tooltip>
      </q-btn>

      <q-btn-dropdown dense color="cyan q-mt-sm shadow-4 q-mx-xs q-px-sm" label="更多">
        <q-list>
          <q-item clickable v-close-popup @click="scanWorkFile">
            <q-item-section>
              <q-item-label>扫描本地文件</q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="recoverOriginCover">
            <q-item-section>
              <q-item-label>恢复原始作品封面</q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="fixGBKShiftJISEncodingBug(false)">
            <q-item-section avatar>
              <q-avatar icon="warning" text-color="negative" />
            </q-item-section>
            <q-item-section>
              <q-item-label>修复此作品下的GBK乱码问题</q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="openDeleteDialog">
            <q-item-section avatar>
              <q-avatar icon="delete" text-color="negative" />
            </q-item-section>
            <q-item-section>
              <q-item-label>删除作品</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>

      <WriteReview v-if="showReviewDialog" @closed="processReview" :workid="metadata.id" :metadata="metadata"></WriteReview>

      <q-dialog v-model="showEditMetaDialog">
        <EditMeta :workid="metadata.id" :metadata="metadata" />
      </q-dialog>

      <!-- 删除作品对话框 -->
      <q-dialog v-model="showDeleteDialog">
        <q-card style="min-width: 400px; max-width: 500px;">
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6 text-negative">删除作品</div>
            <q-space />
            <q-btn v-close-popup icon="close" flat round dense />
          </q-card-section>

          <q-card-section class="text-subtitle1">
            确认要删除作品 "<strong>{{ metadata.title }}</strong>" 吗？此操作不可撤销。
          </q-card-section>

          <q-tabs
            v-model="deleteTab"
            dense
            class="text-grey"
            active-color="negative"
            indicator-color="negative"
            align="justify"
            narrow-indicator
          >
            <q-tab name="keepFiles" label="保留本地文件" />
            <q-tab name="deleteFiles" label="删除本地文件" />
          </q-tabs>

          <q-separator />

          <q-tab-panels v-model="deleteTab" animated>
            <q-tab-panel name="keepFiles">
              <div class="text-body2 q-mb-sm">
                删除数据库记录，但保留本地文件不删除。文件位置信息如下：
              </div>
              <div v-if="fileInfoLoading" class="text-center q-py-md">
                <q-spinner-dots size="30px" color="primary" />
                <div class="text-grey q-mt-sm">正在加载文件信息...</div>
              </div>
              <div v-else-if="fileInfo" class="bg-grey-2 q-pa-sm rounded-borders">
                <div class="row q-mb-xs">
                  <div class="col-3 text-grey">RootFolder:</div>
                  <div class="col-9 text-weight-medium">{{ fileInfo.rootFolder ? fileInfo.rootFolder.name : '未知' }}</div>
                </div>
                <div class="row q-mb-xs">
                  <div class="col-3 text-grey">绝对路径:</div>
                  <div class="col-9 text-weight-medium" style="word-break: break-all;">{{ fileInfo.rootFolder ? fileInfo.rootFolder.path : '未知' }}</div>
                </div>
                <div class="row q-mb-xs">
                  <div class="col-3 text-grey">相对路径:</div>
                  <div class="col-9 text-weight-medium" style="word-break: break-all;">{{ fileInfo.dir }}</div>
                </div>
                <div v-if="fileInfo.fullPath" class="row">
                  <div class="col-3 text-grey">完整路径:</div>
                  <div class="col-9 text-weight-medium" style="word-break: break-all;">{{ fileInfo.fullPath }}</div>
                </div>
              </div>
              <div v-else class="text-center text-grey q-py-md">
                加载文件信息失败
              </div>
            </q-tab-panel>

            <q-tab-panel name="deleteFiles">
              <div class="text-body2 text-negative q-mb-sm">
                <q-icon name="warning" size="md" />
                将同时删除数据库记录和本地音声文件夹。此操作不可撤销！
              </div>
              <div class="bg-red-1 q-pa-sm rounded-borders">
                删除后将无法恢复作品数据，如需重新入库需要再次执行扫描操作。
              </div>
            </q-tab-panel>
          </q-tab-panels>

          <q-card-actions align="right">
            <q-btn flat label="取消" color="grey" v-close-popup />
            <q-btn flat :label="deleteTab === 'deleteFiles' ? '确认删除（含本地文件）' : '确认删除（保留文件）'" color="negative" @click="confirmDeleteWork" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </div>
</template>

<script>
import CoverSFW from 'components/CoverSFW'
import WriteReview from './WriteReview'
import EditMeta from './EditMeta'
import NotifyMixin from '../mixins/Notification.js'
import { ServerApi, prefixWithFormatID } from '../utils.js'
import { mapState } from 'vuex'

function humanReadableSeconds(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds / 60) % 60;
  const s = Math.floor(seconds) % 60;
  let str = '';
  if (h > 0) str += h + '时';
  if (m > 0) str += m + '分';
  str += s + '秒';
  return str;
}

export default {
  name: 'WorkDetails',

  mixins: [NotifyMixin],

  components: {
    CoverSFW,
    WriteReview,
    EditMeta
  },

  props: {
    metadata: {
      type: Object,
      required: true
    }
  },

  data() {
    return {
      rating: 0,
      userMarked: false,
      progress: '',
      showReviewDialog: false,
      showEditMetaDialog: false,
      showTags: true,
      showDeleteDialog: false,
      deleteTab: 'keepFiles',
      fileInfo: null,
      fileInfoLoading: false
    }
  },

  computed: {
    sortedRatings: function() {
      function compare(a, b) {
        return (a.review_point > b.review_point) ? -1 : 1;
      }
      return this.metadata.rate_count_detail.slice().sort(compare);
    },

    dlsiteCode() {
      return prefixWithFormatID(this.metadata.id);
    },

    totalDuration() {
      return this.metadata.memo && this.metadata.memo.totalDuration
        ? this.metadata.memo.totalDuration
        : null;
    },

    ...mapState('AudioPlayer', [
      'playing',
      'playWorkId'
    ]),
  },

  watch: {
    // 需要用watch因为父component pages/work.vue是先用空值初始化的
    metadata (newMetaData) {
      if (newMetaData.userRating) {
        this.userMarked = true;
        this.rating = newMetaData.userRating;
      } else {
        this.userMarked = false;
        this.rating = newMetaData.rate_average_2dp || 0;
      }
      this.progress = newMetaData.progress;

      // 极个别作品没有标签
      if (newMetaData.tags && newMetaData.tags[0].name === null) {
        this.showTags = false;
      }
    },
  },

  methods: {
    humanReadableSeconds,

    setProgress (newProgress) {
      this.progress = newProgress;
      const submitPayload = {
        'user_name': this.$store.state.User.name, // 用户名不会被后端使用
        'work_id': this.metadata.id,
        'progress': newProgress
      };
      this.submitProgress(submitPayload);
    },

    submitProgress (payload) {
      const params = {
        starOnly: false,
        progressOnly: true
      }
      this.$axios.put('/api/review', payload, {params})
        .then((response) => {
          this.showSuccNotif(response.data.message);
          this.$emit('reset');
        })
        .catch((error) => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    setRating (newRating) {
      const submitPayload = {
        'user_name': this.$store.state.User.name, // 用户名不会被后端使用
        'work_id': this.metadata.id,
        'rating': newRating
      };
      this.submitRating(submitPayload);
    },

    submitRating (payload) {
      this.$axios.put('/api/review', payload)
        .then((response) => {
          this.showSuccNotif(response.data.message);
          this.$emit('reset');
        })
        .catch((error) => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    processReview () {
      this.showReviewDialog = false;
    },

    resumeThisHistroy() {
      this.$emit("resumeHistroy")
    },

    clearThisHistroy() {
      this.$q.dialog({
        title: '注意',
        message: '确定要删除这个作品的播放历史吗？',
        cancel: "取消",
        ok: "确定"
      }).onOk(async () => {
        this.$axios.delete('/api/histroy', { data: { work_id: this.metadata.id } })
          .then((_) => {
            this.$q.notify("删除历史成功")
          })
          .catch((err) => {
            this.$q.notify("删除历史失败：", err.message)
            console.error(err)
          })
      })
    },

    async scanWorkFile() {
      try {
        const response = await this.$axios.post(`/api/work/scan/${this.metadata.id}`);
        if (response.data.memo) {
          this.$router.go(0);
        }
      } catch(err) {
        console.error(err);
        this.showErrNotif(err.message || err);
      }
    },

    async recoverOriginCover() {
      try {
        let result = await ServerApi.recoverEditImg(this.metadata.id, 'main');
        if (!result.success) {
          this.showErrNotif('recover main cover failed');
          return;
        }
        result = await ServerApi.recoverEditImg(this.metadata.id, 'sam');
        if (!result.success) {
          this.showErrNotif('recover sam cover failed');
          return;
        }
        this.$router.go(0);
      } catch (err) {
        console.error(err);
        this.showErrNotif(err.message || err);
      }
    },

    async fixGBKShiftJISEncodingBugImpl() {
      try {
        const response = await this.$axios.post(`/api/work/fix/gbk/${this.metadata.id}`);
        if (response.data.memo) {
          this.$router.go(0);
        }
      } catch (err) {
        console.error(err);
        this.showErrNotif(err.message || err);
      }
    },

    fixGBKShiftJISEncodingBug(secondWarning) {
      secondWarning = secondWarning || false;
      this.$q.dialog({
        title: secondWarning
          ? '二次警告！此操作执行后将无法回退修改'
          : '警告！此操作执行后将无法回退修改',
        message: secondWarning
          ? '你确定你知道在做什么吗？这个功能没有单独文件的乱码检测，而是强制所有文件名称转换编码，如果存在正常文件名字，则正常文件名字会被改乱掉，无法修复，请一定确保这个作品文件夹下只有乱码文件，因此造成的任何数据丢失，本软件概不负责'
          : '乱码修复功能，解决ShiftJIS编码文件名在GBK环境下出现的乱码，此功能将作用于这个作品内部的所有子文件，包括递归的子文件夹，但是不包括最顶层的文件夹名字（就是顶层那个带RJ****文件夹名不会变，反正你也看不到这个文件夹的名字），所有作品文件夹内部文件的名字将会被修改，如果存在正常的文件名，则这个正常的文件名会被修改成错误的，请确保这个作品中只有乱码文件，然后再点击确定修改，无法保证的话，请勿使用本功能',
        ok: {
          label: secondWarning ? '我知道，确认修改' : '确认修改',
          color: 'negative'
        },
        cancel: {
          label: '取消',
          color: 'secondary'
        }
      }).onOk(() => {
        if (secondWarning) {
          this.fixGBKShiftJISEncodingBugImpl();
        } else {
          this.fixGBKShiftJISEncodingBug(true);
        }
      });
    },

    openDeleteDialog() {
      this.showDeleteDialog = true;
      this.deleteTab = 'keepFiles';
      this.fileInfo = null;
      this.fileInfoLoading = true;
      this.fetchFileInfo();
    },

    async fetchFileInfo() {
      this.fileInfoLoading = true;
      try {
        const response = await this.$axios.get(`/api/work/${this.metadata.id}/fileinfo`);
        this.fileInfo = response.data;
      } catch (error) {
        console.error('获取文件信息失败:', error);
        this.fileInfo = null;
      } finally {
        this.fileInfoLoading = false;
      }
    },

    async confirmDeleteWork() {
      const deleteFiles = this.deleteTab === 'deleteFiles';
      try {
        const response = await this.$axios.delete(`/api/work/${this.metadata.id}`, {
          params: { deleteFiles }
        });
        this.showDeleteDialog = false;
        this.showSuccNotif(response.data.message || '删除成功');
        this.$router.push('/works');
      } catch (error) {
        console.error('删除作品失败:', error);
        if (error.response && error.response.data && error.response.data.error) {
          this.showErrNotif(error.response.data.error);
        } else {
          this.showErrNotif(error.message || '删除失败');
        }
      }
    }
  }
}
</script>
