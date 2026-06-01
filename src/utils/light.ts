export function getTimestampInSeconds() {
  return Math.floor(Date.now() / 1000)
}

export function sleep(timer = 2000) {
  return new Promise<void>(resolve => {
    setTimeout(() => {
      resolve()
    }, timer)
  })
}

export function containsString(protocol = '', searchProtocol = '') {
  const regex = new RegExp(searchProtocol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return regex.test(protocol)
}

export function completeReload() {
  const url = new URL(window.location.href)

  url.searchParams.delete('clear')
  url.searchParams.delete('address')

  window.location.href = url.href
}

export function changeSymbol(symbol: string) {
  if (symbol.indexOf('stake_dao_test') !== -1) {
    return 'stake_dao_test'
  }

  return symbol
}
