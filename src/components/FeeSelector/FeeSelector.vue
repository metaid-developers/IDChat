<template>
  <div
    class="fee-selector flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
    @click="openFeeModal"
  >
    <!-- 链图标 -->
    <div class="chain-icon w-6 h-6 flex-shrink-0">
      <img
        v-if="currentChain === 'btc'"
        src="@/assets/images/btc.png"
        alt="BTC"
        class="w-full h-full rounded-full"
      />
      <img
        v-else-if="currentChain === 'mvc'"
        src="@/assets/images/mvc.png"
        alt="MVC"
        class="w-full h-full rounded-full"
      />
      <Icon
        v-else-if="currentChain === 'doge'"
        name="doge"
        class="w-full h-full"
      />
    </div>

    <!-- 费率信息 -->
    <div class="fee-info flex flex-col leading-tight">
      <span class="fee-value text-sm font-medium text-dark-800 dark:text-gray-100">{{ currentFeeRate }}</span>
      <span class="fee-unit text-xs text-dark-400 dark:text-gray-400">{{ feeUnit }}</span>
    </div>
  </div>

  <!-- Fee Modal -->
  <Teleport to="body">
    <FeeModal v-model="showFeeModal" @confirm="handleFeeConfirm" />
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useChainStore } from '@/stores/chain'
import FeeModal from '@/components/FeeModal/FeeModal.vue'
import Icon from '@/components/Icon/Icon.vue'

const chainStore = useChainStore()
const showFeeModal = ref(false)

const currentChain = computed(() => chainStore.state.currentChain)

const currentFeeRate = computed(() => {
  const chain = chainStore.state.currentChain
  const chainData = chainStore.state[chain]
  if (!chainData) return 0
  const selectedFeeType = chainData.selectedFeeType
  return chainData[selectedFeeType] || 0
})

const feeUnit = computed(() => {
  const chain = chainStore.state.currentChain
  if (chain === 'btc') return 'sat/vB'
  if (chain === 'doge') return 'sat/vB'
  return 'sats/b'
})

const openFeeModal = () => {
  showFeeModal.value = true
}

const handleFeeConfirm = (data: {
  chain: 'btc' | 'mvc' | 'doge'
  feeType: string
  customFee?: number
}) => {
  console.log('Fee configuration updated:', data)
}
</script>

<style lang="scss" scoped>
.fee-selector {
  min-width: 60px;
}

.fee-info {
  min-width: 40px;
}
</style>
