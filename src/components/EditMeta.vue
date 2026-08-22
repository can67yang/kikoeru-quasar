<template>
  <q-card>
    <q-card-section class="q-pb-sm">
      <div class="text-body1">修改作品信息</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <div style="min-width: 300px;">
        <q-input filled label="编辑标题" v-model="editTitle" />
      </div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-chip size="md" color="primary" class="shadow-4">
        {{ editCircle.name }}
      </q-chip>
      <q-btn round color="deep-orange" icon="swap_horiz" size="sm" class="q-ml-lg" @click="changeCircle" />
    </q-card-section>

    <q-card-section class="q-pt-none">
      <div class="q-px-none q-py-sm">
        <q-chip
          v-for="(tag, index) in editTags"
          :key="tag.name"
          size="md"
          color="secondary"
          class="shadow-4"
          removable
          @remove="removeTagAt(index)"
        >
          {{ tag.name }}
        </q-chip>
        <q-btn round color="deep-orange" icon="add" size="sm" class="q-ml-lg" @click="addTag" />
      </div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <div class="q-px-none q-pt-sm q-py-sm">
        <q-chip
          v-for="(va, index) in editVas"
          :key="va.name"
          square
          size="md"
          color="accent"
          text-color="white"
          icon="mic"
          class="shadow-4"
          removable
          @remove="removeVaAt(index)"
        >
          {{ va.name }}
        </q-chip>
        <q-btn round color="deep-orange" icon="add" size="sm" class="q-ml-lg" @click="addVa" />
      </div>
    </q-card-section>

    <div class="row justify-end">
      <q-card-actions align="right" class="text-primary">
        <q-btn v-close-popup label="确定" @click="confirmChange()" />
        <q-btn v-close-popup label="取消" text-color="negative" @click="() => {}" />
      </q-card-actions>
    </div>

    <q-dialog v-model="showCandidateDialog">
      <q-card style="width: 70vw; max-height: 60vh;">
        <q-card-section>
          <div class="text-body1">{{ searchTitle }}</div>
          <q-input label="搜索" v-model="searchCandidate">
            <template v-slot:append v-if="fetchCandidates.length === 0">
              <q-btn @click="chooseCandidate({ name: searchCandidate, id: 0 })">增加自定义</q-btn>
            </template>
          </q-input>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-scroll-area style="height: 40vh;">
            <q-list dense bordered padding class="rounded-borders">
              <q-item
                v-for="candidate in fetchCandidates"
                :key="candidate.id"
                clickable
                v-ripple
                @click="chooseCandidate(candidate)"
              >
                <q-item-section>{{ candidate.name }}</q-item-section>
              </q-item>
            </q-list>
          </q-scroll-area>
        </q-card-section>

        <div class="row justify-end">
          <q-card-actions align="right" class="text-primary">
            <q-btn v-close-popup label="取消" text-color="negative" @click="() => {}" />
          </q-card-actions>
        </div>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script>
import NotifyMixin from '../mixins/Notification.js'
import { ServerApi } from '../utils.js'

const defaultNVA = {
  id: 0,
  name: 'N/A'
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export default {
  name: 'EditMeta',

  mixins: [NotifyMixin],

  props: {
    workid: {
      type: Number,
      required: true
    },
    metadata: {
      type: Object,
      default: null
    }
  },

  async created() {
    const circles = await ServerApi.getCandidates('circle');
    const vas = await ServerApi.getCandidates('va');
    const tags = await ServerApi.getCandidates('tag');
    this.candidate = {
      circles,
      vas,
      tags
    }
  },

  mounted() {
    this.editTitle = this.metadata.title;

    if (this.metadata.tags && this.metadata.tags.length > 0) {
      this.editTags = deepClone(this.metadata.tags);
    } else {
      this.editTags = [];
    }

    if (this.metadata.vas && this.metadata.vas.length > 0) {
      this.editVas = deepClone(this.metadata.vas);
    } else {
      this.editVas = [];
    }
    if (this.editVas.length === 0) {
      this.editVas = [defaultNVA];
    }

    this.editCircle = this.metadata.circle;
  },

  data () {
    return {
      defaultNVA,
      showCandidateDialog: false,
      editTitle: '',
      editTags: [],
      editVas: [],
      editCircle: {
        id: 0,
        name: ''
      },
      candidate: {
        tags: [],
        vas: [],
        circles: []
      },
      showCandidateType: 'tags',
      searchTitle: '',
      searchCandidate: ''
    }
  },

  computed: {
    fetchCandidates() {
      const candidates = this.candidate[this.showCandidateType];
      if (this.searchCandidate === '') {
        return candidates;
      }
      return candidates.filter(candidate => candidate.name.includes(this.searchCandidate));
    }
  },

  methods: {
    async confirmChange() {
      try {
        const result = await ServerApi.saveEditMeta(this.workid, {
          title: this.editTitle,
          tags: this.editTags,
          vas: this.editVas,
          circle: this.editCircle
        });
        console.log('custom meta success: ', result);
        this.showSuccNotif('自定义meta成功，2秒后刷新页面');
        setTimeout(() => {
          this.$router.go(0);
        }, 2000);
      } catch (error) {
        console.error('custom meta failed: ', error);
        this.showErrNotif('自定义meta失败: ' + error.message);
      }
    },

    changeCircle() {
      this.showCandidateType = 'circles';
      this.searchTitle = '替换社团';
      this.searchCandidate = '';
      this.showCandidateDialog = true;
    },

    addTag() {
      this.showCandidateType = 'tags';
      this.searchTitle = '添加标签';
      this.searchCandidate = '';
      this.showCandidateDialog = true;
    },

    addVa() {
      this.showCandidateType = 'vas';
      this.searchTitle = '添加声优';
      this.searchCandidate = '';
      this.showCandidateDialog = true;
    },

    removeVaAt(index) {
      if (this.editVas.length != 1) {
        this.editVas = [...this.editVas.slice(0, index), ...this.editVas.slice(index + 1)];
      } else {
        this.showErrNotif('声优至少得有一个');
      }
    },

    removeTagAt(index) {
      this.editTags = [...this.editTags.slice(0, index), ...this.editTags.slice(index + 1)];
    },

    chooseCandidate(candidate) {
      if (this.showCandidateType == 'circles') {
        this.editCircle = candidate;
      } else if (this.showCandidateType == 'vas') {
        if (this.editVas.find(va => va.name == candidate.name)) {
          this.showErrNotif('项目已存在，无需重复添加');
        } else {
          this.editVas.push(candidate);
        }
      } else if (this.showCandidateType == 'tags') {
        if (this.editTags.find(tag => tag.name == candidate.name)) {
          this.showErrNotif('项目已存在，无需重复添加');
        } else {
          this.editTags.push(candidate);
        }
      }
      this.showCandidateDialog = false;
    }
  }
}
</script>
