import { useState, useEffect, useRef } from 'react';
import {
    loadFaceModels,
    captureFaceFromVideo
} from '../faceRecognition';

export default function FaceCapture({
    onFaceCaptured,
    onCancel,
    mode = 'register' // 'register' or 'verify'
}) {
    const [stream, setStream] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [capturing, setCapturing] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const videoRef = useRef(null);

    useEffect(() => {
        initializeCamera();
        return () => {
            stopCamera();
        };
    }, []);

    const initializeCamera = async () => {
        try {
            setLoading(true);
            setError('');

            // Load face recognition models
            const modelsLoaded = await loadFaceModels();
            if (!modelsLoaded) {
                throw new Error('Failed to load face recognition models');
            }

            // Start camera with front camera preference
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user', // Front camera for selfie
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            });

            setStream(mediaStream);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }

            setLoading(false);
        } catch (err) {
            console.error('Camera initialization error:', err);
            setError('Could not access camera: ' + err.message);
            setLoading(false);
        }
    };

    const stopCamera = () => {
        // 1. Stop tracks from state stream
        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop();
                videoRef.current && (videoRef.current.srcObject = null);
            });
            setStream(null);
        }

        // 2. Safety override: check video element directly
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            if (tracks) {
                tracks.forEach(track => track.stop());
            }
            videoRef.current.srcObject = null;
        }
    };

    const handleCapture = async () => {
        try {
            setCapturing(true);
            setError('');

            // Countdown before capture
            for (let i = 3; i > 0; i--) {
                setCountdown(i);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            setCountdown(null);

            // Capture face
            const result = await captureFaceFromVideo(videoRef.current);

            // Stop camera
            stopCamera();

            // Pass result to parent
            onFaceCaptured(result);

        } catch (err) {
            console.error('Face capture error:', err);
            setError(err.message || 'Failed to detect face. Please try again.');
            setCapturing(false);
            setCountdown(null);
        }
    };

    const handleCancel = () => {
        stopCamera();
        onCancel();
    };

    return (
        <div className="face-capture-overlay">
            <div className="face-capture-modal">
                <div className="face-capture-header">
                    <h2>
                        {mode === 'register' ? '📸 Register Your Face' : '🔓 Verify Your Face'}
                    </h2>
                    <button
                        className="close-btn"
                        onClick={handleCancel}
                        disabled={capturing}
                    >
                        ✕
                    </button>
                </div>

                <div className="face-capture-content">
                    {loading && (
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                            <p>Loading face recognition...</p>
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            <span>⚠️</span>
                            <p>{error}</p>
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            <div className="video-container">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="face-video"
                                ></video>

                                {/* Face guide overlay */}
                                <div className="face-guide">
                                    <div className="face-oval"></div>
                                    <p className="face-guide-text">
                                        Position your face in the oval
                                    </p>
                                </div>

                                {/* Countdown overlay */}
                                {countdown && (
                                    <div className="countdown-overlay">
                                        <div className="countdown-number">{countdown}</div>
                                    </div>
                                )}
                            </div>

                            <div className="instructions">
                                <p>
                                    {mode === 'register'
                                        ? '✨ Look directly at the camera and ensure your face is well-lit'
                                        : '🔍 Position your face to match your registered photo'
                                    }
                                </p>
                            </div>

                            <div className="capture-actions">
                                <button
                                    className="capture-btn"
                                    onClick={handleCapture}
                                    disabled={capturing}
                                >
                                    {capturing ? 'Capturing...' : '📷 Capture Face'}
                                </button>
                                <button
                                    className="cancel-btn"
                                    onClick={handleCancel}
                                    disabled={capturing}
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style jsx>{`
        .face-capture-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.3s ease;
        }

        .face-capture-modal {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border-radius: 24px;
          max-width: 500px;
          width: 90%;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .face-capture-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .face-capture-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #fff;
        }

        .close-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #fff;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.2rem;
          transition: all 0.3s ease;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: rotate(90deg);
        }

        .face-capture-content {
          padding: 1.5rem;
        }

        .loading-spinner {
          text-align: center;
          padding: 3rem 0;
        }

        .spinner {
          width: 50px;
          height: 50px;
          margin: 0 auto 1rem;
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #fca5a5;
        }

        .error-message span {
          font-size: 1.5rem;
        }

        .video-container {
          position: relative;
          width: 100%;
          aspect-ratio: 4/3;
          border-radius: 16px;
          overflow: hidden;
          background: #000;
        }

        .face-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .face-guide {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .face-oval {
          width: 200px;
          height: 260px;
          border: 3px dashed rgba(59, 130, 246, 0.8);
          border-radius: 50%;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.4);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
        }

        .face-guide-text {
          margin-top: 1rem;
          color: #fff;
          font-size: 0.875rem;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
        }

        .countdown-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .countdown-number {
          font-size: 6rem;
          font-weight: bold;
          color: #fff;
          animation: countdownPulse 1s ease;
        }

        @keyframes countdownPulse {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .instructions {
          margin: 1rem 0;
          text-align: center;
        }

        .instructions p {
          color: #cbd5e1;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .capture-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .capture-btn, .cancel-btn {
          flex: 1;
          padding: 0.875rem 1.5rem;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .capture-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
        }

        .capture-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
        }

        .capture-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cancel-btn {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .cancel-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
        </div>
    );
}
