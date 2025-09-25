import { createRouter, createWebHistory, RouterView } from 'vue-router'
import { getChannels, getAllChannels } from '@/api/talk'
const NotFoundPage = () => import('@/views/404.vue')
//
import { ElMessage } from 'element-plus'
import i18n from '@/utils/i18n'
import { useRootStore } from './stores/root'
import { useUserStore } from './stores/user'
import { GetBandProposalList } from '@/api/strapi'
import { useLayoutStore } from './stores/layout'
import { KeepAlive } from 'vue'

//import.meta.env.VITE_BASE_URL
//export const routerHistory = createWebHistory()
//import.meta.env.MODE == 'development' ? '/' : '/chat/'
export const routerHistory = createWebHistory(
  import.meta.env.MODE == 'development' ? '/' : '/chat/'
) //'/chat/'//createWebHistory(import.meta.env.MODE == 'mainnet' ? '/chat/' : '/')
export const router = createRouter({
  history: routerHistory,
  strict: true,
  routes: [
    // {
    //   path: '/',
    //   redirect: () => {
    //     //const userStore = useUserStore()
    //      return { name: 'buzzRecommend' }
    //     // if (userStore.isAuthorized) {
    //     //   return { name: 'buzzRecommend' }
    //     // } else {
    //     //   return { name: 'home' }
    //     // }
    //   },
    //   children: [],
    // },

    // { path: '/', name: 'home', redirect: '/buzz' },
    //{ path: '/home', name: 'home', component: () => import('@/views/home/index.vue') },
    //{ path: '/randomly-dev', name: 'dev', component: import('@/views/dev/Index.vue') },
    {
      path: '/',
      name: 'buzz',
      component: () => import('@/views/buzz/Layout.vue'),
      meta: { keepAlive: true },
      // redirect: async() => {
      //   const userStore=useUserStore()
      //    const talk = useTalkStore()
      //   if (userStore.isAuthorized) {
      //         let channelId
      //        const myChannelList=await getChannels({
      //         metaId:userStore.last.metaid
      //         })
      //

      //          if(myChannelList.length){

      //             channelId=myChannelList[0].groupId

      //             }else{
      //               channelId='welcome'
      //             }
      //              return { name: 'talkChannel',params:{communityId:'public',channelId:channelId} }

      //     // talkAtMe

      //   } else {
      //     return { name: 'talkChannel',params:{communityId:'public',channelId:'welcome'} }
      //     //return { name: 'buzzRecommend' }
      //   }
      // },
      children: [
        // {
        //   path: 'index',
        //   name: 'buzzIndex',
        //   component: () => import('@/views/buzz/Index.vue'),
        //   meta: { isAuth: true, keepAlive: true },
        // },
        {
          path: 'recommend',
          name: 'buzzRecommend',
          component: () => import('@/views/buzz/Recomment.vue'),
          meta: { keepAlive: true },
        },
        // {
        //   path: 'tx/:txId',
        //   name: 'buzzDetail',
        //   component: () => import('@/views/buzz/Detail.vue'),
        // },
        // {
        //   path: 'tag/:tagId',
        //   name: 'buzzTag',
        //   meta: { keepAlive: false },
        //   component: () => import('@/views/buzz/Tag.vue'),
        // },
        // {
        //   path: 'topic/:topic',
        //   name: 'buzzTopic',
        //   component: () => import('@/views/buzz/Topic.vue'),
        //   meta: { keepAlive: true },
        // },
      ],
    },
    // {
    //   path: '/nft',
    //   name: 'nft',
    //   component: () => import('@/views/nft/Layout.vue'),
    //   meta: { keepAlive: true },
    //   redirect: {
    //     name: 'nftIndex',
    //   },
    //   children: [
    //     {
    //       path: 'index',
    //       name: 'nftIndex',
    //       component: () => import('@/views/nft/Index.vue'),
    //     },
    //     {
    //       path: 'issue',
    //       name: 'nftIssue',
    //       component: () => import('@/views/nft/Issue.vue'),
    //     },
    //     {
    //       path: 'genesis',
    //       name: 'nftGenesis',
    //       component: () => import('@/views/nft/Genesis.vue'),
    //     },
    //     {
    //       path: 'detail/:chain/:genesis/:codehash/:tokenIndex',
    //       name: 'nftDetail',
    //       component: () => import('@/views/nft/Detail.vue'),
    //     },
    //     {
    //       path: 'collection',
    //       name: 'nftCollection',
    //       component: () => import('@/layout/BaseRouterView/BaseRouterView.vue'),
    //       meta: { keepAlive: true },
    //       children: [
    //         {
    //           path: 'index',
    //           name: 'nftCollectionIndex',
    //           component: () => import('@/views/nft/collection/Index.vue'),
    //           meta: { keepAlive: true },
    //         },
    //         {
    //           path: 'detail/:topicType',
    //           name: 'nftCollectionDetail',
    //           component: () => import('@/views/nft/collection/Collection.vue'),
    //           meta: { keepAlive: true },
    //         },
    //       ],
    //     },
    //   ],
    // },

    // ShowTalk
    // {
    //   path: '/talk',
    //   name: 'talk',
    //   meta: { isAuth: true },
    //   redirect:'talk/channels/public'
    //   //redirect: '/talk/channels/@me',
    // },

    // {
    //   //path: '/talk/channels/@me/index',
    //   path:'/talk/channels/public/index',
    //   name: 'talkAtMeDefault',
    //   component: () => import('@/views/talk/AtMeDefault.vue'),
    //   meta: { isAuth: true },
    // },
    {
      path: '/talk/@me',
      component: () => import('@/views/talk/Channel.vue'),
      meta: { isAuth: true,KeepAlive: true  },
      children: [
        {
          path: ':channelId',
          name: 'talkAtMe',
          component: () => import('@/views/talk/components/ChannelBody.vue'),
          meta: { isAuth: true, KeepAlive: true },
        },
      ],
    },

    // .meta解析
    // {
    //   path: '/talk/channels/:metaName([a-zA-Z0-9_-]+[.][a-zA-Z0-9_-]+)/',
    //   name: 'talkMeta',
    //   component: () => import('@/views/talk/MetaName.vue'),
    // },
    // {
    //   path: '/talk/channels/:metaName([\\s\\S]+[.][a-zA-Z0-9_-]+)/:others*',
    //   name: 'talkMeta',
    //   component: () => import('@/views/talk/MetaName.vue'),
    // },

    {
      path: '/talk/channels/:communityId',
      component: () => import('@/views/talk/Channel.vue'),

      children: [
        {
          path: 'index',
          redirect: to => {
            let { communityId, channelId } = to.params

            if (!channelId) {
              channelId = 'welcome' //import.meta.env.VITE_CHAT_DEFAULT_CHANNEL
            }
            if (!communityId) {
              communityId = 'public'
            }
            console.log('channelId', communityId)

            return { name: 'talkChannel', params: { communityId, channelId } }
          },
        },
        // {
        //   path: 'announcements',
        //   name: 'talkAnnouncements',
        //   component: () => import('@/views/talk/components/announcements/Body.vue'),
        // },
        // {
        //   path: 'topics',
        //   name: 'talkTopics',
        //   component: () => import('@/views/talk/components/topics/Body.vue'),
        // },
        // {
        //   path: 'dao',
        //   name: 'talkDAO',
        //   component: () => import('@/views/talk/DAO/Layout.vue'),
        //   redirect: () => {
        //     const talk = useTalkStore()
        //     if (talk.activeCommunity?.dao) {
        //       return {
        //         name: 'talkDAOProposal',
        //       }
        //     } else {
        //       return {
        //         name: 'talkDAOCreate',
        //       }
        //     }
        //   },
        //   //
        //   children: [
        //     {
        //       path: 'create',
        //       name: 'talkDAOCreate',
        //       component: () => import('@/views/talk/DAO/Null.vue'),
        //     },
        //     {
        //       path: 'proposal',
        //       name: 'talkDAOProposal',
        //       component: () => RouterView,
        //       redirect: { name: 'talkDAOProposalIndex' },
        //       children: [
        //         {
        //           path: 'index',
        //           name: 'talkDAOProposalIndex',
        //           component: () => import('@/views/talk/DAO/proposal/Index.vue'),
        //         },
        //         {
        //           path: 'detail/:id',
        //           name: 'talkDAOProposalDetail',
        //           component: () => import('@/views/talk/DAO/proposal/Detail.vue'),
        //           beforeEnter: async (to, from, next) => {
        //             const root = useRootStore()
        //             // if (root.bandProposalList.includes(to.params.id as string)) {
        //             //   next('/404')
        //             // } else {
        //             //   next()
        //             // }
        //             try {
        //               const bandList = await GetBandProposalList()
        //               if (bandList[0].vote_id.includes(to.params.id)) {
        //                 next('/404')
        //               } else {
        //                 next()
        //               }
        //             } catch (error) {
        //               ElMessage.error(`Network error:${error?.toString()}`)
        //               next()
        //             }
        //           },
        //         },
        //         {
        //           path: 'create',
        //           name: 'talkDAOProposalCreate',
        //           component: () => import('@/views/talk/DAO/proposal/Create.vue'),
        //           beforeEnter: (to, from, next) => {
        //             const userStore = useUserStore()
        //             try {
        //               if (
        //                 userStore.user?.metaId !==
        //                 '1f983cc536a5378952e7977c7dda26db52e1804c8d95efa4820144d6e823f5c9'
        //               ) {
        //                 next('/404')
        //               } else {
        //                 next()
        //               }
        //             } catch (error) {
        //               ElMessage.error(`${error?.toString()}`)
        //               next()
        //             }
        //           },
        //         },
        //       ],
        //     },
        //     {
        //       path: 'entrust',
        //       name: 'talkDAOEntrust',
        //       component: () => import('@/views/talk/DAO/Entrust.vue'),
        //     },
        //     {
        //       path: 'about',
        //       name: 'talkDAOAbout',
        //       component: () => import('@/views/talk/DAO/About.vue'),
        //     },
        //     {
        //       path: 'leaderboard',
        //       name: 'talkDAOLeaderboard',
        //       component: () => import('@/views/talk/DAO/Rank.vue'),
        //     },
        //   ],
        // },
        {
          path: ':channelId',
          name: 'talkChannel',
          component: () => import('@/views/talk/components/ChannelBody.vue'),
          meta: { KeepAlive: true },
          // children:[
          //    {
          //     path: 'sub/:subId',
          //     name: 'talkSubChannel',
          //     component: () => import('@/views/talk/components/ChannelBody.vue'),
          //   },
          // ]
          // meta: {  keepAlive: true },
        },
      ],
    },

    // pay
    // {
    //   path: '/pay',
    //   name: 'pay',
    //   component: () => RouterView,
    //   meta: { isHideHeader: true },
    //   children: [
    //     {
    //       path: 'result',
    //       name: 'payResult',
    //       component: () => import('@/views/pay/Result.vue'),
    //     },
    //   ],
    // },
    // user
    // {
    //   path: '/user/:metaId',
    //   name: 'user',
    //   component: () => import('@/views/user/User.vue'),
    //   redirect: {
    //     name: 'userBuzz',
    //   },
    //   children: [
    //     {
    //       path: 'buzz',
    //       name: 'userBuzz',
    //       component: () => import('@/views/user/Buzz.vue'),
    //     },
    //     {
    //       path: 'nft',
    //       name: 'userNFT',
    //       component: () => import('@/views/user/NFT.vue'),
    //     },
    //   ],
    // },

    // MetaName
    // {
    //   path: '/metaname',
    //   name: 'metaName',
    //   component: () => import('@/views/metaname/Layout.vue'),
    //   redirect: '/metaname/index',
    //   children: [
    //     {
    //       path: 'index',
    //       name: 'metaNameIndex',
    //       component: () => import('@/views/metaname/Index.vue'),
    //     },
    //     {
    //       path: 'mine',
    //       name: 'metaNameMine',
    //       meta: { isAuth: true },
    //       component: () => RouterView,
    //       redirect: { name: 'mineIndex' },
    //       children: [
    //         {
    //           path: 'index',
    //           name: 'mineIndex',
    //           meta: { isAuth: true },
    //           component: () => import('@/views/metaname/mine/Mine.vue'),
    //         },
    //         {
    //           path: 'metaname/:metaName',
    //           name: 'mineMetaName',
    //           meta: { isAuth: true },
    //           component: () => import('@/views/metaname/mine/MetaName.vue'),
    //         },
    //         {
    //           path: 'status/:metaName/:orderId/:platform/:productType',
    //           name: 'metaNameMineStatus',
    //           meta: { isAuth: true },
    //           component: () => import('@/views/metaname/mine/Status.vue'),
    //         },
    //       ],
    //     },
    //     {
    //       path: 'market',
    //       name: 'metaNameMarket',
    //       component: () => import('@/views/metaname/Market.vue'),
    //     },
    //     {
    //       path: 'search',
    //       name: 'metaNameSearch',
    //       component: () => RouterView,
    //       redirect: '/metaname/search/index',
    //       children: [
    //         {
    //           path: 'index',
    //           name: 'metaNameSearchIndex',
    //           component: () => import('@/views/metaname/search/Search.vue'),
    //         },
    //         {
    //           path: 'register/:metaName/:orderId/:platform/:productType/:metaFile',
    //           name: 'metaNameSearchRegister',
    //           meta: { isAuth: true },
    //           component: () => import('@/views/metaname/search/Register.vue'),
    //         },
    //       ],
    //     },
    //   ],
    // },

    // 404
    { path: '/404', name: '404', component: NotFoundPage },
    {
      path: '/:pathMatch(.*)',
      redirect: '/404',
    },
  ],
  async scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      // TODO: check if parent in common that works with alias
      if (to.matched.every((record, i) => from.matched[i] !== record)) return { left: 0, top: 0 }
    }
    // leave scroll as it is by not returning anything
    // https://github.com/Microsoft/TypeScript/issues/18319
    return {
      top: 0,
    }
  },
})

