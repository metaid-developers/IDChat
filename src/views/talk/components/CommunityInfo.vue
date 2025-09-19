<template>
  <CreatePublicChannelModal v-if="layout.isShowCreatePublicChannelModal" />
  <CreateConsensualChannelModal v-if="layout.isShowCreateConsensualChannelModal" />
  <CreateGeneralChannelModal v-if="layout.isShowCreateGeneralChannelModal" />
  <!-- <CreateDaoModal v-if="layout.isShowCreateDaoModal" /> -->
  <CommunityInfoModal v-if="layout.isShowCommunityInfoModal" />

  <div
    class="bg-white dark:bg-gray-700 fixed inset-0 fullscreen w-screen z-40 lg:static lg:shrink-0 lg:w-auto"
    :class="[layout.isShowLeftNav ? '' : 'hidden lg:block']"
  >
    <div class="w-full h-full flex">
      <div class="shrink-0 bg-white w-22.5 lg:hidden"></div>
      <div class="flex grow">
        <!-- 社区详情栏 -->
        <div
          class="h-full bg-dark-100 dark:bg-gray-800 grow w-60 flex flex-col justify-between items-stretch relative"
        >
          <button
            class="absolute top-[16PX] right-[16PX] flex items-center justify-center outline-0 z-[90] lg:!hidden"
            @click="  layout.$patch({ isShowLeftNav: false,isShowContactList:false })"
          >
            <Icon
              name="x_mark"
              class="w-4 h-4 text-dark-400 dark:text-gray-200 cursor-pointer rounded-full bg-gray-200/40 dark:bg-gray-900/40 p-2 box-content"
            />
          </button>

          <div class="flex flex-col overflow-x-hidden">
            <!-- 社区封面 -->
            <div class="w-full aspect-[4/3] mb-1" v-if="talk.activeCommunity?.cover">
              <Image
                :src="talk.activeCommunity?.cover"
                :customClass="'object-cover object-center w-full aspect-[4/3]'"
              />
            </div>

            <!-- 社区信息 -->
            <div class="px-3 overflow-y-auto">
              <!-- 社区名 -->
              <div
                class="w-full mt-4 truncate text-lg font-medium lg:hover:underline cursor-pointer"
                :title="talk.activeCommunity?.name"
                @click="layout.isShowCommunityInfoModal = true"
              >
                {{ talk.activeCommunity?.name }}
              </div>

              <!-- 社区MetaName -->
              <!-- <div
                class="w-full mt-2 flex items-center justify-between space-x-2 cursor-pointer"
                :title="talk.activeCommunitySymbolInfo.name"
                v-if="talk.activeCommunity?.metaName"
                @click="checkoutMetaName()"
              >
                <MetaNameDisplay
                  :name="talk.activeCommunity?.metaName"
                  :colorful="true"
                  :text-class="'!text-sm truncate'"
                />

                <Icon
                  name="chevron_right"
                  class="w-3 h-3 text-dark-800 dark:text-gray-100 shrink-0"
                />
              </div>

              <div v-else class="mt-2 w-full">
                <EmptyPit />
              </div> -->

              <div
                class="mt-4.5 text-xs text-dark-400 dark:text-gray-200 leading-kinda-loose break-all font-normal max-h-36 overflow-y-scroll"
              >
                {{ talk.activeCommunity?.description || $t('Talk.Community.no_introduction') }}
              </div>

              <!-- 社区介绍 -->
              <div
                class="mt-4.5 flex w-full items-center justify-between cursor-pointer"
                @click="layout.isShowMemberList = !layout.isShowMemberList"
              >
                <div
                  class="flex items-center justify-between text-xs space-x-2 text-dark-300 dark:text-gray-400"
                >
                  <div class="w-1.5 h-1.5 bg-lime-500 rounded-full"></div>
                  <div class="flex space-x-0.5">
                    <div class="">{{ talk.activeCommunity?.memberTotal || 0 }}</div>
                    <div class="capitalize">
                      {{ $t('Talk.Community.members', talk.activeCommunity?.memberTotal || 0) }}
                    </div>
                  </div>
                </div>
                <Icon name="chevron_right" class="w-3 h-3 text-dark-800 dark:text-gray-100" />
              </div>

              <div
                class="py-8 flex flex-col gap-y-3  border-t border-solid border-dark-200 dark:border-gray-600 pt-4.5 mt-4.5"
              >
                <!-- 管理頻道 -->
                <template v-if="talk.isAdmin()">
                  <div class="uppercase text-dark-400 dark:text-gray-200 text-xs">
                    {{ $t('Talk.Community.settings') }}
                  </div>

                  <div
                    class="py-3 px-2 main-border only-bottom cursor-pointer !bg-white dark:!bg-gray-700 relative group mb-4"
                    :class="'settings' === talk.activeChannelId || 'faded'"
                    @click="popSettingsModal()"
                  >
                    <div
                      class="text-dark-800 dark:text-gray-100 text-sm font-medium flex items-center"
                      :title="$t('Talk.Community.settings')"
                    >
                      <Icon name="hashtag" class="w-5 h-4 text-dark-400 dark:text-gray-200" />
                      <div class="ml-1 truncate grow capitalize">
                        {{ $t('Talk.Community.settings_short') }}
                      </div>
                      <Icon
                        name="settings"
                        class="w-4 h-4 text-dark-800 dark:text-gray-100 box-content ml-auto"
                      />
                    </div>
                  </div>
                </template>

                <!-- 功能頻道 -->
                <!-- <div class="flex justify-between">
                  <div class="uppercase text-dark-400 dark:text-gray-200 text-xs">
                    {{ $t('Talk.Community.general_channels') }}
                  </div>
                
                </div> -->

                <!-- <CommunityChannelItem
                  v-for="channel in generalChannels"
                  :key="channel.id"
                  :channel="channel"
                  :has-buttons="false"
                /> -->

                <!-- 公共頻道 -->
                <div
                  class="flex justify-between mt-4"
                  v-if="talk.activeCommunityPublicChannels.length || talk.isAdmin()"
                >
                  <div class="uppercase text-dark-400 dark:text-gray-200 text-xs">
                    {{ $t('Talk.Community.public_channels') }}
                  </div>
                  <Icon
                    name="plus"
                    class="w-4 h-4 text-black dark:text-white cursor-pointer"
                    v-if="talk.isAdmin()"
                    @click="layout.isShowCreatePublicChannelModal = true"
                  />
                </div>

                <TransitionGroup name="list" tag="div" class="flex flex-col gap-y-3 relative">
                  <CommunityChannelItem
                    v-for="channel in talk.activeCommunityPublicChannels"
                    :key="channel.uuid"
                    :channel="channel"
                  />
                </TransitionGroup>

                <!-- 凭证頻道 -->
                <div
                  class="flex justify-between mt-4"
                  v-if="talk.activeCommunityConsensualChannels.length || talk.isAdmin()"
                >
                  <div class="uppercase text-dark-400 dark:text-gray-200 text-xs">
                    {{ $t('Talk.Community.consensual_channels') }}
                  </div>
                  <Icon
                    name="plus"
                    class="w-4 h-4 text-black dark:text-white cursor-pointer"
                    v-if="talk.isAdmin()"
                    @click="layout.isShowCreateConsensualChannelModal = true"
                  />
                </div>

                <TransitionGroup name="list">
                  <CommunityChannelItem
                    v-for="channel in talk.activeCommunityConsensualChannels"
                    :key="channel.uuid"
                    :channel="channel"
                  />
                </TransitionGroup>
              </div>
            </div>
          </div>

          <!-- 用户信息设置 -->
          <!-- <UserProfile class="shrink-0" /> -->
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { useLayoutStore } from '@/stores/layout'
import { useTalkStore } from '@/stores/talk'
import { useCommunityUpdateFormStore } from '@/stores/forms'

