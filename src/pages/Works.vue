<template>
  <div>
    <!--没有搜索的情况下，显示最近播放作品-->
    <RecentWorks v-if="enableShowRecent && !isAdvanceSearch && searchMetas.length == 0" />

    <!--
      TODO: 当前版本的quasar的input在iOSsafari中输入中文时有bug，
      拼音也会被更新到data中，看了一下quasar官网的demo是没有这个问题的（版本不明），
      用原生的input组件也没有问题，应该是这个项目里quasar版本太老，有些bug，
      以后升级quasar版本试试能不能解决这个问题
    -->
    <div v-if="isAdvanceSearch" class="q-pa-md q-full-width row items-stretch" style="position: relative">
      <q-select
        class="col-2"
        option-value="value"
        option-label="label"
        emit-value
        map-options
        :options="searchMetaOptions"
        dense
        outlined
        v-model="searchMetaType"
      />
      <q-input
        class="col-10"
        outlined
        dense
        autofocus
        label="关键字"
        :hint="advanceSearchBarHint"
        v-model="editKeyword"
        @keyup.enter="onAddAdvanceSearchKeyword"
        @focus="enableShowCandidates"
        @blur="disableShowCandidates"
      >
        <template v-slot:append>
          <q-btn round dense flat icon="add" @click="onAddAdvanceSearchKeyword"/>
        </template>
      </q-input>

      <div v-if="candidatesMeta.length > 0" ref="candidatesEl" class="advance-search-popover">
        <q-badge class="q-ma-xs" v-for="meta in candidatesMeta" :key="meta.t + '_' + meta.d">
          <q-icon class="q-mx-xs" :name="searchMetaIconName(meta.t)" color="white"/>
          {{ meta.name }} : {{ meta.count }}
          <q-btn
            class="q-ml-sm search-tag-close-btn"
            padding="xs"
            round
            flat
            size="xs"
            icon="add"
            @click="onAddMetaData(meta)"
          />
        </q-badge>
      </div>
    </div>

    <div class="q-mt-lg q-ml-md row items-center">
      <span class="text-h5 text-weight-regular q-pa-xs relative-position">
        {{pageTitle}}
        <q-badge color="secondary" floating>{{pagination.totalCount}}</q-badge>
      </span>
      <div v-if="isAdvanceSearch"><!--高级搜索模式的多关键字展示-->
        <q-badge class="q-ma-xs" v-for="meta,index in advanceSearchKeywords" :key="meta.t + '_' + meta.d">
          <q-icon class="q-mx-xs" :name="searchMetaIconName(meta.t)" color="white"/>
          {{ meta.name }}
          <q-btn
            class="q-ml-sm search-tag-close-btn"
            padding="xs"
            round
            flat
            size="xs"
            icon="close"
            @click="removeAdvanceSearchKeyword(index)"
          />
        </q-badge>
      </div>
      <div v-else> <!--普通搜索模式的信息展示-->
        <q-badge class="q-ma-xs" v-for="meta, index in searchMetas" :key="meta">{{ index == 0 ? "":"," }} {{ meta }}</q-badge>
      </div>
    </div>

    <div class="row justify-between q-mb-md q-mx-sm">
      <!-- 排序属性 -->
      <q-select
        dense
        rounded
        outlined
        bg-color=""
        transition-show="scale"
        transition-hide="scale"
        v-model="sortCategoryOption"
        :options="sortCategoryOptions"
        :option-label="humanReadableLabel"
        label="排序属性"
        class="col-auto"
      />

      <!-- 年龄分级 -->
      <q-select
        dense
        rounded
        outlined
        bg-color=""
        transition-show="scale"
        transition-hide="scale"
        v-model="nsfwOption"
        :options="nsfwOptions"
        :option-label="humanReadableLabel"
        label="年龄分级"
        class="col-auto"
      />

      <!-- 字幕筛选 -->
      <q-select
        dense
        rounded
        outlined
        bg-color=""
        style="min-width: 8rem;"
        transition-show="scale"
        transition-hide="scale"
        v-model="lyricOption"
        :options="lyricOptions"
        option-value="value"
        option-label="label"
        option-disable="inactive"
        label="字幕筛选"
        multiple
        use-chips
        emit-value
        map-options
        class="col-auto"
      />

      <!-- 排序顺序 -->
      <q-toggle v-model="sortInDesc" :label="sortInDesc ? '降序' : '升序'" />

      <!-- 切换显示模式按钮 -->
      <q-btn-toggle
        dense
        spread
        rounded
        v-model="listMode"
        toggle-color="primary"
        color="white"
        text-color="primary"
        :options="[
          { icon: 'apps', value: false },
          { icon: 'list', value: true }
        ]"
        style="width: 85px;"
        class="col-auto"
      />

      <q-btn-toggle
        dense
        spread
        rounded
        v-model="showLabel"
        toggle-color="primary"
        color="white"
        text-color="primary"
        :options="[
          { icon: 'label', value: true },
          { icon: 'label_off', value: false }
        ]"
        style="width: 85px;"
        class="col-auto"
        v-if="$q.screen.width > 700 && listMode"
      />

      <q-btn-toggle
        dense
        spread
        rounded
        :disable="$q.screen.width < 1120"
        v-model="detailMode"
        toggle-color="primary"
        color="white"
        text-color="primary"
        :options="[
          { icon: 'zoom_in', value: true },
          { icon: 'zoom_out', value: false },
        ]"
        style="width: 85px;"
        class="col-auto"
        v-if="$q.screen.width > 700 && !listMode"
      />

    </div>

    <div :class="`row justify-center ${listMode ? 'list' : 'q-mx-md'}`">
      <q-infinite-scroll
        ref="infiniteScroller"
        @load="onLoad"
        :offset="250"
        :disable="disableInfiniteScroller || workListMode === WorkListMode.PAGINATION"
        class="col"
      >
        <!--分页模式顶部的页码跳转-->
        <div v-if="workListMode === WorkListMode.PAGINATION" class="row justify-center q-py-lg">
          <Pagination
            :model-value="isLoading ? pagination.currentPage + 1 : pagination.currentPage"
            :max="Math.ceil(pagination.totalCount / pagination.pageSize)"
            @goto="gotoPage"
          />
        </div>

        <!--分页模式加载中的提示-->
        <div v-if="workListMode === WorkListMode.PAGINATION && isLoading" class="row justify-center q-py-lg">
          <q-spinner-dots color="primary" size="40px" />
        </div>

        <q-list v-if="listMode" bordered separator class="shadow-2">
          <WorkListItem v-for="work in works" :key="work.id" :metadata="work" :showLabel="showLabel && $q.screen.width > 700" />
        </q-list>

        <!--旧式的workCard展示-->
        <div v-else-if="oldWorkCardUIStyle" class="row q-col-gutter-x-md q-col-gutter-y-lg">
          <div class="col-xs-12 col-sm-6 col-md-4" v-for="work in works" :key="work.id"
            :class="detailMode ? 'col-lg-3 col-xl-2': 'col-lg-2 col-xl-2'"
          >
            <OldWorkCard :metadata="work" :thumbnailMode="!detailMode" class="fit"/>
          </div>
        </div>

        <!--解决android平台hover事件不像safari那样及时响应的问题，需要手动添加触摸响应时间-->
        <div v-else-if="$q.platform.is.android && $q.platform.has.touch" class="row q-col-gutter-x-md q-col-gutter-y-lg">
          <div class="col-xs-12 col-sm-6 col-md-4" v-for="work in works" :key="work.id"
            @touchstart="()=>onWorkCardTouch(work.id)"
            :class="detailMode ? 'col-lg-3 col-xl-2': 'col-lg-2 col-xl-2'"
            :style="{ '--sim-hover-work-card': work.id === touchedWorkId ? '1' : '0'}"
          >
            <WorkCard :metadata="work" :thumbnailMode="!detailMode" class="fit"/>
          </div>
        </div>

        <!--正常的workCard展示-->
        <div v-else class="row q-col-gutter-x-md q-col-gutter-y-lg">
          <div class="col-xs-12 col-sm-6 col-md-4" v-for="work in works" :key="work.id"
            :class="detailMode ? 'col-lg-3 col-xl-2': 'col-lg-2 col-xl-2'"
            style="--sim-hover-work-card: 0"
          >
            <WorkCard :metadata="work" :thumbnailMode="!detailMode" class="fit"/>
          </div>
        </div>

        <!--分页模式底部的页码跳转-->
        <div v-if="workListMode === WorkListMode.PAGINATION && !isLoading && works.length > 4" class="row justify-center q-py-lg">
          <Pagination
            :model-value="isLoading ? pagination.currentPage + 1 : pagination.currentPage"
            :max="Math.ceil(pagination.totalCount / pagination.pageSize)"
            @goto="gotoPage"
          />
        </div>

        <template v-slot:loading>
          <div class="row justify-center q-my-md">
            <q-spinner-dots color="primary" size="40px" />
          </div>
        </template>
      </q-infinite-scroll>
    </div>
  </div>
