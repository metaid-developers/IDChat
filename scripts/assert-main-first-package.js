const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const main = read('src/main.ts')
const html = read('index.html')
const icon = read('src/components/Icon/Icon.vue')
const viteConfig = read('vite.config.ts')

assert(!main.includes("virtual:svg-icons-register"), 'main.ts should not import the full svg icon sprite')
assert(!main.includes('VueVirtualScroller'), 'main.ts should not install VueVirtualScroller globally')
assert(
  !main.includes('vue-virtual-scroller/dist/vue-virtual-scroller.css'),
  'main.ts should not import vue-virtual-scroller css globally'
)
assert(!html.includes('SF_PRO_Regular.ttf'), 'index.html should not declare the unused SF font')
assert(html.includes('font-display: swap'), 'remaining first-screen font should use font-display: swap')
assert(icon.includes('import.meta.glob'), 'Icon.vue should lazy-load svg icons on demand')
assert(!viteConfig.includes('createSvgIconsPlugin'), 'vite.config.ts should not build one global svg sprite')

console.log('main first-package assertions passed')
