// 测试BTC红包最小金额验证
console.log('=== 测试BTC红包最小金额验证 ===')

// 模拟数据
const testCases = [
    {
        description: 'BTC链 - 0.00003 BTC (3000聪) 分3个红包',
        amount: 0.00003,
        unit: 'BTC',
        quantity: 3,
        chain: 'btc',
        minSats: 500, // BTC链最小500聪
        expected: '每个至少 0.000005 BTC'
    },
    {
        description: 'MVC链 - 0.1 Space 分2个红包',
        amount: 0.1,
        unit: 'Space',
        quantity: 2,
        chain: 'mvc',
        minSats: 10000, // MVC链最小10000聪
        expected: '每个至少 0.0001 Space'
    },
    {
        description: 'BTC链 - Sats单位 3000聪分3个红包',
        amount: 3000,
        unit: 'Sats',
        quantity: 3,
        chain: 'btc',
        minSats: 500,
        expected: '每个至少 500 Sats'
    }
]

// 模拟nicerAmount函数
function nicerAmount(amount, unit) {
    if (unit === 'Space' || unit === 'BTC') {
        return amount * 100000000 // 转换为聪
    } else {
        return amount // 已经是聪
    }
}

// 模拟验证逻辑
function validateRedPacket(testCase) {
    const { amount, unit, quantity, chain, minSats } = testCase
    const totalAmount = nicerAmount(amount, unit)

    console.log(`\n测试: ${testCase.description}`)
    console.log(`总金额(聪): ${totalAmount}`)
    console.log(`最小单红包(聪): ${minSats}`)
    console.log(`需要最小总额(聪): ${minSats * quantity}`)

    if (totalAmount < minSats * quantity) {
        let currentMinSats
        if (unit === 'Space') {
            currentMinSats = minSats / 100000000
        } else if (unit === 'BTC') {
            currentMinSats = minSats / 100000000
        } else if (unit === 'Sats') {
            currentMinSats = minSats
        } else {
            currentMinSats = minSats
        }

        const errorMsg = `总金额 ${amount} 不足以分配 ${quantity} 个红包（每个至少 ${currentMinSats} ${unit}）`
        console.log(`❌ 验证失败: ${errorMsg}`)
        return false
    } else {
        console.log(`✅ 验证通过`)
        return true
    }
}

// 运行测试
testCases.forEach(validateRedPacket)

console.log('\n=== 测试完成 ===')
