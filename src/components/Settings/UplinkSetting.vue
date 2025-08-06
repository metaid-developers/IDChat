<template>
  <ElDrawer
    :model-value="modelValue"
    :show-close="false"
    :with-header="false"
    :size="'360px'"
    :append-to-body="true"
    :lock-scroll="true"
    :close-on-click-modal="false"
    custom-class="none-padding"
  >
    <DrawerRightHeaderVue
      :title="$t('Setting.Uplink settings')"
      @back="emit('update:modelValue', false)"
    />

    <div class="content">
      <img class="cover" src="@/assets/images/uplink_img.png" />

      <div class="payment item">
        <div class="cont flex1 flex flex-align-center">
          <div class="lable flex1">{{ $t('UplinkSetting.Select Payment') }}</div>
          <ElSelect :model-value="userStore.getSdkPayment">
            <ElOption
              v-for="item in payTypes"
              :label="item.name"
              :value="item.value"
              @click="userStore.changeSdkPayment(item.value)"
            />
          </ElSelect>
        </div>
      </div>

      <!-- <div class="list">
        <div class="item">
          <div class="cont flex flex-align-center">
            <div class="lable flex1">{{ $t('UplinkSetting.Uplink Payment Confirmation') }}</div>
            <el-switch
              :model-value="userStore.sdkPayConfirm[userStore.sdkPayment]!.visible"
              @change="onConfirmChange"
            />
          </div>
          <div class="intro">
            {{ $t('UplinkSetting.ConfirmationIntro') }}
          </div>
        </div>

        <div
          class="item"
          :class="{disabled: userStore.sdkPayConfirm[userStore.sdkPayment]!.visible}"
        >
          <div class="cont flex flex-align-center" @click="setMeValue">
            <div class="lable flex1">{{ $t('UplinkSetting.Alert value setting') }}</div>
            <span class="value"
              >{{ userStore.sdkPayConfirm[userStore.sdkPayment]!.value }}
              {{
                userStore.sdkPayment === SdkPayType.SPACE ? 'Satoshi' : userStore.sdkPayment
              }}</span
            >
            <Icon name="down" class="right" />
          </div>
          <div class="intro">
            {{ $t('UplinkSetting.AlertValueIntro').replaceAll('ME', userStore.sdkPayment) }}
          </div>
        </div>
      </div> -->
    </div>
  </ElDrawer>
</template>

<script setup lang="ts">
import DrawerRightHeaderVue from '@/components/DrawerRightHeader/DrawerRightHeader.vue'
import { useRootStore } from '@/stores/root'
import { useUserStore } from '@/stores/user'
import { ElSwitch } from 'element-plus'
import { ref, computed } from 'vue'
import { SdkPayType } from '@/enum'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'

interface Props {
  modelValue: boolean
}
const props = withDefaults(defineProps<Props>(), {})

const emit = defineEmits(['update:modelValue'])
const userStore = useUserStore()
const rootStore = useRootStore()
const i18n = useI18n()
const payTypes = computed(() => {
  if (!userStore.metaletLogin) {
    return [
      {
        name: 'ME',
        value: SdkPayType.ME,
      },
      {
        name: 'SPACE',
        value: SdkPayType.SPACE,
      },
    ]
  } else {
    return [
      {
        name: 'SPACE',
        value: SdkPayType.SPACE,
      },
    ]
  }
})

function onConfirmChange(value: boolean) {
  userStore.changeSdkPayConfirm('visible', value, userStore.sdkPayment)
}

function setMeValue() {
  if (userStore.sdkPayConfirm[userStore.sdkPayment]!.visible) return
  ElMessageBox.prompt('', i18n.t('UplinkSetting.Alert value setting'), {
    confirmButtonText: i18n.t('Confirm'),
    cancelButtonText: i18n.t('Cancel'),
    inputPattern: /^[1-9][0-9]*$/,
    inputErrorMessage: i18n.t('Invalid Value'),
    confirmButtonClass: 'main-border primary',
    cancelButtonClass: 'main-border',
  }).then(({ value }) => {
    const _value = parseInt(value)
    if (_value) {
      userStore.changeSdkPayConfirm('value', _value, userStore.sdkPayment)
    }
  })
}
</script>

<style lang="scss" scoped src="./UplinkSetting.scss"></style>
