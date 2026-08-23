<template>
  <div class="q-pa-lg">
    <div class="row">
      <div class="text-h6">任务列表</div>
      <q-btn class="q-mx-lg" color="grey" @click="checkStatus">刷新</q-btn>
    </div>
    <q-list>
      <q-item v-for="task in taskList" :key="task.id">
        <q-item-section>
          <q-item-label>{{ task.code }}</q-item-label>
          <q-item-label caption>{{ task.id }}</q-item-label>
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ task.status }}</q-item-label>
          <q-item-label caption>finished:{{ task.finished }}</q-item-label>
          <q-item-label caption>error:{{ task.error }}</q-item-label>
          <q-item-label caption>stop:{{ task.stop }}</q-item-label>
        </q-item-section>
        <q-item-section top side>
          <div class="text-grey-8 q-gutter-xs">
            <q-btn
              v-if="task.finished"
              class="gt-xs"
              color="red"
              size="12px"
              flat dense round
              icon="delete"
              @click="onDeleteTask(task.id)"
            />
            <q-btn
              v-if="!task.finished"
              class="gt-xs"
              color="yello"
              size="12px"
              flat dense round
              icon="stop"
              @click="onStopTask(task.id)"
            />
            <q-btn
              v-if="task.finished"
              class="gt-xs"
              color="grey"
              size="12px"
              flat dense round
              icon="refresh"
              @click="onRestartTask(task.id)"
            />
          </div>
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script>
import { ServerApi } from '../utils.js';
import NotifyMixin from '../mixins/Notification.js';

export default {
  name: 'SyncTaskListStatus',

  mixins: [NotifyMixin],

  data() {
    return {
      taskList: [],
      intervalId: 0,
      refreshIntervalMs: 1000,
    };
  },

  methods: {
    async checkStatus() {
      this.taskList = await ServerApi.getSyncTaskListStatus();
    },

    resetChecker() {
      this.checkStatus();
      this.intervalId = setInterval(() => {
        this.checkStatus();
      }, this.refreshIntervalMs);
      console.log("start transcoding interval check", this.trackHash, this.intervalId);
    },

    async onDeleteTask(id) {
      try {
        const result = await ServerApi.deleteSyncTask(id);
        if (result) this.showSuccNotif("delete task success");
      } catch (error) {
        this.showErrNotif("delete task failed: " + error.message);
      }
      await this.checkStatus();
    },

    async onStopTask(id) {
      try {
        const result = await ServerApi.stopSyncTask(id);
        if (result) this.showSuccNotif("stop task success");
      } catch (error) {
        this.showErrNotif("stop task failed: " + error.message);
      }
      await this.checkStatus();
    },

    async onRestartTask(id) {
      try {
        const result = await ServerApi.restartSyncTask(id);
        if (result) this.showSuccNotif("restart task success");
      } catch (error) {
        this.showErrNotif("restart task failed: " + error.message);
      }
      await this.checkStatus();
    },
  },

  mounted() {
    this.resetChecker();
  },

  beforeUnmount() {
    clearInterval(this.intervalId);
    this.intervalId = 0;
  },
};
</script>
