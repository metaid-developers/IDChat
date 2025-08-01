<template>
  <div class="pb-1.5 rounded-lg text-xs flex flex-col text-dark-400 font-medium sticker">
    <div
      class="flex border-b border-dark-200 mx-2 text-sm font-medium pb-2 pt-2 space-x-1 h-11 items-center"
    >
      <!-- <div
        class="py-0.5 px-2 rounded cursor-pointer"
        :class="[
          activeTab === 'nft'
            ? 'text-dark-800 main-border bg-primary small'
            : 'border border-transparent',
        ]"
        @click="changeTab('nft')"
        v-if="!isHideNFT"
      >
        {{ $t('Talk.Input.nft_stickers') }}
      </div> -->
      <div
        class="py-0.5 px-2 rounded cursor-pointer"
        :class="[
          activeTab === 'emoji'
            ? 'text-dark-800 main-border bg-primary small'
            : 'border border-transparent',
        ]"
        @click="changeTab('emoji')"
      >
        {{ $t('Talk.Input.emoji') }}
      </div>
    </div>
    <div class="p-2 h-64 overflow-y-auto">
      <!-- <div v-if="activeTab === 'nft'" class="h-full flex items-center justify-center">
        <div class="flex flex-col items-center space-y-4">
          <img :src="Cat" class="w-32 h-32" alt="" />
          <div class="text-dark-400 text-sm font-medium">
            {{ $t('Talk.Input.no_nft_stickers') }}
          </div>
        </div>
      </div> -->
      <div v-if="activeTab === 'emoji'">
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😃')">😃</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😁')">😁</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😂')">😂</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😄')">😄</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😅')">😅</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😆')">😆</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😇')">😇</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😈')">😈</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😉')">😉</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😊')">😊</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😋')">😋</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😌')">😌</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😍')">😍</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😎')">😎</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😏')">😏</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😐')">😐</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😒')">😒</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😓')">😓</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😔')">😔</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😕')">😕</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😖')">😖</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😗')">😗</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😘')">😘</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😙')">😙</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😚')">😚</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😜')">😜</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😝')">😝</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😞')">😞</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😟')">😟</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😠')">😠</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😡')">😡</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😢')">😢</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😣')">😣</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😤')">😤</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😥')">😥</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😦')">😦</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😨')">😨</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😩')">😩</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😪')">😪</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😫')">😫</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😬')">😬</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😭')">😭</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😮')">😮</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😯')">😯</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😰')">😰</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😲')">😲</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😳')">😳</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😴')">😴</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😵')">😵</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🧐')">🧐</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('😷')">😷</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🙁')">🙁</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🙂')">🙂</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🙃')">🙃</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🤐')">🤐</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🤑')">🤑</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🤒')">🤒</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🤓')">🤓</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🤔')">🤔</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🤕')">🤕</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🤠')">🤠</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🤡')">🤡</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🤢')">🤢</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🤤')">🤤</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🤥')">🤥</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🤧')">🤧</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🤨')">🤨</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🤩')">🤩</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🤪')">🤪</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🤫')">🤫</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🤬')">🤬</span>
        <span class="text-3xl p-0.5 cursor-pointer" @click="addEmoji('🤭')">🤭</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import Cat from '@/assets/images/cat.svg?url'

interface Props {
  isHideNFT?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  isHideNFT: true,
})

const emit = defineEmits(['input'])
const key = 'defaultStickerTab'

watch(
  () => props.isHideNFT,
  () => {
    if (props.isHideNFT) {
      activeTab.value = 'emoji'
    } else {
      activeTab.value = localStorage.getItem(key) || 'emoji'
    }
  }
)

const activeTab = ref(localStorage.getItem(key) || 'emoji')
const addEmoji = (emoji: string) => {
  emit('input', {
    type: activeTab.value,
    value: emoji,
  })
}

function changeTab(type: string) {
  localStorage.setItem(key, type)
  activeTab.value = type
}
</script>

<style lang="scss" scoped>
.sticker {
  margin: calc(-1 * (var(--el-popover-padding)));
}
</style>
