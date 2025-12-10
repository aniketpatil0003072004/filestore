/**
 * CLIENT-SIDE ENCRYPTION HELPER (AES-GCM)
 * 
 * This ensures End-to-End Encryption.
 * Data is encrypted in the browser BEFORE it hits the network/database.
 * The 'password' (Master Key) is never stored anywhere.
 */

// Generate a cryptographic key from the user's password
async function getKey(password) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    // We use a fixed salt for simplicity in this MVP, 
    // but typically you'd store a unique salt per user.
    // For a personal app, a hardcoded salt + strong password is acceptable.
    const salt = enc.encode("VIDEO_VAULT_SECURE_SALT_V1");

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

// ENCRYPT FUNCTION
export async function encryptData(text, password) {
    try {
        const key = await getKey(password);
        const encoded = new TextEncoder().encode(text);

        // Generate a random IV (Initialization Vector) - vital for security
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encoded
        );

        // Combine IV + Encrypted Data and convert to Base64 for storage
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);

        // Convert buffer to Base64 string
        return btoa(String.fromCharCode(...combined));
    } catch (e) {
        console.error("Encryption failed:", e);
        throw new Error("Encryption failed");
    }
}

// DECRYPT FUNCTION
export async function decryptData(encryptedBase64, password) {
    try {
        const key = await getKey(password);

        // Convert Base64 back to buffer
        const combined = new Uint8Array(atob(encryptedBase64).split("").map(c => c.charCodeAt(0)));

        // Extract IV (first 12 bytes) and Data
        const iv = combined.slice(0, 12);
        const data = combined.slice(12);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            data
        );

        return new TextDecoder().decode(decrypted);
    } catch (e) {
        console.error("Decryption failed:", e);
        throw new Error("Incorrect Password or Corrupted Data"); // Likely wrong password
    }
}
