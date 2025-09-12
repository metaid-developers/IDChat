<template>
  <TransitionRoot :show="modelValue">
    <Dialog @close="closeModal" class="relative z-[100] text-dark-800 dark:text-gray-100">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm"></div>
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel
              class="w-[412px] max-w-[96vw] transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all"
            >
              <!-- Title -->
              <DialogTitle
                class="text-lg text-center font-medium   text-gray-900 dark:text-gray-100 mb-4"
              >
                Payment
              </DialogTitle>

              <!-- Content -->
              <div class="mt-2 space-y-6">
                <div
                  v-if="payment"
                  class="text-center text-2xl font-semibold text-gray-900 dark:text-gray-100"
                >
                  {{ formatAmount(payment.total - payment.gas - payment.serviceFee) }} BTC
                </div>
                <!-- Divider -->
                <div class="border-b border-gray-200 dark:border-gray-600"></div>

                <!-- Fee Details -->
                <div class="space-y-4 text-base" v-if="payment">
                  <div class="flex justify-between items-center">
                    <span class="font-medium text-gray-900 dark:text-gray-100">Total</span>
                    <span class="text-gray-900 dark:text-gray-100"
                      >{{ formatAmount(payment.total) }} {{ payment.unit }}</span
                    >
                  </div>

                  <div class="flex justify-between items-center">
                    <span class="font-medium text-gray-900 dark:text-gray-100">Gas</span>
                    <span class="text-gray-900 dark:text-gray-100"
                      >{{ formatAmount(payment.gas) }} {{ payment.unit }}</span
                    >
                  </div>

                  <div class="flex justify-between items-center">
                    <span class="font-medium text-gray-900 dark:text-gray-100">Service Fee</span>
                    <span class="text-gray-900 dark:text-gray-100"
                      >{{ formatAmount(payment.serviceFee) }} {{ payment.unit }}</span
                    >
                  </div>
                </div>

                <!-- Buttons -->
                <div class="flex space-x-3 w-full">
                  <button
                    class="flex-1 rounded-md main-border fade border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                    @click="cancel"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    class="flex-1 rounded-md main-border border-transparent  primary px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                    @click="confirm"
                    type="button"
                  >
                    Confirm
                  </button>
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
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'

interface PaymentInfo {
  total: number
  gas: number
  serviceFee: number
  unit: string
}

interface Props {
  modelValue: boolean
  payment: PaymentInfo | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const closeModal = () => {
  emit('update:modelValue', false)
}

const confirm = () => {
  emit('confirm')
}

const cancel = () => {
  emit('cancel')
}

const formatAmount = (amount: number) => {
  return amount.toFixed(8)
}
</script>
