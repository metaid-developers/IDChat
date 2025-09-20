<template>
  <BaseModal>
    <template #title>
      {{ $t('Talk.Community.create_broadcast_channel') }}
    </template>

    <template #body>
      <div class="flex flex-col h-full">
        <p class="mt-4.5 text-base text-dark-400 dark:text-gray-200 leading-relaxed text-center">
          {{ $t('Talk.Community.create_broadcast_channel_tip') }}
        </p>

        <!-- <div class="mt-7.5 w-full">
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
          </div>
        </div> -->

        <div class="flex items-end justify-end grow lg:mt-8">
          <button
            class="w-14 h-14 main-border primary flex items-center justify-center"
            :class="{
              'faded still text-dark-300  dark:text-gray-400 dark:!bg-gray-700': '',
            }"
            @click="tryCreateBroadcastChannel"
          >
            <Icon name="arrow_right" class="w-6 h-6" />
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script lang="ts" setup>
import { ChannelPublicityType } from '@/enum'

import { useLayoutStore } from '@/stores/layout'
import { useTalkStore } from '@/stores/talk'
import { useUserStore } from '@/stores/user'
import { createBroadcastChannel } from '@/utils/talk'
import { ShowControl } from '@/enum'
import BaseModal from './BaseModal.vue'
import { realRandomString, sleep } from '@/utils/util'

import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { useSimpleTalkStore } from '@/stores/simple-talk'

const router = useRouter()
const route = useRoute()
const i18n = useI18n()
const userStore = useUserStore()
const layout = useLayoutStore()
const simpleTalk = useSimpleTalkStore()

const tryCreateBroadcastChannel = async () => {
  layout.isShowLoading = true
  const subscribeId = realRandomString(32)
  const groupId = route.params.channelId as string
  const res = await createBroadcastChannel(groupId)
  console.log('res', res)

  // 添加占位頻道
  if (res.status === 'success') {
    await simpleTalk.loadGroupChannels(simpleTalk.activeChannelId)
  }

  layout.isShowLoading = false
  ElMessage.success(`${i18n.t('create_broadcast_success')}`)
}
</script>

<style lang="scss" scoped></style>