</template>

<script>
import WorkCard from 'components/WorkCard.vue'
import WorkListItem from 'components/WorkListItem.vue'
import NotifyMixin from '../mixins/Notification.js'
import RecentWorks from 'src/components/RecentWorks.vue'
import Pagination from 'src/components/Pagination.vue'
import { mapState } from 'pinia'
import { useAudioPlayerStore } from 'stores/audioPlayer.js'
import OldWorkCard from 'src/components/OldWorkCard.vue'
import { debounce } from 'quasar'
import { AdvanceSearchCondType, WorkListMode } from '../utils.js'

export default {
  name: 'Works',

  mixins: [NotifyMixin],

  components: {
    WorkCard,
    OldWorkCard,
    WorkListItem,
    RecentWorks,
    Pagination,
  },

  data () {
    const data = {
      WorkListMode,
      listMode: false,
      showLabel: true,
      detailMode: true,
      disableInfiniteScroller: false,
      isLoading: false,
      works: [],
      pageTitle: '',
      searchMetas: [],
      page: 1,
      pagination: { currentPage:0, pageSize:12, totalCount:0 },
      seed: 7, // random sort

      // 排序种类，例如可以选择按照发售日期来排序结果
      sortCategoryOption: "release",
      sortCategoryOptions: ["release", "rating", "dl_count", "price", "rate_average_2dp", "review_count", "id", "created_at", "random"],

      nsfwOption: "nsfw_0",
      nsfwOptions: ["nsfw_0", "nsfw_1", "nsfw_2"], // nsfw_0无年龄限制，nsfw_1全年龄，nsfw_2十八禁

      lyricOption: [], // 注意，这个选项可多选，但是clear的时候，quasar可能会将其设置为null，需要特别注意

      // 排序顺序，true表示降序，false表示升序
      sortInDesc: true,

      touchedWorkId: 0, // 用来解决android移动端设备没有hover事件导致workCard不能跟随手指显示标签的问题

      /*
        advanceSearchKeywords
        [
          {t: 1, d: "異世界"}, // 模糊匹配，目前只实现这一个
          {t: 2, d: "恋鈴桃歌"}, // 声优匹配，实际搜索字段在前端就要变成id
          {t: 3, d: "环绕音"}, // 标签匹配，实际搜索字段在前端就要变成id
          {t: 3, d: "治愈"}, // 标签匹配，实际搜索字段在前端就要变成id
          {t: 4, d: "Delivery Voice"}, // 社团匹配，实际搜索字段在前端就要变成id
        ]
      */
      editKeyword: "",
      advanceSearchKeywords: [],
      isAdvanceSearch: false,
      focusInAdvanceSearch: false,
      AdvanceSearchCondType: Object.assign({}, AdvanceSearchCondType, { CODE: 5 }),
      searchMetaType: AdvanceSearchCondType.FUZZY,
      searchMetaOptions: [
        { value: AdvanceSearchCondType.FUZZY, label: "自动" },
        { value: AdvanceSearchCondType.VA, label: "声优" },
        { value: AdvanceSearchCondType.TAG, label: "标签" },
        { value: AdvanceSearchCondType.CIRCLE, label: "社团" },
      ],
      candidates: []
    };

    if (localStorage.sortCategoryOption) {
      data.sortCategoryOption = localStorage.sortCategoryOption;
    }
    if (localStorage.nsfwOption) {
      data.nsfwOption = localStorage.nsfwOption;
    }
    if (localStorage.lyricOption) {
      data.lyricOption = JSON.parse(localStorage.lyricOption);
    }
    if (localStorage.sortInDesc) {
      data.sortInDesc = (localStorage.sortInDesc === 'true');
    }
    if (localStorage.showLabel) {
      data.showLabel = (localStorage.showLabel === 'true');
    }
    if (localStorage.listMode) {
      data.listMode = (localStorage.listMode === 'true');
    }
    if (localStorage.detailMode) {
      data.detailMode = (localStorage.detailMode === 'true');
    }
    if (localStorage.advanceSearchKeywords) {
      data.advanceSearchKeywords = JSON.parse(localStorage.advanceSearchKeywords || "[]");
    }

    return data
  },

  created () {
    this.refreshPageTitle();
    this.seed = Math.floor(Math.random() * 100);
    this.reset = debounce(this.reset, 100, false)
  },

  mounted() {
    this.checkAdvanceSearchMode()
    this.polishQueryParam()

    if (this.workListMode === WorkListMode.PAGINATION) {
      const page = parseInt(this.$route.query.page);
      this.reset(page)
    }
  },

  computed: {
    urlDetect () {
      const query = this.$route.query
      if (query.circleId) {
        return `/api/circles/${this.$route.query.circleId}/works`
      } else if (query.tagId) {
        return `/api/tags/${this.$route.query.tagId}/works`
      } else if (query.vaId) {
        return `/api/vas/${this.$route.query.vaId}/works`
      } else if (query.keyword || this.isAdvanceSearch || this.$route.path == "/search") {
        // keyword should pass in as a query param later
        return `/api/search`
      } else {
        return '/api/works'
      }
    },

    advanceSearchBarHint() {
      if (this.searchMetaType === AdvanceSearchCondType.FUZZY) {
        if (this.editKeyword === "") return "模糊关键字搜索，可搜索作品名、声优名、标签名、社团名"
        else if (this.isAdvanceKeywordCode) return "检测到番号，回车后将忽略其他条件，直接搜索番号"
        else return "按回车或者右侧加号添加，或者点击下方过滤结果的加号直接筛选对应条件"
      } else if (this.searchMetaType === AdvanceSearchCondType.VA) {
        return "搜索声优，点击下方过滤结果的加号以添加条件，请勿直接回车添加"
      } else if (this.searchMetaType === AdvanceSearchCondType.TAG || this.searchMetaType === AdvanceSearchCondType.CIRCLE) {
        return "搜索标签，点击下方过滤结果的加号以添加条件，请勿直接回车添加"
      }
      return ""
    },

    lyricOptions() {
      const options = [
        { value: "lyric_local", label: "本地歌词", inactive: false },
        { value: "lyric_ai", label: "AI歌词", inactive: false },
        { value: "lyric_no", label: "无歌词", inactive: false },
      ];
      return options
    },

    isAdvanceKeywordCode() {
      return /^(RJ|BJ|VJ)?(\d{6}|\d{8})$/i.test(this.editKeyword)
    },

    candidatesMeta() {
      if (this.searchMetaType == AdvanceSearchCondType.FUZZY && this.editKeyword === "") return []

      const candidates = this.searchMetaType == AdvanceSearchCondType.FUZZY
        ? this.candidates
        : this.candidates.filter(meta => meta.t === this.searchMetaType);

      const filtered = candidates.filter(meta => meta.name.toLowerCase().includes(this.editKeyword.toLowerCase()));
      return filtered
    },

    isShowCandidates() {
      return this.isAdvanceSearch && this.focusInAdvanceSearch
    },

    ...mapState(useAudioPlayerStore, [
      'oldWorkCardUIStyle',
      'enableShowRecent',
      'workListMode',
    ]),
  },

  // keep-alive hooks
  // <keep-alive /> is set in MainLayout
  activated () {
    this.disableInfiniteScroller = false
  },

  deactivated () {
    this.disableInfiniteScroller = true
  },

  watch: {
    urlDetect () {
      this.reset()
    },

    sortCategoryOption (v) {
      localStorage.sortCategoryOption = v;
      this.reset()
    },

    nsfwOption (v) {
      localStorage.nsfwOption = v;
      this.reset()
    },

    lyricOption (v) {
      if (v !== null) {
        if (v.length > 1 && v.includes("no_lyric")) {
          this.$nextTick(() => {
            this.lyricOption = ["no_lyric"]
          })
        } else {
          localStorage.lyricOption = JSON.stringify(v, null, 0);
          this.reset()
        }
      } else {
        this.$nextTick(() => {
          this.lyricOption = []
        })
      }
    },

    sortInDesc (v) {
      localStorage.sortInDesc = v;
      this.reset()
    },

    showLabel (newLabelSetting) {
      localStorage.showLabel = newLabelSetting;
    },

    listMode (newListModeSetting) {
      localStorage.listMode = newListModeSetting;
    },

    detailMode(newModeSetting) {
      localStorage.detailMode = newModeSetting;
    },

    advanceSearchKeywords(newValue) {
      localStorage.advanceSearchKeywords = JSON.stringify(newValue, null, 0)
      this.reset()
    },

    '$route.name': {
      handler: function() {
        // 高级搜索模式通过route.name进行判断，因此当这个属性变化的时候，需要及时更新状态，
        // 否则会出现url跳转到聚合搜索页面后，页面没有更新的问题，
        // 因为被vue复用组件了，需要重新检查一遍
        this.checkAdvanceSearchMode()
      },
      deep: true,
      immediate: true
    },

    '$route.query.keyword'() {
      this.reset()
    },

    '$route.query.page'() {
      this.polishQueryParam()
      if (this.workListMode === WorkListMode.PAGINATION) {
        const page = parseInt(this.$route.query.page);
        this.reset(page)
      }
    },
  },

  methods: {
    async onLoad (index, done) {
      const stop = await this.requestWorksQueue()
      done(stop)
    },

    async requestWorksQueue () {
      this.isLoading = true
      const params = {
        page: this.pagination.currentPage + 1 || 1,
        sort: this.sortInDesc ? "desc" : "asc",
        order: this.sortCategoryOption,
        nsfw: parseInt(this.nsfwOption.replace("nsfw_", "")), // 'nsfw_0' => 0, 'nsfw_1' => 1, 'nsfw_2' => 2
        lyric: this.lyricOption === null ? "" : this.lyricOption.map(o => o.replace("lyric_", "")).sort().join("_"), // ["lyric_local", "lyric_ai"] => "ai_local"
        seed: this.seed,
        isAdvance: this.isAdvanceSearch ? 1 : 0
      }

      if (this.isAdvanceSearch) {
        params.keyword = JSON.stringify(this.advanceSearchKeywords, null, 0)
      } else if (this.$route.query.keyword) {
        params.keyword = this.$route.query.keyword
      }

      try {
        const response = await this.$axios.get(this.urlDetect, { params })
        const works = response.data.works

        if (this.workListMode === WorkListMode.PAGINATION) {
          this.works = works.concat()
        } else {
          this.works = (params.page === 1) ? works.concat() : this.works.concat(works)
        }
        this.pagination = response.data.pagination
        this.isLoading = false

        return this.works.length >= this.pagination.totalCount
      } catch (error) {
        if (error.response) {
          // 请求已发出，但服务器响应的状态码不在 2xx 范围内
          if (error.response.status !== 401) {
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          }
        } else {
          this.showErrNotif(error.message || error)
        }
        this.isLoading = false
        return true
      }
    },

    refreshPageTitle () {
      if (this.$route.query.circleId || this.$route.query.tagId || this.$route.query.vaId) {
        let url = '', restrict = ''
        if (this.$route.query.circleId) {
          restrict = 'circles'
          url = `/api/${restrict}/${this.$route.query.circleId}`
        } else if (this.$route.query.tagId) {
          restrict = 'tags'
          url = `/api/${restrict}/${this.$route.query.tagId}`
        } else {
          restrict = 'vas'
          url = `/api/${restrict}/${this.$route.query.vaId}`
        }

        this.$axios.get(url)
          .then((response) => {
            const name = response.data.name
            let pageTitle

            switch (restrict) {
              case 'tags':
                pageTitle = '搜索标签：'
                break
              case 'vas':
                pageTitle = '搜索声优：'
                break
              case 'circles':
                pageTitle = '社团作品：'
                break
            }
            // pageTitle += name || ''
            this.searchMetas = [name]
            this.pageTitle = pageTitle
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
      } else if (this.$route.query.keyword) {
        this.pageTitle = '搜索关键字：';
        this.searchMetas = [this.$route.query.keyword];
      } else if (this.isAdvanceSearch) {
        this.pageTitle = '聚合搜索：'

      } else {
        this.pageTitle = '所有作品'
        this.searchMetas = [];
      }
    },

    async reset (page) {
      if (this.workListMode === WorkListMode.WATERFALL) {
        this.seed = Math.floor(Math.random() * 100);
        this.stopLoad = true
        this.refreshPageTitle()
        this.pagination = { currentPage:0, pageSize:12, totalCount:0 }
        this.works = []
        this.$refs.infiniteScroller.reset()
        this.$refs.infiniteScroller.poll()
        this.$refs.infiniteScroller.trigger()
        this.$refs.infiniteScroller.resume()
      } else {
        const isDefault = !page
        if (isDefault) page = 1
        if (!page) {
          console.warn("分页无效：", page)
          return
        }

        this.seed = Math.floor(Math.random() * 100);
        this.stopLoad = true
        this.works = []
        this.pagination = {
          currentPage: page - 1,
          pageSize: 12,
          totalCount: isDefault ? 0 : this.pagination.totalCount
        }
        await this.requestWorksQueue()
      }
    },

    async gotoPage (page) {
      await this.$router.push({
        query: {
          ...this.$route.query,
          page: page
        }
      })
      await this.reset(page)
    },

    polishQueryParam() {
      if (this.workListMode == WorkListMode.PAGINATION) {
        if (!this.$route.query.page) {
          this.$router.replace({
            query: {
              ...this.$route.query,
              page: 1
            }
          })
        }
      } else if (this.$route.query.page) {
        const query = Object.assign({}, this.$route.query)
        delete query.page
        this.$router.replace({
          query: query
        })
      }
    },

    // 将一些标签名称转换成可阅读的文字
    // 例如排序属性中，有release作为标记，release通常用来直接传递给服务器，
    // 通过这个函数可以将release转换成更加可阅读的文字标签“发售日期”
    humanReadableLabel(label) {
      switch(label) {
        case "release": return "发售日期";
        case "rating": return "我的评价";
        case "dl_count": return "售出数量";
        case "price": return "售出价格";
        case "rate_average_2dp": return "听众评分";
        case "review_count": return "评论数量";
        case "id": return "作品番号";
        case "created_at": return "添加时间";
        case "random": return "随机排序";
        case "nsfw_0": return "所有分级";
        case "nsfw_1": return "全年龄";
        case "nsfw_2": return "十八禁";
        default: return label;
      }
    },

    onWorkCardTouch(id) {
      this.touchedWorkId = id;
      console.log('touch on work id = ', id);
    },

    async checkAdvanceSearchMode() {
      this.isAdvanceSearch = this.$route.name == "advance search";

      if (this.isAdvanceSearch && this.candidates.length === 0) {
        let candidates = [];
        const restricts = {
          vas: AdvanceSearchCondType.VA,
          tags: AdvanceSearchCondType.TAG,
          circles: AdvanceSearchCondType.CIRCLE,
        };

        for (let restrict of Object.keys(restricts)) {
          try {
            const list = (await this.$axios.get(`/api/${restrict}`)).data.slice();
            candidates = candidates.concat(
              list.sort((a, b) => b.count - a.count).map(item => ({
                d: item.id,
                name: item.name,
                count: item.count,
                t: restricts[restrict]
              }))
            )
          } catch (error) {
            console.warn("get meta candidates failed: ", restrict, error)
          }
        }

        this.candidates = candidates
      }
    },

    onAddAdvanceSearchKeyword() {
      const isCode = this.isAdvanceKeywordCode;
      if (!isCode && this.searchMetaType !== AdvanceSearchCondType.FUZZY) {
        this.showErrNotif("正在搜索声优、标签、社团，请勿回车或者点击加号，请直接点击下方列出来的可选项");
        return
      }

      const keyword = this.editKeyword.trim()
      if (keyword === "") {
        this.showErrNotif("无法添加空白的关键字");
        return;
      }

      const cond = {
        t: isCode ? 5 : AdvanceSearchCondType.FUZZY, // 5 => AdvanceSearchCondType.CODE
        d: keyword,
        name: keyword
      }

      if (this.advanceSearchKeywords.find(kw => kw.t == cond.t && kw.d == cond.d) === undefined) {
        this.advanceSearchKeywords.push(cond)
        this.editKeyword = ""
        this.reset()
      } else {
        this.showErrNotif("关键字重复，添加失败")
      }
    },

    onAddMetaData(meta) {
      if (this.advanceSearchKeywords.find(kw => kw.t === meta.t && kw.d === meta.d) === undefined) {
        this.advanceSearchKeywords.push({
          t: meta.t,
          d: meta.d,
          name: meta.name
        })
      } else {
        this.showErrNotif("搜索条件重复，添加失败")
      }
    },

    removeAdvanceSearchKeyword(index) {
      this.advanceSearchKeywords.splice(index, 1);
    },

    searchMetaIconName(type) {
      switch(type) {
        case AdvanceSearchCondType.FUZZY: return "description";
        case AdvanceSearchCondType.VA: return "mic";
        case AdvanceSearchCondType.TAG: return "label";
        case AdvanceSearchCondType.CIRCLE: return "groups";
        case 5: return "fingerprint"; // AdvanceSearchCondType.CODE
        default: return "warning";
      }
    },

    enableShowCandidates() {
      this.focusInAdvanceSearch = true
    },

    disableShowCandidates() {
      setTimeout(() => {
        this.focusInAdvanceSearch = false
      }, 500)
    }

  },
}
</script>

<style lang="scss" scoped>
  .list {
    // 宽度 >= $breakpoint-sm-min
    @media (min-width: $breakpoint-sm-min) {
      padding: 0px 20px;
    }
  }

  .work-card {
    // 宽度 > $breakpoint-xl-min
    @media (min-width: $breakpoint-md-min) {
      width: 560px;
    }
  }
.search-tag-close-btn {
  background: rgba(144, 144, 144, 0.4);
  color: white
}

.advance-search-popover {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 2000;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  padding: 8px 16px;
  max-height: 300px;
  overflow-y: auto;

  .q-badge {
    cursor: default;
  }
}

.body--dark .advance-search-popover {
  background: rgba(30, 30, 30, 0.95);
}
</style>