// const delay = (t: number) => new Promise(resolve => setTimeout(resolve, t))

// remove trailing slashes
// router.beforeEach((to, from, next) => {
//   if (/.\/$/.test(to.path)) {
//     to.meta.redirectCode = 301
//     next(to.path.replace(/\/$/, ''))
//   } else next()
//   // next()
// })

// router.beforeEach(async (to, from, next) => {
//   // console.log(`Guard from ${from.fullPath} to ${to.fullPath}`)
//   if (to.params.id === 'no-name') return next(false)

//   const time = Number(to.query.delay)
//   if (time > 0) {
//     console.log('⏳ waiting ' + time + 'ms')
//     to.meta.waitedFor = time
//     await delay(time)
//   }
//   next()
// })

// router.afterEach((to, from) => {
//   if (to.name === from.name && to.name === 'repeat') {
//     const toDepth = to.path.split('/').length
//     const fromDepth = from.path.split('/').length
//     to.meta.transition = toDepth < fromDepth ? 'slide-right' : 'slide-left'
//   }
// })

// router.afterEach((to, from) => {
//   // console.log(
//   //   `After guard: from ${from.fullPath} to ${
//   //     to.fullPath
//   //   } | location = ${location.href.replace(location.origin, '')}`
//   // )
// })

export function go(delta: number) {
  return new Promise((resolve, reject) => {
    function popStateListener() {
      clearTimeout(timeout)
    }
    window.addEventListener('popstate', popStateListener)

    function clearHooks() {
      removeAfterEach()
      removeOnError()
      window.removeEventListener('popstate', popStateListener)
    }

    // if the popstate event is not called, consider this a failure
    const timeout = setTimeout(() => {
      clearHooks()
      reject(new Error('Failed to use router.go()'))
      // using 0 leads to false positives
    }, 1)

    // setImmediate

    const removeAfterEach = router.afterEach((_to, _from, failure) => {
      clearHooks()
      resolve(failure)
    })
    const removeOnError = router.onError(err => {
      clearHooks()
      reject(err)
    })

    router.go(delta)
  })
}

