<template>
  <div ref="refreshBoxRef"></div>
  <CommunityVue ref="CommunityRef" />
  <!-- <FollowVue ref="FollowRef" /> -->
  <!-- <GuideVue /> -->
  <!-- <HomeBuzzListVue ref="recommentBuzzRef" /> -->
</template>

<script setup lang="ts">
import { inject, onActivated, ref } from 'vue'
import HomeBuzzListVue from './components/HomeBuzzList.vue'
import CommunityVue from './components/recommend/Community.vue'
import FollowVue from './components/recommend/Follow.vue'
import GuideVue from './components/recommend/Guide.vue'

const pulldown: PullDownVal = inject('Pulldown')!
const recommentBuzzRef = ref()
const FollowRef = ref()
const CommunityRef = ref()
const refreshBoxRef = ref()

onActivated(() => {
  pulldown.refreshSlot = refreshBoxRef.value
  pulldown.onRefresh = () => {
    return new Promise<void>(async resolve => {
      try {
        Promise.all([
          CommunityRef.value?.refreshDatas(),
          //FollowRef.value?.refreshDatas(),
          // recommentBuzzRef.value?.refreshDatas(),
        ]).then(() => {
          resolve()
        })
      } catch (error) {
        resolve()
      }
    })
  }
})
</script>

<style lang="scss" scoped src="./Recomment.scss"></style>
