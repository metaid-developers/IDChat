<template>
  <TransitionRoot :show="layout.isShowRedPacketOpenModal" :unmount="true">
    <Dialog @close="closeModal" class="relative z-50">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/30"></div>
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div
          class="flex h-full overflow-y-hidden lg:h-auto lg:min-h-full items-center justify-center"
        >
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-75"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-75"
          >
            <DialogPanel
              class="flex w-auto h-auto lg:max-w-screen-sm lg:items-stretch justify-center lg:w-auto relative lg:static lg:h-auto"
            >
              <div class="flex flex-col items-center justify-center group">
                <div class="w-[95vw] lg:w-108 h-15 flex items-end">
                  <img :src="GiftRibbonImg" al="" />
                </div>
                <div
                  class="bg-white rounded-3xl w-[80vw] lg:w-114 h-105 flex flex-col dark:shadow-lg dark:shadow-blue-100/30 items-center"
                >
                  <template v-if="canOpen">
                    <div
                      class="w-full lg:w-114 h-60 bg-gradient-to-tr rounded-t-3xl shadow-md flex flex-col items-center justify-start overflow-x-hidden group-hover:-skew-x-3 group-hover:shadow-xl duration-300 origin-top"
                      :class="[
                        msgChain === 'mvc'
                          ? 'from-[#CBFDE4] to-[#FCEDCE]'
                          : 'from-[#FFF9E7] via-[#FFC86D] to-[#F7A088]',
                      ]"
                    >
                      <UserAvatar
                        :meta-id="message.userInfo?.metaid"
                        :image="message.userInfo?.avatar"
                        :meta-name="''"
                        class="w-15 h-15 rounded-2xl bg-amber-200 mt-7.5"
                        :disabled="true"
                      />
                      <div class="mt-3 text-sm capitalize dark:text-dark-800 ">
                        {{ $t('Talk.Modals.red_packet') }}
                      </div>
                      <div
                        class="text-2xl mt-3 truncate w-full px-6 lg:px-12 text-center dark:text-dark-800"
                      >
                        {{ note }}
                      </div>
                    </div>
                    <div class="w-full flex items-stretch justify-center grow relative">
                      <div
                        class="absolute top-0 w-28 h-28 rounded-full gift-button-gradient flex items-center justify-center text-dark-800 text-xl capitalize -translate-y-1/2 border-2 border-b-5 border-solid border-dark-300 shadow-xl box-content font-medium group-hover:-translate-y-[53%] group-hover:skew-x-1 origin-bottom duration-300 cursor-pointer hover:text-amber-500 hover:shadow-[#5A4015]-300/40 hover:border-[#5A4015]-300"
                        @click="tryOpenRedPacket"
                      >
                        <img :src="msgChain === 'mvc' ? MvcImg : BtcImg" al="" />
                        <!-- {{ $t('Talk.Modals.receive') }} -->
                      </div>
                      <div
                        class="w-15 bg-gradient-to-br from-[#F5FFE4] to-[#FCEDCE]"
                        :class="[
                          msgChain === 'btc'
                            ? 'from-[#FFE0AD]  to-[#FFEFD0]'
                            : 'from-[#F5FFE4] to-[#FCEDCE]',
                        ]"
                      ></div>
                    </div>
                  </template>

                  <template v-else>
                    <div
                      class="self-stretch h-15 bg-gradient-to-tr from-[#CBFDE4] to-[#FCEDCE] rounded-t-3xl"
                      :class="[
                        msgChain === 'btc'
                          ? 'from-[#FFE0AD]  to-[#FFEFD0]'
                          : 'from-[#CBFDE4] to-[#FCEDCE]',
                      ]"
                    ></div>

                    <UserAvatar
                      :meta-id="message.userInfo?.metaid"
                      :image="message.userInfo?.avatar"
                      :meta-name="''"
                      class="w-15 h-15 rounded-2xl bg-amber-200 mt-7.5"
                      :disabled="true"
                    />
                    <div class="mt-3 text-sm text-dark-300 capitalize">
                      {{ $t('Talk.Modals.red_packet') }}
                    </div>
                    <div
                      class="text-2xl mt-3 truncate w-full px-6 lg:px-12 text-center dark:text-dark-800"
                    >
                      {{ note }}
                    </div>

                    <div
                      class="mt-10 text-sm text-dark-300"
                      v-if="rejectReason.reason === 'all claimed'"
                    >
                      {{ $t('Talk.Modals.red_packet_all_claimed') }}
                    </div>
                    <!-- <template v-else>
                      <div class="mt-10 text-sm text-dark-300">
                        {{ $t('Talk.Modals.red_packet_no_token') }}
                      </div>
                      <div class="flex items-center text-sm mt-2">
                        <Image
                          v-if="requireNft?.icon"
                          :src="requireNft?.icon"
                          customClass="w-10 h-10 rounded-md"
                        />
                        <div class="ml-2 flex flex-col items-start">
                          <div class="font-medium text-sm">{{ requireNft?.name }}</div>
                          <div class="text-xs capitalize font-bold text-amber-400">
                            {{ requireNft?.chain }}
                          </div>
                        </div>
                      </div>
                    </template> -->

                    <div
                      class="mt-4 text-sm text-link flex space-x-px items-center cursor-pointer hover:underline"
                      @click="viewDetails"
                    >
                      <span>
                        {{ $t('Talk.Modals.view_details') }}
                      </span>
                      <Icon name="chevron_right" class="w-4 h-4" />
                    </div>
                  </template>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script lang="ts" setup>
