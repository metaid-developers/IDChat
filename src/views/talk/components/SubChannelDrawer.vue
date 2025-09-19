<template>
  <div>
    <ElDrawer
    :model-value="modelValue"
    :show-close="true"
    :with-header="false"
    :size="calulateSize"
    :append-to-body="true"
    :lock-scroll="false"
    
    custom-class="none-padding"
    :modal="false"
    @close="emit('update:modelValue', false)"
  >

    <!-- <span @click="emit('update:modelValue', false)">123132</span> -->
    <SubChannel></SubChannel>

</ElDrawer>
  </div>
</template>
<script setup lang='ts'>
import { computed, onMounted,ref ,watch} from 'vue'
import SubChannel from '../SubChannel.vue';
import { useLayoutStore } from '@/stores/layout';

interface Props {
  modelValue: boolean
}
const props = withDefaults(defineProps<Props>(), {})
const emit = defineEmits(['update:modelValue'])
const layout=useLayoutStore()
const calulateSize=ref("0px")


const calulateWidth=()=>{
     
    const screenWidth = window.innerWidth || 
        document.documentElement.clientWidth || 
        document.body.clientWidth;
        
        if(screenWidth >= 1024){
           calulateSize.value= `${screenWidth-364}px` || '0px'
        }else{
           calulateSize.value= `${screenWidth}px` || '0px'
        }
}

onMounted(()=>{
      calulateWidth()
      window.addEventListener('resize',calulateWidth)

      // Re-calculate on device orientation change
      window.addEventListener('orientationchange',calulateWidth)
})

</script>
<style lang='scss' >


</style>