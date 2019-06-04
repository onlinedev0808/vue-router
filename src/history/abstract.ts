import consola from 'consola'
import { BaseHistory, HistoryLocationNormalized } from './base'
import { NavigationCallback, HistoryState } from './base'

const cs = consola.withTag('abstract')

export class AbstractHistory extends BaseHistory {
  // private _listeners: NavigationCallback[] = []
  private _teardowns: Array<() => void> = []

  constructor() {
    super()
    cs.info('created')
  }

  // TODO: is this necessary
  ensureLocation() {}

  replace(to: HistoryLocationNormalized) {}

  push(to: HistoryLocationNormalized, data?: HistoryState) {}

  listen(callback: NavigationCallback) {
    return () => {}
  }

  destroy() {
    for (const teardown of this._teardowns) teardown()
    this._teardowns = []
  }

  back() {}
}
