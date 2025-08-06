<template>
  <div
    class="flex items-center py-1 lg:py-2 group cursor-pointer hover:bg-dark-200 hover:dark:bg-gray-900 px-4"
    @click="messageThisGuy"
  >
    <UserAvatar
      :name="member.name"
      :type="member.avatarType"
      :meta-id="member.metaId"
      :image="member.avatarImage"
      :meta-name="''"
      :image-class="'w-9 h-9'"
      class="shrink-0"
    />
    <div class="ml-2 flex flex-col gap-y-px">
      <UserName
        :name="member.name"
        :meta-name="''"
        class="max-w-[160PX] text-sm"
      />
      <div class="text-xxs text-dark-300 dark:text-gray-400" v-if="member.metaId">
        MetaID: {{ member.metaId.substring(0, 6) }}
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useTalkStore } from '@/stores/talk'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

// import UserName from

const props = defineProps(['member'])
const talk = useTalkStore()
const router = useRouter()

const isYou = computed(() => {
  return props.member.metaId === talk.selfMetaId
})

const popMemberMenu = () => {
  if (isYou.value) return
}

const messageThisGuy = () => {
  // 如果是自己，就不要发消息了
  if (isYou.value) return

  const memberMetaId = props.member.metaId
  router.push('/talk/channels/@me/' + memberMetaId)
}
</script>
<style lang=""></style>
