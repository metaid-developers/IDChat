#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const sourcePath = path.resolve(__dirname, '../src/stores/simple-talk.ts')
const source = fs.readFileSync(sourcePath, 'utf8')

const fail = message => {
  console.error(`IndexedDB local-first assertion failed: ${message}`)
  process.exit(1)
}

const loadNewestStart = source.indexOf('async loadNewestMessages(')
if (loadNewestStart === -1) {
  fail('loadNewestMessages method was not found')
}

const firstServerFetch = source.indexOf('const fetchPromise = this.fetchServerMessages', loadNewestStart)
if (firstServerFetch === -1) {
  fail('loadNewestMessages no longer has the expected server fetch marker')
}

const localFirstCall = source.indexOf('await this.tryLoadNewestMessagesFromLocal', loadNewestStart)
if (localFirstCall === -1 || localFirstCall > firstServerFetch) {
  fail('loadNewestMessages must try IndexedDB local latest-page range before fetching the server')
}

const helperStart = source.indexOf('async tryLoadNewestMessagesFromLocal(')
if (helperStart === -1) {
  fail('tryLoadNewestMessagesFromLocal helper was not found')
}

const helperEnd = source.indexOf('async loadNewestMessages(', helperStart)
const helperBody = source.slice(helperStart, helperEnd === -1 ? source.length : helperEnd)

if (!helperBody.includes('this.db.getMessagesInRange')) {
  fail('tryLoadNewestMessagesFromLocal must read IndexedDB by index range')
}

if (!helperBody.includes('this.checkMessageRangeContinuity')) {
  fail('tryLoadNewestMessagesFromLocal must verify index continuity before using local messages')
}

const newestBodyEnd = source.indexOf('async loadServerMessagesSync(', loadNewestStart)
const newestBody = source.slice(loadNewestStart, newestBodyEnd === -1 ? source.length : newestBodyEnd)

if (!newestBody.includes('服务器没有返回消息，保留本地缓存') || !newestBody.includes('fallbackMessages')) {
  fail('empty server latest-page responses must preserve local cached messages')
}

console.log('IndexedDB local-first assertions passed.')
