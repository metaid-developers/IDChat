<template>
  <div class="h-full flex flex-col justify-center items-center">
    <h3 class="text-xl lg:text-2xl text-dark-800 dark:text-gray-100 capitalize font-thin">
      {{ $t('Talk.Channel.welcome') }}
    </h3>
    <h3
      class="text-2xl lg:text-3xl mt-1 meta-name with-reflection text-center"
      :class="talk.activeCommunitySymbolInfo.suffix === 'eth' && 'ens'"
    >
      {{ talk.activeCommunity?.name }}
    </h3>

    <!-- 功能 -->
    <div class="flex flex-col items-center mt-12 space-y-2">
      <div
        class="p-3 w-[80vw] lg:w-90 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-between cursor-pointer group"
        v-for="utility in visibleUtilities"
        :key="utility.name"
        @click="utility.action"
      >
        <div class="flex items-center space-x-3">
          <Icon
            :name="utility.icon"
            class="w-6 h-6 text-dark-800 dark:text-gray-100 rounded-full p-1.5 cursor-pointer box-content"
            :class="utility.bgColor"
          />
          <p class="text-base group-hover:underline dark:text-gray-100">{{ $t(utility.name) }}</p>
        </div>

        <Icon name="chevron_right" class="w-4 h-4 text-dark-800 dark:text-gray-100" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCommunityUpdateFormStore } from '@/stores/forms'
import { useLayoutStore } from '@/stores/layout'
import { useTalkStore } from '@/stores/talk'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const talk = useTalkStore()
const layout = useLayoutStore()
const router = useRouter()

const utilities = ref([
  {
    name: 'Talk.Channel.utilities.invite',
    icon: 'user_plus',
    bgColor: 'bg-green-400',
    action: () => {
      talk.inviteLink = `${location.origin}/talk/channels/${talk.activeCommunitySymbol}/index`
      talk.invitingChannel = {
        community: talk.activeCommunity,
        channel: null,
      }
      layout.isShowInviteModal = true
    },
  },
  {
    name: 'Talk.Channel.utilities.settings',
    icon: 'sparkles',
    needsAdmin: true,
    bgColor: 'bg-orange-400',
    action: () => {
      // router.push('/talk/channels/' + talk.activeCommunityId + '/settings')

      const form = useCommunityUpdateFormStore()
      form.original = talk.activeCommunity
      form.name = talk.activeCommunity?.name || ''
      form.description = talk.activeCommunity?.description || ''
      layout.isShowCommunitySettingsModal = true
    },
  },
  // {
  //   name: 'Talk.Channel.utilities.learn',
  //   icon: 'rocket',
  //   bgColor: 'bg-yellow-400',
  //   action: () => {
  //     // 跳转到 https://show3.gitbook.io/show3.0/v/english/
  //     window.open('https://show3.gitbook.io/show3.0/v/english/', '_blank')
  //   },
  // },
  // {
  //   name: 'Talk.Channel.utilities.download',
  //   icon: 'phone',
  //   bgColor: 'bg-blue-400',
  //   action: () => {
  //     // 跳转到 /home
  //     router.push('/home')
  //   },
  // },
])

const visibleUtilities = computed(() => {
  return utilities.value.filter(utility => {
    if (utility.needsAdmin) {
      return talk.isAdmin()
    }
    return true
  })
})
</script>
