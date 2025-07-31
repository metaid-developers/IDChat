<template>
  <Image
    class="avatar"
    :src="image"
    :type="type"
    :default-image="DefaultAvatar"
    :custom-class="customClass"
   
    ref="AvatarRef"
  />
</template>
<script lang="ts" setup>
import { computed, render, h, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import DefaultAvatar from '@/assets/images/default_user.png'
import UserCard from '../UserCard/UserCard.vue'
import { v1 } from 'uuid'
import i18n from '@/utils/i18n'
import { createPopper, VariationPlacement } from '@popperjs/core'

const router = useRouter()
const userCardWarpId = `user-card-warp-${v1()}`
const AvatarRef = ref()
let popper: any
let popperLeftRange = [0, 0]
let buttonLeftRange = [0, 0]
let buttonTopRange = [0, 0]
let popperTopRange = [0, 0]

interface Props {
  name?: string
  metaName: string
  metaId?: string
  image: string
  type?: 'metaId' | 'metafile'
  disabled?: boolean
  imageClass?: string
}
const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  type: 'metaId',
})

const customClass = computed(() => {
  return props.imageClass ? props.imageClass + ' avatar-rounded' : 'avatar-rounded'
})

const toUserPage = () => {
  if (props.disabled) return
  if (props.metaId) {
    router.push(`/user/${props.metaId}`)
  }
}

// function openUserCard(e: any) {
//   if (props.disabled) return
//   e.stopPropagation()
//   if (popper) {
//     destroy()
//   } else {
//     const div = document.createElement('div')
//     div.id = userCardWarpId
//     div.className = 'user-card-warp'
//     document.body.append(div)
//     render(
//       // @ts-ignore
//       h(UserCard, {
//         i18n: i18n,
//         modelValue: true,
//         metaId: props.metaId,
//         name: props.name,
//         metaName: props.metaName,
//         onHide: () => {
//           destroy()
//         },
//       }),
//       document.getElementById(userCardWarpId)!
//     )
//     nextTick(() => {
//       popper = createPopper(AvatarRef.value.imgRef, document.getElementById(userCardWarpId)!, {
//         placement: 'right-start',
//       })
//       nextTick(() => {
//         const userCardWarp = document.getElementById(userCardWarpId)!
//         popperLeftRange = [
//           userCardWarp.getBoundingClientRect().left,
//           userCardWarp.getBoundingClientRect().left + userCardWarp.getBoundingClientRect().width,
//         ]
//         popperTopRange = [
//           userCardWarp.getBoundingClientRect().top,
//           userCardWarp.getBoundingClientRect().top + userCardWarp.getBoundingClientRect().height,
//         ]
//         buttonLeftRange = [
//           AvatarRef.value.imgRef.getBoundingClientRect().left,
//           AvatarRef.value.imgRef.getBoundingClientRect().left +
//             AvatarRef.value.imgRef.getBoundingClientRect().width,
//         ]
//         buttonTopRange = [
//           AvatarRef.value.imgRef.getBoundingClientRect().top,
//           AvatarRef.value.imgRef.getBoundingClientRect().top +
//             AvatarRef.value.imgRef.getBoundingClientRect().height,
//         ]
//       })
//     })
//     document.addEventListener(
//       'click',
//       e => {
//         if (
//           (e.clientX > popperLeftRange[0] &&
//             e.clientX < popperLeftRange[1] &&
//             e.clientY > popperTopRange[0] &&
//             e.clientY < popperTopRange[1]) ||
//           (e.clientX > buttonLeftRange[0] &&
//             e.clientX < buttonLeftRange[1] &&
//             e.clientY > buttonTopRange[0] &&
//             e.clientY < buttonTopRange[1])
//         ) {
//           return
//         } else {
//           destroy()
//         }
//       },
//       true
//     )
//   }
// }

function destroy() {
  document.removeEventListener('click', () => {})
  popper?.destroy()
  popper = undefined
  document.getElementById(userCardWarpId)?.remove()
}
</script>
<style lang="scss" scoped src="./UserAvatar.scss"></style>