import CreatePublicChannelModal from './modals/CreatePublicChannelModal.vue'
import CreateConsensualChannelModal from './modals/CreateConsensualChannelModal.vue'
import CreateGeneralChannelModal from './modals/CreateGeneralChannelModal.vue'
import CreateDaoModal from './modals/CreateDaoModal.vue'
import CommunityInfoModal from './modals/community/Info.vue'
import CommunityChannelItem from './CommunityChannelItem.vue'
import MetaNameDisplay from '@/components/MetaName/Display.vue'
import EmptyPit from '@/components/MetaName/EmptyPit.vue'
import { EnvMode } from '@/enum'

const layout = useLayoutStore()
const talk = useTalkStore()
const i18n = useI18n()
const router = useRouter()

const popSettingsModal = () => {
  const form = useCommunityUpdateFormStore()
  form.original = talk.activeCommunity
  form.name = talk.activeCommunity?.name || ''
  form.description = talk.activeCommunity?.description || ''
  layout.isShowCommunitySettingsModal = true
}

// 功能頻道列表
// const generalChannels = computed(() => {
//   return talk.generalChannels
//     .filter(channel => {
//       console.log('channel', channel, talk.activeCommunityId, import.meta.env.MODE)

//       // 如果社区没有metaname，不显示topics頻道
//       if (channel.id === 'topics' && !talk.activeCommunity?.metaName) {
//         return false
//       } else if (import.meta.env.MODE == 'mainnetgray' && channel.id === 'DAO') {
//         return true
//       } else if (
//         channel.id === 'DAO' &&
//         talk.activeCommunityId !==
//           'f28bebcaabde3f60b5241324c206443123f59ed3432c2960cd59baa8b27081fa' &&
//         talk.activeCommunityId !==
//           'd0b8c48101e13739ab71458e0d3de4b683b21142e359d06e0f43ca85bb64a1b6'
//       ) {
//         return false
//       }

//       return true
//     })
//     .map(channel => {
//       return {
//         id: channel.id,
//         name: i18n.t(channel.nameKey),
//       }
//     })
// })

function checkoutMetaName() {
  if (!talk.activeCommunity?.metaName) return

  // 如果不是.metaid方案，则不处理
  if (!talk.activeCommunity?.metaNameNft?.startsWith('metacontract://')) return

  // 路由跳转
  const metaNameNft = talk.activeCommunity?.metaNameNft
  // 解析出三元组:先去掉开头的metacontract://, 再用/分割
  const [codehash, genesis, tokenIndex] = metaNameNft.replace('metacontract://', '').split('/')

  router.push({
    name: 'nftDetail',
    params: {
      chain: 'mvc',
      genesis,
      codehash,
      tokenIndex,
    },
  })
}
</script>

<style lang="scss" scoped>
*::-webkit-scrollbar {
  width: 0px !important;
}

// .list-leave-active,
.list-move, /* apply transition to moving elements */
.list-enter-active {
  transition: all 0.5s ease !important;
}

// .list-leave-to,
.list-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

// /* ensure leaving items are taken out of layout flow so that moving
//    animations can be calculated correctly. */
// .list-leave-active {
//   position: absolute;
//   width: 100%;
// }
</style>
