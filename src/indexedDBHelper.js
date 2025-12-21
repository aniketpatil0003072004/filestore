/**
 * IndexedDB Helper for Vaultify
 * Stores user token for Service Worker access
 */

const DB_NAME = 'video-vault-db'
const DB_VERSION = 1
const STORE_NAME = 'auth'

/**
 * Open IndexedDB database
 */
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)

        request.onupgradeneeded = (event) => {
            const db = event.target.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME)
            }
        }
    })
}

/**
 * Store user token in IndexedDB
 * @param {string} token - User authentication token
 */
export async function storeToken(token) {
    try {
        const db = await openDatabase()
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)

        return new Promise((resolve, reject) => {
            const request = store.put(token, 'user_token')
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    } catch (error) {
        console.error('Error storing token:', error)
        throw error
    }
}

/**
 * Get user token from IndexedDB
 * @returns {Promise<string|null>} User token or null
 */
export async function getToken() {
    try {
        const db = await openDatabase()
        const transaction = db.transaction([STORE_NAME], 'readonly')
        const store = transaction.objectStore(STORE_NAME)

        return new Promise((resolve, reject) => {
            const request = store.get('user_token')
            request.onsuccess = () => resolve(request.result || null)
            request.onerror = () => reject(request.error)
        })
    } catch (error) {
        console.error('Error getting token:', error)
        return null
    }
}

/**
 * Remove user token from IndexedDB
 */
export async function removeToken() {
    try {
        const db = await openDatabase()
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)

        return new Promise((resolve, reject) => {
            const request = store.delete('user_token')
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    } catch (error) {
        console.error('Error removing token:', error)
        throw error
    }
}
