<template>
  <ElDialog
    :modelValue="modelValue"
    @close="emit('update:modelValue', false)"
    title="Fee"
    :width="'560px'"
    :closeOnClickModal="false"
    class="fee-dialog"
  >
    <div class="fee-modal-content">
      <!-- Chain Options with Fee Types - Accordion Style -->
      <div class="chain-sections">
        <!-- BTC Section -->
        <div class="chain-section main-border" :class="{ selected: selectedChain === 'btc' }">
          <div class="chain-header flex items-center" @click="selectChain('btc')">
            <div class="chain-icon">
              <img src="@/assets/images/btc.png" alt="BTC" class="w-[30px] h-[30px] rounded-full" />
            </div>
            <div class="chain-info">
              <div class="chain-name">BTC</div>
              <div class="chain-subtitle">Network</div>
            </div>
            <div class="accordion-arrow" :class="{ expanded: selectedChain === 'btc' }">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>

          <transition name="accordion">
            <div v-show="selectedChain === 'btc'" class="fee-options-wrapper">
              <div class="fee-options">
                <div
                  class="fee-option"
                  :class="{ selected: selectedBTCFeeType === 'economyFee' }"
                  @click="selectFeeType('economyFee', 'btc')"
                >
                  <div class="fee-label">ECO</div>
                  <div class="flex items-center gap-1">
                    <div class="fee-value">{{ chainStore.state.btc.economyFee }}</div>
                    <div class="fee-time">sat/vB</div>
                  </div>
                </div>

                <div
                  class="fee-option"
                  :class="{ selected: selectedBTCFeeType === 'halfHourFee' }"
                  @click="selectFeeType('halfHourFee', 'btc')"
                >
                  <div class="fee-label">Normal</div>
                  <div class="flex items-center gap-1">
                    <div class="fee-value">{{ chainStore.state.btc.halfHourFee }}</div>
                    <div class="fee-time">sat/vB</div>
                  </div>
                </div>

                <div
                  class="fee-option"
                  :class="{ selected: selectedBTCFeeType === 'customizeFee' }"
                  @click="selectFeeType('customizeFee', 'btc')"
                >
                  <div class="fee-label">Customize</div>
                  <div class="flex items-center gap-1">
                    <input
                      v-if="selectedBTCFeeType === 'customizeFee'"
                      v-model="customBTCValue"
                      type="number"
                      class="fee-input"
                      placeholder="Custom fee"
                      @click.stop
                      :min="0.3"
                    />
                    <div v-else class="fee-value">{{ chainStore.state.btc.customizeFee }}</div>
                    <div class="fee-time">sat/vB</div>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>

        <!-- MVC Section -->
        <div class="chain-section main-border" :class="{ selected: selectedChain === 'mvc' }">
          <div class="chain-header" @click="selectChain('mvc')">
            <div class="chain-icon">
              <img src="@/assets/images/mvc.png" alt="MVC" class="w-[30px] h-[30px] rounded-full" />
            </div>
            <div class="flex flex-col gap-1">
              <div class="chain-info">
                <div class="chain-name">MVC</div>
                <div class="chain-subtitle">Network</div>
              </div>
              <div class="rounded-full bg-[#F7931A]/20 text-[#F7931A] text-xs px-2 py-0">
                Bitcoin sidechain
              </div>
            </div>
            <div class="accordion-arrow" :class="{ expanded: selectedChain === 'mvc' }">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>

          <transition name="accordion">
            <div v-show="selectedChain === 'mvc'" class="fee-options-wrapper">
              <div class="fee-options">
                <div
                  class="fee-option"
                  :class="{ selected: selectedMVCFeeType === 'economyFee' }"
                  @click="selectFeeType('economyFee', 'mvc')"
                >
                  <div class="fee-label">ECO</div>
                  <div class="flex items-center gap-1">
                    <div class="fee-value">{{ chainStore.state.mvc.economyFee }}</div>
                    <div class="fee-time">sat/vB</div>
                  </div>
                </div>

                <div
                  class="fee-option"
                  :class="{ selected: selectedMVCFeeType === 'fastestFee' }"
                  @click="selectFeeType('fastestFee', 'mvc')"
                >
                  <div class="fee-label">High</div>
                  <div class="flex items-center gap-1">
                    <div class="fee-value">{{ chainStore.state.mvc.fastestFee }}</div>
                    <div class="fee-time">sat/vB</div>
                  </div>
                </div>

                <div
                  class="fee-option"
                  :class="{ selected: selectedMVCFeeType === 'customizeFee' }"
                  @click="selectFeeType('customizeFee', 'mvc')"
                >
                  <div class="fee-label">Customize</div>
                  <div class="flex items-center gap-1">
                    <input
                      v-if="selectedMVCFeeType === 'customizeFee'"
                      v-model="customMVCValue"
                      type="number"
                      class="fee-input"
                      placeholder="Custom fee"
                      @click.stop
                    />
                    <div v-else class="fee-value">{{ chainStore.state.mvc.customizeFee }}</div>
                    <div class="fee-time">sat/vB</div>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>

        <!-- DOGE Section -->
        <div class="chain-section main-border" :class="{ selected: selectedChain === 'doge' }">
          <div class="chain-header" @click="selectChain('doge')">
            <div class="chain-icon">
              <Icon name="doge" class="w-[30px] h-[30px]" />
            </div>
            <div class="flex flex-col gap-1">
              <div class="chain-info">
                <div class="chain-name">DOGE</div>
                <div class="chain-subtitle">Network</div>
              </div>
              <div class="rounded-full bg-[#C3A634]/20 text-[#C3A634] text-xs px-2 py-0">
                Bitcoin sidechain
              </div>
            </div>
            <div class="accordion-arrow" :class="{ expanded: selectedChain === 'doge' }">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>

          <transition name="accordion">
            <div v-show="selectedChain === 'doge'" class="fee-options-wrapper">
              <div class="fee-options">
                <div
                  class="fee-option"
                  :class="{ selected: selectedDOGEFeeType === 'economyFee' }"
                  @click="selectFeeType('economyFee', 'doge')"
                >
                  <div class="fee-label">ECO</div>
                  <div class="fee-value-wrap">
                    <span class="fee-value">{{
                      formatDogeFee(chainStore.state.doge.economyFee)
                    }}</span>
                    <span class="fee-time">DOGE/KB</span>
                  </div>
                </div>

                <div
                  class="fee-option"
                  :class="{ selected: selectedDOGEFeeType === 'halfHourFee' }"
                  @click="selectFeeType('halfHourFee', 'doge')"
                >
                  <div class="fee-label">Normal</div>
                  <div class="fee-value-wrap">
                    <span class="fee-value">{{
                      formatDogeFee(chainStore.state.doge.halfHourFee)
                    }}</span>
                    <span class="fee-time">DOGE/KB</span>
                  </div>
                </div>

                <div
                  class="fee-option"
                  :class="{ selected: selectedDOGEFeeType === 'customizeFee' }"
                  @click="selectFeeType('customizeFee', 'doge')"
                >
                  <div class="fee-label">Customize</div>
                  <div class="fee-value-wrap">
                    <input
                      v-if="selectedDOGEFeeType === 'customizeFee'"
                      v-model="customDOGEInputValue"
                      type="number"
                      class="fee-input"
                      placeholder="0.001"
                      step="0.0001"
                      min="0.001"
                      @click.stop
                    />
                    <span v-else class="fee-value">
                      {{ formatDogeFee(chainStore.state.doge.customizeFee) }}
                    </span>
                    <span class="fee-time">DOGE/KB</span>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>

      <!-- OK Button -->
      <button class="ok-button main-border primary" @click="handleConfirm">
        OK
      </button>
    </div>
  </ElDialog>
