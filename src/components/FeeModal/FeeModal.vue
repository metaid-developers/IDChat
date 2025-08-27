<template>
  <ElDialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="Fee"
    :width="'560px'"
    :close-on-click-modal="false"
    class="fee-dialog"
  >
    <div class="fee-modal-content">
      <!-- Chain Options with Fee Types -->
      <div class="chain-sections">
        <!-- BTC Section -->
        <div
          class="chain-section  main-border "
          :class="{ faded: selectedChain !== 'btc', selected: selectedChain === 'btc' }"
        >
          <div class="chain-header flex items-center" @click="selectChain('btc')">
            <div class="chain-icon">
              <img src="@/assets/images/btc.png" alt="BTC" class="w-[30px] h-[30px] rounded-full" />
            </div>
            <div class="chain-info">
              <div class="chain-name">BTC</div>
              <div class="chain-subtitle">Network</div>
            </div>
          </div>

          <div class="fee-options">
            <div
              class="fee-option "
              :class="{
                selected: selectedBTCFeeType === 'economyFee',
                disabled: selectedChain !== 'btc',
              }"
              @click="selectFeeType('economyFee', 'btc')"
            >
              <div class="fee-label">ECO</div>
              <div class="flex items-center gap-1">
                <div class="fee-value">{{ chainStore.state.btc.economyFee }}</div>
                <div class="fee-time">sat/vB</div>
              </div>
            </div>

            <div
              class="fee-option "
              :class="{
                selected: selectedBTCFeeType === 'halfHourFee',
                disabled: selectedChain !== 'btc',
              }"
              @click="selectFeeType('halfHourFee', 'btc')"
            >
              <div class="fee-label">Normal</div>
              <div class="flex items-center gap-1">
                <div class="fee-value">{{ chainStore.state.btc.halfHourFee }}</div>
                <div class="fee-time">sat/vB</div>
              </div>
            </div>

            <div
              class="fee-option "
              :class="{
                selected: selectedBTCFeeType === 'customizeFee',
                disabled: selectedChain !== 'btc',
              }"
              @click="selectFeeType('customizeFee', 'btc')"
            >
              <div class="fee-label">Customize</div>
              <div class="flex items-center gap-1">
                <input
                  v-if="selectedChain === 'btc' && selectedBTCFeeType === 'customizeFee'"
                  v-model="customBTCValue"
                  type="number"
                  class="fee-input"
                  placeholder="Custom fee"
                  @click.stop
                />
                <div v-else class="fee-value">{{ chainStore.state.btc.customizeFee }}</div>
                <div class="fee-time">sat/vB</div>
              </div>
            </div>
          </div>
        </div>

        <!-- MVC Section -->
        <div
          class="chain-section main-border"
          :class="{ faded: selectedChain !== 'mvc', selected: selectedChain === 'mvc' }"
        >
          <div class="chain-header " @click="selectChain('mvc')">
            <div class="chain-icon">
              <img src="@/assets/images/mvc.png" alt="MVC" class="w-[30px] h-[30px] rounded-full" />
            </div>
            <div class="flex flex-col gap-1">
              <div class="chain-info">
                <div class="chain-name">MVC</div>
                <div class="chain-subtitle">Network</div>
              </div>
              <div class=" rounded-full bg-[#F7931A]/20 text-[#F7931A] text-xs px-2 py-0">
                Bitcoin sidechain
              </div>
            </div>
          </div>

          <div class="fee-options">
            <div
              class="fee-option "
              :class="{
                selected: selectedMVCFeeType === 'economyFee',
                disabled: selectedChain !== 'mvc',
              }"
              @click="selectFeeType('economyFee', 'mvc')"
            >
              <div class="fee-label">ECO</div>
              <div class="flex items-center gap-1">
                <div class="fee-value">{{ chainStore.state.mvc.economyFee }}</div>
                <div class="fee-time">sat/vB</div>
              </div>
            </div>

            <div
              class="fee-option "
              :class="{
                selected: selectedMVCFeeType === 'fastestFee',
                disabled: selectedChain !== 'mvc',
              }"
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
              :class="{
                selected: selectedMVCFeeType === 'customizeFee',
                disabled: selectedChain !== 'mvc',
              }"
              @click="selectFeeType('customizeFee', 'mvc')"
            >
              <div class="fee-label">Customize</div>
              <div class="flex items-center gap-1">
                <input
                  v-if="selectedChain === 'mvc' && selectedMVCFeeType === 'customizeFee'"
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
import { ElDialog } from 'element-plus'
import { useChainStore, type ChainFeeData } from '@/stores/chain'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'confirm'])

const chainStore = useChainStore()

// Reactive states
const selectedChain = ref<'btc' | 'mvc'>('btc')
const selectedBTCFeeType = ref<ChainFeeData['selectedFeeType']>(chainStore.state.btc.selectedFeeType)
const selectedMVCFeeType = ref<ChainFeeData['selectedFeeType']>(chainStore.state.mvc.selectedFeeType)

const customBTCValue = ref<number>(chainStore.state.btc.customizeFee)
const customMVCValue = ref<number>(chainStore.state.mvc.customizeFee)

// Computed
// const isMobile = computed(() => window.innerWidth <= 1024)

// Methods
const selectChain = (chain: 'btc' | 'mvc') => {
  selectedChain.value = chain
}

const selectFeeType = (feeType: ChainFeeData['selectedFeeType'], chain:'btc'|'mvc') => {
  selectedChain.value = chain
  if (chain === 'btc') {
    selectedBTCFeeType.value = feeType
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
      chainStore.setBtcCustomizeFee(customBTCValue.value)
    }
    chainStore.setBtcFeeType(selectedBTCFeeType.value)
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
  gap: 20px;
}

.chain-section {
  border-radius: 12px;
  overflow: hidden;

  //   &.selected {
  //     border-color: var(--themeTextColor);
  //   }
}

.chain-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.15s ease;

  &.selected {
    border-color: var(--color-primary);
    background: rgba(var(--color-primaryRgb), 0.1);
  }

  &:hover {
    border-color: var(--color-primary);
    transform: translateY(-1px);
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

.fee-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 4px;
  padding: 0 20px 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.fee-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 9px;
  cursor: pointer;
  border-radius: 8px;
  background: var(--themeBgThreeColor);
  transition: all 0.15s ease;

  //   &.selected {
  //     border: 2px solid var(--themeTextColor);
  //     background: var(--color-primary);
  //   }
}
.chain-section {
  &.selected {
    .fee-option {
      &.selected {
        border: 2px solid var(--themeTextColor);
        background: var(--color-primary);
      }
    }
  }
}
.dark {
  .chain-section {
    &.selected {
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
  }
}
.fee-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--themeTextColor);
}

.fee-value {
  font-size: 18px;
  color: var(--themeTextColor);
}

.fee-time {
  font-size: 14px;
  color: var(--themeFadedTextColor);
  opacity: 0.8;
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
