<template>
  <BaseModal v-model="layout[ShowControl.isShowInviteModal]" :extra-close-event="reset">
    <template #title>
      {{ $t('Talk.Modals.invite_title') }}
    </template>

    <template #body>
      <div class="flex flex-col divide-y divide-dark-300 dark:divide-gray-700 divide-solid">
        <div class="space-y-3 pb-6">
          <p class="text-base">{{ $t('Talk.Modals.share_invite_link_tip') }}</p>
          <div class="grid space-x-4 items-center grid-cols-4">
            <div
              class="main-border p-3 text-base text-dark-800 dark:text-gray-100 still cursor-text col-span-3 !select-all  truncate"
              id="inviteLink"
            >
              {{ talk.inviteLink }}
            </div>

            <button
              class="main-border py-3 text-base text-dark-800 primary font-bold col-span-1 text-center"
              :class="{ 'cursor-default still saturate-50': isCopied }"
              @click="copyInviteLink"
            >
              {{ isCopied ? $t('Talk.Modals.copied') : $t('Talk.Modals.copy') }}
            </button>
          </div>
        </div>

        <!-- <div class="pt-4 pb-6">
          <p class="text-base mb-3">
            {{ $t('Talk.Modals.share_to_buzz_tip') }}
          </p>
          <button
            class="main-border primary flex items-center w-full justify-center space-x-2 py-3 font-bold"
            @click="shareToBuzz"
          >
            <Icon name="share_arrow" class="w-6 h-6" />
            <span class="text-base">{{ $t('Talk.Modals.share_to_buzz_button') }}</span>
          </button>
        </div> -->

        <div class="pt-4">
          <p class="text-base mb-3">
            {{ $t('Talk.Modals.share_card_tip') }}
          </p>
          <button
            class="main-border primary flex items-center w-full justify-center space-x-2 py-3 font-bold"
            @click="makeCard"
          >
            <Icon name="photo_4" class="w-6 h-6" />
            <span class="text-base">{{ $t('Talk.Modals.card') }}</span>
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script lang="ts" setup>
import { ShowControl } from '@/enum'
import BaseModal from '../BaseModal.vue'
import { useLayoutStore } from '@/stores/layout'
import { ref } from 'vue'
import { useTalkStore } from '@/stores/talk'

const layout = useLayoutStore()
const talk = useTalkStore()
const isCopied = ref(false)

const reset = () => {
  isCopied.value = false
  talk.inviteLink = ''
}

const selectLink = () => {
  return
  const range = document.createRange()
  const selection = window.getSelection()
  const link = document.getElementById('inviteLink') as HTMLElement

  range.selectNodeContents(link)
  selection?.removeAllRanges()
  selection?.addRange(range)
}

const copyInviteLink = () => {
  if (!navigator.clipboard) {
    fallbackCopy()
  } else {
    navigator.clipboard.writeText(talk.inviteLink)
  }

  isCopied.value = true
}

const fallbackCopy = () => {
  const isIos = navigator.userAgent.match(/ipad|iphone/i)
  const textarea = document.createElement('textarea')

  // create textarea
  textarea.value = talk.inviteLink

  // ios will zoom in on the input if the font-size is < 16px
  textarea.style.fontSize = '20PX'
  document.body.appendChild(textarea)

  // select text
  if (isIos) {
    const range = document.createRange()
    range.selectNodeContents(textarea)

    const selection = window.getSelection() as Selection
    selection.removeAllRanges()
    selection.addRange(range)
    textarea.setSelectionRange(0, 999999)
  } else {
    textarea.select()
  }

  // copy selection
  document.execCommand('copy')

  // cleanup
  document.body.removeChild(textarea)
}

const shareToBuzz = () => {
  layout[ShowControl.isShowInviteModal] = false
  layout[ShowControl.isShowShareToBuzzModal] = true
}

const makeCard = () => {
  layout[ShowControl.isShowInviteModal] = false
  layout[ShowControl.isShowCommunityCardModal] = true
}
</script>