</template>

<script lang="ts" setup>
import { ref, watch, defineProps, defineEmits } from 'vue'
import { ElDialog, ElMessage } from 'element-plus'
import Icon from '@/components/Icon/Icon.vue'
import { useChainStore, type ChainFeeData } from '@/stores/chain'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'confirm'])

const chainStore = useChainStore()

// Reactive states
const selectedChain = ref<'btc' | 'mvc' | 'doge'>('btc')
const selectedBTCFeeType = ref<ChainFeeData['selectedFeeType']>(chainStore.state.btc.selectedFeeType)
const selectedMVCFeeType = ref<ChainFeeData['selectedFeeType']>(chainStore.state.mvc.selectedFeeType)
const selectedDOGEFeeType = ref<ChainFeeData['selectedFeeType']>(chainStore.state.doge.selectedFeeType)

const customBTCValue = ref<number>(chainStore.state.btc.customizeFee)
const customMVCValue = ref<number>(chainStore.state.mvc.customizeFee)
const customDOGEValue = ref<number>(chainStore.state.doge.customizeFee)
// 用于输入的 DOGE 单位值（用户输入 DOGE，内部存储 sats）
const customDOGEInputValue = ref<number>(chainStore.state.doge.customizeFee / 100000000)

// Computed
// const isMobile = computed(() => window.innerWidth <= 1024)

