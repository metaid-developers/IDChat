<template>
  <div class="divide-y divide-solid divide-dark-100 dark:divide-gray-900">
    <div class="flex items-center justify-end pb-6">
      <div class="flex items-center space-x-3">
        <button
          class="w-20 text-center main-border text-sm font-medium py-1.5 dark:bg-gray-800 hover:dark:bg-gray-700 transition"
          @click="form.resetInForm()"
        >
          {{ $t('Talk.Modals.reset') }}
        </button>
        <button
          class="w-20 text-center main-border text-sm font-medium py-1.5 primary transition"
          :class="{
            'faded still text-dark-300 dark:!text-gray-400 dark:!bg-gray-800': !form.isFinished,
          }"
          :disabled="!form.isFinished"
          @click="form.submit()"
        >
          {{ $t('Talk.Modals.save') }}
        </button>
      </div>
    </div>

    <!-- 图标、名字 -->
    <div class="py-6 flex flex-col lg:flex-row gap-y-12 lg:gap-y-0 lg:gap-x-12">
      <div class="">
        <h4 class="text-dark-400 dark:text-gray-200 text-sm mb-6">
          {{ $t('Talk.Modals.icon') }}
        </h4>

        <div class="flex">
          <div
            class="w-22.5 h-22.5 rounded-full flex items-center justify-center relative cursor-pointer"
            @click="iconUploader?.click()"
          >
            <img
              :src="form.iconPreviewUrl"
              alt=""
              v-if="form.iconPreviewUrl"
              class="rounded-full !w-22.5 !h-22.5 object-cover object-center"
            />

            <Image
              :src="form.original.icon"
              customClass="rounded-full !w-22.5 !h-22.5 object-cover object-center"
              v-else
            />
            <!-- <Icon name="photo_2" class="w-9 h-9" v-else /> -->

            <div class="absolute right-[-2PX] bottom-[-2PX] z-10">
              <div
                class="flex items-center justify-center w-10 h-10 bg-primary border-2 border-solid border-dark-800 rounded-full"
              >
                <Icon name="plus_2" class="w-4 h-4 text-dark-800" />
              </div>
            </div>
          </div>

          <input
            type="file"
            class="hidden"
            ref="iconUploader"
            accept="image/*"
            @change="handleIconChange"
          />
        </div>
      </div>

      <div class="lg:grow">
        <h4 class="text-dark-400 dark:text-gray-200 text-sm mb-6">
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
      </div>
    </div>

    <!-- metaName -->
    <!-- <div class="py-6">
      <h4 class="text-dark-400 dark:text-gray-200 text-sm mb-6">
        {{ $t('Talk.Modals.metaname') }}
      </h4>

      <div class="mt-2">
      
        <div class="grid grid-cols-9 items-center justify-between">
          <div class="space-y-2 col-span-4">
            <div class="text-dark-300 dark:text-gray-400 text-xs h-8 flex items-center">
              {{ $t('Talk.Modals.equipped') }}
            </div>
            <template v-if="form.original.metaName && isAtMyAddress">
              <MetaNameDisplay
                :name="form.original.metaName"
                :colorful="true"
                class="!hidden lg:!flex"
              />
              <MetaNameDisplay
                :name="form.original.metaName"
                :colorful="true"
                :no-tag="true"
                class="lg:!hidden"
              />
            </template>
            <div v-else class="text-dark-300 dark:text-gray-400 text-xs h-8 flex items-center">
              --
            </div>
          </div>

        
          <Icon
            name="chevron_double_right"
            class="w-4 h-4 lg:w-5 lg:h-5 text-dark-300 dark:text-gray-400 col-span-1 mx-1 lg:mx-0 place-self-center"
          />

        
          <div class="col-span-4 space-y-2">
            <div class="flex items-center gap-x-2 h-8">
              <div class="text-dark-300 dark:text-gray-400 text-xs">
                {{ $t('Talk.Modals.switch_to') }}
              </div>
              <button
                class="main-border primary px-2 py-1 small rounded-full text-xs font-bold"
                @click="layout.isShowChooseMetaNameModal2 = true"
              >
                {{ $t('Talk.Modals.choose') }}
              </button>
            </div>

            <ChooseMetaNameModal
              v-if="layout.isShowChooseMetaNameModal2"
              @choose="onChooseMetaName"
            />

            <template v-if="form.metaName">
              <MetaNameDisplay
                :name="form.metaName.name"
                :colorful="true"
                class="!hidden lg:!flex"
              />
              <MetaNameDisplay
                :name="form.metaName.name"
                :colorful="true"
                :no-tag="true"
                class="lg:!hidden"
              />
            </template>
            <div class="text-dark-300 dark:text-gray-400" v-else>
              {{ $t('Talk.Modals.unchanged') }}
            </div>
          </div>
        </div>
      </div>
    </div> -->

    <!-- 封面 -->
    <div class="py-6">
      <h4 class="text-dark-400 dark:text-gray-200 text-sm mb-6">
        {{ $t('Talk.Modals.cover') }}
      </h4>

      <div class="flex flex-col space-y-7.5 lg:flex-row lg:space-x-7.5 lg:space-y-0 items-center">
        <button
          class="border-dashed border-2 rounded-xl w-full lg:w-60 h-45 flex flex-col items-center justify-center space-y-2"
          :class="[
            form.coverPreviewUrl || form.original.cover
              ? 'border-transparent'
              : 'border-dark-250  dark:border-gray-400',
          ]"
          @click="coverUploader?.click()"
        >
          <img
            :src="form.coverPreviewUrl"
            alt=""
            v-if="form.coverPreviewUrl"
            class="object-contain object-center w-full lg:w-60 h-45 rounded-xl"
          />

          <Image
            :src="form.original.cover"
            customClass="!w-full lg:w-60 h-45 rounded-xl object-contain object-center"
            v-else-if="form.original.cover"
          />

          <template v-else>
            <Icon name="photo_add" class="w-6 h-6 text-dark-400 dark:text-gray-100" />
            <p class="text-sm text-dark-400 dark:text-gray-200">
              {{ $t('Talk.Community.choose_nft_cover') }}
            </p>
          </template>
        </button>

        <div class="flex flex-col items-center lg:items-start">
          <p class="text-sm mb-4 text-center lg:text-start">
            {{ $t('Talk.Modals.choose_cover_tip') }}
          </p>

          <button
            class="main-border primary px-8 py-3 text-base font-medium"
            @click="coverUploader?.click()"
          >
            {{ $t('Talk.Modals.choose_cover') }}
          </button>
        </div>
      </div>

      <input
        type="file"
        class="hidden"
        ref="coverUploader"
        accept="image/*"
        @change="handleCoverChange"
      />
    </div>

    <!-- 介绍 -->
    <div class="py-6">
      <h4 class="text-dark-400 dark:text-gray-200 text-sm mb-6">
        {{ $t('Talk.Modals.introduction') }}
      </h4>

      <textarea
        rows="3"
        class="outline-0 main-border faded-switch !bg-white still w-full p-4 text-base resize-none dark:!bg-gray-800"
        :placeholder="$t('Talk.Community.introduction_placeholder')"
        v-model="form.description"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, toRaw } from 'vue'

