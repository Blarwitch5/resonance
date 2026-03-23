export function decodeBase64Json<T>(raw: string): T | null {
  try {
    const binary = atob(raw)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    const decoded = new TextDecoder('utf-8').decode(bytes)
    return JSON.parse(decoded) as T
  } catch {
    try {
      return JSON.parse(atob(raw)) as T
    } catch {
      return null
    }
  }
}
