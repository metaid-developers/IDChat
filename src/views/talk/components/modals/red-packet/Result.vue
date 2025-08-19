<template>
  <TransitionRoot :show="layout.isShowRedPacketResultModal" :unmount="true">
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
              class="flex w-auto h-auto lg:max-w-screen-sm lg:items-stretch justify-center lg:w-auto relative lg:static lg:h-auto text-dark-800"
            >
              <div class="flex flex-col items-center justify-center">
                <div class="w-[95vw] lg:w-108 h-15 flex items-end">
                  <img :src="GiftRibbonImg" al="" />
                </div>

                <div
                  class="bg-white rounded-3xl w-[90vw] lg:w-114 flex flex-col dark:shadow-lg dark:shadow-blue-100/30 items-center p-7.5"
                >
                  <div class="flex justify-end self-stretch">
                    <button @click="closeModal" class="outline-none">
                      <Icon
                        name="x"
                        class="w-6 h-6 box-content text-dark-400 bg-dark-200 rounded-full p-1.5"
                      />
                    </button>
                  </div>
                  <UserAvatar
                    :meta-id="redPacketResult?.userInfo?.metaid"
                    :image="redPacketResult?.userInfo?.avatar"
                    :meta-name="''"
                    class="w-15 h-15 rounded-2xl mt-4.5"
                    :disabled="true"
                  />
                  <div class="mt-4 text-sm text-dark-300 capitalize font-bold">
                    {{ $t('Talk.Modals.red_packet') }}
                  </div>
                  <div class="text-lg truncate w-full px-6 lg:px-12 text-center text-amber-400">
                    {{ note }}
                  </div>

                  <div class="mt-5 flex items-end space-x-1" v-if="myDraw">
                    <div class="text-4xl font-bold tracking-tight">
                      {{ nicerAmountWithUnit(myDraw?.amount).amount }}
                    </div>
                    <div class="text-base">
                      {{ nicerAmountWithUnit(myDraw?.amount).unit }}
                    </div>
                  </div>
                  <!-- <div class="mt-2 text-sm text-dark-300 font-bold font-sans">
                    ≈ 723.00 CNY
                  </div> -->

                  <div
                    class="mt-7.5 mb-1.5 flex items-center justify-between self-stretch text-sm text-dark-300"
                  >
                    <div class="">{{ $t('Talk.Modals.Draws') }}</div>
                    <div class="">
                      {{ `${$t('Talk.Modals.opened')} ${draws.length} / ${redPacketResult.count}` }}
                    </div>
                  </div>

                  <div
                    class="h-[218PX] self-stretch flex flex-col items-stretch overflow-y-auto divide-y divide-solid divide-gray-100 px-2 -mx-2 no-dark"
                  >
                    <div class="flex items-center justify-between py-3" v-for="draw in sortedDraws">
                      <div class="flex space-x-3 items-center">
                        <UserAvatar
                          :meta-id="draw.userInfo?.metaid"
                          :image="draw.userInfo?.avatar"
                          
                          :meta-name="''"
                          class="w-12 h-12"
                        />

                      <UserName
                      :name="draw.userInfo?.name"
                      :meta-name="''"
                      :no-tag="true"
                      />

                        <div class="flex flex-col space-y-0.5 items-start">
                          <span :class="['text-sm text-dark-800 font-medium']">{{
                            draw.name
                          }}</span>
                          <span class="text-xs text-dark-250">
                            {{ formatTimestamp(draw.timestamp, i18n) }}
                          </span>
                        </div>
                      </div>

                      <div class="flex flex-col space-y-1 items-end">
                        <div class="text-sm text-dark-800 font-medium flex items-center space-x-2">
                          <span>
                            {{
                              nicerAmountWithUnit(draw.amount).amount +
                                ' ' +
                                nicerAmountWithUnit(draw.amount).unit
                            }}
                          </span>
                          <span
                            v-if="draw.amount >= luckiestAmount"
                            class="text-xxs bg-amber-400 text-white rounded-md px-1 py-0.5"
                          >
                            {{ $t('Talk.Modals.lucky') }}
                          </span>
                        </div>
                        <!-- <div class="text-xs text-dark-250 font-sans">≈ 723.00 CNY</div> -->
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center min-h-10 mt-4" v-if="requireNft">
                    <span class="text-xs text-dark-300 dark:text-gray-400">{{
                      $t('Talk.Modals.red_packet_require_nft')
                    }}</span>
                    <div class="flex items-center text-sm ml-2">
                      <img
                        :src="requireNft.iconUrl"
                        alt=""
                        v-if="requireNft.iconUrl"
                        class="w-10 h-10 rounded-md"
                      />
                      <Image
                        v-else-if="requireNft.icon"
                        :src="requireNft.icon"
                        custom-class="w-10 h-10 rounded-md"
                      />
                      <div class="ml-2 flex flex-col items-start">
                        <div class="font-medium text-base">{{ requireNft.name }}</div>
                        <div class="text-xs capitalize font-bold text-amber-400">
                          {{ requireNft.chain }}
                        </div>
                      </div>
                    </div>
                  </div>
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
import { Dialog, DialogPanel, TransitionRoot, TransitionChild } from '@headlessui/vue'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useLayoutStore } from '@/stores/layout'
import { useModalsStore } from '@/stores/modals'
import GiftRibbonImg from '@/assets/images/gift_ribbon.svg?url'
import { formatTimestamp } from '@/utils/talk'
import { useTalkStore } from '@/stores/talk'
import { GetNFT } from '@/api/aggregation'
import { nftSeries } from '@/utils/series'