// 将 DOGE 费率从 sats/kB 转换为 DOGE/KB
const formatDogeFee = (satsFee: number) => {
  return (satsFee / 100000000).toFixed(4)
}

// Methods
const selectChain = (chain: 'btc' | 'mvc' | 'doge') => {
  selectedChain.value = chain
}

const selectFeeType = (feeType: ChainFeeData['selectedFeeType'], chain:'btc'|'mvc'|'doge') => {
  selectedChain.value = chain
  if (chain === 'btc') {
    selectedBTCFeeType.value = feeType
  } else if (chain === 'doge') {
    selectedDOGEFeeType.value = feeType
  } else {
    selectedMVCFeeType.value = feeType
  }
}

const handleConfirm = () => {
  // Update the store with selected values
  chainStore.setCurrentChain(selectedChain.value)
  if (selectedChain.value === 'btc') {
    chainStore.setBtcFeeType(selectedBTCFeeType.value)
    if (selectedBTCFeeType.value === 'customizeFee') {
      if(customBTCValue.value < 1){
       ElMessage.error('BTC custom fee must be at least 1 sat/vB')
       customBTCValue.value=1
      }
      chainStore.setBtcCustomizeFee(customBTCValue.value)
    }
    chainStore.setBtcFeeType(selectedBTCFeeType.value)
  } else if (selectedChain.value === 'doge') {
    chainStore.setDogeFeeType(selectedDOGEFeeType.value)
    if (selectedDOGEFeeType.value === 'customizeFee') {
      // 将 DOGE 单位转换为 sats/kB
      const dogeInSats = Math.round(customDOGEInputValue.value * 100000000)
      if(dogeInSats < 5000000){
       ElMessage.error('DOGE custom fee must be at least 0.05 DOGE/KB')
       customDOGEInputValue.value = 0.05
       chainStore.setDogeCustomizeFee(5000000)
      } else {
        chainStore.setDogeCustomizeFee(dogeInSats)
      }
    }
  } else {
    chainStore.setMvcFeeType(selectedMVCFeeType.value)
    if (selectedMVCFeeType.value === 'customizeFee') {
      chainStore.setMvcCustomizeFee(customMVCValue.value)
    }
  }

  // Emit confirm event
  //   emit('confirm', {
  //     chain: selectedChain.value,
  //     feeType: selectedChain.value === 'btc' ? selectedBTCFeeType.value : selectedMVCFeeType.value,
  //     customFee: selectedChain.value === 'btc' && selectedBTCFeeType.value === 'customizeFee' ? customBTCValue.value : selectedChain.value === 'mvc' && selectedMVCFeeType.value === 'customizeFee' ? customMVCValue.value : undefined
  //   })

  // Close modal
  emit('update:modelValue', false)
}

