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
                      {{ nicerAmountWithUnit(myDraw?.luckyAmount || '0').amount }}
                    </div>
                    <div class="text-sm">
                      {{ nicerAmountWithUnit(myDraw?.luckyAmount || '0').unit }}
                    </div>
                  </div>
                  <div class="mt-2 flex items-end space-x-1">
                    <div class="text-sm">
                      (total:{{
                        nicerAmountWithUnit(redPacketResult?.luckyTotalAmount || '0').amount
                      }}
                      {{ nicerAmountWithUnit(redPacketResult?.luckyTotalAmount || '0').unit }})
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
                    class="h-[218px] self-stretch flex flex-col items-stretch overflow-y-auto divide-y divide-solid divide-gray-100 px-2 -mx-2 no-dark"
                  >
                    <div
                      class="flex items-center justify-between py-2.5 lg:py-3"
                      v-for="draw in sortedDraws"
                      :key="draw.gradMetaId + draw.timestamp"
                    >
                      <div class="flex space-x-2 lg:space-x-3 items-center flex-1 min-w-0">
                        <UserAvatar
                          :meta-id="draw.userInfo?.metaid"
                          :image="draw.userInfo?.avatar"
                          :meta-name="''"
                          class="w-10 h-10 lg:w-12 lg:h-12 flex-shrink-0"
                        />

                        <div
                          class="flex flex-col lg:flex-row lg:space-x-3 lg:items-center space-y-0.5 lg:space-y-0 items-start flex-1 min-w-0"
                        >
                          <UserName
                            :name="draw.userInfo?.name || draw.userInfo?.metaid?.slice(0, 6)"
                            :meta-name="''"
                            :no-tag="true"
                            class="truncate text-sm lg:text-base"
                          />
                          <span class="text-xs text-dark-250 whitespace-nowrap">
                            {{ formatTimestamp(draw.timestamp, i18n) }}
                          </span>
                        </div>
                      </div>

                      <div
                        class="flex flex-col space-y-1 items-end flex-shrink-0 bg-white lg:bg-transparent px-2 lg:px-0 py-1 lg:py-0 rounded lg:rounded-none"
                      >
                        <!-- 移动端：金额单独一行 -->
                        <div class=" text-sm text-dark-800 font-medium text-right">
                          <span class="whitespace-nowrap">
                            {{ nicerAmountWithUnit(draw.luckyAmount).amount }}
                            <span class="text-xs text-dark-400">{{
                              nicerAmountWithUnit(draw.luckyAmount).unit
                            }}</span>
                          </span>
                        </div>

                        <!-- 移动端：标签和按钮一行 -->
                        <div class="flex  items-center space-x-1 justify-end">
                          <span
                            v-if="draw.luckyAmount >= luckiestAmount"
                            class="bg-amber-400 text-white rounded px-0.5 py-0.5 whitespace-nowrap text-xxs"
                          >
                            {{ $t('Talk.Modals.lucky') }}
                          </span>

                          <span
                            class="py-0.5 px-1 text-xxs text-white rounded whitespace-nowrap"
                            :class="grayState(draw.gradState)?.color"
                          >
                            {{ grayState(draw.gradState)?.state }}
                          </span>
                          <button
                            v-if="draw.gradState == GrabStatus.broadCastSuccess"
                            @click="toMvcScan(draw.gradTxId)"
                            class="w-4 h-4 flex items-center justify-center rounded text-dark-400 cursor-pointer hover:text-dark-800 hover:border-solid hover:border-dark-300 hover:bg-amber-400 transition-all duration-300 flex-shrink-0"
                          >
                            <Icon
                              name="link"
                              class="w-2.5 h-2.5 p-0.5 box-content text-gray-500 hover:text-white cursor-pointer"
                            />
                          </button>
                        </div>

                        <!-- 桌面端：保持原来的横向布局 -->
                        <div
                          class="hidden  text-sm text-dark-800 font-medium items-center space-x-1"
                        >
                          <span class="whitespace-nowrap">
                            {{ nicerAmountWithUnit(draw.luckyAmount).amount }}
                            <span class="text-xs text-dark-400">{{
                              nicerAmountWithUnit(draw.luckyAmount).unit
                            }}</span>
                          </span>
                          <span
                            v-if="draw.luckyAmount >= luckiestAmount"
                            class="bg-amber-400 text-white rounded px-1 py-0.5 whitespace-nowrap text-xxs"
                          >
                            {{ $t('Talk.Modals.lucky') }}
                          </span>

                          <span
                            class="py-0.5 px-1 text-xs text-white rounded whitespace-nowrap"
                            :class="grayState(draw.gradState)?.color"
                          >
                            {{ grayState(draw.gradState)?.state }}
                          </span>
                          <button
                            v-if="draw.gradState == GrabStatus.broadCastSuccess"
                            @click="toMvcScan(draw.gradTxId)"
                            class="w-5 h-5 flex items-center justify-center rounded text-dark-400 cursor-pointer hover:text-dark-800 hover:border-solid hover:border-dark-300 hover:bg-amber-400 transition-all duration-300 flex-shrink-0"
                          >
                            <Icon
                              name="link"
                              class="w-3 h-3 p-1 box-content text-gray-500 hover:text-white cursor-pointer"
                            />
                          </button>
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
import { GetNFT } from '@/api/aggregation'
import { nftSeries } from '@/utils/series'
import Decimal from 'decimal.js-light'
// import { toMvcScan } from '@/utils/util'
import { GrabStatus } from '@/enum'
import { useSimpleTalkStore } from '@/stores/simple-talk'
const layout = useLayoutStore()
const modals = useModalsStore()
const talk = useSimpleTalkStore()
const i18n = useI18n()
const requireNft = ref()
const toMvcScan = (txId: string) => {
  if (redPacketResult.type == 'btc') {
    window.open(`https://mempool.space/tx/${txId}`, '_blank')
  } else {
    window.open(`https://mvcscan.com/tx/${txId}`, '_blank')
  }
}
const closeModal = () => {
  modals.redPacketResult = null
  layout.isShowRedPacketResultModal = false
}

