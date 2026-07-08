// Cross-platform path utilities for renderer process
// Works in browser context without Node.js process object

function detectSeparator(path: string): string {
  // Detect separator from path - Windows uses backslash, Unix uses forward slash
  return path.includes('\\') ? '\\' : '/'
}

export function join(...paths: string[]): string {
  if (paths.length === 0) return ''
  
  // Detect separator from first path, or default to forward slash
  const separator = paths[0] ? detectSeparator(paths[0]) : '/'
  
  return paths
    .filter(Boolean)
    .join(separator)
    .replace(/[/\\]+/g, separator)
}

export function dirname(path: string): string {
  const lastIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  if (lastIndex < 0) return '.'
  const separator = detectSeparator(path)
  return path.substring(0, lastIndex) || separator
}

export function basename(path: string): string {
  const parts = path.split(/[/\\]/).filter(Boolean)
  return parts[parts.length - 1] || path
}

export function extname(path: string): string {
  const lastDot = path.lastIndexOf('.')
  const lastSep = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  if (lastDot > lastSep && lastDot > 0) {
    return path.substring(lastDot)
  }
  return ''
}
