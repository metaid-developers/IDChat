#!/usr/bin/env node

/**
 * API 文件迁移辅助工具
 * 检查哪些 API 文件还在使用 import.meta.env，并提供迁移建议
 */

const fs = require('fs')
const path = require('path')

const apiDir = path.resolve(__dirname, '../src/api')

// 需要检查的模式
const patterns = [
    /import\.meta\.env\.VITE_\w+/g,
    /VITE_\w+\(\)/g,
]

console.log('🔍 检查 API 文件中的配置使用情况...\n')

// 读取所有 API 文件
const files = fs.readdirSync(apiDir).filter(f => f.endsWith('.ts'))

let totalIssues = 0
const fileIssues = []

files.forEach(file => {
    const filePath = path.join(apiDir, file)
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n')

    const issues = []

    lines.forEach((line, index) => {
        patterns.forEach(pattern => {
            const matches = line.match(pattern)
            if (matches) {
                issues.push({
                    line: index + 1,
                    code: line.trim(),
                    matches: matches,
                })
            }
        })
    })

    if (issues.length > 0) {
        totalIssues += issues.length
        fileIssues.push({
            file,
            filePath,
            issues,
        })
    }
})

if (totalIssues === 0) {
    console.log('✅ 所有 API 文件都已迁移完成！\n')
    process.exit(0)
}

console.log(`⚠️  发现 ${totalIssues} 处需要迁移的代码\n`)

fileIssues.forEach(({ file, filePath, issues }) => {
    console.log(`📄 ${file}`)
    console.log(`   路径: ${filePath}`)
    console.log(`   问题数: ${issues.length}`)

    issues.forEach(issue => {
        console.log(`   L${issue.line}: ${issue.code}`)
        issue.matches.forEach(match => {
            console.log(`     → ${match}`)
        })
    })

    console.log('')
})

console.log('💡 迁移建议：')
console.log('')
console.log('1. 导入工具函数：')
console.log('   import { createLazyApiClient } from \'@/utils/api-factory\'')
console.log('   import { getRuntimeConfig } from \'@/config/runtime-config\'')
console.log('')
console.log('2. 修改 API 客户端初始化：')
console.log('   // 之前')
console.log('   const Api = new HttpRequest(`${import.meta.env.VITE_BASEAPI}/endpoint`, options).request')
console.log('')
console.log('   // 之后')
console.log('   const Api = createLazyApiClient(')
console.log('     () => `${getRuntimeConfig().api.baseApi}/endpoint`,')
console.log('     options')
console.log('   )')
console.log('')
console.log('3. 查看详细迁移指南：')
console.log('   docs/API_MIGRATION_GUIDE.md')
console.log('')

process.exit(1)
