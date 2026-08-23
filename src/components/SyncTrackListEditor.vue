<template>
  <q-card style="width: 90vw; max-width: 90vw; height: 80vh; max-height: 80vh;">
    <q-card-section class="row justify-between items-center full-width">
      <div class="text-h5">同步文件选择</div>
      <div>
        <q-btn
          v-close-popup
          class="primary q-mr-lg"
          color="primary"
          @click="confirmSync()"
        >确认同步</q-btn>
        <q-btn
          v-close-popup
          color="red"
          icon="close"
        />
      </div>
    </q-card-section>

    <div v-if="selectedSize > 0">已选择 {{ formatBytes(selectedSize, 1) }}</div>

    <q-scroll-area style="height: 70%; max-width: 100%;">
      <q-tree
        class="q-px-lg"
        :nodes="internalTracks"
        default-expand-all
        node-key="relativePath"
        label-key="title"
        children-key="children"
      >
        <template v-slot:default-header="{ node }">
          <div class="row items-center justify-between full-width">
            <div>
              <q-checkbox
                :model-value="[false, 'maybe', true][node.selection]"
                @update:model-value="onClickNode(node)"
              />
              <span>{{ node.title }}</span>
            </div>
            <div class="row iterms-center justify-between col-2">
              <div v-if="node.type !== 'folder'">{{ getExtensionWithoutDot(node.title) }}</div>
              <div v-if="node.size > 0" style="width: 50pt;">{{ formatBytes(node.size, 1) }}</div>
            </div>
          </div>
        </template>
      </q-tree>
    </q-scroll-area>
  </q-card>
</template>

<script>
const Selection = {
  No: 0,
  Some: 1,
  Yes: 2
};

function clone (value) {
  return JSON.parse(JSON.stringify(value));
}

export default {
  name: 'SyncTrackListEditor',

  props: {
    tracks: {
      type: Array,
      required: true
    }
  },

  data () {
    return {
      internalTracks: [],
      selectedSize: 0
    }
  },

  watch: {
    tracks (newTracks) {
      this.setupNewTracks(newTracks)
    }
  },

  methods: {
    formatBytes (bytes, decimals = 0) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    },

    getExtensionWithoutDot (fileName) {
      if (!fileName || typeof fileName !== 'string') return '';
      const index = fileName.lastIndexOf('.');
      if (index === -1 || index === fileName.length - 1 || index === 0 ||
        fileName.indexOf('/', index) !== -1 || fileName.indexOf('\\', index) !== -1) {
        return '';
      }
      return fileName.slice(index + 1);
    },

    onClickNode (node) {
      if (node.selection >= Selection.Some) {
        this.setSelectionAll(node, Selection.No);
      } else {
        this.setSelectionAll(node, Selection.Yes);
      }
    },

    setSelectionAll (node, selection) {
      node.selection = selection;
      if (node.type === 'folder' && node.children) {
        node.children.forEach(child => {
          this.setSelectionAll(child, selection);
        });
      }
      this.selectedSize = this.refreshTracks(this.internalTracks);
    },

    refreshTracks (tracks) {
      for (let track of tracks) {
        if (track.type === 'folder' && track.children) {
          const size = this.refreshTracks(track.children);
          track.size = size;
          if (track.children.every(child => child.selection === Selection.Yes)) {
            track.selection = Selection.Yes;
          } else if (track.children.every(child => child.selection === Selection.No)) {
            track.selection = Selection.No;
          } else {
            track.selection = Selection.Some;
          }
        }
      }
      return this.sumSelectedSize(tracks);
    },

    sumSelectedSize (tracks) {
      const sizes = tracks
        .filter(track => track.selection !== Selection.No)
        .map(track => track.size)
        .filter(size => typeof size === 'number');
      return sizes.length > 0 ? sizes.reduce((a, b) => a + b) : undefined;
    },

    assignTrackSelectionStatus (tracks, parentPath = '') {
      tracks.forEach(track => {
        track.selection = Selection.Yes;
        track.relativePath = [parentPath, track.title].join('/');
        if (track.type === 'folder' && track.children) {
          this.assignTrackSelectionStatus(track.children, track.relativePath);
        }
      });
    },

    confirmSync () {
      const tracks = this.cleanSyncOnlyTracks(clone(this.internalTracks));
      this.$emit('confirmSync', tracks);
    },

    cleanSyncOnlyTracks (tracks) {
      const filtered = tracks.filter(track => track.selection !== Selection.No);
      filtered.forEach(track => {
        if (track.type === 'folder' && track.children) {
          track.children = this.cleanSyncOnlyTracks(track.children);
        }
        delete track.selection;
      });
      return filtered;
    },

    setupNewTracks (tracks) {
      const cloned = clone(tracks);
      this.assignTrackSelectionStatus(cloned);
      this.selectedSize = this.refreshTracks(cloned);
      this.internalTracks = cloned;
    }
  },

  mounted () {
    this.setupNewTracks(this.tracks);
  }
}
</script>
