<template>
  <BaseModal
    v-model="layout[ShowControl.isShowCreatePublicChannelModal]"
    :extraCloseEvent="form.reset"
  >
    <template #title>
      {{
        form.publicKey
          ? $t('Talk.Community.edit_public_channel')
          : $t('Talk.Community.create_public_channel')
      }}
    </template>

    <template #body>
      <div class="flex flex-col h-full">
        <p class="mt-4.5 text-base text-dark-400 dark:text-gray-200 leading-relaxed text-center">
          {{ $t('Talk.Community.create_public_channel_tip') }}
        </p>

        <div class="mt-7.5 w-full">
          <h4 class="text-lg  capitalize">
            {{ $t('Talk.Community.channel_name') }}
          </h4>

          <div class="mt-2">
            <input
              type="text"
              class="outline-0 main-border faded-switch !bg-white dark:!bg-gray-700 still w-full px-4 py-3 text-base leading-[24PX] font-bold placeholder:font-normal"
              :placeholder="$t('Talk.Community.channel_name')"
              v-model="form.name"
            />
          </div>

          <!-- <div class="mt-6">
            <SwitchGroup>
              <div class="flex items-center gap-x-3">
                <Switch
                  v-model="form.adminOnly"
                  :class="form.adminOnly ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-900'"
                  class="relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75"
                >
                  <span
                    aria-hidden="true"
                    :class="form.adminOnly ? 'translate-x-6' : 'translate-x-0'"
                    class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-600 shadow-lg ring-0 transition duration-200 ease-in-out"
                  ></span>
                </Switch>

                <SwitchLabel class="text-dark-400 dark:text-gray-200 text-sm">
                  {{ $t('Talk.Modals.admin_only') }}
                </SwitchLabel>
              </div>
            </SwitchGroup>
          </div> -->
        </div>

        <div class="flex items-end justify-end grow lg:mt-8">
          <button
            class="w-14 h-14 main-border primary flex items-center justify-center"
            :class="{
              'faded still text-dark-300  dark:text-gray-400 dark:!bg-gray-700': !form.isFinished,
            }"
            :disabled="!form.isFinished"
            @click="tryCreateChannel"
          >
            <Icon name="arrow_right" class="w-6 h-6" />
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script lang="ts" setup>
import { ChannelPublicityType, GroupChannelType } from '@/enum'
import { useChannelFormStore } from '@/stores/forms'
import { useLayoutStore } from '@/stores/layout'
import { useTalkStore } from '@/stores/talk'
import { Switch, SwitchLabel, SwitchGroup } from '@headlessui/vue'

import { useUserStore } from '@/stores/user'
import { createChannel } from '@/utils/talk'
import { ShowControl } from '@/enum'
import BaseModal from './BaseModal.vue'
import { realRandomString, sleep } from '@/utils/util'
import { Channel } from '@/@types/talk'
import { watch } from 'vue'
import { fromBase64 } from 'js-base64'
import { debug } from 'console'
import { useRouter } from 'vue-router'
const form = useChannelFormStore()
const router = useRouter()
form.type = GroupChannelType.PublicText

const userStore = useUserStore()
const layout = useLayoutStore()
const talk = useTalkStore()

const tryCreateChannel = async () => {
  if (!form.isFinished) return

  layout.isShowCreatePublicChannelModal = false
  layout.isShowLoading = true
  const subscribeId = form.uuid || realRandomString(32)
  
  const res = await createChannel(form, talk.activeCommunityId == '@me' ? '' : talk.activeCommunityId, subscribeId)
  console.log("res",res)
  
  // 添加占位頻道
  if (res.status === 'success') {
 
    const newChannel = {
      id: 'placeholder_' + realRandomString(8),
      name: form.name,
      isPlaceHolder: true,
      roomType: ChannelPublicityType.Public,
      uuid: res.subscribeId,
      roomPublicKey: form.publicKey,
      chatSettingType: form.adminOnly ? 1 : 0,
      txId: form.txId,
    }
    
    // 将占位頻道添加到頻道列表最前面
    if (res.channelId) {
      
      const index = talk.activeCommunityChannels.findIndex(item => item.txId === form?.txId)
      
      if (index !== -1) {
        talk.activeCommunityChannels[index] = newChannel
      }
    } else {
      talk.activeCommunityChannels.unshift(newChannel)
    }
  }

  layout.isShowLoading = false

  sleep(2000).then(() => {
    // 跳转刷新
     window.location.reload()
     //router.push(`/talk/channels/public/${res.channelId}`)
    // talk.refetchChannels()
  })
}
</script>
