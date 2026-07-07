import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const dist = path.join(root, 'dist')
const src = path.join(root, 'src')

const failures = []

function assert(condition, message) {
  if (!condition) failures.push(message)
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

const indexPath = path.join(dist, 'index.html')
assert(fs.existsSync(indexPath), 'dist/index.html no existe. Ejecuta npm run build antes del smoke visual.')

if (fs.existsSync(indexPath)) {
  const html = fs.readFileSync(indexPath, 'utf8')
  const assetRefs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1])
  const localAssets = assetRefs.filter(ref => ref.startsWith('/assets/') || ref.startsWith('assets/'))

  assert(localAssets.length > 0, 'index.html no referencia assets compilados.')

  for (const ref of localAssets) {
    const file = path.join(dist, ref.replace(/^\//, ''))
    assert(fs.existsSync(file), `asset referenciado no existe: ${ref}`)
    if (fs.existsSync(file)) {
      assert(fs.statSync(file).size > 0, `asset vacío: ${ref}`)
    }
  }
}

const app = read('src/App.tsx')
const requiredRoutes = [
  '/login',
  '/register',
  '/admin/login',
  '/admin/dashboard',
  '/dashboard',
  '/usuarios',
  '/terceros',
  '/inventario',
  '/facturas',
  '/facturas-compra',
  '/asientos',
  '/auditoria',
  '/reportes/tributarios',
]

for (const route of requiredRoutes) {
  assert(app.includes(route), `ruta crítica no encontrada en App.tsx: ${route}`)
}

const criticalScreens = [
  'src/pages/Login/LoginPage.tsx',
  'src/pages/Register/RegisterPage.tsx',
  'src/pages/Admin/AdminLoginPage.tsx',
  'src/pages/Admin/AdminLayout.tsx',
  'src/pages/Dashboard/DashboardPage.tsx',
  'src/pages/Facturacion/FacturacionPage.tsx',
  'src/features/auditoria/pages/AuditoriaPage.tsx',
]

for (const screen of criticalScreens) {
  const file = path.join(root, screen)
  assert(fs.existsSync(file), `pantalla crítica no existe: ${screen}`)
  if (fs.existsSync(file)) {
    assert(fs.statSync(file).size > 200, `pantalla crítica sospechosamente vacía: ${screen}`)
  }
}

const brandingAssets = [
  'public/favicon.ico',
  'public/favicon.svg',
  'public/branding/logo-dark.svg',
  'public/branding/logo-light.svg',
]

for (const asset of brandingAssets) {
  const file = path.join(root, asset)
  assert(fs.existsSync(file), `asset de branding no existe: ${asset}`)
  if (fs.existsSync(file)) {
    assert(fs.statSync(file).size > 0, `asset de branding vacío: ${asset}`)
  }
}

const cssPath = path.join(src, 'index.css')
assert(fs.existsSync(cssPath), 'src/index.css no existe.')
if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, 'utf8')
  for (const token of ['--bg-', '--text-', '--border', '.btn', '.card', '.modal-overlay']) {
    assert(css.includes(token), `token visual base no encontrado en CSS: ${token}`)
  }
}

if (failures.length > 0) {
  console.error('E2E/visual smoke falló:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('E2E/visual smoke OK: build, rutas críticas y branding verificados.')
