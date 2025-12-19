# ShowV3

- 集成自适应（使用设计稿 px,自动转换 rem）
- 集成`i18n`国际化多语言配置
- 集成`element-plus`Ui 组件,tempalte 里面直接使用，不用引入。script 使用需单独引入
- 集成代码格式规范和编辑器自动格式化
- 使用 Vue3 最新 SFC setup 语法，推荐使用[https://vue3js.cn/docs/zh/guide/composition-api-setup.html#%E5%8F%82%E6%95%B0](https://vue3js.cn/docs/zh/guide/composition-api-setup.html#%E5%8F%82%E6%95%B0)

## 使用

1. 修改`.env`的`VITE_Design_Size`的自适应配置,`VITE_AppName`:应用名称;`VITE_AppDescription`:应用描述
2. 修改 publice 目录下对应图标
3. 图标推荐使用 svg 格式。有两种使用方式,
   1. 多色图标 `import` 引入使用,可以自由编辑 svg 每个部分， 使用方法[vite-svg-loader](https://github.com/jpkleemans/vite-svg-loader)
   2. 单色图标 使用全局组件 `<Icon />`，使用方法查看下面 全局组件部分内容
4. 布局推荐使用`flex`,`flex`全局快捷样式查看`/src/assets//styles/flex.scss`
5. 卸载旧的浏览器`Vue.js devtools`插件，安装最新版本[https://chrome.google.com/webstore/detail/vuejs-devtools/ljjemllljcmogpfapbkkighbhhppjdbg](https://chrome.google.com/webstore/detail/vuejs-devtools/ljjemllljcmogpfapbkkighbhhppjdbg)
6. 页面标题统一在`router.ts`路由文件，根据`meta.title`字段配置，通过配置`meta.isAuth`字段是否需要登录才可访问
7. 页面是否缓存,统一在`router.ts`路由文件，根据`meta.keepAlive`字段配置

## 全局组件

- `Image`: `MetaFile` 图片使用全局组件 `<Image />`, 使用本地数据库缓存图片,使用方法：`/src/components/Image/Image.vue`
- `UserAvatar`: 用户头像组件使用方法：`/src/components/UserAvatar/UserAvatar.vue`
- `Icon`: `svg`图标雪碧图组件（减少资源请求，不用引入使用）,把`svg`图标放在`/src/assets/icons/`目录下，使用方法 `/src/components/Icon/Icon.vue`

## VSCode 设置

安装推荐插件即可

## API 配置说明

应用的 API 配置位于 `public/app-config.json` 文件中，以下是各配置项的说明：

```json
{
  "api": {
    "mvcBaseApi": "https://api.mvcscan.com/browser",
    "fileApi": "https://file.metaid.io/metafile-indexer/api/v1/files",
    "avatarContentApi": "https://file.metaid.io/metafile-indexer/thumbnail",
    "metafileIndexerApi": "https://file.metaid.io/metafile-indexer/api",
    "chatApi": "https://www.show.now/chat-api",
    "chatNotify": "https://api.idchat.io",
    "chatWs": "https://www.show.now",
    "chatWsPath": "/socket"
  }
}
```

| 配置项               | 说明                                                              |
| -------------------- | ----------------------------------------------------------------- |
| `mvcBaseApi`         | MVC 区块链浏览器 API 地址，用于查询区块链相关数据（交易、地址等） |
| `fileApi`            | MetaFile 文件上传/下载 API 地址，用于处理文件的存储和获取         |
| `avatarContentApi`   | 头像缩略图 API 地址，用于获取用户头像的缩略图资源                 |
| `metafileIndexerApi` | MetaFile 索引器 API 地址，用于文件索引和查询服务                  |
| `chatApi`            | 聊天服务 REST API 地址，用于处理聊天消息、群组管理等 HTTP 请求    |
| `chatNotify`         | 聊天通知服务地址，用于处理推送通知相关功能                        |
| `chatWs`             | WebSocket 服务器地址，用于实时消息通信的基础 URL                  |
| `chatWsPath`         | WebSocket 连接路径，与 `chatWs` 组合形成完整的 WebSocket 连接地址 |

### 环境配置文件

- `public/app-config.json` - 生产环境配置
- `public/app-config.dev.json` - 开发环境配置
- `public/app-config-test.json` - 测试环境配置

### WebSocket 连接示例

WebSocket 完整连接地址由 `chatWs` + `chatWsPath` 组成：

```
wss://www.show.now/socket
```
