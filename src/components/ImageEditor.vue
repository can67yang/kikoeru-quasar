<template>
  <q-card style="width: 100%; height: 100%;">
    <q-card-section>
      <div class="text-h6">图像编辑器</div>
    </q-card-section>

    <q-card-section style="display: flex; align-items: center; justify-content: center; width: 100%; height: calc(100% - 18rem);">
      <canvas ref="canvas" class="img" style="width: 100%; height: 100%;"></canvas>
    </q-card-section>

    <q-card-section align="right">
      <q-btn-toggle
        class="cover-type-toggle"
        no-caps
        rounded
        unelevated
        toggle-color="primary"
        text-color="primary"
        v-model="coverType"
        :options="optionRatio"
      />
    </q-card-section>

    <q-card-actions style="display: flex;">
      <div style="display: inline; flex-grow: 1; padding: 0 2rem 0 2rem;">
        <span>调整裁剪区域</span>
        <q-slider v-model="offset" :min="0" :max="maxOffset" :disable="maxOffset < 2" />
      </div>

      <div style="display: inline;">
        <q-btn color="primary" @click="confirmCrop">确认</q-btn>
        <q-btn v-close-popup color="negative">取消</q-btn>
      </div>
    </q-card-actions>
  </q-card>
</template>

<script>
import NotifyMixin from '../mixins/Notification.js'
import { ServerApi } from '../utils.js'

const coverRatio = {
  main: 4 / 3,
  sam: 1
}

export default {
  name: 'ImageEditor',

  mixins: [NotifyMixin],

  props: {
    src: String,
    work_id: Number
  },

  data () {
    return {
      offset: 0,
      maxOffset: 0,
      offsetDirection: 'width',
      destRatio: coverRatio.main,
      destHeight: 0,
      destWidth: 0,
      image: null,
      ctx: null,
      resizeObserver: null,
      coverType: 'main',
      optionRatio: [
        { label: '主封面', value: 'main' },
        { label: '缩略图', value: 'sam' }
      ]
    }
  },

  watch: {
    offset() {
      this.drawCropImg();
    },
    coverType() {
      this.destRatio = coverRatio[this.coverType];
      this.updateImg();
      this.drawCropImg();
    }
  },

  computed: {
    canvas() {
      return this.$refs.canvas;
    }
  },

  methods: {
    drawCropImg() {
      if (!(this.canvas && this.image && this.ctx)) {
        console.warn('canva/image/ctx not ready');
        return;
      }
      const canvas = this.canvas;
      if (!(canvas.width == canvas.clientWidth && canvas.height == canvas.clientHeight)) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);

      const canvasRatio = canvas.width / canvas.height;
      let x = 0, y = 0, w = 0, h = 0;
      if (canvasRatio > this.destRatio) {
        h = canvas.height;
        w = this.destRatio * h;
        y = 0;
        x = (canvas.width - w) / 2;
      } else {
        w = canvas.width;
        h = w / this.destRatio;
        x = 0;
        y = (canvas.height - h) / 2;
      }
      const offsetX = this.offsetDirection == 'width' ? this.offset : 0;
      const offsetY = this.offsetDirection == 'width' ? 0 : this.offset;
      this.ctx.drawImage(this.image, offsetX, offsetY, this.destWidth, this.destHeight, x, y, w, h);
    },

    async confirmCrop() {
      const canvas = document.createElement('canvas');
      if (this.coverType === 'main') {
        canvas.width = this.destWidth;
        canvas.height = this.destHeight;
      } else if (this.coverType === 'sam') {
        canvas.width = 100;
        canvas.height = 100;
      }
      const ctx = canvas.getContext('2d');
      const offsetX = this.offsetDirection == 'width' ? this.offset : 0;
      const offsetY = this.offsetDirection == 'width' ? 0 : this.offset;
      const x = 0;
      const y = 0;
      const w = canvas.width;
      const h = canvas.height;
      ctx.drawImage(this.image, offsetX, offsetY, this.destWidth, this.destHeight, x, y, w, h);

      const quality = 1;
      const newSrc = canvas.toDataURL('image/jpeg', quality);
      console.log('newSrc = ', newSrc);

      const result = await ServerApi.saveEditImg(this.work_id, newSrc, this.coverType);
      if (result.success) {
        this.$router.go(0);
      } else {
        this.showErrNotif('更新封面失败：' + result.message);
      }
    },

    updateImg() {
      const img = this.image;
      const imgRatio = img.width / img.height;
      if (imgRatio > this.destRatio) {
        this.destHeight = img.height;
        this.destWidth = img.height * this.destRatio;
        this.offsetDirection = 'width';
        this.maxOffset = img.width - this.destWidth;
      } else {
        this.destWidth = img.width;
        this.destHeight = img.width / this.destRatio;
        this.offsetDirection = 'height';
        this.maxOffset = img.height - this.destHeight;
      }
    }
  },

  mounted() {
    console.log('edit img for work_id ', this.work_id, this.src);
    const canvas = this.$refs.canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const img = new Image();
    img.src = this.src;
    img.onload = () => {
      this.image = img;
      this.updateImg();
      this.drawCropImg();
    };
    img.onerror = () => {
      alert('无法加载图像，请检查URL');
    };

    this.resizeObserver = new ResizeObserver(() => {
      this.drawCropImg();
    });
    this.resizeObserver.observe(this.canvas);
  },

  unmounted() {
    this.resizeObserver.unobserve(this.canvas);
  }
}
</script>

<style scoped>
.img {
  object-fit: fill;
}

.cover-type-toggle {
  border: 1px solid #027be3;
}
</style>
