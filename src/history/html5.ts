import consola from 'consola'
import BaseHistory from './base'
import {
  HistoryLocation,
  NavigationCallback,
  HistoryState,
  NavigationType,
} from '../types/index'

const cs = consola.withTag('html5')

type PopStateListener = (this: Window, ev: PopStateEvent) => any

export default class HTML5History extends BaseHistory {
  private history = window.history
  private _popStateListeners: PopStateListener[] = []
  private _listeners: NavigationCallback[] = []
  private _teardowns: Array<() => void> = []

  constructor() {
    super()
  }

  // TODO: is this necessary
  ensureLocation() {
    const to = buildFullPath()
    cs.log('ensureLocation', to)
    this.history.replaceState(
      {
        _back: null,
        _current: to,
        _forward: null,
      },
      '',
      to
    )
    this.location = to
  }

  replace(to: HistoryLocation) {
    if (to === this.location) return
    cs.info('replace', this.location, to)
    this.history.replaceState(
      {
        // TODO: this should be user's responsibility
        // _replacedState: this.history.state || null,
        _back: this.location,
        _current: to,
        _forward: null,
        _replaced: true,
      },
      '',
      to
    )
    this.location = to
  }

  push(to: HistoryLocation, data?: HistoryState) {
    // replace current entry state to add the forward value
    this.history.replaceState(
      {
        ...this.history.state,
        _forward: to,
      },
      ''
    )
    // TODO: compare current location to prevent navigation
    // NEW NOTE: I think it shouldn't be history responsibility to check that
    // if (to === this.location) return
    const state = {
      _back: this.location,
      _current: to,
      _forward: null,
      ...data,
    }
    cs.info('push', this.location, '->', to, 'with state', state)
    this.history.pushState(state, '', to)
    this.location = to
  }

  listen(callback: NavigationCallback) {
    // state is the same as history.state
    const handler: PopStateListener = ({ state }) => {
      cs.log(this)
      cs.info('popstate fired', {
        state,
        location: this.location,
      })
      const from = this.location
      // we have the state from the old entry, not the current one being removed
      // TODO: correctly parse pathname
      this.location = state ? state._current : buildFullPath
      callback(this.location, from, {
        type:
          from === state._forward
            ? NavigationType.back
            : NavigationType.forward,
      })
    }

    // settup the listener and prepare teardown callbacks
    this._popStateListeners.push(handler)
    this._listeners.push(callback)
    window.addEventListener('popstate', handler)

    const teardown = () => {
      this._popStateListeners.splice(
        this._popStateListeners.indexOf(handler),
        1
      )
      this._listeners.splice(this._listeners.indexOf(callback), 1)
      window.removeEventListener('popstate', handler)
    }

    this._teardowns.push(teardown)
    return teardown
  }

  destroy() {
    for (const teardown of this._teardowns) teardown()
    this._teardowns = []
  }
}

const buildFullPath = () =>
  window.location.pathname + window.location.search + window.location.hash
