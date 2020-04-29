import fakePromise from 'faked-promise'
import { createDom, noGuard, newRouter as createRouter } from '../utils'
import { RouteRecordRaw } from '../../src/types'

const Home = { template: `<div>Home</div>` }
const Foo = { template: `<div>Foo</div>` }

const beforeRouteUpdate = jest.fn()
const routes: RouteRecordRaw[] = [
  { path: '/', component: Home },
  { path: '/foo', component: Foo },
  {
    path: '/guard/:go',
    component: {
      ...Foo,
      beforeRouteUpdate,
    },
  },
]

beforeEach(() => {
  beforeRouteUpdate.mockReset()
})

describe('beforeRouteUpdate', () => {
  beforeAll(() => {
    createDom()
  })

  it('calls beforeRouteUpdate guards when changing params', async () => {
    const router = createRouter({ routes })
    beforeRouteUpdate.mockImplementationOnce(noGuard)
    await router.push('/guard/valid')
    // not called on initial navigation
    expect(beforeRouteUpdate).not.toHaveBeenCalled()
    await router.push('/guard/other')
    expect(beforeRouteUpdate).toHaveBeenCalledTimes(1)
  })

  it('waits before navigating', async () => {
    const [promise, resolve] = fakePromise()
    const router = createRouter({ routes })
    beforeRouteUpdate.mockImplementationOnce(async (to, from, next) => {
      await promise
      next()
    })
    await router.push('/guard/one')
    const p = router.push('/guard/foo')
    expect(router.currentRoute.value.fullPath).toBe('/guard/one')
    resolve()
    await p
    expect(router.currentRoute.value.fullPath).toBe('/guard/foo')
  })
})
