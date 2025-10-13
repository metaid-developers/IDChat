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
    <header class="flex flex-align-center">
      <div class="title flex1">
        {{ $t('Setting.title') }}
      </div>
      <a
        class="close flex flex-align-center flex-pack-center"
        @click="emit('update:modelValue', false)"
      >
        <Icon name="x_mark" />
      </a>
    </header>

    <div class="list">
      <!-- Edit Profile -->
      <!-- <div
        class="item flex flex-align-center"
        @click="isShowEditProfile = true"
        v-if="userStore.isAuthorized"
      >
        <span class="icon-warp flex flex-align-center flex-pack-center">
          <UserAvatar
            :meta-id="userStore.user!.metaId"
            :image="userStore.user!.avatarImage"
            :name="userStore.user!.name"
            :meta-name="userStore.user!.metaName"
          />
        </span>
        <span class="flex1 name">{{ $t('Setting.Edit Profile') }}</span>
        <Icon class="right" name="down" />
      </div> -->

      <!-- Link Account -->
      <!-- <div
        class="item flex flex-align-center"
        @click="isShowLinkAccount = true"
        v-if="userStore.isAuthorized && !isMainnet"
      >
        <span class="icon-warp flex flex-align-center flex-pack-center">
          <Icon name="link_account" />
        </span>
        <span class="flex1 name">{{ $t('Setting.Link Account') }}</span>
        <Icon class="right" name="down" />
      </div> -->

      <div
        class="item flex flex-align-center"
        v-for="item in list"
        :key="item.icon"
        @click="item.fun()"
      >
        <span class="icon-warp flex flex-align-center flex-pack-center">
          <Icon :name="item.icon" />
        </span>
        <span class="flex1 name">{{ item.name }}</span>
        <span class="value">{{ item.value() }}</span>
        <Icon class="right" name="down" />
      </div>
    </div>

    <!-- EditProfile -->
    <EditProfileVue v-model="isShowEditProfile" v-if="userStore.isAuthorized" />
    <!-- UplinkSettingVue -->
    <UplinkSettingVue v-model="isShowUploadLinkSet" />
    <!-- Language -->
    <LanguageVue v-model="isShowLangSet" />
    <!-- Theme -->
    <ThemeVue v-model="isShowThemeSet" />
    <!-- LinkAccount -->
    <LinkAccount v-model="isShowLinkAccount" />
  </ElDrawer>
</template>
<script lang="ts" setup>
import FlagEn from '@/assets/images/flag_en.png?url'
import FlagCn from '@/assets/images/flag_cn.png?url'
import { useI18n } from 'vue-i18n'
import { computed, reactive, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import EditProfileVue from './EditProfile.vue'
import UplinkSettingVue from './UplinkSetting.vue'
import LanguageVue from './Language.vue'
import ThemeVue from './Theme.vue'
import LinkAccount from './LinkAccount.vue'
import { EnvMode } from '@/enum'
import { useRootStore } from '@/stores/root'

interface Props {
  modelValue: boolean
}
const props = withDefaults(defineProps<Props>(), {})

const emit = defineEmits(['update:modelValue'])
const i18n = useI18n()
const userStore = useUserStore()
const isShowEditProfile = ref(false)
const isShowLangSet = ref(false)
const isShowThemeSet = ref(false)
const rootStore=useRootStore()
const isShowUploadLinkSet = ref(false)
const isShowLinkAccount = ref(false)
const isMainnet = import.meta.env.MODE === EnvMode.Mainnet

const switchLanguage = (lang: string) => {
  i18n.locale.value = lang
  currentLanguage.value = lang
  localStorage.setItem('lang', lang)
}

const list = computed(() => {
  const result = [
    {
      name: i18n.t('Setting.Language'),
      icon: 'i18n',
      value: () => {
        return i18n.locale.value.toUpperCase()
      },
      fun: function() {
        if(rootStore.isWebView){
          return ElMessage.warning(`${i18n.t('Setting.WebViewLangTip')}`)
        }
        isShowLangSet.value = true
      },
    },
    {
      name: i18n.t('Setting.Theme'),
      icon: 'theme',
      value: () => {
        return localStorage.theme === 'dark' ? 'Dark' : 'Light'
      },
      fun: function() {
        isShowThemeSet.value = true
      },
    },
  ]


  // if (userStore.isAuthorized) {
  //   result.unshift({
  //     name: i18n.t('Setting.Uplink settings'),
  //     icon: 'link',
  //     value: () => {
  //       return ''
  //     },
  //     fun: function() {
  //       isShowUploadLinkSet.value = true
  //     },
  //   })
  // }

  return result
})

const currentLanguage = ref(i18n.locale.value)
</script>
<style lang="scss" scoped src="./SettingsModal.scss"></style>
