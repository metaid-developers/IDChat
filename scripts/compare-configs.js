/**
 * 配置对比工具
 * 用于比较不同环境配置文件的差异
 * 
 * 用法: node scripts/compare-configs.js [env1] [env2]
 * 示例: node scripts/compare-configs.js dev prod
 */

const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const env1 = args[0] || 'dev'
const env2 = args[1] || 'prod'

const rootDir = path.resolve(__dirname, '..')

function loadConfig(env) {
    const filePath = path.join(rootDir, 'public', `app-config.${env}.json`)
    if (!fs.existsSync(filePath)) {
        console.error(`❌ 配置文件不存在: ${filePath}`)
        return null
    }
    try {
        const content = fs.readFileSync(filePath, 'utf8')
        return JSON.parse(content)
    } catch (error) {
        console.error(`❌ 读取配置失败: ${error.message}`)
        return null
    }
}

function compareObjects(obj1, obj2, path = '') {
    const differences = []

    // 检查 obj1 中的字段
    for (const key in obj1) {
        const fullPath = path ? `${path}.${key}` : key

        if (!(key in obj2)) {
            differences.push({
                path: fullPath,
                type: 'missing_in_env2',
                value1: obj1[key],
                value2: undefined,
            })
            continue
        }

        const val1 = obj1[key]
        const val2 = obj2[key]

        if (typeof val1 === 'object' && typeof val2 === 'object' && !Array.isArray(val1)) {
            differences.push(...compareObjects(val1, val2, fullPath))
        } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
            differences.push({
                path: fullPath,
                type: 'different',
                value1: val1,
                value2: val2,
            })
        }
    }

    // 检查 obj2 中额外的字段
    for (const key in obj2) {
        if (!(key in obj1)) {
            const fullPath = path ? `${path}.${key}` : key
            differences.push({
                path: fullPath,
                type: 'missing_in_env1',
                value1: undefined,
                value2: obj2[key],
            })
        }
    }

    return differences
}

function formatValue(val) {
    if (val === undefined) return '(不存在)'
    if (Array.isArray(val)) return `[${val.length} 项]`
    if (typeof val === 'object') return JSON.stringify(val, null, 2)
    return String(val)
}

console.log(`\n📊 配置对比: ${env1} vs ${env2}\n`)

const config1 = loadConfig(env1)
const config2 = loadConfig(env2)

if (!config1 || !config2) {
    process.exit(1)
}

const differences = compareObjects(config1, config2)

if (differences.length === 0) {
    console.log('✅ 两个配置文件完全相同\n')
    process.exit(0)
}

console.log(`发现 ${differences.length} 处差异:\n`)

// 按类型分组
const grouped = {
    different: [],
    missing_in_env1: [],
    missing_in_env2: [],
}

differences.forEach(diff => {
    grouped[diff.type].push(diff)
})

// 显示差异
if (grouped.different.length > 0) {
    console.log('🔸 值不同的字段:')
    grouped.different.forEach(diff => {
        console.log(`\n  ${diff.path}`)
        console.log(`    ${env1}: ${formatValue(diff.value1)}`)
        console.log(`    ${env2}: ${formatValue(diff.value2)}`)
    })
    console.log('')
}

if (grouped.missing_in_env2.length > 0) {
    console.log(`🔸 只存在于 ${env1} 的字段:`)
    grouped.missing_in_env2.forEach(diff => {
        console.log(`  ${diff.path}: ${formatValue(diff.value1)}`)
    })
    console.log('')
}

if (grouped.missing_in_env1.length > 0) {
    console.log(`🔸 只存在于 ${env2} 的字段:`)
    grouped.missing_in_env1.forEach(diff => {
        console.log(`  ${diff.path}: ${formatValue(diff.value2)}`)
    })
    console.log('')
}

console.log('提示: 确保所有环境的配置文件结构一致，以避免运行时错误\n')
