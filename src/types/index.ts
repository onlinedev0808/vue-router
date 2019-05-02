import { HistoryQuery } from '../history/base'

type Lazy<T> = () => Promise<T>

export type TODO = any

export type ListenerRemover = () => void

// TODO: support numbers for easier writing but cast them
export type RouteParams = Record<string, string | string[]>
export type RouteQuery = Record<string, string | string[] | null>

export interface RouteQueryAndHash {
  query?: RouteQuery
  hash?: string
}
export interface LocationAsPath {
  path: string
}

export interface LocationAsName {
  name: string
  params?: RouteParams
}

export interface LocationAsRelative {
  params?: RouteParams
}

interface RouteLocationOptions {
  replace?: boolean
}

// User level location
export type RouteLocation =
  | string
  | RouteQueryAndHash & LocationAsPath & RouteLocationOptions
  | RouteQueryAndHash & LocationAsName & RouteLocationOptions
  | RouteQueryAndHash & LocationAsRelative & RouteLocationOptions

// exposed to the user in a very consistant way
export interface RouteLocationNormalized
  extends Required<RouteQueryAndHash & LocationAsRelative & LocationAsPath> {
  fullPath: string
  query: HistoryQuery // the normalized version cannot have numbers
  // TODO: do the same for params
  name: string | void
  matched: RouteRecord[] // non-enumerable
}

// interface PropsTransformer {
//   (params: RouteParams): any
// }

// export interface RouterLocation<PT extends PropsTransformer> {
//   record: RouteRecord<PT>
//   path: string
//   params: ReturnType<PT>
// }

// TODO: type this for beforeRouteUpdate and beforeRouteLeave
export interface RouteComponentInterface {
  beforeRouteEnter?: NavigationGuard
  beforeRouteLeave?: NavigationGuard<void>
}
// TODO: have a real type with augmented properties
// export type RouteComponent = TODO & RouteComponentInterface
export type RouteComponent = {
  template?: string
} & RouteComponentInterface

// NOTE not sure the whole PropsTransformer thing can be usefull
// since in callbacks we don't know where we are coming from
// and I don't thin it's possible to filter out the route
// by any means
export interface RouteRecord {
  path: string // | RegExp
  component: RouteComponent | Lazy<RouteComponent>
  name?: string
  beforeEnter?: NavigationGuard
  // props: PT
}

export const START_RECORD: RouteRecord = {
  path: '/',
  // @ts-ignore
  component: { render: h => h() },
}

// TODO: this should probably be generate by ensureLocation
export const START_LOCATION_NORMALIZED: RouteLocationNormalized = {
  path: '/',
  name: undefined,
  params: {},
  query: {},
  hash: '',
  fullPath: '/',
  matched: [],
}

// make matched non enumerable for easy printing
Object.defineProperty(START_LOCATION_NORMALIZED, 'matched', {
  enumerable: false,
})

// Matcher types
// the matcher doesn't care about query and hash
export type MatcherLocation =
  | LocationAsPath
  | LocationAsName
  | LocationAsRelative

export interface MatcherLocationNormalized {
  name: RouteLocationNormalized['name']
  path: string
  // record?
  params: RouteLocationNormalized['params']
  matched: RouteRecord[]
}

export interface NavigationGuardCallback {
  (): void
  (valid: false): void
}

export interface NavigationGuard<V = void> {
  (
    this: V,
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardCallback
  ): any
}

export interface PostNavigationGuard {
  (to: RouteLocationNormalized, from: RouteLocationNormalized): any
}
