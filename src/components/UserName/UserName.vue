<template>
  <span class="user-name space-x-1">
    <MetaNameDisplay
      :name="metaName"
      :colorful="true"
      :text-class="textClass"
      v-if="metaName"
      :noTag="noTag"
    />
    <span :class="[textClass, 'truncate']" :title="name" v-else>
      {{ truncateText(name)  }}
    </span>
  </span>
</template>

<script setup lang="ts">
import MetaNameDisplay from '@/components/MetaName/Display.vue'
import {truncateText} from '@/utils/filters'
interface Props {
  name: string
  metaName?: string
  textClass?: string
  noTag?: boolean
}
const props = withDefaults(defineProps<Props>(), {})
</script>

<!-- <style lang="scss" scoped src="./UserName.scss"></style> -->
