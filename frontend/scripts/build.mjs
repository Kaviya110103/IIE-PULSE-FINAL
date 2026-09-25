import { build, mergeConfig } from 'vite'
import config from '../vite.config.js'

await build(mergeConfig(config, { configFile: false }))
