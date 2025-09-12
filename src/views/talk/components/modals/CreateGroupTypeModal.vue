<template>
  <BaseModal
    v-model="layout[ShowControl.isShowCreateGroupTypeModal]"
    :extraCloseEvent="form.reset"
  >
    <template #title>
      {{
      $t('Talk.Community.create_broadcast_channel')
      }}
    </template>

    <template #body>
      <div class="flex flex-col h-full">
     

        <div class="mt-7.5 w-full">
         

          <div class="mt-2">
            <div>
               <button
            class="w-14 h-14 main-border primary flex items-center justify-center"
            :class="{
              'faded still text-dark-300  dark:text-gray-400 dark:!bg-gray-700',
            }"
            
            @click="createChannel(CreateGroupType.public)"
          >
            <Icon name="arrow_right" class="w-6 h-6" />
            <span>{{ $t('channel_type_public') }}</span>
          </button>
            </div>
            <div>
                   <button
            class="w-14 h-14 main-border primary flex items-center justify-center"
            :class="{
              'faded still text-dark-300  dark:text-gray-400 dark:!bg-gray-700',
            }"
            
            @click="createChannel(CreateGroupType.broadcast)"
          >
            <Icon name="arrow_right" class="w-6 h-6" />
            <span>{{ $t('channel_type_broadcast') }}</span>
          </button>

            </div>
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
              'faded still text-dark-300  dark:text-gray-400 dark:!bg-gray-700' : !form.type,
            }"
            :disabled="!form.type"
            @click="layout.isShowCreatePublicChannelModal = true"
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

import { ShowControl,CreateGroupType } from '@/enum'
import BaseModal from './BaseModal.vue'
import { realRandomString, sleep } from '@/utils/util'
import { Channel } from '@/@types/talk'
import { watch } from 'vue'
import { fromBase64 } from 'js-base64'
import { debug } from 'console'
import { useRouter } from 'vue-router'
const form = useChannelFormStore()
const router = useRouter()
//form.type = GroupChannelType.PublicText

const userStore = useUserStore()
const layout = useLayoutStore()
const talk = useTalkStore()


function createChannel(type:CreateGroupType){

  switch(type){
    case CreateGroupType.public:
      form.type = GroupChannelType.PublicText
      break;
    case CreateGroupType.broadcast:
      form.type = GroupChannelType.Broadcast
      break;
  }


}


</script>
