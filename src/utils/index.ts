import { RouteLocationNormalized, MatchedRouteRecord } from '../types'
import { guardToPromiseFn } from './guardToPromiseFn'

export * from './guardToPromiseFn'

type GuardType = 'beforeRouteEnter' | 'beforeRouteUpdate' | 'beforeRouteLeave'
export async function extractComponentsGuards(
  matched: MatchedRouteRecord[],
  guardType: GuardType,
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
) {
  const guards: Array<() => Promise<void>> = []
  await Promise.all(
    matched.map(async record => {
      // TODO: cache async routes per record
      for (const name in record.components) {
        const component = record.components[name]
        const resolvedComponent = await (typeof component === 'function'
          ? component()
          : component)

        const guard = resolvedComponent[guardType]
        if (guard) {
          guards.push(guardToPromiseFn(guard, to, from))
        }
      }
    })
  )

  return guards
}
