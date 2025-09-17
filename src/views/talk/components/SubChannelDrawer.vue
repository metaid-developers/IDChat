<template>
  <div>
    <ElDrawer
    :model-value="modelValue"
    :show-close="true"
    :with-header="false"
    :size="calulateWidth"
    :append-to-body="true"
    :lock-scroll="false"
    
    custom-class="none-padding"
    :modal="false"
    @close="emit('update:modelValue', false)"
  >

    <span @click="emit('update:modelValue', false)">123132</span>
</ElDrawer>
  </div>
</template>
<script setup lang='ts'>
import { computed, onMounted,ref } from 'vue'

interface Props {
  modelValue: boolean
}
const props = withDefaults(defineProps<Props>(), {})
const emit = defineEmits(['update:modelValue'])

const calulateWidth=computed(()=>{
    const screenWidth = window.innerWidth || 
        document.documentElement.clientWidth || 
        document.body.clientWidth;
        return `${screenWidth-365}px` || '0px'
})
onMounted(()=>{
    // window.addEventListener('resize',calulateWidth)

    //   // Re-calculate on device orientation change
    //   window.addEventListener('orientationchange',calulateWidth)
})

</script>
<style lang='scss' >


</style>