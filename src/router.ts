import { BaseHistory, HistoryLocationNormalized } from './history/base'
import { RouterMatcher } from './matcher'
import {
  RouteLocation,
  RouteRecord,
  START_LOCATION_NORMALIZED,
  RouteLocationNormalized,
  MatcherLocationNormalized,
  ListenerRemover,
  NavigationGuard,
  TODO,
  NavigationGuardCallback,
  PostNavigationGuard,
} from './types/index'

export interface RouterOptions {
  history: BaseHistory
  routes: RouteRecord[]
}

export class Router {
  protected history: BaseHistory
  private matcher: RouterMatcher
  private beforeGuards: NavigationGuard[] = []
  private afterGuards: PostNavigationGuard[] = []
  currentRoute: Readonly<RouteLocationNormalized> = START_LOCATION_NORMALIZED

  constructor(options: RouterOptions) {
    this.history = options.history
    // this.history.ensureLocation()

    this.matcher = new RouterMatcher(options.routes)

    this.history.listen((to, from, info) => {
      // TODO: check navigation guards
      const matchedRoute = this.matcher.resolve(to, this.currentRoute)
      // console.log({ to, matchedRoute })
      // TODO: navigate

      this.currentRoute = {
        ...to,
        ...matchedRoute,
      }
    })
  }

  /**
   * Trigger a navigation, should resolve all guards first
   * @param to Where to go
   */
  async push(to: RouteLocation) {
    let url: HistoryLocationNormalized
    let location: MatcherLocationNormalized
    if (typeof to === 'string' || 'path' in to) {
      url = this.history.utils.normalizeLocation(to)
      location = this.matcher.resolve(url, this.currentRoute)
    } else {
      // named or relative route
      // we need to resolve first
      location = this.matcher.resolve(to, this.currentRoute)
      // intentionally drop current query and hash
      url = this.history.utils.normalizeLocation({
        query: to.query ? this.history.utils.normalizeQuery(to.query) : {},
        hash: to.hash,
        ...location,
      })
    }

    // TODO: refactor in a function, some kind of queue
    const toLocation: RouteLocationNormalized = { ...url, ...location }
    await this.navigate(toLocation, this.currentRoute)
    this.history.push(url)
    const from = this.currentRoute
    this.currentRoute = toLocation

    // navigation is confirmed, call afterGuards
    for (const guard of this.afterGuards) guard(toLocation, from)
  }

  private async navigate(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized
  ): Promise<TODO> {
    // TODO: Will probably need to be some kind of queue in the future that allows to remove
    // elements and other stuff
    let guards: Array<() => Promise<any>> = []

    // check global guards first
    for (const guard of this.beforeGuards) {
      guards.push(guardToPromiseFn(guard, to, from))
    }

    // console.log('Guarding against', guards.length, 'guards')
    for (const guard of guards) {
      await guard()
    }

    // check the route beforeEnter
    // TODO: check children. Should we also check reused routes guards
    guards = []
    for (const record of to.matched) {
      if (record.beforeEnter)
        guards.push(guardToPromiseFn(record.beforeEnter, to, from))
    }

    // run the queue of per route beforeEnter guards
    for (const guard of guards) {
      await guard()
    }

    // check in-component beforeRouteEnter
    guards = []
    // TODO: is it okay to resolve all matched component or should we do it in order
    await Promise.all(
      to.matched.map(async ({ component }) => {
        // TODO: cache async routes per record
        const resolvedComponent = await (typeof component === 'function'
          ? component()
          : component)
        if (resolvedComponent.beforeRouteEnter) {
          // TODO: handle the next callback
          guards.push(
            guardToPromiseFn(resolvedComponent.beforeRouteEnter, to, from)
          )
        }
      })
    )

    // run the queue of per route beforeEnter guards
    for (const guard of guards) {
      await guard()
    }
  }

  getRouteRecord(location: RouteLocation) {}

  /**
   * Add a global beforeGuard that can confirm, abort or modify a navigation
   * @param guard
   */
  beforeEach(guard: NavigationGuard): ListenerRemover {
    this.beforeGuards.push(guard)
    return () => {
      this.beforeGuards.splice(this.beforeGuards.indexOf(guard), 1)
    }
  }

  /**
   * Add a global after guard that is called once the navigation is confirmed
   * @param guard
   */
  afterEach(guard: PostNavigationGuard): ListenerRemover {
    this.afterGuards.push(guard)
    return () => {
      this.afterGuards.splice(this.afterGuards.indexOf(guard), 1)
    }
  }
}

function guardToPromiseFn(
  guard: NavigationGuard,
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
): () => Promise<void> {
  return () =>
    new Promise((resolve, reject) => {
      const next: NavigationGuardCallback = (valid?: boolean) => {
        // TODO: better error
        if (valid === false) reject(new Error('Aborted'))
        else resolve()
      }

      guard(to, from, next)
    })
}