import { useCommunityUpdateFormStore } from '@/stores/forms'
import { isFileTooLarge, isImage } from '@/utils/talk'
import ChooseMetaNameModal from '@/components/ChooseMetaName/Wrapper.vue'

import MetaNameDisplay from '@/components/MetaName/Display.vue'
import { useLayoutStore } from '@/stores/layout'
import { getMetaNameAddress } from '@/utils/meta-name'
import { useTalkStore } from '@/stores/talk'

const form = useCommunityUpdateFormStore()
const layout = useLayoutStore()
const talk = useTalkStore()

const iconUploader = ref<HTMLInputElement | null>(null)
const coverUploader = ref<HTMLInputElement | null>(null)

const handleIconChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    if (!isImage(file) || isFileTooLarge(file)) {
      return
    }

    form.icon = file
  }
}

const isAtMyAddress = ref(false)
// const getMetaNameAtOwnerAddress = async () => {
//   const nft = form?.original?.metaNameNft

//   if (!nft) {
//     isAtMyAddress.value = false
//     return
//   }

//   // 不判断ens协议
//   if (nft.startsWith('ens://')) {
//     isAtMyAddress.value = false
//     return
//   }

//   const { address } = await getMetaNameAddress(nft)
//   if (!address) {
//     isAtMyAddress.value = false
//     return
//   }

//   isAtMyAddress.value = address === form?.original?.ownerInfo?.address
// }
// getMetaNameAtOwnerAddress()

// const onChooseMetaName = (metaName: any) => {
//   console.log('here')
//   form.metaName = toRaw(metaName)
// }

const handleCoverChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    if (!isImage(file) || isFileTooLarge(file)) {
      return
    }

    form.cover = file
  }
}
</script>
