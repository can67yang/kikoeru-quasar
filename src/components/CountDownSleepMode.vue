<template>
  <q-dialog :model-value="modelValue" persistent position="bottom" @update:model-value="$emit('update:model-value', $event)">
    <q-card class="q-pb-xl">
      <q-card-section>
        <div class="row items-center no-wrap">
          <div class="col">睡眠倒计时</div>
          <div class="col-auto">
            <q-btn v-close-popup flat label="关闭窗口" color="primary" />
          </div>
        </div>
      </q-card-section>

      <div class="q-pa-md">
        <q-input
          v-model="mannulMinutes"
          filled dense type="number"
          :rules="[v => v >= 0]"
        >
          <template v-slot:prepend>
            <span class="text-subtitle2">设置</span>
          </template>
          <template v-slot:append>
            <span class="text-subtitle2">分钟后停止播放</span>
          </template>
        </q-input>

        <q-slider
          v-model="countDownValue"
          color="primary"
          markers snap
          :min="0"
          :max="10"
        />
      </div>

      <div v-if="showCountTimer" class="row justify-center">
        <div class="text-subtitle2">
          倒计时中，还剩<span class="text-warning">{{ countTimerRemainMinutes }}分钟{{ countTimerRemainSeconds }}秒</span>停止播放
        </div>
      </div>

      <div class="row justify-between">
        <q-card-actions>
          <q-btn
            v-if="sleepMode"
            v-close-popup
            flat
            label="取消倒计时"
            color="primary"
            :disable="!sleepMode"
            @click="clearSleepTimer"
          />
        </q-card-actions>
        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            :label="sleepMode ? '重新倒计时' : '开始倒计时'"
            color="primary"
            @click="setSleepTimer"
          />
        </q-card-actions>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { mapState, mapActions } from 'pinia';
import { useAudioPlayerStore } from 'stores/audioPlayer.js'
import { date } from 'quasar';

export default {
  name: 'CountDownSleepMode',

  // v-model: showTimer from MainLayout
  props: ['modelValue'],

  data() {
    return {
      countDownValue: 0,
      mannulMinutes: 0,
      showCountTimer: false,
      countTimerRemainMills: 0,
      countTimerIntervalId: 0,
    };
  },

  computed: {
    ...mapState(useAudioPlayerStore, ['sleepTime', 'sleepMode']),

    isDarkModeOn() {
      return this.$q.dark.isActive;
    },

    hour() {
      return parseInt(this.time.split(":")[0]);
    },

    minute() {
      return parseInt(this.time.split(":")[1]);
    },

    countDownMinutes() {
      if (this.countDownValue < 0) return 0;
      return [0, 1, 3, 5, 10, 20, 30, 45, 60, 90, 120][this.countDownValue];
    },

    countTimerRemainMinutes() {
      return Math.floor(this.countTimerRemainMills / 1000 / 60);
    },

    countTimerRemainSeconds() {
      return Math.floor(this.countTimerRemainMills / 1000) % 60;
    },
  },

  mounted() {
    try {
      if (this.$q.sessionStorage.getItem('sleepMode')) {
        this.SET_SLEEP_TIMER(this.$q.sessionStorage.getItem('sleepTime'));
      }
    } catch {
      console.log('Web Storage API error');
    }
  },

  watch: {
    // v-model: showTimer from MainLayout
    value(visible) {
      this.setCountDownTimer(visible && this.sleepMode);
      if (visible) {
        if (this.sleepMode) {
          const targetTime = new Date(this.sleepTime);
          this.time = date.formatDate(targetTime, 'HH:mm');
        } else {
          const currentTime = new Date();
          this.time = currentTime.getHours().toString().padStart(2, '0') + ':' + currentTime.getMinutes().toString().padStart(2, '0');
        }
      }
    },

    countDownValue() {
      this.mannulMinutes = this.countDownMinutes;
    },

    mannulMinutes(v) {
      if (v < 0) {
        this.$nextTick(() => {
          this.mannulMinutes = 0;
        });
      }
    },
  },

  methods: {
    ...mapActions(useAudioPlayerStore, [
      'SET_SLEEP_TIMER',
      'CLEAR_SLEEP_MODE',
    ]),

    fnMarkerLabel(v) {
      return v + 'm';
    },

    setSleepTimer() {
      if (this.mannulMinutes <= 0) {
        this.$q.notify({
          message: "倒计时失败，时长不能小于0",
          color: 'negative',
          icon: 'bedtime',
          timeout: 2000,
        });
      }
      const stopTime = date.addToDate(new Date(), {
        seconds: 60 * this.mannulMinutes,
      });
      const stopMills = stopTime.getTime();
      this.SET_SLEEP_TIMER(stopMills);
      // Persist sleep timer
      try {
        this.$q.sessionStorage.set('sleepTime', stopMills);
        this.$q.sessionStorage.set('sleepMode', true);
      } catch {
        console.log('Web Storage API error');
      }
      this.showSuccNotif(`${this.mannulMinutes}分钟后，于${date.formatDate(stopTime, 'HH:mm:ss')}停止播放`);
      this.setCountDownTimer(true);
    },

    clearSleepTimer() {
      this.CLEAR_SLEEP_MODE();
      try {
        this.$q.sessionStorage.set('sleepTime', null);
        this.$q.sessionStorage.set('sleepMode', false);
      } catch {
        console.log('Web Storage API error');
      }
      this.showSuccNotif('已关闭睡眠模式');
      this.setCountDownTimer(false);
    },

    showSuccNotif(message) {
      this.$q.notify({
        message,
        color: 'primary',
        icon: 'bedtime',
        timeout: 2000,
      });
    },

    updateCountDownTimer() {
      this.countTimerRemainMills = this.sleepTime - Date.now();
    },

    setCountDownTimer(enable) {
      if (!enable) {
        this.showCountTimer = false;
        clearInterval(this.countTimerIntervalId);
        return;
      }
      this.updateCountDownTimer();
      this.showCountTimer = true;
      this.countTimerIntervalId = setInterval(() => {
        this.updateCountDownTimer();
      }, 1000);
    },
  },

  beforeUnmount() {
    clearInterval(this.countTimerIntervalId);
  },
};
</script>
