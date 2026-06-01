<template>
  <Teleport to="body">
    <div class="image-preview" v-if="imagePreview.visibale" @click.stop="() => {}">
      <a class="close-btn flex flex-align-center flex-pack-center" @click="close"
        ><Icon name="x_mark"
      /></a>
      <div id="images" style="display: none;">
        <img :src="$filters.metafile(item, -1)" v-for="item in imagePreview.images" />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import Viewer from 'viewerjs'
import 'viewerjs/dist/viewer.min.css'
import { nextTick, onBeforeUnmount, watch } from 'vue'
import { isAndroid,isIOS } from '@/stores/root'
import { urlToBase64,downloadImage } from '@/utils/util'
import { useImagePreview } from '@/stores/imagePreview'

let viewer: Viewer | undefined
const imagePreview = useImagePreview()

const destroyViewer = () => {
  viewer?.destroy()
  viewer = undefined
}

const openViewer = () => {
  nextTick(() => {
    const imagesElement = document.getElementById('images')
    if (!imagesElement) return

    destroyViewer()
    viewer = new Viewer(imagesElement, {
      button: false,
      navbar: true,
      title: false,
      inline: true,
      movable: true,
      rotatable: true,
      scalable: true,
      zoomable: true,
      zoomOnTouch: true,
      zoomOnWheel: true,
      initialViewIndex: imagePreview.index,
      toolbar: {
        oneToOne: true,
        prev: true,
        next: true,
        rotateLeft: true,
        rotateRight: true,
        reset: true,
        zoomIn: true,
        zoomOut: true,
        download: async function() {
          if (!viewer?.image) return

          let url: string = viewer.image.src
          if (isAndroid || isIOS) {
            url = await urlToBase64(url)
          }

          downloadImage(url, viewer.image.alt)
        },
      },
    })
    viewer.view()
  })
}

watch(
  () => imagePreview.visibale,
  isVisible => {
    if (isVisible) {
      openViewer()
    } else {
      destroyViewer()
    }
  },
  { immediate: true }
)

onBeforeUnmount(destroyViewer)

function close() {
  imagePreview.visibale = false
}
</script>

<style lang="scss" scoped src="./ImagePreview.scss"></style>
