/**
 * 配置切换脚本
 * 用于在不同环境之间切换配置文件
 * 
 * 用法: node scripts/switch-config.js [dev|test|prod]
 */

const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const env = args[0]

const validEnvs = ['dev', 'test', 'prod']

if (!env || !validEnvs.includes(env)) {
    console.error('❌ 错误: 请指定有效的环境')
    console.log('用法: node scripts/switch-config.js [dev|test|prod]')
    console.log('')
    console.log('可用环境:')
    console.log('  dev  - 开发环境 (testnet)')
    console.log('  test - 测试环境 (testnet)')
    console.log('  prod - 生产环境 (mainnet)')
    process.exit(1)
}

const rootDir = path.resolve(__dirname, '..')
const sourceFile = path.join(rootDir, 'public', `app-config.${env}.json`)
const targetFile = path.join(rootDir, 'public', 'app-config.json')

// 检查源文件是否存在
if (!fs.existsSync(sourceFile)) {
    console.error(`❌ 错误: 配置文件 ${sourceFile} 不存在`)
    console.log('')
    console.log('提示: 请先创建对应环境的配置文件')
    console.log(`  ${sourceFile}`)
    process.exit(1)
}

try {
    // 读取并验证 JSON 格式
    const configContent = fs.readFileSync(sourceFile, 'utf8')
    const config = JSON.parse(configContent)

    // 验证必需的字段
    const requiredFields = ['app', 'api', 'blockchain', 'features']
    const missingFields = requiredFields.filter(field => !config[field])

    if (missingFields.length > 0) {
        console.error(`❌ 配置文件缺少必需字段: ${missingFields.join(', ')}`)
        process.exit(1)
    }

    // 复制配置文件
    fs.copyFileSync(sourceFile, targetFile)

    console.log('✅ 配置切换成功!')
    console.log('')
    console.log(`环境: ${env}`)
    console.log(`源文件: ${sourceFile}`)
    console.log(`目标文件: ${targetFile}`)
    console.log('')
    console.log('配置概览:')
    console.log(`  应用名称: ${config.app?.name}`)
    console.log(`  API 地址: ${config.api?.baseApi}`)
    console.log(`  区块链网络: ${config.blockchain?.network}`)
    console.log(`  聊天功能: ${config.features?.enableChat ? '启用' : '禁用'}`)
    console.log(`  支付功能: ${config.features?.enablePayment ? '启用' : '禁用'}`)

} catch (error) {
    console.error('❌ 配置切换失败:', error.message)
    process.exit(1)
}