// @ts-expect-error
window._go = go

// router.beforeEach((to, from, next) => {
//   if (to.query.to) next(to.query.to as string)

//   else next()
// })
router.beforeEach(async (to, from, next) => {
  const layout = useLayoutStore()
  const rootStore=useRootStore()
  rootStore.checkWebViewBridge()
  if (to.path === '/') {
    debugger
    
    const userStore = useUserStore()
    // const talk = useTalkStore()

    if (userStore.isAuthorized) {
      const myChannelList = await getChannels({
        metaId: userStore.last.metaid,
      })

      let channelId
      if (myChannelList.length) {
        if(Number(myChannelList[0].type) == 2){
          channelId=myChannelList[0].metaId
             next({
          name: 'talkAtMe',
          params: { channelId },
        })
        }else{
          channelId = myChannelList[0].groupId
           next({
          name: 'talkChannel',
          params: { communityId: 'public', channelId },
        })

        
        }


        channelId = myChannelList[0].groupId
        layout.$patch({ showJoinView: false })
        layout.$patch({ showWelcomeDescView: false })
        //layout.$patch({ isShowLeftNav: true })
      } else {
        layout.$patch({ isShowLeftNav: true })
        layout.$patch({ showJoinView: true })
        channelId = 'welcome'
           next({
        name: 'talkChannel',
        params: { communityId: 'public', channelId },
      })
      }

   
    } else {
      layout.$patch({ isShowLeftNav: true })
      layout.$patch({ showJoinView: false })
      layout.$patch({ showWelcomeDescView: true })
      next({
        name: 'talkChannel',
        params: { communityId: 'public', channelId: 'welcome' },
      })
    }
  } else if (to.path == '/talk/channels/public/welcome') {
    const userStore = useUserStore()
    debugger
    if (userStore.isAuthorized) {
      
      const myChannelList = await getChannels({
        metaId: userStore.last.metaid,
      })

      let channelId
      if (myChannelList.length) {
        
        if(Number(myChannelList[0].type) == 2){
          channelId=myChannelList[0].metaId
             next({
          name: 'talkAtMe',
          params: { channelId },
        })
        }else{
          debugger
          channelId = myChannelList[0].groupId
           next({
          name: 'talkChannel',
          params: { communityId: 'public', channelId },
        })
        }

        
        
        layout.$patch({ showWelcomeDescView: false })
        layout.$patch({ showJoinView: false })


       
        //layout.$patch({ isShowLeftNav: true })
      } else {
        debugger
        layout.$patch({ isShowLeftNav: true })
        layout.$patch({ showJoinView: true })
        layout.$patch({ showWelcomeDescView: true })
        channelId = 'welcome'
        next()
      }
    } else {
      layout.$patch({ showJoinView: false })
      layout.$patch({ showWelcomeDescView: true })
      next()
    }

    layout.$patch({ isShowLeftNav: true })
  } else {
    if(from.name !== to.name && !from.name){
      layout.$patch({isShowLeftNav:true})
    }
    
    next()
    
   
  }
})

const dirLog = {
  '': '？',
  back: '⏪',
  forward: '⏩',
}
routerHistory.listen((to, from, info) => {
  console.log(`${dirLog[info.direction]} as a ${info.type}`)
})
