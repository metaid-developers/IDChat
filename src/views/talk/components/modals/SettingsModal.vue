<template>
  <div
    class="fixed inset-0 fullscreen w-screen z-50 bg-dark-100 flex justify-center items-center select-none"
  >
    <div
      class="h-full w-full relative bg-dark-100 px-5 py-2.5 lg:w-96 lg:bg-white lg:h-4/5 lg:rounded-lg lg:shadow-lg"
    >
      <div class="h-8 flex items-center justify-end">
        <Icon
          name="x_circle"
          class="w-6 h-6 text-dark-400 cursor-pointer"
          @click="$emit('closeModal')"
        />
      </div>

      <div class="text-dark-300 text-xs font-bold pb-2 px-2 uppercase">
        {{ $t('Talk.Settings.settings') }}
      </div>

      <div class="flex flex-col space-y-4 px-2">
        <div class="py-1.5" v-if="rootstore.isWebView">
          <div class="text-dark-800 text-base font-medium mb-3 capitalize">
            {{ $t('Talk.Settings.language') }}
          </div>

          <div class="mt-1 flex flex-col gap-y-3">
            <div
              class="main-border p-2.5  text-dark-800 flex items-center justify-between cursor-pointer transition-all duration-150"
              :class="[
                currentLanguage === language.code
                  ? 'bg-primary text-dark-800'
                  : 'faded bg-white text-dark-400',
              ]"
              @click="switchLanguage(language.code)"
              v-for="language in languages"
            >
              <div class="">
                <Icon
                  :name="currentLanguage === language.code ? 'radio_circle_fill' : 'radio_circle'"
                  class="w-6 h-6"
                />
              </div>
              <div class="flex items-center">
                <div class="text-base font-medium capitalize">
                  {{ $t('Talk.Settings.' + language.code) }}
                </div>
                <img :src="language.flag" alt="" class="ml-2 h-4 w-6" />
              </div>
            </div>
          </div>
        </div>

        <div class="py-1.5">
          <div class="text-dark-800 text-base font-medium mb-3 capitalize">
            {{ $t('Talk.Settings.theme') }}
          </div>
          <div class="mt-1 flex flex-col gap-y-3">
            <div
              class="bg-primary main-border p-2.5 text-dark-800 flex items-center justify-between cursor-pointer transition-all duration-150"
            >
              <div class="">
                <Icon name="radio_circle_fill" class="w-6 h-6 text-dark-800" />
              </div>
              <div class="flex items-center">
                <div class="text-base font-medium capitalize">{{ $t('Talk.Settings.light') }}</div>
              </div>
            </div>

            <div
              class="bg-white main-border faded p-2.5 text-dark-400 flex items-center justify-between cursor-pointer"
            >
              <div class="">
                <Icon name="radio_circle" class="w-6 h-6 text-dark-400" />
              </div>
              <div class="flex items-center">
                <div class="text-base font-medium capitalize">{{ $t('Talk.Settings.dark') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import FlagEn from '@/assets/images/flag_en.png?url'
import FlagCn from '@/assets/images/flag_cn.png?url'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { useRootStore } from '@/stores/root'
const i18n = useI18n()
const rootstore=useRootStore()

const switchLanguage = (lang: string) => {
  i18n.locale.value = lang
  currentLanguage.value = lang
  localStorage.setItem('lang', lang)
}

const languages = ref([
  {
    name: 'English',
    code: 'en',
    flag: FlagEn,
  },
  {
    name: '简体中文',
    code: 'zh',
    flag: FlagCn,
  },
])

const themes = ref([
  {
    name: 'light',
  },
  {
    name: 'dark',
  },
])

const currentLanguage = ref(i18n.locale.value)
</script>
<style lang="scss" scoped></style>
