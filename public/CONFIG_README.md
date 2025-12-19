# 应用配置说明 (app-config.json)

## 简介

`app-config.json` 是应用的运行时配置文件，包含应用的基本信息、API 端点和区块链配置。该文件在应用打包后可直接修改，无需重新构建。

## 配置文件位置

- **生产环境**: `dist/app-config.json`

## 配置项说明

### 1. 应用基本信息 (app)

| 配置项      | 说明                         | 示例                                                 |
| ----------- | ---------------------------- | ---------------------------------------------------- |
| name        | 应用名称，显示在浏览器标题栏 | "IDChat \| Decentralized Messenger Built on Bitcoin" |
| description | 应用描述，用于 SEO           | "A Decentralized Messaging App Built on Bitcoin"     |
| keywords    | 应用关键词，用于 SEO         | "IDChat \| Decentralized Messenger Built on Bitcoin" |
| key         | 应用唯一标识                 | "IDChat \| Decentralized Messenger Built on Bitcoin" |
| logo        | 应用 Logo 路径               | "/logo.png"                                          |
| favicon     | 网站图标路径                 | "/favicon.ico"                                       |
| designSize  | UI 设计稿基准尺寸（px）      | 1920                                                 |

### 2. API 端点配置 (api)

| 配置项                   | 说明                     |
| ------------------------ | ------------------------ |
| mvcBaseApi               | MVC 区块链浏览器 API     |
| metaSoBaseURL            | MetaSo 服务基础 URL      |
| metaFSBaseURL            | MetaFS 文件服务 URL      |
| paths.fileApi            | 文件 API 路径            |
| paths.avatarContentApi   | 头像缩略图 API 路径      |
| paths.metafileIndexerApi | Metafile 索引器 API 路径 |
| paths.chatApi            | 聊天 API 路径            |
| paths.chatNotify         | 聊天通知服务路径         |
| paths.chatWs             | 聊天 WebSocket 服务路径  |
| paths.chatWsPath         | WebSocket 连接路径       |

### 3. 区块链配置 (blockchain)

| 配置项      | 说明                 | 可选值                |
| ----------- | -------------------- | --------------------- |
| network     | 区块链网络类型       | "mainnet" / "testnet" |
| networkNew  | 新版网络标识         | "livenet" / "testnet" |
| metaidTag   | MetaID 标签          | "metaid"              |
| addressHost | 主机地址（BTC 地址） | bc1p 开头的地址       |

### 4. 其他配置 (other)

预留的扩展配置项，可根据需要添加自定义配置。

## 使用方法

### 开发环境

直接修改 `app-config.json` 文件，重启服务器即可生效。

## 支持

如有问题，请查阅项目文档或联系开发团队。
