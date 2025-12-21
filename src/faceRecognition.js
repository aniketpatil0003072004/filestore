import * as faceapi from 'face-api.js';

let modelsLoaded = false;

/**
 * Load face-api.js models from CDN
 * These models are needed for face detection and recognition
 */
export async function loadFaceModels() {
    if (modelsLoaded) return true;

    try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        modelsLoaded = true;
        console.log('✅ Face recognition models loaded');
        return true;
    } catch (error) {
        console.error('❌ Failed to load face models:', error);
        return false;
    }
}

/**
 * Extract face descriptor from an image
 * Returns a 128-dimensional array that uniquely identifies a face
 */
export async function extractFaceDescriptor(imageElement) {
    try {
        const detection = await faceapi
            .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            throw new Error('No face detected in the image');
        }

        // Return the descriptor as an array
        return Array.from(detection.descriptor);
    } catch (error) {
        console.error('Face extraction error:', error);
        throw error;
    }
}

/**
 * Compare two face descriptors
 * Returns the distance (0 = identical, 1 = completely different)
 * Threshold: < 0.6 is considered a match
 */
export function compareFaces(descriptor1, descriptor2) {
    if (!descriptor1 || !descriptor2) {
        throw new Error('Invalid face descriptors');
    }

    const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
    const MATCH_THRESHOLD = 0.6;

    return {
        distance,
        isMatch: distance < MATCH_THRESHOLD,
        confidence: Math.max(0, (1 - distance) * 100).toFixed(1) + '%'
    };
}

/**
 * Capture face from video stream and extract descriptor
 */
export async function captureFaceFromVideo(videoElement) {
    if (!videoElement || videoElement.readyState !== 4) {
        throw new Error('Video not ready');
    }

    // Create canvas to capture frame
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0);

    // Convert to image element for face-api
    const imgBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
    const imgUrl = URL.createObjectURL(imgBlob);
    const img = new Image();

    return new Promise((resolve, reject) => {
        img.onload = async () => {
            try {
                const descriptor = await extractFaceDescriptor(img);
                URL.revokeObjectURL(imgUrl);
                resolve({ descriptor, imageBlob: imgBlob });
            } catch (error) {
                URL.revokeObjectURL(imgUrl);
                reject(error);
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(imgUrl);
            reject(new Error('Failed to load captured image'));
        };
        img.src = imgUrl;
    });
}

/**
 * Store face descriptor in Supabase for a user token
 */
export async function storeFaceDescriptor(supabase, userToken, descriptor, faceImageBlob) {
    try {
        // Upload face image to storage
        const fileName = `face_${userToken}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
            .from('screenshots')
            .upload(fileName, faceImageBlob);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('screenshots')
            .getPublicUrl(fileName);

        // Store descriptor in database
        const { error: dbError } = await supabase
            .from('user_faces')
            .upsert({
                user_token: userToken,
                face_descriptor: descriptor,
                face_image_url: publicUrl,
                updated_at: new Date().toISOString()
            });

        if (dbError) throw dbError;

        return { success: true, imageUrl: publicUrl };
    } catch (error) {
        console.error('Error storing face data:', error);
        throw error;
    }
}

/**
 * Retrieve face descriptor from Supabase for verification
 */
export async function getFaceDescriptor(supabase, userToken) {
    try {
        const { data, error } = await supabase
            .from('user_faces')
            .select('face_descriptor, face_image_url')
            .eq('user_token', userToken)
            .single();

        if (error) throw error;
        if (!data) throw new Error('No face registered for this token');

        return data.face_descriptor;
    } catch (error) {
        console.error('Error retrieving face data:', error);
        throw error;
    }
}

/**
 * Verify user by comparing live face with stored face
 */
export async function verifyUserByFace(supabase, userToken, liveFaceDescriptor) {
    try {
        const storedDescriptor = await getFaceDescriptor(supabase, userToken);
        const comparison = compareFaces(storedDescriptor, liveFaceDescriptor);

        return {
            verified: comparison.isMatch,
            confidence: comparison.confidence,
            distance: comparison.distance
        };
    } catch (error) {
        console.error('Face verification error:', error);
        throw error;
    }
}

/**
 * Identify a user by checking their face against ALL stored faces
 * matchThreshold: strictness (lower is stricter). 0.5 is safe.
 */
export async function identifyUser(supabase, liveDescriptor) {
    try {
        // 1. Fetch ALL face profiles
        const { data: allFaces, error } = await supabase
            .from('user_faces')
            .select('user_token, face_descriptor');

        if (error) throw error;
        if (!allFaces || allFaces.length === 0) return null;

        let bestMatch = null;
        let bestDistance = 1.0; // Start with max distance (no match)

        // 2. Loop through all faces to find the closest match
        for (const record of allFaces) {
            const storedDescriptor = record.face_descriptor;
            if (storedDescriptor) {
                const result = compareFaces(storedDescriptor, liveDescriptor);

                // Check if this is a match AND better than previous best
                if (result.isMatch && result.distance < bestDistance) {
                    bestDistance = result.distance;
                    bestMatch = {
                        token: record.user_token,
                        confidence: result.confidence,
                        distance: result.distance
                    };
                }
            }
        }

        return bestMatch; // Returns { token, confidence } or null
    } catch (error) {
        console.error('Face identification error:', error);
        throw error;
    }
}
