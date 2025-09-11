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
import { nextTick, onMounted, ref, watch } from 'vue'
import { isAndroid,isIOS } from '@/stores/root'
import { checkAppHasMethod, downloadFile, urlToBase64,downloadImage } from '@/utils/util'
import { NavigationGuardNext, onBeforeRouteLeave, RouteLocationNormalized } from 'vue-router'
import { useImagePreview } from '@/stores/imagePreview'

let viewer: Viewer
const emit = defineEmits(['update:modelValue'])
const imagePreview = useImagePreview()

watch(
  () => imagePreview.visibale,
  async () => {
    if (imagePreview.visibale) {
      nextTick(() => {
        viewer = new Viewer(document.getElementById('images')!, {
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
              // @ts-ignore
              let url: string = viewer.image.src
              if (isAndroid || isIOS) {
                url = await urlToBase64(url)
                
              }
              
              // @ts-ignore
              downloadImage(url, viewer.image.alt)
            },
          },
        })
        viewer.view()
      })
    }
  }
)

function close() {
  imagePreview.visibale = false
}
</script>

<style lang="scss" scoped src="./ImagePreview.scss"></style>