import { useLayoutStore } from '@/stores/layout'
import { Dialog, DialogPanel, TransitionRoot, TransitionChild } from '@headlessui/vue'
import GiftRibbonImg from '@/assets/images/gift_ribbon.svg?url'
import MvcImg from '@/assets/images/mvc_gift.svg?url'
import BtcImg from '@/assets/images/btc_gift.svg?url'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getOneRedPacket, getRedPacketRemains, grabRedPacket } from '@/api/talk'
import { useTalkStore } from '@/stores/talk'
import { useModalsStore } from '@/stores/modals'
import { debounce, sleep } from '@/utils/util'
import { useUserStore } from '@/stores/user'
import { RedPacketDistributeType } from '@/enum'
import { GetNFT } from '@/api/aggregation'

const layout = useLayoutStore()
const modals = useModalsStore()

const message = modals.openRedPacket?.message
const i18n = useI18n()
const talk = useTalkStore()
const user = useUserStore()
const remains = ref([])
const requireNft = ref()

console.log('message', message, { ...modals.openRedPacket.message })
const redPacket = computed(() => {
  return modals.openRedPacket.redPacketInfo
})

const msgChain = computed(() => {
  return message.chain
})

const distributeType = computed(() => {
  return redPacket.value?.requireType
})

const canOpen = computed(() => {
  if (distributeType.value === RedPacketDistributeType.Random) {
    return remains.value.length > 0
  }

  //return redPacket.value?.tokenCount > 0
  return +redPacket.value?.usedCount < +redPacket.value?.count
})

const rejectReason = computed(() => {
  if (remains.value.length === 0) {
    return { reason: 'all claimed' }
  }

  // if (redPacket.value?.tokenCount === 0) {
  //   //
  //   return {
  //     reason: 'no token',
  //   }
  // }

  return {
    reason: '',
  }
})

const note = computed(() => {
  return message?.data?.content || i18n.t('Talk.Channel.default_red_envelope_message')
})

const tryOpenRedPacket = async () => {
  try {
    layout.isShowLoading = true
    const params: any = {
      groupId: talk.activeChannelId,
      pinId: `${message?.txId}i0`,
      metaId: talk.selfMetaId,
      address: talk.selfAddress,
    }
    const redPacketType = redPacket.value?.requireType
    if (redPacketType === '2') {
      // params.address = talk.selfAddress
    } else if (redPacketType === '2001' || redPacketType === '2002') {
      //params.address = user.user?.evmAddress
    }

    await grabRedPacket(params)
    await sleep(1000)
    layout.isShowLoading = false
    await viewDetails()
  } catch (error) {
    layout.isShowLoading = false
    ElMessage.error((error as any).toString())
  }
}

const viewDetails = async () => {
  talk.addReceivedRedPacketId(message?.txId)

  const redPacketInfo = await getOneRedPacket({
    groupId: talk.activeChannelId,
    pinId: `${message?.txId}i0`,
  })

  modals.redPacketResult = redPacketInfo

  modals.openRedPacket = null
  layout.isShowRedPacketOpenModal = false
  layout.isShowRedPacketResultModal = true
}

const closeModal = () => {
  modals.openRedPacket = null
  layout.isShowRedPacketOpenModal = false
}

onMounted(async () => {
  const groupId = talk.activeChannelId
  const pinId = `${message?.txId}i0`
  const params: any = {
    groupId,
    pinId,
  }
  const redPacketType = redPacket.value?.requireType
  if (redPacketType === '2') {
    params.address = talk.selfAddress
  } else if (redPacketType === '2001' || redPacketType === '2002') {
    // params.address = user.user?.evmAddress
  }
  getRedPacketRemains(params).then(res => {
    remains.value = res.unused
    console.log('remains', remains.value)
  })

  // 如果是nft红包，获取nft信息
  if (redPacketType === '2001' || redPacketType === '2' || redPacketType === '2002') {
    let chain
    if (redPacketType === '2001') {
      //chain = import.meta.env.VITE_ETH_CHAIN
    } else if (redPacketType === '2002') {
      //chain = import.meta.env.VITE_POLYGON_CHAIN
    } else {
      chain = 'mvc'
    }
    const {
      data: {
        results: { items },
      },
    } = await GetNFT({
      codehash: redPacket.value?.requireCodehash,
      genesis: redPacket.value?.requireGenesis,
      chain,
      tokenIndex: 0,
    })
    requireNft.value = {
      icon: items[0].nftIcon,
      name: items[0].nftName,
      seriesName: items[0].nftSeriesName || items[0].nftName,
      chain,
    }
    console.log('nftInfo', requireNft.value)
  }
})
</script>

<style lang="scss" scoped>
.gift-button-gradient {
  background: linear-gradient(221deg, #faecd4 9%, #f0d5a8 36%, #f0d5a8 70%, #f0d5a8 90%);
  border: 2px solid #5a4015;
  box-shadow: 0px 4px 0px 0px #5a4015;
}
</style>
