<template>
  <BaseModal
    v-model="layout[ShowControl.isShowRedPacketModal]"
    v-model:show-second-control="layout[ShowControl.isShowChooseTokenModal]"
  >
    <template #title>
      {{ $t('Talk.Modals.create_candy_bags') }}
    </template>

    <template #body>
      <TabGroup>
        <TabList class="w-full bg-dark-100 dark:bg-gray-900 rounded-xl text-base flex font-medium">
          <Tab> </Tab>
          <!-- <Tab
            class="w-full py-3 capitalize border-2 outline-0 rounded-xl transition-[background-color] duration-150"
            :class="[
              activeTab === 'redPacket'
                ? 'border-dark-800 dark:border-gray-500 bg-primary text-dark-800'
                : 'border-transparent',
            ]"
            @click="changeTab('redPacket')"
          >
            {{ $t('Talk.Modals.lucky_candy_bag') }}
          </Tab> -->
          <!-- <Tab
            class="w-full py-3 capitalize border-2 outline-0 rounded-xl transition-[background-color] duration-150"
            :class="[
              activeTab === 'nft'
                ? 'border-dark-800 dark:border-gray-500 bg-primary text-dark-800'
                : 'border-transparent',
            ]"
            @click="changeTab('nft')"
          >
            {{ $t('Talk.Modals.nft_candy_bag') }}
          </Tab> -->
        </TabList>

        <TabPanels>
          <TabPanel class="">
            <form @submit.prevent="() => {}">
              <!-- 红包类型显示 -->

              <!-- 数量 -->
              <div class="my-7.5 flex flex-col space-y-5 text-base">
                <div class="grid grid-cols-4 gap-2 items-center">
                  <div class="capitalize font-medium">{{ $t('Talk.Input.quantity') }}</div>
                  <div class="col-span-3">
                    <input
                      :placeholder="$t('Talk.Input.enter_quantity')"
                      type="number"
                      name="quantity"
                      min="1"
                      step="1"
                      class="main-border w-full p-4 outline-0 faded-switch still dark:bg-gray-700"
                      v-model="form.quantity"
                      @blur="form.validateQuantity"
                    />
                  </div>
                </div>
                <div class="grid grid-cols-4 gap-2 items-center">
                  <div class="capitalize font-medium flex items-center space-x-0.5">
                    <span>{{ $t('Talk.Input.total') }}</span>

                    <Popover class="relative h-4">
                      <PopoverButton>
                        <Icon
                          name="question_mark_circle"
                          class="w-4 h-4 text-gray-700 dark:text-gray-300"
                        />
                      </PopoverButton>

                      <PopoverPanel
                        class="absolute z-50 bg-white dark:bg-gray-700 rounded-lg shadow-md text-sm p-2 w-60"
                      >
                        {{ $t('Talk.Input.total_explain') }}
                      </PopoverPanel>
                    </Popover>
                  </div>
                  <div class="col-span-3 relative flex items-center">
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      class="main-border w-full p-4 outline-0 faded-switch still dark:bg-gray-700"
                      v-model="form.amount"
                      @blur="form.validateAmount"
                    />
                    <div class="absolute right-0 z-10">
                      <Menu as="div" class="relative inline-block">
                        <div class="">
                          <MenuButton
                            v-slot="{ scope }"
                            class="text-base flex items-center font-medium px-3 py-1 outline-0"
                            @click="handleSelectToken"
                          >
                            <span>{{
                              layout.selectedRedPacketType === 'token'
                                ? form.selectedToken
                                  ? form.selectedToken.symbol
                                  : ''
                                : currentUnit
                            }}</span>
                            <Icon name="chevron_right" class="w-5 h-5 text-dark-480" />
                          </MenuButton>
                        </div>

                        <transition
                          enter-active-class="transition duration-100 ease-out"
                          enter-from-class="transform scale-95 opacity-50 translate-y-[-10%]"
                          enter-to-class="transform scale-100 opacity-100"
                          leave-active-class="transition duration-75 ease-in"
                          leave-from-class="transform scale-100 opacity-100"
                          leave-to-class="transform scale-95 opacity-50 translate-y-[-10%]"
                        >
                          <MenuItems
                            class="absolute flex flex-col p-2 bg-white right-0 translate-y-[20PX] rounded-xl shadow-lg z-50 main-border still w-36  dark:!bg-gray-700"
                            v-if="layout.selectedRedPacketType !== 'token'"
                          >
                            <MenuItem v-slot="{ active }">
                              <button class="p-2" type="button" @click="triggleUnit">
                                {{
                                  layout.selectedRedPacketType === 'token'
                                    ? 'Select Token'
                                    : layout.selectedRedPacketType === 'btc'
                                    ? currentUnit == 'BTC'
                                      ? 'Sats'
                                      : 'BTC'
                                    : currentUnit == 'Space'
                                    ? 'Sats'
                                    : 'Space'
                                }}
                              </button>
                            </MenuItem>

                            <!-- <MenuItem v-slot="{ active }">
                            <button class="p-2">MC</button>
                          </MenuItem>
                          <MenuItem v-slot="{ active }">
                            <button class="p-2">ShowCoin</button>
                          </MenuItem> -->
                          </MenuItems>
                        </transition>
                      </Menu>
                    </div>
                  </div>
                </div>
                <div class="grid grid-cols-4 gap-2 items-center">
                  <div class="capitalize font-medium">{{ $t('Talk.Input.blessings') }}</div>
                  <div class="col-span-3">
                    <input
                      type="text"
                      :placeholder="$t('Talk.Input.best_wishes')"
                      class="main-border w-full p-4 outline-0 faded-switch still dark:bg-gray-700"
                      v-model="form.message"
                    />
                  </div>
                </div>
              </div>

              <div class="my-7.5 flex justify-center items-baseline space-x-1">
                <div class="text-4xl font-bold">{{ form.nicerAmount }}</div>
                <div class="text-base">{{ form.selectedToken?.symbol || form.amountUnit }}</div>
              </div>

              <div class="w-full">
                <button
                  class="main-border uppercase font-medium text-base w-full py-3 primary"
                  @click="submit"
                >
                  {{ $t('Talk.Input.send') }}
                </button>
              </div>

              <div class="w-full mt-4 text-xs text-dark-300 text-center">
                {{ $t('Talk.Input.red_packet_refund_tip') }}
              </div>
            </form>
          </TabPanel>

          <!-- NFT -->
          <TabPanel class="">
            <div class="my-7.5 flex flex-col space-y-5 text-base">
              <div class="grid grid-cols-4 gap-2 items-center">
                <div class="capitalize font-medium">{{ $t('Talk.Input.quantity') }}</div>
                <div class="col-span-3">
                  <input
                    :placeholder="$t('Talk.Input.enter_quantity')"
                    type="number"
                    min="1"
                    step="1"
                    class="main-border w-full p-4 outline-0 faded-switch still dark:bg-gray-700"
                    v-model="form.quantity"
                    @blur="form.validateQuantity"
                  />
                </div>
              </div>
              <div class="grid grid-cols-4 gap-2 items-center">
                <div class="capitalize font-medium flex items-center space-x-0.5">
                  <span>{{ $t('Talk.Input.amount_each') }}</span>

                  <Popover class="relative h-4">
                    <PopoverButton>
                      <Icon
                        name="question_mark_circle"
                        class="w-4 h-4 text-gray-700 dark:text-gray-300"
                      />
                    </PopoverButton>

                    <PopoverPanel
                      class="absolute z-50 bg-white dark:bg-gray-700 rounded-lg shadow-md text-sm p-2 w-60"
                    >
                      {{ $t('Talk.Input.amount_each_explain') }}
                    </PopoverPanel>
                  </Popover>
                </div>
                <div class="col-span-3 relative flex items-center">
                  <input
                    type="number"
                    placeholder="0"
                    class="main-border w-full p-4 outline-0 faded-switch still dark:bg-gray-700"
                    v-model="form.each"
                    @blur="form.validateEach"
                  />
                  <div class="absolute right-0 z-10">
                    <Menu as="div" class="relative inline-block">
                      <div class="">
                        <MenuButton
                          class="text-base flex items-center font-medium px-3 py-1 outline-0"
                          @click="isShowSelectTokenModal = !isShowSelectTokenModal"
                        >
                          <span>{{
                            layout.selectedRedPacketType === 'token'
                              ? form.selectedToken
                                ? form.selectedToken.symbol
                                : 'Token'
                              : currentUnit
                          }}</span>
                          <Icon name="chevron_right" class="w-5 h-5 text-dark-480" />
                        </MenuButton>
                      </div>

                      <transition
                        enter-active-class="transition duration-100 ease-out"
                        enter-from-class="transform scale-95 opacity-50 translate-y-[-10%]"
                        enter-to-class="transform scale-100 opacity-100"
                        leave-active-class="transition duration-75 ease-in"
                        leave-from-class="transform scale-100 opacity-100"
                        leave-to-class="transform scale-95 opacity-50 translate-y-[-10%]"
                      >
                        <MenuItems
                          class="absolute p-2 bg-white right-0 translate-y-[20PX] rounded-xl shadow-lg z-50 main-border still w-36 dark:!bg-gray-700"
                        >
                          <MenuItem v-slot="{ active }">
                            <button class="p-2" type="button" @click="triggleUnit">
                              {{
                                layout.selectedRedPacketType === 'token'
                                  ? '选择Token'
                                  : currentUnit == 'Space'
                                  ? 'Sats'
                                  : 'Space'
                              }}
                            </button>
                          </MenuItem>
                          <!-- <MenuItem v-slot="{ active }">
                            <button class="p-2">MC</button>
                          </MenuItem>
                          <MenuItem v-slot="{ active }">
                            <button class="p-2">ShowCoin</button>
                          </MenuItem> -->
                        </MenuItems>
                      </transition>
                    </Menu>
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-4 gap-2 items-center">
                <div class="capitalize font-medium">{{ $t('Talk.Input.blessings') }}</div>
                <div class="col-span-3">
                  <input
                    type="text"
                    :placeholder="$t('Talk.Input.best_wishes')"
                    class="main-border w-full p-4 outline-0 faded-switch still dark:bg-gray-700"
                    v-model="form.message"
                  />
                </div>
              </div>

              <div class="grid grid-cols-4 gap-2 items-center">
                <div class="capitalize font-medium">
                  {{ $t('Talk.Input.required_nft') }}
                </div>
                <div class="col-span-3">
                  <button
                    class="outline-0 main-border w-full px-4 py-3 text-base flex justify-between items-center dark:!bg-gray-700"
                    :class="[!form.nft && 'faded !bg-white dark:!bg-gray-700']"
                    @click="layout.isShowChooseTokenModal = !layout.isShowChooseTokenModal"
                    type="button"
                  >
                    <div class="flex items-center gap-x-3">
                      <template v-if="form.nft">
                        <div class="w-8 h-8 rounded-full">
                          <Image
                            :src="form.nft.nftIcon"
                            customClass="w-8 h-8 box-content rounded"
                          />
                        </div>

                        <span class="text-sm ">
                          {{ form.nft.nftSeriesName }}
                        </span>
                      </template>
                      <template v-else>
                        <Icon
                          name="nft_symbol"
                          class="w-6 h-6 text-dark-300 dark:text-gray-400 box-content group-hover:text-dark-800"
                        />

                        <span class="text-sm text-dark-400 dark:text-gray-200">{{
                          $t('Talk.Input.choose_nft')
                        }}</span>
                      </template>
                    </div>

                    <Icon
                      name="chevron_right"
                      class="w-6 h-6  lg:text-dark-300 lg:dark:text-gray-400 lg:group-hover:text-dark-800 dark:lg:group-hover:text-gray-100 -mr-2 transition-all duration-200"
                    />
                  </button>
                </div>
              </div>
            </div>

            <div class="my-7.5 flex justify-center items-baseline space-x-1">
              <div class="text-4xl font-bold">{{ form.each * form.quantity }}</div>
              <div class="text-base">{{ form.amountUnit }}</div>
            </div>

            <div class="w-full">
              <button
                class="main-border uppercase font-medium text-base w-full py-3 primary"
                :class="{
                  'faded still text-dark-300 dark:!text-gray-400 dark:!bg-gray-700': !form.isFinished,
                }"
                @click="submit"
                :disabled="!form.isFinished"
              >
                {{ $t('Talk.Input.send') }}
              </button>
            </div>

            <div class="w-full mt-4 text-xs text-dark-300 text-center">
              {{ $t('Talk.Input.red_packet_refund_tip') }}
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </template>

    <template #secondTitle>
      <div v-if="isTokenRedPacket">
        Select Token
      </div>
      <div v-else class="flex items-center space-x-3">
        <Listbox v-model="selectedChain">
          <div class="relative mt-1">
            <ListboxButton
              class="relative w-full px-2 py-1 text-center focus:outline-none rounded-xl text-sm border border-solid border-dark-200 dark:border-gray-600 dark:text-gray-100 flex items-center space-x-1"
              v-slot="{ open }"
            >
              <div class="w-7.5 h-7.5 shrink-0 flex items-center justify-center">
                <img :src="selectedChain.icon" class="h-full" />
              </div>
              <span class="block truncate w-12 text-left">{{ selectedChain.name }}</span>
              <Icon
                name="chevron_right"
                :class="[
                  open && 'rotate-90',
                  'w-4 h-4 text-dark-400 dark:text-gray-200 transition duration-200',
                ]"
              />
            </ListboxButton>

            <transition
              enter-active-class="transition duration-100 ease-out"
              enter-from-class="transform scale-95 opacity-0 -translate-y-1/2"
              enter-to-class="transform scale-100 opacity-100"
              leave-active-class="transition duration-75 ease-out"
              leave-from-class="transform scale-100 opacity-100"
              leave-to-class="transform scale-95 opacity-0"
            >
              <ListboxOptions
                class="absolute mt-2 max-h-60 overflow-auto rounded-xl bg-white dark:bg-gray-700 py-2 text-base shadow-md focus:outline-none z-50 border border-solid border-dark-100 dark:border-gray-600 dark:shadow-blue-100/20"
              >
                <ListboxOption
                  v-slot="{ active, selected }"
                  v-for="chain in chains"
                  :key="chain.name"
                  :value="chain"
                  as="template"
                >
                  <li
                    :class="[
                      'relative select-none py-2 p-7.5 text-dark-800 dark:text-gray-100 cursor-pointer flex items-center justify-between min-w-fit group w-45',
                    ]"
                  >
                    <div class="flex items-center space-x-1">
                      <div class="w-7.5 h-7.5 shrink-0 flex items-center justify-center">
                        <img :src="chain.icon" class="h-full" />
                      </div>

                      <span class="shrink-0 group-hover:underline">
                        {{ chain.name }}
                      </span>
                    </div>

                    <Icon
                      name="check_bold"
                      v-if="selected"
                      class="w-3 h-3 inline bg-primary rounded-md p-1 box-content"
                    />
                  </li>
                </ListboxOption>
              </ListboxOptions>
            </transition>
          </div>
        </Listbox>

        <div class="text-left">
          {{ isTokenRedPacket ? '选择Token红包' : $t('Talk.Community.choose_nft') }}
        </div>
      </div>
    </template>

    <template #secondBody>
      <!-- Token红包选择 -->
      <div v-if="isTokenRedPacket" class="h-full flex flex-col">
        <!-- Token余额提示 -->
        <div v-if="form.selectedToken" class="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="flex items-center space-x-2">
            <!-- Token图标 -->
            <div class="relative w-8 h-8">
              <img
                v-if="form.selectedTokenIcon"
                :src="form.selectedTokenIcon"
                :alt="form.selectedToken.symbol"
                class="w-8 h-8 rounded-full object-cover"
                @error="form.selectedTokenIcon = null"
              />
              <div
                v-else
                class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                :style="{ backgroundColor: form.tokenIconBgColor }"
              >
                {{ form.tokenIconText }}
              </div>
            </div>
            <div>
              <div class="font-medium">{{ form.selectedToken.symbol }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                TokenID: {{ form.selectedToken.genesis.replace(/(\w{4})\w+(\w{5})/, '$1...$2') }}
              </div>
            </div>
          </div>
        </div>

        <!-- Token列表 -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="form.availableTokens.length === 0" class="text-center py-8">
            <div class="text-gray-500 dark:text-gray-400">加载Token余额中...</div>
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="token in form.availableTokens"
              :key="token.sensibleId"
              class="p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              :class="{
                'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600':
                  form.selectedToken?.sensibleId === token.sensibleId,
              }"
              @click="selectToken(token)"
            >
              <div class="flex items-center space-x-3">
                <!-- Token图标 -->
                <div class="relative w-10 h-10">
                  <img
                    v-if="tokenIcons[token.genesis]"
                    :src="tokenIcons[token.genesis]"
                    :alt="token.symbol"
                    class="w-10 h-10 rounded-full object-cover"
                    @error="handleTokenIconError(token.genesis)"
                  />
                  <div
                    v-else
                    class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    :style="{ backgroundColor: generateTokenColor(token.genesis) }"
                  >
                    {{ token.symbol.slice(0, 2).toUpperCase() }}
                  </div>
                </div>
                <div class="flex-1">
                  <div class="font-medium">{{ token.symbol }}</div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">
                    TokenID:{{ token.genesis.replace(/(\w{4})\w+(\w{5})/, '$1...$2') }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-300">
                    Balance:
                    {{
                      ((token.confirmed + token.unconfirmed) / Math.pow(10, token.decimal)).toFixed(
                        Math.min(token.decimal, 8)
                      )
                    }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- NFT红包选择 (保留原有逻辑但不会显示，因为现在没有Token红包的入口) -->
      <div v-else>
        <p
          class="text-sm text-dark-400 dark:text-gray-200 pb-4.5 border-b border-solid border-dark-200 dark:border-gray-600"
        >
          {{ $t('Talk.Input.choose_nft_red_packet_tip') }}
        </p>

        <!-- NFT -->
        <div class="h-full">
          <div
            v-if="fetching"
            class="w-full h-full flex items-center justify-center flex-col gap-y-4"
          >
            <img :src="DogWalking" class="w-48 h-48" alt="" />
            <div class="flex items-center space-x-2">
              <Icon name="loading" class="w-4 h-4 animate-spin text-dark-400 dark:!text-gray-200" />
              <div class="text-dark-400 dark:text-gray-200 text-base font-medium">
                {{ $t('Talk.Modals.loading') }}
              </div>
            </div>
          </div>
          <div class="flex flex-col mt-6" v-else-if="nftSeries.length > 0">
            <div
              v-for="nft in nftSeries"
              :key="nft.nftSeriesName"
              class="flex space-x-3 items-center cursor-pointer hover:bg-dark-100 dark:hover:bg-gray-900 rounded p-2"
              @click="selectNft(nft)"
            >
              <Image
                :src="nft.nftIcon"
                customClass="rounded-xl h-13.5 w-13.5 object-contain object-center"
              />
              <div class="text-base ">
                {{ nft.nftSeriesName }}
              </div>
            </div>
          </div>
          <div class="w-full h-full flex items-center justify-center flex-col gap-y-8" v-else>
            <img :src="Cat" class="w-36 h-36" alt="" />
            <div class="text-dark-400 dark:text-gray-200 text-base font-medium">
              {{ $t('Talk.Community.no_nft_available') }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseModal>

  <!-- Payment Confirmation Modal -->
  <PaymentConfirmModal
    v-model="showPayment"
    :payment="payment"
    @confirm="confirmPayment"
    @cancel="cancelPayment"
  />
</template>

<script lang="ts" setup>
import {
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/vue'
import { ref, watch, Ref, watchEffect, onMounted, computed } from 'vue'
import { object, number } from 'yup'
import { useForm } from 'vee-validate'
import { Chains, RedPacketDistributeType, ShowControl } from '@/enum'
// @ts-ignore
import BaseModal from '../BaseModal.vue'
// @ts-ignore
import PaymentConfirmModal from './PaymentConfirmModal.vue'
import Cat from '@/assets/images/cat.svg?url'
import DogWalking from '@/assets/images/dog_walking.svg?url'
import ETH from '@/assets/images/eth.png'
import MVC from '@/assets/images/icon_mvc.png'
import BTC from '@/assets/images/btc.png'
import POLYGON from '@/assets/svg/polygon.svg?url'

import { useLayoutStore } from '@/stores/layout'
import { useRedPacketFormStore } from '@/stores/forms'
import { useUserStore } from '@/stores/user'
import { GetNFTs } from '@/api/aggregation'
import { showLoading } from '@/utils/util'
import Decimal from 'decimal.js-light'
import { useChainStore } from '@/stores/chain'
import { broadcastToApi } from '@/utils/userInfo'
// @ts-ignore
import { SHA256 } from 'crypto-es/lib/sha256.js'
import { getTokenIconWithFallback } from '@/utils/token-icons'

const layout = useLayoutStore()
const userStore = useUserStore()
const isShowSelectTokenModal = ref(false)
const chainStore = useChainStore()
const form = useRedPacketFormStore()

const handleSelectToken = () => {
  if (layout.selectedRedPacketType === 'token') {
    openTokenSelector()
    return
  }
  isShowSelectTokenModal.value = !isShowSelectTokenModal.value
}

// 计算属性
const isTokenRedPacket = computed(() => {
  return (layout.selectedRedPacketType as any) === 'token'
})

const showPayment = ref(false)
const payment = ref<{
  total: number
  gas: number
  serviceFee: number
  unit: string
  commitTxHex: string
  revealTxHex: string[]
} | null>(null)
// 根据form.unit初始化currentUnit，支持所有四种单位
const currentUnit = ref<'BTC' | 'Space' | 'Sats' | 'Token'>(
  form.unit === 'BTC' || form.unit === 'Space' || form.unit === 'Sats' || form.unit === 'Token'
    ? form.unit
    : chainStore.state.currentChain === 'btc'
    ? 'BTC'
    : 'Space'
)

const activeTab = ref('redPacket')
const changeTab = (tab: string) => {
  if (tab !== activeTab.value) {
    layout[ShowControl.isShowChooseTokenModal] = false
  }

  activeTab.value = tab
  if (tab === 'redPacket') {
    form.type = RedPacketDistributeType.Random
  } else {
    form.type = RedPacketDistributeType.Nft
  }
}

/** 验证 */
const normalSchema = object({
  quantity: number()
    .required()
    .min(1)
    .max(100),
})
const easySchema = {
  quantity(value: number) {
    if (value < 1 || value > 100) {
      return '数量必须在1-100之间'
    }
    return true
  },
}
const { errors } = useForm({
  validationSchema: easySchema,
})

/** ------ */

const chains = ref([
  {
    id: 1,
    name: (import.meta.env as any).VITE_ETH_CHAIN || 'ETH',
    icon: ETH,
    value: (import.meta.env as any).VITE_ETH_CHAIN || 'eth',
  },
  {
    id: 2,
    name: 'MVC',
    icon: MVC,
    value: 'mvc' as Chains,
  },
  {
    id: 3,
    name: 'BTC',
    icon: BTC,
    value: 'btc' as Chains,
  },
  {
    id: 4,
    name: (import.meta.env as any).VITE_POLYGON_CHAIN || 'POLYGON',
    icon: POLYGON,
    value: (import.meta.env as any).VITE_POLYGON_CHAIN || 'polygon',
  },
])
const selectedChain = ref(chains.value[0])

const nftSeries: Ref<any[]> = ref([])
const fetching = ref(false)

const triggleUnit = () => {
  // 根据红包类型而不是gas链来切换单位
  if (layout.selectedRedPacketType === 'btc') {
    // BTC红包的单位切换
    if (currentUnit.value == 'BTC') {
      currentUnit.value = 'Sats'
      form.unit = 'Sats'
      form.amount = new Decimal(form.amount).mul(10 ** 8).toNumber()
    } else {
      currentUnit.value = 'BTC'
      form.unit = 'BTC'
      form.amount = new Decimal(form.amount).div(10 ** 8).toNumber()
    }
  } else if (layout.selectedRedPacketType === 'token') {
    // Token红包打开Token选择器
    openTokenSelector()
  } else {
    // MVC红包的单位切换
    if (currentUnit.value == 'Space') {
      currentUnit.value = 'Sats'
      form.unit = 'Sats'
      form.amount = new Decimal(form.amount).mul(10 ** 8).toNumber()
    } else {
      currentUnit.value = 'Space'
      form.unit = 'Space'
      form.amount = new Decimal(form.amount).div(10 ** 8).toNumber()
    }
  }
}

const openTokenSelector = () => {
  // 打开Token选择器
  layout.isShowChooseTokenModal = true
  // 加载Token余额
  form.loadTokenBalances()
}

const selectNft = (nft: any) => {
  form.nft = nft
  form.chain = selectedChain.value.value
  layout.isShowChooseTokenModal = false
}

// Token选择相关函数
// Token图标缓存
const tokenIcons = ref<Record<string, string>>({})

// 处理图标加载错误
const handleTokenIconError = (genesis: string) => {
  delete tokenIcons.value[genesis]
}

// 加载Token图标
const loadTokenIcon = async (token: any) => {
  if (!token.genesis || tokenIcons.value[token.genesis]) return

  try {
    const iconUrl = await getTokenIconWithFallback(token.genesis, token.codeHash, token.symbol)

    if (iconUrl) {
      tokenIcons.value[token.genesis] = iconUrl
    }
  } catch (error) {
    console.warn('Failed to load token icon:', error)
  }
}

const selectToken = (token: any) => {
  form.selectToken(token)
  layout.isShowChooseTokenModal = false
}

// 生成Token图标颜色的函数
const generateTokenColor = (genesis: string) => {
  const hash = SHA256(genesis).toString()
  const r = Math.floor(parseInt(hash.slice(0, 2), 16) * 0.6) + 60 // 60-213
  const g = Math.floor(parseInt(hash.slice(2, 4), 16) * 0.6) + 60 // 60-213
  const b = Math.floor(parseInt(hash.slice(4, 6), 16) * 0.6) + 60 // 60-213
  return `rgb(${r}, ${g}, ${b})`
}

watch(
  () => form.amount,
  (amount: number | string) => {
    if (amount === '') return
    if (+amount < 0 || typeof amount !== 'number') {
      form.amount = 0
    }
  }
)

// 监听可用代币列表变化，预加载图标
watch(
  () => form.availableTokens,
  tokens => {
    tokens.forEach(token => {
      loadTokenIcon(token)
    })
  },
  { immediate: true }
)

const submit = async () => {
  try {
    if (form.unit === 'Token' && !form.selectedToken) {
      ElMessage.error('Please select a token')
      openTokenSelector()
      return
    }
    if (form.unit === 'Token' && !window.metaidwallet.version) {
      ElMessage.error('current wallet not support token red packet, please update your wallet')
      return
    }
    const ret = (await form.submit()) as any
    if (ret && ret.status === 'ready_to_broadcast') {
      layout.isShowLoading = false
      showPayment.value = true
      const commitCost = parseFloat(ret.commitCost) || 0
      const revealCost = parseFloat(ret.revealCost) || 0
      const totalCost = commitCost + revealCost + 210 * form.quantity
      payment.value = {
        total: new Decimal(form.amount).toNumber() + new Decimal(totalCost).div(10 ** 8).toNumber(),
        gas: new Decimal(totalCost).div(10 ** 8).toNumber(),
        serviceFee: 0,
        commitTxHex: ret.commitTxHex,
        revealTxHex: ret.revealTxsHex,
        unit: layout.selectedRedPacketType === 'btc' ? 'BTC' : 'Space',
      }
    } else {
      layout.isShowRedPacketModal = false
      layout.isShowLoading = false
      form.reset()
    }
  } catch (error) {
    console.error('Error during submission:', error)
    ElMessage.error((error as Error).message || 'Submission failed')
    layout.isShowLoading = false
  }
}

const confirmPayment = async () => {
  // 这里添加确认支付的逻辑
  layout.isShowLoading = true
  await broadcastToApi({
    txHex: payment.value?.commitTxHex || '',
    chain: 'btc',
    network: 'mainnet',
  })

  await broadcastToApi({
    txHex: payment.value?.revealTxHex[0] || '',
    chain: 'btc',
    network: 'mainnet',
  })
  // const [...revealTxIds] = await Promise.all([
  //   ...payment.value?.revealTxHex.map(rawTx =>
  //     broadcastToApi({
  //       txHex: rawTx,
  //       chain: 'btc',
  //       network: 'mainnet',
  //     })
  //   ),
  // ])
  showPayment.value = false
  layout.isShowRedPacketModal = false
  layout.isShowLoading = false
  form.reset()
}

const cancelPayment = () => {
  showPayment.value = false
  layout.isShowLoading = false
}

// 监听红包类型变化，独立于gas链
watch(
  () => layout.selectedRedPacketType,
  newType => {
    // 根据红包类型设置form的当前链类型，用于验证和逻辑处理
    form.currentRedPacketType = newType
    form.loadSettings()

    // 更新UI状态
    if (newType === 'btc') {
      currentUnit.value = form.unit === 'Sats' ? 'Sats' : 'BTC'
    } else if (newType === 'token') {
      currentUnit.value = 'Token'
      form.unit = 'Token'
      // 加载Token余额
      form.loadTokenBalances()
      // 恢复之前选择的Token
      form.loadSelectedToken()
    } else {
      currentUnit.value = form.unit === 'Sats' ? 'Sats' : 'Space'
    }
  },
  { immediate: true }
)

// 监听链切换（gas链），不影响红包类型
// watch(
//   () => chainStore.state.currentChain,
//   newChain => {
//     // gas链变化不影响红包类型，只影响gas费用计算
//     console.log('Gas chain changed to:', newChain)
//   }
// )

// // 在组件挂载时确保加载正确的设置
// onMounted(() => {
//   form.loadSettings()

//   // 更新currentUnit以匹配form.unit
//   if (chainStore.state.currentChain === 'btc') {
//     currentUnit.value = form.unit === 'Sats' ? 'Sats' : 'BTC'
//   } else {
//     currentUnit.value = form.unit === 'Sats' ? 'Sats' : 'Space'
//   }
// })

// onMounted(() => {
//   if (userStore.user?.evmAddress) {
//     chains.value.push({
//       id: 2,
//       name: 'ETH',
//       icon: ETH,
//       value: import.meta.env.VITE_ETH_CHAIN,
//     })
//   }
// })
</script>
