<template>
  <div>
    <div class="text-h2">同步</div>

    <div class="q-pa-lg">
      <q-select
        v-model="selectRootFolder"
        label="存储库目录"
        :options="rootFolders"
        :option-value="opt => Object(opt) === opt && 'name' in opt ? opt.name : null"
        :option-label="opt => Object(opt) === opt && 'name' in opt ? opt.name + ': ' + opt.path : '- Null -'"
        :option-disable="opt => Object(opt) !== opt || opt.inactive === true"
      >
        <template v-slot:hint>
          保存路径：{{ selectRootFolder.path }}
        </template>
      </q-select>

      <q-input
        v-model="host"
        label="服务器地址"
        hint="服务器地址，http://xxxxx，末尾不要有斜杠"
        :rules="[val => !!val || 'require host']"
      />

      <q-input
        v-model="metaApi"
        label="meta请求模板"
      >
        <template v-slot:prepend>
          <q-btn
            round
            dense
            flat
            icon="refresh"
            @click="metaApi = defaultMetaApi"
          />
        </template>
      </q-input>

      <q-input
        v-model="trackApi"
        label="track请求模板"
      >
        <template v-slot:prepend>
          <q-btn
            round
            dense
            flat
            icon="refresh"
            @click="trackApi = defaultTrackApi"
          />
        </template>
      </q-input>

      <q-input
        v-model="filter"
        label="番号"
        hint="RJxxxxxxxx"
        :rules="[val => filterValidateRegex.test(val) || 'require code like RJxxxxxxxx or VJxxxxxx']"
        @change="onFilterSubmit()"
      >
        <template v-slot:append>
          <q-btn
            round
            dense
            flat
            icon="search"
            @click="onFilterSubmit()"
          />
        </template>
      </q-input>
    </div>

    <q-dialog
      v-model="showTrackList"
      seamless
    >
      <SyncTrackListEditor
        :tracks="tracks"
        @confirmSync="onConfirmSync"
      />
    </q-dialog>

    <SyncTaskListStatus />
  </div>
</template>

<script>
import { ServerApi } from '../../utils'
import NotifyMixin from '../../mixins/Notification.js'
import SyncTrackListEditor from '../../components/SyncTrackListEditor.vue'
import SyncTaskListStatus from '../../components/SyncTaskListStatus.vue'

const syncRootFolderName = 'syncRootFolderName'
const syncMetaApi = 'syncMetaApi'
const syncTrackApi = 'syncTrackApi'
const syncHost = 'syncHost'

export default {
  name: 'Syncer',

  components: {
    SyncTaskListStatus,
    SyncTrackListEditor
  },

  mixins: [NotifyMixin],

  data () {
    return {
      host: '',
      metaApi: '',
      trackApi: '',
      defaultMetaApi: '/api/workInfo/{code_for_the_work}',
      defaultTrackApi: '/api/tracks/{code_for_the_work}',
      filter: '',
      filterValidateRegex: /^[A-Za-z]{2}((\d{6})|(\d{8}))$/,
      selectRootFolder: null,
      rootFolders: [],
      showTrackList: false,
      tracks: []
    }
  },

  methods: {
    async onFilterSubmit () {
      try {
        const tracks = await ServerApi.getSyncInfo(this.host, this.metaApi, this.trackApi, this.filter.toUpperCase());
        console.log('syncer track list: ', tracks);
        this.tracks = tracks;
        this.showTrackList = true;
      } catch (error) {
        this.showErrNotif('get info failed: ' + error.message);
      }
    },

    async onConfirmSync (tracks) {
      console.log('confim sync: ', tracks);
      const taskId = await ServerApi.newSyncTask(this.host, this.filter.toUpperCase(), this.selectRootFolder.name, true, tracks);
      console.log('sync task id: ', taskId);
    }
  },

  watch: {
    selectRootFolder (newVal) {
      if (newVal && newVal.name) {
        this.$q.localStorage.set(syncRootFolderName, newVal.name);
      }
    },

    host (newVal) {
      if (newVal.endsWith('/')) {
        this.host = newVal.substring(0, newVal.length - 1);
      }
      this.$q.localStorage.set(syncHost, this.host);
    },

    metaApi (newVal) {
      this.$q.localStorage.set(syncMetaApi, newVal);
    },

    trackApi (newVal) {
      this.$q.localStorage.set(syncTrackApi, newVal);
    }
  },

  async mounted () {
    const config = await ServerApi.getServerConfig();
    console.log('rootFolders: ', config.rootFolders);
    this.rootFolders = config.rootFolders;

    let selectRootFolder = null;
    if (this.$q.localStorage.has(syncRootFolderName)) {
      const folderName = this.$q.localStorage.getItem(syncRootFolderName);
      selectRootFolder = config.rootFolders.filter(folder => folder.name === folderName)[0];
    }
    this.selectRootFolder = selectRootFolder || config.rootFolders[0];

    if (this.$q.localStorage.has(syncHost)) {
      this.host = this.$q.localStorage.getItem(syncHost);
    }

    if (this.$q.localStorage.has(syncMetaApi)) {
      this.metaApi = this.$q.localStorage.getItem(syncMetaApi);
    } else {
      this.metaApi = this.defaultMetaApi;
    }

    if (this.$q.localStorage.has(syncTrackApi)) {
      this.trackApi = this.$q.localStorage.getItem(syncTrackApi);
    } else {
      this.trackApi = this.defaultTrackApi;
    }
  },

  created () {}
}
</script>
