const DB_NAME = 'elo-sandbox'
const STORE_NAME = 'files'
const FILE_KEY = 'rive'
const FILE_NAME_KEY = 'rive-name'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveRiveFile(buffer: ArrayBuffer, fileName: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(buffer, FILE_KEY)
    store.put(fileName, FILE_NAME_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadRiveFile(): Promise<{ buffer: ArrayBuffer; fileName: string } | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const bufReq = store.get(FILE_KEY)
    const nameReq = store.get(FILE_NAME_KEY)
    tx.oncomplete = () => {
      const buffer = bufReq.result as ArrayBuffer | undefined
      if (!buffer) { resolve(null); return }
      resolve({ buffer, fileName: (nameReq.result as string | undefined) ?? '' })
    }
    tx.onerror = () => reject(tx.error)
  })
}

export function bufferToBlobUrl(buffer: ArrayBuffer): string {
  const blob = new Blob([buffer], { type: 'application/octet-stream' })
  return URL.createObjectURL(blob)
}
