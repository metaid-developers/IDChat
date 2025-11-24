<template>
  <BaseModal
    v-model="layout[ShowControl.isShowCreatePublicChannelModal]"
    :extraCloseEvent="form.reset"
  >
    <template #title>
      {{
        form.publicKey
          ? $t('Talk.Community.edit_group_chat')
          : $t('Talk.Community.create_group_chat')
      }}
    </template>

    <template #body>
      <div class="flex flex-col h-full">
        <div class="mt-7.5 w-full">
          <div class="mt-2">
            <div class="flex items-center justify-center gap-6 mb-4">
              <label class="inline-flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="channel_type"
                  class="mr-2"
                  :value="GroupChannelType.PublicText"
                  v-model="form.type"
                />
                <span>{{ $t('Talk.Community.public_channel') }}</span>
              </label>

              <label class="inline-flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="channel_type"
                  class="mr-2"
                  :value="GroupChannelType.Password"
                  v-model="form.type"
                />
                <span>{{ $t('Talk.Community.private_channel') }}</span>
              </label>
            </div>

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

            <p class="mt-3 text-sm text-dark-400 dark:text-gray-300">
              <span v-if="form.type === GroupChannelType.PublicText">
                {{ $t('Talk.Community.public_channel_hint') }}
              </span>
              <span v-else>
                {{ $t('Talk.Community.private_channel_hint') }}
              </span>
            </p>
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
import { useSimpleTalkStore } from '@/stores/simple-talk'
const form = useChannelFormStore()
const router = useRouter()
form.type = GroupChannelType.PublicText

// when user chooses private channel, generate a random password so the channel will be created as type=1 on-chain
watch(
  () => form.type,
  val => {
    if (val === GroupChannelType.Password) {
      // ensure a password exists so createChannel will set type='1'
      if (!form.password) form.password = realRandomString(12)
    } else {
      // clear password for public/broadcast to avoid accidental private behaviour
      form.password = ''
    }
  }
)

const userStore = useUserStore()
const layout = useLayoutStore()
const simpleTalk = useSimpleTalkStore()

const tryCreateChannel = async () => {
  if (!form.isFinished) return

  layout.isShowCreatePublicChannelModal = false
  layout.isShowLoading = true
  const subscribeId = form.uuid || realRandomString(32)
  // talk.activeCommunityId == '@me' ? '' : talk.activeCommunityId
  const res = await createChannel(form, '', subscribeId)
  console.log('res', res)

  // 添加占位頻道
  if (res.status === 'success') {
    // const newChannel = {
    //   id: 'placeholder_' + realRandomString(8),
    //   name: form.name,
    //   isPlaceHolder: true,
    //   roomType: ChannelPublicityType.Public,
    //   uuid: res.subscribeId,
    //   roomPublicKey: form.publicKey,
    //   chatSettingType: form.adminOnly ? 1 : 0,
    //   txId:`${res.channelId}i0`//form.txId,
    // }
    // // 将占位頻道添加到頻道列表最前面
    // if (res.channelId) {
    //   console.log("talk.activeCommunityChannels",talk.activeCommunityChannels)
    //   const index = talk.activeCommunityChannels.findIndex(item => item.txId === `${res.channelId}i0`)
    //   if (index !== -1) {
    //     talk.activeCommunityChannels[index] = newChannel
    //   }
    // } else {
    //   talk.activeCommunityChannels.unshift(newChannel)
    // }
  }

  layout.isShowLoading = false

  sleep(1000).then(async () => {
    await simpleTalk.syncFromServer()
    // 跳转刷新
    //

    router.push(`/talk/channels/public/${res.channelId}i0`)
    //  talk.refetchChannels()
    //window.location.reload()
  })
}
</script>
