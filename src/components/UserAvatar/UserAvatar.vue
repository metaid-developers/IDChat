<template>
  <Image
    class="avatar"
    :src="image"
    :type="type"
    :default-image="DefaultAvatar"
    :custom-class="customClass"
    ref="AvatarRef"
    v-if="!isCustom"
  />
  <!-- <div :id="avatarsContainer" v-else></div> -->
  <div
    v-else
    :style="
      `background:${generateTelegramGradient(
        props.name || ''
      )};color:#fff;min-width:${size}px;min-height:${size}px;border-radius:50%;font-size:${
        size! / 2.5}px;`"
    class="flex items-center justify-center font-semibold"
  >
    {{ props.name ? props.name.slice(0, 2).toUpperCase() : '' }}
  </div>
</template>
<script lang="ts" setup>
import { computed, render, h, ref, nextTick, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import DefaultAvatar from '@/assets/images/default_user.png'
import UserCard from '../UserCard/UserCard.vue'
import { v1 } from 'uuid'
import i18n from '@/utils/i18n'
import { createPopper, VariationPlacement } from '@popperjs/core'

const router = useRouter()
// const userCardWarpId = `user-card-warp-${v1()}`
const prefix = 'avatarsContainer'
const uuid = ref(v1())
const avatarsContainer = ref(`${prefix}-${uuid.value}`)
const AvatarRef = ref()
let popper: any
const popperLeftRange = [0, 0]
const buttonLeftRange = [0, 0]
const buttonTopRange = [0, 0]
const popperTopRange = [0, 0]

interface Props {
  name?: string
  metaName: string
  metaId?: string
  image: string
  isCustom?: boolean
  type?: 'metaId' | 'metafile'
  disabled?: boolean
  imageClass?: string
  size?: number
}
const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  type: 'metaId',
  isCustom: false,
})

const customClass = computed(() => {
  return props.imageClass ? props.imageClass + ' avatar-rounded' : 'avatar-rounded'
})

const customAvatar = () => {
  if (props.isCustom && props.name) {
    const avatar = generateTelegramAvatar(props?.name, props?.size)
    if (avatar) {
      document.getElementById(`${avatarsContainer.value}`)?.appendChild(avatar)
    }
  }
}

// watch(
//   () => hasCustomAvatar.value,
//    (newVal) => {

//     if(newVal) {
//      customAvatar()
//     }
//   }
// )

// 生成类似 Telegram 的渐变背景色（基于用户名）
function generateTelegramGradient(name: string) {
  // 更深色的渐变色组合，提高文字可读性
  const gradients = [
    'linear-gradient(135deg, #4a5eb8 0%, #5a3882 100%)', // 深蓝紫渐变
    'linear-gradient(135deg, #c06cc7 0%, #c7455a 100%)', // 深粉红渐变
    'linear-gradient(135deg, #3b8bcc 0%, #0097a7 100%)', // 深蓝青渐变
    'linear-gradient(135deg, #2e8b5b 0%, #26a69a 100%)', // 深绿青渐变
    'linear-gradient(135deg, #c75877 0%, #d4af37 100%)', // 深粉黄渐变
    'linear-gradient(135deg, #6a9daa 0%, #d8749c 100%)', // 深青粉渐变
    'linear-gradient(135deg, #cc9966 0%, #a67c52 100%)', // 深黄橙渐变
    'linear-gradient(135deg, #cc6660 0%, #b8396b 100%)', // 深红粉渐变
    'linear-gradient(135deg, #5faab3 0%, #5db877 100%)', // 深蓝绿渐变
    'linear-gradient(135deg, #a67799 0%, #b8a85a 100%)', // 深紫黄渐变
    'linear-gradient(135deg, #5bc5cc 0%, #4d7fd9 100%)', // 深青蓝渐变
    'linear-gradient(135deg, #cc9a1f 0%, #1a8b8a 100%)', // 深黄青渐变
  ]

  if (!name) return gradients[0]

  // 使用名字的哈希值来选择渐变
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % gradients.length
  return gradients[index]
}

// 生成随机但稳定的背景颜色（基于用户名）
function generateBackgroundColor(name: string) {
  // 使用名字的哈希值来生成稳定的颜色
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  // 使用HSL颜色空间，固定饱和度和亮度，只变化色相
  const h = Math.abs(hash) % 360
  return `hsl(${h}, 70%, 60%)`
}

function generateTelegramAvatar(username: string, size = 48) {
  if (!username) return

  // 创建容器和canvas元素
  const container = document.createElement('div')
  container.className = `avatar-container-${uuid.value}`

  const canvas = document.createElement('canvas')
  canvas.className = `avatar-canvas-${uuid.value}`
  canvas.width = size
  canvas.height = size

  // const nameLabel = document.createElement('span');
  // nameLabel.textContent = username;

  container.appendChild(canvas)
  // container.appendChild(nameLabel);

  // 获取画布上下文
  const ctx = canvas.getContext('2d')
  if (!ctx) return container // 如果无法获取上下文，返回空容器

  // 获取名字的首字母
  function getInitials(name: string) {
    const words = name.trim().split(/\s+/)
    let initials = ''

    if (words.length === 0) return ''
    if (words.length === 1) {
      // 只有一个单词，取前两个字符（处理中文）
      const word = words[0]
      if (/^[\u4e00-\u9fa5]+$/.test(word)) {
        // 中文字符
        return word.length >= 2 ? word.substring(0, 2) : word
      } else {
        // 非中文字符
        return word.length >= 2 ? word.substring(0, 2).toUpperCase() : word.toUpperCase()
      }
    } else {
      // 多个单词，取前两个单词的首字母
      for (let i = 0; i < Math.min(2, words.length); i++) {
        const word = words[i]
        if (/^[\u4e00-\u9fa5]+$/.test(word)) {
          // 中文字符，取第一个字
          initials += word[0]
        } else {
          // 非中文字符，取首字母
          if (word.length > 0) {
            initials += word[0].toUpperCase()
          }
        }
      }
      return initials
    }
  }

  const initials = getInitials(username)
  const bgColor = generateBackgroundColor(username)

  // 绘制圆形背景
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fillStyle = bgColor
  ctx.fill()

  // 绘制文字
  ctx.fillStyle = '#ffffff'
  ctx.font = `${size / 2.5}px Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initials, size / 2, size / 2)

  return container
}

onMounted(() => {
  // customAvatar()
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

// function destroy() {
//   document.removeEventListener('click', () => {})
//   popper?.destroy()
//   popper = undefined
//   document.getElementById(userCardWarpId)?.remove()
// }
</script>
<style lang="scss" scoped src="./UserAvatar.scss">
[class*='avatar-container-'] {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}
[class*='avatar-canvas-'] {
  border-radius: 50%;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}
</style>
