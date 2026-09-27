// Assembles src/ into a single self-contained page.
//   oikoumene.html — body fragment (for hosts that supply the document skeleton)
//   index.html     — standalone page, open directly in a browser
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const read = (f) => readFileSync(join(here, 'src', f), 'utf8')
const js = ['data.js', 'peoples.js', 'engine.js', 'render.js', 'ui.js'].map(read).join('\n')
const fragment = `${read('shell.html')}<script>\n${js}\n</script>\n`
writeFileSync(join(here, 'oikoumene.html'), fragment)
writeFileSync(
  join(here, 'index.html'),
  `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head>\n<body>\n${fragment}</body>\n</html>\n`,
)
console.log('built', (fragment.length / 1024).toFixed(1), 'KB')
