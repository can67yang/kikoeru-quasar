<template>
  <div>
    <div v-if="worksWithoutSelf.length > 1" class="q-mt-sm q-px-sm">
      <q-list bordered separator>
        <q-item-label header>关联作品</q-item-label>
        <q-item
          v-for="work in worksWithoutSelf"
          :key="work.id"
          :to="`/work/${work.id}`"
          :disable="work.id == metadata.id"
        >
          <q-item-section>
            <q-item-label>
              {{ idNumberToCode(work.id) }}
            </q-item-label>
            <q-item-label caption>{{ work.name }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </div>
</template>

<script>
import { prefixWithFormatID } from '../utils.js'

export default {
  name: 'RelatedWorks',

  props: {
    metadata: {
      type: Object,
      required: true
    }
  },

  data () {
    return {
      idNumberToCode: prefixWithFormatID
    }
  },

  computed: {
    worksWithoutSelf() {
      return this.metadata.relatedWorks
        ? this.metadata.relatedWorks
        : [];
    }
  },

  mounted() {},

  methods: {}
}
</script>
