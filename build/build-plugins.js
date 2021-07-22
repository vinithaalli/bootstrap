#!/usr/bin/env node

/*!
 * Script to build our plugins to use them separately.
 * Copyright 2020-2021 The Bootstrap Authors
 * Copyright 2020-2021 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
 */

'use strict'

const path = require('path')
const rollup = require('rollup')
const { babel } = require('@rollup/plugin-babel')
const banner = require('./banner.js')

const distPath = path.resolve(__dirname, '../js/dist/')
const srcPath = path.resolve(__dirname, '../js/src/')

const plugins = [
  babel({
    // Only transpile our source code
    exclude: 'node_modules/**',
    // Include the helpers in each file, at most one copy of each
    babelHelpers: 'bundled'
  })
]

const utilPlugins = {
  BackDrop: 'util/backdrop.js',
  ScrollBarHelper: 'util/scrollbar.js',
  sanitizeHtml: 'util/sanitizer.js',
  Util: 'util/index.js'
}

const domPlugins = {
  Data: 'dom/data.js',
  EventHandler: 'dom/event-handler.js',
  Manipulator: 'dom/manipulator.js',
  SelectorEngine: 'dom/selector-engine.js'
}

const mainPlugins = {
  BaseComponent: 'base-component.js',
  Alert: 'alert.js',
  Button: 'button.js',
  Carousel: 'carousel.js',
  Collapse: 'collapse.js',
  Dropdown: 'dropdown.js',
  Modal: 'modal.js',
  Offcanvas: 'offcanvas.js',
  Popover: 'popover.js',
  ScrollSpy: 'scrollspy.js',
  Tab: 'tab.js',
  Toast: 'toast.js',
  Tooltip: 'tooltip.js'
}

const nodePlugins = {
  Popper: '@popperjs/core'
}

const bsPlugins = {
  ...domPlugins,
  ...utilPlugins,
  ...mainPlugins
}
const allPlugins = {
  ...bsPlugins,
  ...nodePlugins
}

const makePluginPath = (pluginKey, basePath) => {
  if (Object.prototype.hasOwnProperty.call(nodePlugins, pluginKey)) {
    return nodePlugins[pluginKey]
  }

  const pluginFilename = allPlugins[pluginKey]

  return path.resolve(__dirname, `${basePath}/${pluginFilename}`)
}

const resolvedDist = new Map()
const resolvedSrc = new Map()

Object.keys(allPlugins).forEach(key => {
  resolvedDist.set(key, makePluginPath(key, distPath))
  resolvedSrc.set(key, makePluginPath(key, srcPath).replace('.js', ''))
})

const build = async pluginKey => {
  console.log(`Building ${pluginKey} plugin...`)

  const pluginFilename = path.basename(bsPlugins[pluginKey])
  const external = []
  const globals = {}
  const bundle = await rollup.rollup({
    input: resolvedSrc.get(pluginKey),
    plugins,
    external: source => {
      // eslint-disable-next-line no-unused-vars
      const plugin = Object.entries(allPlugins).find(([key, path]) => {
        return path.includes(source.replace('../', '').replace('./', ''))
      })

      if (!plugin) {
        console.warn(`Source ${source} is not mapped`)
        return false
      }

      const pluginKey = plugin[0]
      external.push(resolvedDist.get(pluginKey))
      globals[resolvedSrc.get(pluginKey)] = pluginKey
      return external
    }
  })

  await bundle.write({
    banner: banner(pluginFilename),
    format: 'umd',
    name: pluginKey,
    sourcemap: true,
    globals,
    file: resolvedDist.get(pluginKey)
  })

  console.log(`Building ${pluginKey} plugin... Done!`)
}

const main = async () => {
  try {
    await Promise.all(Object.keys(bsPlugins).map(plugin => build(plugin)))
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

main()
