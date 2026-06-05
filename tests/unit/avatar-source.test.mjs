import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'
import vm from 'node:vm'

const require = createRequire(import.meta.url)

function loadAvatarModule() {
  const source = readFileSync(new URL('../../src/utils/avatar.ts', import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  })
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    require,
  })
  return module.exports
}

const {
  buildUserAvatarContentUrl,
  getUserAvatarPinId,
  normalizeImageSource,
  normalizeAvatarContentApi,
  resolveCurrentUserAvatarSource,
  resolveUserAvatarLookupCandidates,
  resolveUserAvatarSource,
  resolveUserAvatarFromInfo,
  shouldHydrateUserAvatarSource,
} = loadAvatarModule()

test('normalizes missing image component sources to an empty string', () => {
  assert.equal(normalizeImageSource(undefined), '')
  assert.equal(normalizeImageSource(null), '')
  assert.equal(normalizeImageSource('/content/example'), '/content/example')
})

test('prefers raw avatar pin over resolved avatarImage URL for user records', () => {
  const source = resolveUserAvatarFromInfo({
    avatar: '/content/fcf9553c70f4e11ebaa69288f849566de96cdef9e3dac139adfe76fa58db29e6i0',
    avatarImage:
      'https://file.metaid.io/metafile-indexer/content/fcf9553c70f4e11ebaa69288f849566de96cdef9e3dac139adfe76fa58db29e6i0',
  })

  assert.equal(
    source,
    '/content/fcf9553c70f4e11ebaa69288f849566de96cdef9e3dac139adfe76fa58db29e6i0'
  )
})

test('normalizes avatar content and thumbnail URLs to the same user avatar source', () => {
  assert.equal(
    resolveUserAvatarSource(
      'https://file.metaid.io/metafile-indexer/content/fcf9553c70f4e11ebaa69288f849566de96cdef9e3dac139adfe76fa58db29e6i0?x-oss-process=image/resize,w_235'
    ),
    '/content/fcf9553c70f4e11ebaa69288f849566de96cdef9e3dac139adfe76fa58db29e6i0'
  )
  assert.equal(
    resolveUserAvatarSource(
      '/thumbnail/fcf9553c70f4e11ebaa69288f849566de96cdef9e3dac139adfe76fa58db29e6i0'
    ),
    '/content/fcf9553c70f4e11ebaa69288f849566de96cdef9e3dac139adfe76fa58db29e6i0'
  )
})

test('extracts user avatar pin ids from content, thumbnail, and metafile sources', () => {
  const pinId = 'fcf9553c70f4e11ebaa69288f849566de96cdef9e3dac139adfe76fa58db29e6i0'

  assert.equal(getUserAvatarPinId(`/content/${pinId}`), pinId)
  assert.equal(getUserAvatarPinId(`/thumbnail/${pinId}?x-oss-process=image/resize,w_235`), pinId)
  assert.equal(getUserAvatarPinId(`metafile://${pinId}`), pinId)
})

test('builds avatar content URLs even when runtime config still points at thumbnail', () => {
  const pinId = 'dd68fdd852ef98de1a3e118d07511ff3def0fe281ca68fccfb588628a52d4dd7i0'

  assert.equal(
    normalizeAvatarContentApi('https://file.metaid.io/metafile-indexer/thumbnail/'),
    'https://file.metaid.io/metafile-indexer/content'
  )
  assert.equal(
    buildUserAvatarContentUrl(
      'https://file.metaid.io/metafile-indexer/thumbnail',
      `/content/${pinId}`,
      235
    ),
    `https://file.metaid.io/metafile-indexer/content/${pinId}?x-oss-process=image/auto-orient,1/quality,q_80/resize,m_lfit,w_235`
  )
  assert.equal(
    buildUserAvatarContentUrl(
      'https://file.metaid.io/metafile-indexer/content',
      `/content/${pinId}`,
      -1
    ),
    `https://file.metaid.io/metafile-indexer/content/${pinId}`
  )
})

test('normalizes metafile pin ids but preserves ordinary remote image URLs', () => {
  assert.equal(
    resolveUserAvatarSource(
      'metafile://fcf9553c70f4e11ebaa69288f849566de96cdef9e3dac139adfe76fa58db29e6i0'
    ),
    '/content/fcf9553c70f4e11ebaa69288f849566de96cdef9e3dac139adfe76fa58db29e6i0'
  )
  assert.equal(
    resolveUserAvatarSource('https://example.com/avatar.png'),
    'https://example.com/avatar.png'
  )
})

test('ignores empty content avatar placeholders', () => {
  assert.equal(
    resolveUserAvatarFromInfo({
      avatar: '/content/',
      avatarImage: 'https://file.metaid.io/metafile-indexer/content/',
    }),
    ''
  )
})

test('ignores bundled default avatar placeholders', () => {
  assert.equal(resolveUserAvatarSource('/src/assets/images/default_user.png'), '')
  assert.equal(
    resolveUserAvatarSource('http://127.0.0.1:5173/src/assets/images/default_user.png'),
    ''
  )
  assert.equal(resolveUserAvatarSource('/assets/default_user.4a00f165.png'), '')
})

test('prefers current profile avatar over stale online avatar records', () => {
  assert.equal(
    resolveCurrentUserAvatarSource(
      {
        avatar: '/content/dd68fdd852ef98de1a3e118d07511ff3def0fe281ca68fccfb588628a52d4dd7i0',
      },
      {
        avatar: '/content/fcf9553c70f4e11ebaa69288f849566de96cdef9e3dac139adfe76fa58db29e6i0',
      }
    ),
    '/content/dd68fdd852ef98de1a3e118d07511ff3def0fe281ca68fccfb588628a52d4dd7i0'
  )

  assert.equal(
    resolveCurrentUserAvatarSource(
      {
        avatar: '',
      },
      {
        avatar: '/content/fcf9553c70f4e11ebaa69288f849566de96cdef9e3dac139adfe76fa58db29e6i0',
      }
    ),
    '/content/fcf9553c70f4e11ebaa69288f849566de96cdef9e3dac139adfe76fa58db29e6i0'
  )
})

test('builds user avatar lookup candidates in stable identity order', () => {
  assert.equal(
    JSON.stringify(resolveUserAvatarLookupCandidates(
      {
        globalMetaId: ' id-global ',
        metaid: 'id-meta',
        address: 'address-1',
      },
      {
        globalMetaId: 'id-global',
        metaid: 'id-meta-2',
      }
    )),
    JSON.stringify([
      { type: 'globalMetaId', value: 'id-global' },
      { type: 'metaId', value: 'id-meta' },
      { type: 'address', value: 'address-1' },
      { type: 'metaId', value: 'id-meta-2' },
    ])
  )
})

test('hydrates user avatars when missing or when the local image fails', () => {
  const candidates = [{ type: 'globalMetaId', value: 'id-global' }]

  assert.equal(shouldHydrateUserAvatarSource('', candidates), true)
  assert.equal(shouldHydrateUserAvatarSource('/content/stalei0', candidates), false)
  assert.equal(shouldHydrateUserAvatarSource('/content/stalei0', candidates, true), true)
  assert.equal(shouldHydrateUserAvatarSource('', []), false)
})
