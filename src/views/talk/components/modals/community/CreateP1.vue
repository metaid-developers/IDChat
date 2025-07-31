<template>
  <div class="flex flex-col w-full h-full">
    <div class="flex flex-col items-center">
      <p class="mt-4.5 text-base text-dark-400 dark:text-gray-200 leading-relaxed text-center">
        {{ $t('Talk.Community.create_fist_step_tip') }}
      </p>

      <div class="mt-12">
        <div
          class="w-30 h-30 rounded-full border-dashed border-2 flex items-center justify-center relative cursor-pointer"
          :class="[form.iconPreviewUrl ? 'border-transparent' : 'border-gray-250']"
          @click="iconUploader?.click()"
        >
          <img
            :src="form.iconPreviewUrl"
            alt=""
            v-if="form.iconPreviewUrl"
            class="rounded-full w-30 h-30 object-cover object-center"
          />
          <Icon name="photo_2" class="w-9 h-9" v-else />

          <div class="absolute right-0 bottom-0 z-10">
            <div
              class="flex items-center justify-center w-10 h-10 bg-primary border-2 border-solid border-dark-800 rounded-full"
            >
              <Icon name="plus_2" class="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      <div class="mt-12 w-full">
        <!-- 社区名 -->
        <h4 class="text-lg capitalize">
          {{ $t('Talk.Community.community_name') }}
        </h4>

        <div class="mt-2">
          <input
            type="text"
            class="outline-0 main-border faded-switch !bg-white dark:!bg-gray-700 still w-full px-4 py-3 text-base leading-[24PX] font-bold placeholder:font-normal"
            :placeholder="$t('Talk.Community.community_name')"
            v-model="form.name"
          />
        </div>

        <!-- MetaName -->
        <!-- <h4 class="text-sm mt-8">
          {{ $t('Talk.Community.community_name_tip') }}
          <span class="text-xs text-dark-300 dark:text-gray-400">
            {{ $t('Talk.Community.optional') }}
          </span>
        </h4> -->

        <!-- <div class="mt-2">
          <button
            class="outline-0 main-border w-full px-4 py-3 text-base flex justify-between items-center group"
            @click="layout.isShowChooseMetaNameModal = !layout.isShowChooseMetaNameModal"
          >
            <div class="flex items-center gap-x-1.5">
              <template v-if="form.metaName">
                <MetaNameDisplay :name="form.metaName.name" :text-class="'!text-sm !font-bold'" />
                <span class="text-sm font-bold">
                  {{ form.metaName.name }}
                </span>

                <Icon name="tag_nft" class="w-9.5 h-4" />
              </template>
              <template v-else>
                <span class="text-dark-250 select-none font-sm dark:text-gray-400">{{
                  $t('Talk.Community.community_name_placeholder')
                }}</span>
              </template>
            </div>

            <Icon
              name="chevron_right"
              class="w-6 h-6  lg:text-dark-300 lg:dark:text-gray-400 lg:group-hover:text-dark-800 dark:lg:group-hover:!text-gray-100 -mr-2 transition-all duration-200"
            />
          </button>

          <p class="mt-3 text-xs text-dark-300 dark:text-gray-400">
            <span class="">
              {{ $t('Talk.Community.agree_tip') }}
            </span>
            <a
              href="https://docs.google.com/document/d/1nwglSl4xeqnbdmp0v9xlJFNuNMHKPW5YAOLgjEh3Ql8/edit?usp=sharing"
              class="text-link dark:text-blue-400 ml-1 font-medium"
              target="_blank"
            >
              {{ $t('Talk.Community.agree_guidelines') }}
            </a>
            <span>
              {{ $t('Talk.period') }}
            </span>
          </p>
        </div> -->
      </div>
    </div>

    <div class="grow flex items-end justify-end lg:mt-8">
      <button
        class="w-14 h-14 main-border primary flex items-center justify-center"
        :class="{
          'faded still text-dark-300 dark:!text-gray-400 dark:!bg-gray-700': !form.isStep1Finished,
        }"
        :disabled="!form.isStep1Finished"
        @click="$emit('forward')"
      >
        <Icon name="arrow_right" class="w-6 h-6" />
      </button>
    </div>
  </div>

  <input
    type="file"
    class="hidden"
    ref="iconUploader"
    accept="image/*"
    @change="handleIconChange"
  />
</template>

<script lang="ts" setup>
import { ref } from 'vue'

import { useLayoutStore } from '@/stores/layout'
import { useTalkStore } from '@/stores/talk'
import { useCommunityFormStore } from '@/stores/forms'
import { isFileTooLarge, isImage } from '@/utils/talk'

import MetaNameDisplay from '@/components/MetaName/Display.vue'

const layout = useLayoutStore()
const talkStore = useTalkStore()
const form = useCommunityFormStore()

const iconUploader = ref<HTMLInputElement | null>(null)

const handleIconChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    if (!isImage(file)) {
      talkStore.$patch({
        error: {
          type: 'image_only',
          message: 'image_only',
          timestamp: Date.now(),
        },
      })
      return
    }

    if (isFileTooLarge(file)) {
      talkStore.$patch({
        error: {
          type: 'image_too_large',
          message: 'image_too_large',
          timestamp: Date.now(),
        },
      })
      return
    }

    form.icon = file
  }
}
</script>
