import { writable } from 'svelte/store'

export const tags = writable({
  filterUrl: true,
  __tag1: {},
  __tag2: {},
  __tag3: {},
  route: '',
  uniq: true,
  list: false
})

export const eurls = writable({
  expanded: false
})
