<template>
  <div>
    <div class="row items-center">
      <q-btn
        class="q-mx-xs jump-unit"
        outline dense
        icon="chevron_left"
        :disable="modelValue - 1 < min"
        @click="gotoIndex(modelValue - 1)"
      >
        <q-tooltip>上一页</q-tooltip>
      </q-btn>

      <span v-for="item in leadingItems" :key="item">
        <q-btn
          class="q-mx-xs jump-unit"
          outline dense
          :disable="item === null"
          @click="gotoIndex(item)"
        >
          {{ item == null ? '...' : item }}
        </q-btn>
      </span>

      <span v-for="item in centerItems" :key="item">
        <q-btn
          class="q-mx-xs jump-unit"
          outline dense
          :color="item == modelValue ? 'primary' : ''"
          :disable="modelValue === item"
          @click="gotoIndex(item)"
        >
          {{ item }}
        </q-btn>
      </span>

      <span v-for="item in trailingItems" :key="item">
        <q-btn
          class="q-mx-xs jump-unit"
          outline dense
          :disable="item === null"
          @click="gotoIndex(item)"
        >
          {{ item == null ? '...' : item }}
        </q-btn>
      </span>

      <q-btn
        class="q-mx-xs jump-unit"
        outline dense
        icon="chevron_right"
        :disable="modelValue + 1 > max"
        @click="gotoIndex(modelValue + 1)"
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
    modelValue: {
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
      const distance = this.modelValue - this.min;
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
        let i = Math.max(this.min, this.modelValue - VISIBLE_ITEMS_SIDE);
        i <= Math.min(this.max, this.modelValue + VISIBLE_ITEMS_SIDE);
        ++i
      ) {
        items.push(i);
      }
      return items;
    },

    trailingItems() {
      const distance = this.max - this.modelValue;
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
      this.$emit('goto', this.modelValue + 1);
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
.jump-unit {
  min-width: 2.25rem;
}

.super-small :deep(.q-field__inner) {
  height: 2rem !important;
  width: 4.5rem;
  padding-top: 0px !important;
}

.super-small :deep(.q-field__control) {
  height: 2rem !important;
  min-height: 2rem !important;
}

.super-small :deep(.q-field__marginal) {
  height: 2rem !important;
}

.super-small :deep(.q-field__label) {
  top: 0px !important;
}

.super-small :deep(input),
.super-small :deep(input::placeholder) {
  font-size: 0.75rem;
}
</style>