const redPacketResult = modals.redPacketResult

console.log('redPacketResult', redPacketResult)
const note = computed(() => {
  return redPacketResult?.content || i18n.t('Talk.Channel.default_red_envelope_message')
})
const draws = computed(() => {
  return (redPacketResult?.payList || []).filter(
    (item: any) => item.used === true || item.isWithdraw === true
  )
})

const unit = computed(() => {
  return redPacketResult?.type?.toUpperCase() === 'METACONTRACT-FT'
    ? redPacketResult.tickInfo?.symbol
    : redPacketResult?.type?.toUpperCase() || 'SPACE'
})
const sortedDraws = computed(() => {
  return draws.value.sort((a: any, b: any) => b.timestamp - a.timestamp)
})
const luckiestAmount = computed(() => {
  const amount = Math.max(...draws.value.map((item: any) => Number(item.luckyAmount)))
  return amount
})

function grayState(state: GrabStatus) {
  switch (state) {
    case GrabStatus.grabSuccess:
      return {
        state: 'Pending',
        color: 'bg-amber-300',
      }
    case GrabStatus.grabSuccessAndBroadcastPending:
      return {
        state: 'Pending',
        color: 'bg-amber-300',
      }
    case GrabStatus.broadCastSuccess:
      return {
        state: 'Success',
        color: 'bg-lime-400',
      }
    case GrabStatus.grabSuccessAndBroadcastFail:
      return {
        state: 'Fail',
        color: 'bg-rose-600',
      }

    default:
      break
  }
}

const nicerAmountWithUnit = (amount: string) => {
  if (!amount) {
    return {
      amount: '0',
      unit: '',
    }
  }

  const amountNumber = new Decimal(amount)
    .div(10 ** (redPacketResult.tickInfo?.decimal || 8))
    .toNumber()
  // if (amountNumber >= 100_000_000) {
  //   return {
  //     amount: `${(amountNumber / 100_000_000).toFixed(2)}`,
  //     unit: 'SPACE',
  //   }
  // }

  return {
    amount: amountNumber,
    unit: unit.value,
  }
}

const myDraw = computed(() => {
  return draws.value.find((item: any) => item.gradMetaId === talk.selfMetaId)
})

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
