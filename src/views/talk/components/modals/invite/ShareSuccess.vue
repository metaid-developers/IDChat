<template>
  <BaseModal v-model="layout[ShowControl.isShowShareSuccessModal]">
    <template #title>
      {{ $t('Talk.Modals.share_successfully') }}
    </template>

    <template #body>
      <div class="flex flex-col h-full">
        <p class="text-dark-400 dark:text-gray-200 text-base text-center">
          {{ $t('Talk.Modals.share_successfully_tip') }}
        </p>

        <button
          class="main-border primary py-3 w-full mt-6 text-base font-bold"
          @click="goCheckOutBuzz"
          v-show="talk.shareToBuzzTxId"
        >
          {{ $t('Talk.Modals.go_check_out') }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script lang="ts" setup>
import { ShowControl } from '@/enum'
import { useLayoutStore } from '@/stores/layout'
import { useTalkStore } from '@/stores/talk'
import BaseModal from '../BaseModal.vue'
import { VITE_SHOW_NOW_HOST } from '@/config/app-config'

const layout = useLayoutStore()
const talk = useTalkStore()

const goCheckOutBuzz = () => {
  if (!talk.shareToBuzzTxId) return

  const url = `${VITE_SHOW_NOW_HOST() || import.meta.env.VITE_SHOW_NOW_HOST}/buzz/${
    talk.shareToBuzzTxId
  }i0`
  window.open(url, '_blank')

  talk.shareToBuzzTxId = ''
  layout.isShowShareSuccessModal = false
}
</script>
