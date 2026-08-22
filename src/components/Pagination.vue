<template>
  <div>
    <div class="row">
      <q-btn
        class="q-mx-xs jump-unit"
        outline size="md" padding="none"
        icon="chevron_left"
        :disable="value - 1 < min"
        @click="gotoIndex(value - 1)"
      >
        <q-tooltip>上一页</q-tooltip>
      </q-btn>

      <span v-for="item in leadingItems" :key="item">
        <q-btn
          class="q-mx-xs jump-unit"
          outline size="md" padding="none"
          :disable="item === null"
          @click="gotoIndex(item)"
        >
          {{ item == null ? '...' : item }}
        </q-btn>
      </span>

      <span v-for="item in centerItems" :key="item">
        <q-btn
          class="q-mx-xs jump-unit"
          outline size="md" padding="none"
          :color="item == value ? 'primary' : ''"
          :disable="value === item"
          @click="gotoIndex(item)"
        >
          {{ item }}
        </q-btn>
      </span>

      <span v-for="item in trailingItems" :key="item">
        <q-btn
          class="q-mx-xs jump-unit"
          outline size="md" padding="none"
          :disable="item === null"
          @click="gotoIndex(item)"
        >
          {{ item == null ? '...' : item }}
        </q-btn>
      </span>

      <q-btn
        class="q-mx-xs jump-unit"
        outline size="md" padding="none"
        icon="chevron_right"
        :disable="value + 1 > max"
        @click="gotoIndex(value + 1)"
      >
        <q-tooltip>下一页</q-tooltip>
      </q-btn>

      <q-input
        class="super-small"
        v-model="jump"
        dense outlined
        placeholder="跳转到"
        @keyup.enter="jumpText"
      />
    </div>
  </div>
</template>

<script>
const VISIBLE_ITEMS_SIDE = 2;

export default {
  name: 'Pagination',

  props: {
    value: {
      type: Number,
      required: true,
    },
    max: {
      type: Number,
      required: true,
    },
    min: {
      type: Number,
      default: 1,
    },
  },

  computed: {
    leadingItems() {
      const distance = this.value - this.min;
      if (distance <= VISIBLE_ITEMS_SIDE) {
        return [];
      } else if (distance >= VISIBLE_ITEMS_SIDE + 2) {
        return [this.min, null];
      } else {
        return [this.min];
      }
    },

    centerItems() {
      const items = [];
      for (
        let i = Math.max(this.min, this.value - VISIBLE_ITEMS_SIDE);
        i <= Math.min(this.max, this.value + VISIBLE_ITEMS_SIDE);
        ++i
      ) {
        items.push(i);
      }
      return items;
    },

    trailingItems() {
      const distance = this.max - this.value;
      if (distance <= VISIBLE_ITEMS_SIDE) {
        return [];
      } else if (distance >= VISIBLE_ITEMS_SIDE + 2) {
        return [null, this.max];
      } else {
        return [this.max];
      }
    },
  },

  data() {
    return {
      jump: '',
    };
  },

  methods: {
    gotoNext() {
      this.$emit('goto', this.value + 1);
    },

    gotoIndex(index) {
      this.$emit('goto', Math.max(this.min, Math.min(this.max, index)));
    },

    jumpText() {
      const index = parseInt(this.jump);
      if (index) {
        this.gotoIndex(index);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.super-small {
  max-width: 80px;
}
</style>