// Initialize with current store values
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      // Initialize with current store state
      selectedChain.value = chainStore.state.currentChain
      if (selectedChain.value === 'btc') {
        selectedBTCFeeType.value = chainStore.state.btc.selectedFeeType
        customBTCValue.value = chainStore.state.btc.customizeFee
      } else if (selectedChain.value === 'doge') {
        selectedDOGEFeeType.value = chainStore.state.doge.selectedFeeType
        customDOGEValue.value = chainStore.state.doge.customizeFee
        // 将 sats 转换为 DOGE 单位用于输入显示
        customDOGEInputValue.value = chainStore.state.doge.customizeFee / 100000000
      } else {
        selectedMVCFeeType.value = chainStore.state.mvc.selectedFeeType
        customMVCValue.value = chainStore.state.mvc.customizeFee
      }
    }
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.fee-modal-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.chain-sections {
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 768px) {
    gap: 8px;
  }
}

.chain-section {
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;

  &.selected {
    border-color: var(--color-primary);
    background: rgba(var(--color-primaryRgb), 0.05);
  }
}

.chain-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(var(--color-primaryRgb), 0.05);
  }
}

.accordion-arrow {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--themeFadedTextColor);
  transition: transform 0.3s ease;

  &.expanded {
    transform: rotate(180deg);
  }
}

.chain-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.chain-info {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 8px;
  .chain-name {
    font-weight: 500;
    font-size: 18px;
    color: var(--themeTextColor);
  }
  .chain-subtitle {
    font-size: 14px;
    color: var(--themeFadedTextColor);
  }
}

.mvc-badge {
  background: var(--color-primary);
  color: var(--themeTextColor);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 8px;
  display: inline-block;
}

// Accordion transition
.accordion-enter-active,
.accordion-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.accordion-enter-from,
.accordion-leave-to {
  opacity: 0;
  max-height: 0;
}

.accordion-enter-to,
.accordion-leave-from {
  opacity: 1;
  max-height: 300px;
}

.fee-options-wrapper {
  overflow: hidden;
}

.fee-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 4px;
  padding: 0 20px 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 0 16px 16px;
  }
}

.fee-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 12px;
  cursor: pointer;
  border-radius: 8px;
  background: var(--themeBgThreeColor);
  transition: all 0.15s ease;
  min-width: 0;

  @media (max-width: 768px) {
    padding: 12px 10px;
    flex-wrap: wrap;
  }

  &.selected {
    border: 2px solid var(--themeTextColor);
    background: var(--color-primary);
  }
}

.dark {
  .fee-option {
    &.selected {
      border: 2px solid #000;
      background: var(--color-primary);
      .fee-label {
        color: #000;
      }
      .fee-value {
        color: #000;
      }
      .fee-time {
        color: #000;
      }
    }
  }
}
.fee-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--themeTextColor);
  flex-shrink: 0;
}

.fee-value-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
  min-width: 0;

  @media (max-width: 768px) {
    gap: 2px;
  }
}

.fee-value {
  font-size: 18px;
  color: var(--themeTextColor);
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: 15px;
  }
}

.fee-time {
  font-size: 14px;
  color: var(--themeFadedTextColor);
  opacity: 0.8;
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: 12px;
  }
}

.fee-input {
  background: var(--themeBgSecondColor);
  border: 1px solid var(--faded-border-color);
  border-radius: 4px;
  padding: 0px 8px;
  font-size: 18px;
  color: var(--themeTextColor);
  width: 50px;
  text-align: center;

  &::placeholder {
    color: var(--themeFadedTextColor);
    font-size: 10px;
  }

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
}
.ok-button {
  display: block;
  width: 100%;
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 16px;
  color: var(--themeTextColor);
  border: none;
  transition: all 0.15s ease;
}

// ElDialog specific styles
:deep(.el-dialog) {
  border-radius: 12px;

  .el-dialog__header {
    padding: 20px 20px 0;

    .el-dialog__title {
      font-size: 20px;
      font-weight: 600;
      color: var(--themeTextColor);
    }
  }

  .el-dialog__body {
    padding: 0 20px 20px;
  }
}
</style>
