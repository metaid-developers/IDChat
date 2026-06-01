<template>
  <svg aria-hidden="true" :class="iconClass">
    <use :href="symbolId" :xlink:href="symbolId" :fill="fillColor" />
  </svg>
</template>

<script lang="ts" setup>
import { useRootStore } from '@/stores/root'
import { computed, watch } from 'vue'

interface Props {
  name: string
  prefix?: string
  color?: string
  customClass?: string
  useColorClass?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  prefix: 'icon',
})
const rootStore = useRootStore()
const iconLoaders = import.meta.glob('../../assets/icons/*.svg', {
  as: 'raw',
}) as Record<string, () => Promise<string>>
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const loadedSymbols = new Set<string>()
const loadingSymbols = new Map<string, Promise<void>>()
let spriteRoot: SVGSVGElement | null = null

const iconClass = computed(() => {
  return props.customClass ? props.customClass + ' icon' : 'icon'
})
const symbolId = computed(() => `#${props.prefix}-${props.name}`)
const fillColor = computed(() => {
  
  if (props.color) return props.color
  if (props.useColorClass) return 'currentColor'

  return rootStore.theme === 'dark' ? '#fff' : '#303133'
})

function getSpriteRoot() {
  if (spriteRoot) return spriteRoot

  const existingRoot = document.getElementById('__svg__icons__dom__')
  if (existingRoot instanceof SVGSVGElement) {
    spriteRoot = existingRoot
    return spriteRoot
  }

  spriteRoot = document.createElementNS(SVG_NAMESPACE, 'svg')
  spriteRoot.id = '__svg__icons__dom__'
  spriteRoot.setAttribute('aria-hidden', 'true')
  spriteRoot.style.position = 'absolute'
  spriteRoot.style.width = '0'
  spriteRoot.style.height = '0'
  spriteRoot.style.overflow = 'hidden'
  document.body.appendChild(spriteRoot)

  return spriteRoot
}

function iconPath(name: string) {
  return `../../assets/icons/${name}.svg`
}

async function ensureIconSymbol(name: string, prefix: string) {
  if (!name || typeof document === 'undefined') return

  const symbolName = `${prefix}-${name}`
  if (loadedSymbols.has(symbolName)) return

  const existingSymbol = document.getElementById(symbolName)
  if (existingSymbol) {
    loadedSymbols.add(symbolName)
    return
  }

  const loader = iconLoaders[iconPath(name)]
  if (!loader) return

  const loadingSymbol = loadingSymbols.get(symbolName)
  if (loadingSymbol) {
    await loadingSymbol
    return
  }

  const load = loader()
    .then(rawSvg => {
      const svgDocument = new DOMParser().parseFromString(rawSvg, 'image/svg+xml')
      const svg = svgDocument.querySelector('svg')
      if (!svg) return

      const symbol = document.createElementNS(SVG_NAMESPACE, 'symbol')
      symbol.id = symbolName
      const viewBox = svg.getAttribute('viewBox')
      if (viewBox) symbol.setAttribute('viewBox', viewBox)
      symbol.innerHTML = svg.innerHTML
      getSpriteRoot().appendChild(symbol)
      loadedSymbols.add(symbolName)
    })
    .finally(() => {
      loadingSymbols.delete(symbolName)
    })

  loadingSymbols.set(symbolName, load)
  await load
}

watch(
  () => [props.name, props.prefix] as const,
  ([name, prefix]) => {
    void ensureIconSymbol(name, prefix)
  },
  { immediate: true }
)
</script>
