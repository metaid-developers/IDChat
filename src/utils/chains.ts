import { Chains } from '@/enum'
import ETH from '@/assets/images/eth.png'
import MVC from '@/assets/images/icon_mvc.png'
import BSV from '@/assets/images/bsv.png'
import BTC from '@/assets/images/btc.png'
import POLYGON from '@/assets/svg/polygon.svg?url'

export default [
  {
    id: 1,
    key: 'eth',
    name: import.meta.env.VITE_ETH_CHAIN,
    coinName: 'ETH',
    icon: ETH,
    value: import.meta.env.VITE_ETH_CHAIN,
    precision: 18,
    minUnit: 'wei',
    unit: 'eth',
  },
  {
    id: 2,
    key: 'mvc',
    name: 'MVC',
    coinName: 'SPACE',
    icon: MVC,
    value: 'mvc' as Chains,
    precision: 8,
    minUnit: 'sat',
    unit: 'space',
  },
  {
    id: 3,
    key: 'btc',
    name: 'BTC',
    coinName: 'BTC',
    icon: BTC,
    value: 'btc' as Chains,
    precision: 8,
    minUnit: 'sat',
    unit: 'btc',
  },
  {
    id: 4,
    key: 'polygon',
    name: import.meta.env.VITE_POLYGON_CHAIN,
    coinName: 'MATIC',
    icon: POLYGON,
    value: import.meta.env.VITE_POLYGON_CHAIN,
    precision: 18,
    minUnit: 'wei',
    unit: 'matic',
  },
  {
    id: 5,
    key: 'bsv',
    name: 'BSV',
    coinName: 'BSV',
    icon: BSV,
    value: 'bsv' as Chains,
    precision: 8,
    minUnit: 'sat',
    unit: 'bsv',
  },
]
