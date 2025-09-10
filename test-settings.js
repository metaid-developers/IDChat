// 测试BTC和MVC红包设置分离
console.log('测试BTC和MVC红包设置分离功能')

// 模拟BTC设置
const btcSettings = {
    amount: 0.00003,
    each: 0.00001,
    unit: 'BTC',
    quantity: 3,
    message: 'BTC红包测试',
    type: 1
}

// 模拟MVC设置
const mvcSettings = {
    amount: 0.1,
    each: 0.05,
    unit: 'Space',
    quantity: 2,
    message: 'MVC红包测试',
    type: 1
}

// 测试保存和读取
localStorage.setItem('redPacketFormSettings_btc', JSON.stringify(btcSettings))
localStorage.setItem('redPacketFormSettings_mvc', JSON.stringify(mvcSettings))

console.log('BTC设置:', JSON.parse(localStorage.getItem('redPacketFormSettings_btc')))
console.log('MVC设置:', JSON.parse(localStorage.getItem('redPacketFormSettings_mvc')))

// 验证设置互不干扰
console.log('BTC和MVC设置是否不同:',
    localStorage.getItem('redPacketFormSettings_btc') !== localStorage.getItem('redPacketFormSettings_mvc')
)