const layout = useLayoutStore()
const modals = useModalsStore()
const talk = useTalkStore()
const i18n = useI18n()
const requireNft = ref()

const closeModal = () => {
  modals.redPacketResult = null
  layout.isShowRedPacketResultModal = false
}

const redPacketResult = modals.redPacketResult

console.log("redPacketResult",redPacketResult)
const note = computed(() => {
  return redPacketResult?.content || i18n.t('Talk.Channel.default_red_envelope_message')
})
const draws = computed(() => {
  return (redPacketResult?.payList || []).filter((item: any) => item.used === true || item.isWithdraw === true)
})
const myDraw = computed(() => {
  return draws.value.find((item: any) => item.gradMetaId === talk.selfMetaId)
})
const sortedDraws = computed(() => {
  return draws.value.sort((a: any, b: any) => b.timestamp - a.timestamp)
})
const luckiestAmount = computed(() => {
  const amount = Math.max(...draws.value.map((item: any) => Number(item.amount)))
  return amount
})
const nicerAmountWithUnit = (amount: string) => {
  if (!amount) {
    return {
      amount: '0',
      unit: '',
    }
  }

  const amountNumber = Number(amount)
  if (amountNumber >= 100_000_000) {
    return {
      amount: `${(amountNumber / 100_000_000).toFixed(2)}`,
      unit: 'Space',
    }
  }

  return {
    amount,
    unit: 'Sats',
  }
}

onMounted(async () => {
  const requireType = redPacketResult?.requireType
  const needsNft = requireType === '2' || requireType === '2001' || requireType === '2002'

  if (needsNft) {
    // 先从本地速查表查询系列信息
    type seriesKey = keyof typeof nftSeries
    const series = nftSeries[redPacketResult?.requireGenesis as seriesKey]
    console.log({ nftSeries, redPacketResult, series })
    if (series) {
      console.log('here')
      requireNft.value = series
      return
    }

    let chain
    if (requireType === '2001') {
      chain = import.meta.env.VITE_ETH_CHAIN
    } else if (requireType === '2002') {
      chain = import.meta.env.VITE_POLYGON_CHAIN
    } else {
      chain = 'mvc'
    }
    const {
      data: {
        results: { items },
      },
    } = await GetNFT({
      codehash: redPacketResult?.requireCodehash,
      genesis: redPacketResult?.requireGenesis,
      chain,
      tokenIndex: 0,
    })
    requireNft.value = {
      icon: items[0].nftIcon,
      name: items[0].nftSeriesName,
      seriesName: items[0].nftSeriesName || items[0].nftName,
      chain,
    }
  }
})
</script>

<style lang="scss" scoped>
*::-webkit-scrollbar {
  width: 8px;
}

*::-webkit-scrollbar-track {
  background: #edeff2;
}

*::-webkit-scrollbar-thumb {
  background-color: #bfc2cc;
  border-radius: 20px;
}
</style>
