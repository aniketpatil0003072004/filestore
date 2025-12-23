import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";
import {
  analyzeUrl,
  getPredefinedCategories,
  getCategoryEmoji,
} from "./urlAnalyzer";
import { storeToken, removeToken } from "./indexedDBHelper";
import StatsCalendar from "./components/StatsCalendar";
import { enrichMetadata } from "./metadataFetcher";
import { analyzeContentWithMetadata } from "./categoryHelper";
import { encryptData, decryptData } from "./cryptoHelper";
import { extractTextFromPdf, summarizeTextWithGemini } from "./pdfHelper";
import "./App.css";

function App() {
  // THEME STATE
  const [theme, setTheme] = useState(() => localStorage.getItem("vaultify_theme") || "dark");
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    localStorage.setItem("vaultify_theme", theme);
    if (theme === "light") {
      document.body.classList.add("light-mode");
    } else {
      document.body.classList.remove("light-mode");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  const menuItemStyle = {
    display: "block",
    width: "100%",
    padding: "0.75rem 1rem",
    textAlign: "left",
    background: "transparent",
    border: "none",
    color: "var(--text-primary)",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.2s"
  };

  const [sessionToken, setSessionToken] = useState(() =>
    localStorage.getItem("video_vault_token")
  );
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [activeCategory, setActiveCategory] = useState("All");
  const [activeTag, setActiveTag] = useState(null);

  // SECRETS MANAGEMENT
  const [isSecretsUnlocked, setIsSecretsUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  // CHANGE PASSWORD STATE
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [isReEncrypting, setIsReEncrypting] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);

  // Auto-save mode (default: ON)
  const [autoSaveMode, setAutoSaveMode] = useState(() => {
    const saved = localStorage.getItem("auto_save_mode");
    return saved !== null ? saved === "true" : true;
  });

  // Success toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastEmoji, setToastEmoji] = useState("✅");

  // PROMO / INTRO STATE
  const [showIntro, setShowIntro] = useState(true);
  const [isPromoMuted, setIsPromoMuted] = useState(true);

  const togglePromoAudio = () => {
    const newMuted = !isPromoMuted;
    setIsPromoMuted(newMuted);

    if (newMuted) {
      window.speechSynthesis.cancel();
    } else {
      // Start Narrator
      const utterance = new SpeechSynthesisUtterance(
        "Welcome to Vaultify. The ultimate place to organize your digital life. " +
        "Stop losing your favorite content. Save YouTube videos, Shorts, and Instagram Reels instantly. " +
        "Capture moments on the go. Take photos and record videos directly inside the app. " +
        "Privacy is our priority. With End-to-End Encryption, only YOU have the key to your secrets. " +
        "Boost productivity with AI Summaries for your PDFs, and track everything on your personal Calendar. " +
        "Secure. Smart. Organized. Get started with Vaultify today."
      );
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // WALLET STATE (new feature)
  const [walletBalance, setWalletBalance] = useState(0);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletInput, setWalletInput] = useState("");

  // SELECTION & WHATSAPP SHARING
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleSelection = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const shareViaWhatsApp = () => {
    const selectedItems = items.filter(i => selectedIds.has(i.id));
    if (selectedItems.length === 0) return;

    let total = 0;
    let message = "Papa, sending you some expenses:\n\n";

    selectedItems.forEach(item => {
      const amt = parseFloat(item.amount) || 0;
      total += amt;
      message += `• ${item.title}: ₹${amt}\n`;
    });

    message += `\n*Total Amount: ₹${total}*`;

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Form State
  const [itemType, setItemType] = useState("video");
  const [formData, setFormData] = useState({
    url: "",
    title: "",
    category: "",
    description: "",
    userTag: "",
    channelName: "",
    amount: "",
    isIncome: false,
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [urlAnalysis, setUrlAnalysis] = useState(null);
  const [enrichedMetadata, setEnrichedMetadata] = useState(null);

  // PDF & AI State
  const [pdfFile, setPdfFile] = useState(null);

  // GEMINI API KEY MANAGEMENT
  // API Key is managed via .env file (VITE_GEMINI_API_KEY)
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState("");

  // CAMERA STATE
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState("photo"); // 'photo' or 'video'
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState(null);
  const videoPreviewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [recordedBlob, setRecordedBlob] = useState(null); // New state for review

  const startCamera = async (mode) => {
    try {
      setCameraMode(mode);
      setShowCamera(true);
      setRecordedBlob(null); // Reset
      setIsRecording(false);
      setIsModalOpen(false); // Close add item modal
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Prefer back camera on mobile
        audio: mode === "video",
      });
      setStream(mediaStream);
    } catch (err) {
      alert("Could not access camera: " + err.message);
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
    setIsRecording(false);
    setRecordedBlob(null);
    recordedChunksRef.current = [];
  };

  useEffect(() => {
    if (showCamera && videoPreviewRef.current && stream && !recordedBlob) {
      videoPreviewRef.current.srcObject = stream;
    } else if (videoPreviewRef.current && recordedBlob) {
      videoPreviewRef.current.srcObject = null;
      videoPreviewRef.current.src = URL.createObjectURL(recordedBlob);
    }
  }, [showCamera, stream, recordedBlob]);

  const capturePhoto = async () => {
    if (!videoPreviewRef.current) return;
    if (videoPreviewRef.current.videoWidth === 0) {
      alert("Camera is starting up, please wait...");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = videoPreviewRef.current.videoWidth;
    canvas.height = videoPreviewRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoPreviewRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      saveCapturedMedia(blob, "photo");
    }, "image/jpeg");
  };

  const startRecording = () => {
    if (!stream) return;
    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
      setIsRecording(false);
      saveCapturedMedia(blob, "video");
    };
    recorder.start();
    setIsRecording(true);
  };

  const stopCaptureRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const saveCapturedMedia = async (blob, type) => {
    if (!blob || blob.size === 0) return;
    try {
      setUploading(true);
      const ext = type === "photo" ? "jpg" : "webm";
      const fileName = `capture_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("screenshots")
        .upload(fileName, blob);
      if (uploadErr) throw uploadErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("screenshots").getPublicUrl(fileName);

      const newItem = {
        user_token: sessionToken,
        type: type === "photo" ? "photo" : "video",
        url: publicUrl,
        title: type === "photo" ? "Captured Photo" : "Captured Video",
        category: type === "photo" ? "📸 Photos" : "🎥 Videos",
        notes: "",
        created_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("items")
        .insert([newItem])
        .select();
      if (error) throw error;
      setItems([data[0], ...items]);
      stopCamera();
      setToastMessage(type === "photo" ? "Photo Saved!" : "Video Saved!");
      setShowToast(true);
      setActiveCategory(newItem.category);
    } catch (e) {
      alert("Error saving media: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const urlInputRef = useRef(null);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  // Register Service Worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          if (registration.active) {
            registration.active.postMessage({
              type: "SUPABASE_CONFIG",
              url: import.meta.env.VITE_SUPABASE_URL,
              key: import.meta.env.VITE_SUPABASE_ANON_KEY,
            });
          }
        })
        .catch((error) => console.log("SW registration failed:", error));
    }

    const handleInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener("beforeinstallprompt", handleInstall);

    return () =>
      window.removeEventListener("beforeinstallprompt", handleInstall);
  }, []);

  // Handle Share Target
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedUrl = urlParams.get("url") || urlParams.get("text");
    const sharedTitle = urlParams.get("title");
    const manualMode = urlParams.get("manual") === "true";

    if (sharedUrl && sessionToken) {
      const analysis = analyzeUrl(sharedUrl);
      setUrlAnalysis(analysis);

      if (autoSaveMode && !manualMode) {
        autoSaveSharedLink(sharedUrl, sharedTitle, analysis);
      } else {
        setFormData({
          url: sharedUrl,
          title: sharedTitle || "",
          category: analysis.suggestedCategory || "",
          description: "",
          userTag: "",
          amount: "",
          isIncome: false,
        });
        setItemType("video");
        setIsModalOpen(true);
      }
      window.history.replaceState({}, "", "/");
    }
  }, [sessionToken, autoSaveMode]);

  useEffect(() => {
    if (sessionToken) {
      localStorage.setItem("video_vault_token", sessionToken);
      storeToken(sessionToken).catch((err) => console.error(err));
      fetchItems();
    } else {
      localStorage.removeItem("video_vault_token");
      removeToken().catch((err) => console.error(err));
      setItems([]);
    }
  }, [sessionToken]);

  useEffect(() => {
    if (
      isModalOpen &&
      itemType === "video" &&
      urlInputRef.current &&
      !editingItem
    ) {
      setTimeout(() => urlInputRef.current?.focus(), 100);
    }
  }, [isModalOpen, itemType, editingItem]);

  // Persist wallet balance when it changes
  // Load wallet from Supabase when user logs in and persist updates to DB
  useEffect(() => {
    const loadWallet = async () => {
      if (!sessionToken) {
        setWalletBalance(0);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_token", sessionToken)
          .single();

        if (!error && data && typeof data.balance !== "undefined") {
          setWalletBalance(parseFloat(data.balance) || 0);
        } else {
          // no wallet row yet -> ensure 0
          setWalletBalance(0);
        }
      } catch (e) {
        console.error("Wallet load error", e);
        setWalletBalance(0);
      }
    };

    loadWallet();
  }, [sessionToken]);

  const saveWalletToDB = async (value) => {
    if (!sessionToken) return;
    try {
      await supabase
        .from("wallets")
        .upsert({ user_token: sessionToken, balance: value });
    } catch (e) {
      console.error("Wallet save to DB failed", e);
    }
  };

  const adjustWallet = (delta) => {
    setWalletBalance((prev) => {
      const next = Math.round((prev + delta) * 100) / 100;
      // persist change to DB (fire-and-forget)
      saveWalletToDB(next);
      return next;
    });
  };

  const fetchItems = async () => {
    if (!sessionToken) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("user_token", sessionToken)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching items:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // FIXED CATEGORIES
  const categories = [
    "All",
    "YouTube Videos",
    "YouTube Shorts",
    "Instagram Reels",
    "Instagram Posts",
    "🔒 Security",
  ];

  // NEW: Extract all unique USER TAGS from metadata for Autocomplete
  const userTags = [
    ...new Set(items.map((i) => i.metadata?.user_tag).filter(Boolean)),
  ];

  const extractVideoId = (url) => {
    try {
      if (!url) return null;
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        if (url.includes("v=")) return url.split("v=")[1]?.split("&")[0];
        if (url.includes("youtu.be/"))
          return url.split("youtu.be/")[1]?.split("?")[0];
        if (url.includes("embed/"))
          return url.split("embed/")[1]?.split("?")[0];
      }
      if (url.includes("instagram.com")) {
        const match = url.match(/\/(reel|p)\/([^\/\?]+)/);
        if (match) return match[2];
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  const unlockSecrets = () => {
    if (tempPassword.length < 4) {
      alert("Password too short");
      return;
    }
    setMasterPassword(tempPassword);
    setIsSecretsUnlocked(true);
    setShowPasswordPrompt(false);
    setToastMessage("Secrets Unlocked!");
    setToastEmoji("🔓");
    setShowToast(true);
    setActiveCategory("🔒 Security");
    setTempPassword("");
  };

  // --- RE-ENCRYPTION LOGIC FOR PASSWORD CHANGE ---
  const handlePasswordChange = async () => {
    if (newPasswordInput.length < 4) {
      alert("New password too short!");
      return;
    }

    if (
      !confirm(
        "⚠️ This will re-encrypt all your secret notes with the new password. Proceed?"
      )
    )
      return;

    setIsReEncrypting(true);

    try {
      // 1. Get all secret items
      const secretItems = items.filter((i) => i.type === "secret");
      const updatedItems = [];

      // 2. Loop and Re-Encrypt
      for (const item of secretItems) {
        try {
          // Decrypt with OLD password
          const plainText = await decryptData(item.notes, masterPassword);
          // Encrypt with NEW password
          const newCipherText = await encryptData(plainText, newPasswordInput);

          // Update in DB
          const { error } = await supabase
            .from("items")
            .update({ notes: newCipherText })
            .eq("id", item.id);

          if (error) throw error;

          updatedItems.push({ ...item, notes: newCipherText });
        } catch (e) {
          console.error("Failed to re-key item", item.id, e);
          alert(
            `Error re-encrypting item: ${item.title}. It might be unrecoverable.`
          );
        }
      }

      // 3. Update Local State
      setItems((prev) =>
        prev.map((p) => {
          const updated = updatedItems.find((u) => u.id === p.id);
          return updated || p;
        })
      );

      // 4. Update Master Password
      setMasterPassword(newPasswordInput);
      setNewPasswordInput("");
      setShowChangePasswordModal(false);
      setToastMessage("Password Changed!");
      setToastEmoji("🔑");
      setShowToast(true);
    } catch (err) {
      console.error(err);
      alert("Critical Error during re-encryption. Please check console.");
    } finally {
      setIsReEncrypting(false);
    }
  };

  const DecryptedNote = ({ item, password }) => {
    const [content, setContent] = useState("Decrypting...");
    const [error, setError] = useState(false);

    useEffect(() => {
      decryptData(item.notes, password)
        .then((text) => setContent(text))
        .catch(() => {
          setError(true);
          setContent("⚠️ Wrong Password");
        });
    }, [item.notes, password]);

    return (
      <div
        style={{
          padding: "1rem",
          background: "rgba(0,0,0,0.2)",
          borderRadius: "8px",
          marginTop: "0.5rem",
          whiteSpace: "pre-wrap",
        }}
      >
        {error ? <span style={{ color: "#ef4444" }}>{content}</span> : content}
      </div>
    );
  };

  const autoSaveSharedLink = async (url, title, analysis) => {
    try {
      setUploading(true);
      let metadata = null;
      let contentAnalysis = null;
      try {
        metadata = await enrichMetadata(url);
        contentAnalysis = analyzeContentWithMetadata(url, metadata, analysis);
      } catch (err) {
        console.error("Auto-save metadata fetch error:", err);
      }
      let finalTitle = title;
      if (!finalTitle || finalTitle.trim() === "") {
        if (metadata?.title) {
          finalTitle = metadata.title;
        } else {
          const videoId = extractVideoId(url);
          finalTitle = videoId
            ? `Video ${videoId.substring(0, 8)}`
            : "Saved Link";
        }
      }

      const newItem = {
        user_token: sessionToken,
        type: "video",
        url: url,
        title: finalTitle,
        category: contentAnalysis?.fullCategory || "Other Links",
        notes: "",
        image_url: metadata?.thumbnail || null,
        channel_name: metadata?.channelName || null,
        creator_profile: metadata?.creatorProfile || null,
        content_description: metadata?.description || null,
        thumbnail_url: metadata?.thumbnail || null,
        metadata: metadata || null,
        created_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("items")
        .insert([newItem])
        .select();
      if (error) throw error;
      setItems([data[0], ...items]);
      setToastEmoji(contentAnalysis?.emoji || "✅");
      setToastMessage(`Saved to ${newItem.category}!`);
      setShowToast(true);
      if (newItem.category) setActiveCategory(newItem.category);
    } catch (error) {
      console.error("Error auto-saving:", error.message);
      setToastEmoji("❌");
      setToastMessage("Failed to save.");
      setShowToast(true);
    } finally {
      setUploading(false);
    }
  };

  const getThumbnail = (url) => {
    try {
      if (url && (url.includes("youtube.com") || url.includes("youtu.be"))) {
        const videoId = extractVideoId(url);
        if (videoId)
          return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  // --- UPDATED HANDLE EDIT (Includes Decryption) ---
  const handleEdit = async (item) => {
    setEditingItem(item);
    setItemType(item.type);

    let descriptionText = item.notes || "";

    // IF SECRET and UNLOCKED: Decrypt first so user can 'APPEND'
    if (item.type === "secret") {
      if (!isSecretsUnlocked) {
        setShowPasswordPrompt(true);
        setEditingItem(null); // Abort edit
        return;
      }

      try {
        descriptionText = await decryptData(item.notes, masterPassword);
      } catch (e) {
        console.error("Decrypt edit failed", e);
        descriptionText = "*** Error Decrypting ***";
      }
    }

    setFormData({
      url: item.url || "",
      title: item.title || "",
      category: item.category || "",
      description: descriptionText, // Now contains PLAINTEXT for easy appending
      userTag: item.metadata?.user_tag || "",
      channelName: item.channel_name || "",
      amount: item.amount || "",
      isIncome: item.is_income || false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editingItem) {
      if (itemType === "video" && !formData.url) return;
      if (itemType === "note" && !formData.description) return;
      if (itemType === "secret" && !formData.description) return;
      if (itemType === "pdf" && !pdfFile && !formData.url) return; // PDF needs file or URL
    }

    try {
      setUploading(true);

      // ENCRYPTION LOGIC
      let finalDescription = formData.description;
      let finalTitle = formData.title || "Untitled Secret";
      let finalCategory = formData.category;

      if (itemType === "secret") {
        if (!isSecretsUnlocked) {
          alert("You must unlock secrets first!");
          setShowPasswordPrompt(true);
          setUploading(false);
          return;
        }
        try {
          // Encrypt whatever is in the text box (Previous Data + New Appended Data)
          finalDescription = await encryptData(
            formData.description,
            masterPassword
          );

          finalCategory = "🔒 Security";
          finalTitle =
            "🔒 " + (formData.title || "Secret Note").replace("🔒 ", "");
        } catch (err) {
          console.error(err);
          alert("Encryption Failed!");
          return;
        }
      }

      if (editingItem) {
        const baseMetadata = editingItem.metadata || {};
        const finalMetadata = { ...baseMetadata, user_tag: formData.userTag };

        let updates = {
          metadata: finalMetadata,
        };

        // Always update notes (it's either encrypted blob OR plain text)
        updates.notes = finalDescription;

        // Update Title too just in case
        if (formData.title) updates.title = finalTitle;

        // If editing an expense, handle amount and wallet adjustment
        if (itemType === "expense") {
          const newAmt = parseFloat(formData.amount) || 0;
          const newIsIncome = !!formData.isIncome;
          updates.amount = newAmt;
          updates.is_income = newIsIncome;

          try {
            const prevAmt = parseFloat(editingItem.amount) || 0;
            const prevIsIncome = !!editingItem.is_income;
            const prevVal = prevIsIncome ? prevAmt : -prevAmt;
            const newVal = newIsIncome ? newAmt : -newAmt;
            const delta = Math.round((newVal - prevVal) * 100) / 100;
            if (delta !== 0) adjustWallet(delta);
          } catch (e) {
            console.error("Wallet adjust on edit failed", e);
          }
        }

        const { data, error } = await supabase
          .from("items")
          .update(updates)
          .eq("id", editingItem.id)
          .select();
        if (error) throw error;
        const updatedItem = data[0];
        setItems(items.map((i) => (i.id === editingItem.id ? updatedItem : i)));
        setToastEmoji("🏷️");
        setToastMessage("Updated!");
        setShowToast(true);
      } else {
        // CREATE NEW ITEM
        let imageUrl = null;
        if (selectedFile) {
          const fileExt = selectedFile.name.split(".").pop();
          const fileName = `${Date.now()}.${fileExt}`;
          const { error: upload } = await supabase.storage
            .from("screenshots")
            .upload(fileName, selectedFile);
          if (!upload) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("screenshots").getPublicUrl(fileName);
            imageUrl = publicUrl;
          }
        }

        let newItem = {
          user_token: sessionToken,
          type: itemType,
          url: formData.url,
          category: finalCategory || formData.category,
          notes: finalDescription,
          metadata: { user_tag: formData.userTag },
          title: finalTitle,
          image_url: imageUrl,
          created_at: new Date().toISOString(),
        };

        if (itemType === "expense") {
          const amt = parseFloat(formData.amount) || 0;
          newItem.amount = amt;
          newItem.is_income = !!formData.isIncome;
          // adjust wallet now
          try {
            const val = newItem.is_income ? amt : -amt;
            adjustWallet(val);
          } catch (e) {
            console.error("Wallet adjust on create failed", e);
          }
        }

        // --- PDF HANDLING ---
        if (itemType === "pdf") {
          // 1. Upload PDF
          let pdfUrl = null;
          if (pdfFile) {
            const fileExt = pdfFile.name.split(".").pop();
            const fileName = `doc_${Date.now()}.${fileExt}`;
            const { error: uploadErr } = await supabase.storage
              .from("screenshots")
              .upload(fileName, pdfFile);
            if (!uploadErr) {
              const {
                data: { publicUrl },
              } = supabase.storage.from("screenshots").getPublicUrl(fileName);
              pdfUrl = publicUrl;
            }
          }

          newItem.url = pdfUrl || formData.url; // URL to the file
          newItem.title =
            formData.title || (pdfFile ? pdfFile.name : "Untitled PDF");
          newItem.category = "📄 Documents"; // New Category
          newItem.notes = summary
            ? `**AI Summary:**\n${summary}\n\n---\n${formData.description}`
            : formData.description;
        }
        // --------------------

        if (itemType === "video") {
          let videoId = extractVideoId(formData.url);
          newItem.title = videoId ? `Video ${videoId}` : "Untitled";
          try {
            const metadata = await enrichMetadata(formData.url);
            const analysis = analyzeUrl(formData.url);
            const contentAnalysis = analyzeContentWithMetadata(
              formData.url,
              metadata,
              analysis
            );
            newItem.category = contentAnalysis.fullCategory;
            newItem.metadata = { ...metadata, user_tag: formData.userTag };
            newItem.title = metadata.title || newItem.title;
            newItem.image_url = metadata.thumbnail || imageUrl;
          } catch (e) { }
        }

        const { data, error } = await supabase
          .from("items")
          .insert([newItem])
          .select();
        if (error) throw error;
        setItems([data[0], ...items]);
      }

      setFormData({
        url: "",
        title: "",
        category: "",
        description: "",
        userTag: "",
        channelName: "",
        amount: "",
        isIncome: false,
      });
      setSelectedFile(null);
      setPdfFile(null);
      setSummary("");
      setUrlAnalysis(null);
      setEnrichedMetadata(null);
      setEditingItem(null);
      setIsModalOpen(false);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteItem = async (id) => {
    if (confirm("Are you sure you want to delete this?")) {
      try {
        // Reverse wallet effect if this was an expense
        try {
          const itemToDelete = items.find((i) => i.id === id);
          if (itemToDelete && itemToDelete.type === "expense") {
            const amt = parseFloat(itemToDelete.amount) || 0;
            const val = itemToDelete.is_income ? -amt : amt;
            adjustWallet(val);
          }
        } catch (e) {
          console.error("Wallet adjust on delete failed", e);
        }

        const { error } = await supabase.from("items").delete().eq("id", id);
        if (error) throw error;
        setItems(items.filter((i) => i.id !== id));
        fetchItems();
      } catch (error) {
        alert("Error: " + error.message);
      }
    }
  };

  const handleSignOut = () => setSessionToken(null);
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };
  const toggleAutoSave = () => {
    const newValue = !autoSaveMode;
    setAutoSaveMode(newValue);
    localStorage.setItem("auto_save_mode", newValue.toString());
    setToastEmoji(newValue ? "⚡" : "📝");
    setToastMessage(newValue ? "Auto-save enabled!" : "Manual mode enabled");
    setShowToast(true);
  };

  const handleCategoryClick = (cat) => {
    if (cat === "🔒 Security" && !isSecretsUnlocked) {
      setShowPasswordPrompt(true);
    } else {
      setActiveCategory(cat);
      setActiveTag(null);
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    }
  };

  const filteredItems = activeTag
    ? items.filter(
      (i) =>
        i.metadata?.user_tag === activeTag &&
        (i.type !== "secret" || isSecretsUnlocked)
    )
    : activeCategory === "🔒 Security"
      ? items.filter((i) => i.type === "secret")
      : activeCategory === "All"
        ? items.filter((i) => i.type !== "secret")
        : items.filter((i) => i.category === activeCategory && i.type !== "secret");

  if (!sessionToken)
    return (
      <Auth
        onLogin={(token) => {
          setSessionToken(token);
          setShowIntro(true);
        }}
      />
    );

  // INTRO SPLASH SCREEN
  if (showIntro) {
    return (
      <div
        className="intro-screen"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "#0f172a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem"
        }}
      >
        <div style={{
          width: "100%",
          maxWidth: "800px",
          aspectRatio: "16/9",
          background: "black",
          borderRadius: "24px",
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(99, 102, 241, 0.4)",
          position: "relative",
          marginBottom: "2rem"
        }}>
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <img
              src="/promo.webp"
              alt="Vaultify Promo"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
            <button
              onClick={() => togglePromoAudio()}
              style={{
                position: "absolute",
                bottom: "20px",
                right: "20px",
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "white",
                borderRadius: "50%",
                width: "50px",
                height: "50px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                backdropFilter: "blur(4px)",
                zIndex: 20
              }}
            >
              {isPromoMuted ? "🔇" : "🔊"}
            </button>
          </div>
        </div>

        <h1 style={{
          fontSize: "2.5rem",
          marginBottom: "1rem",
          background: "linear-gradient(to right, #6366f1, #d946ef)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textAlign: "center"
        }}>
          Welcome to Vaultify
        </h1>

        <p style={{
          color: "var(--text-secondary)",
          maxWidth: "500px",
          textAlign: "center",
          marginBottom: "2rem",
          fontSize: "1.1rem",
          lineHeight: "1.6"
        }}>
          Organize your videos, manage expenses, and secure your secrets in one beautiful place.
        </p>

        <button
          onClick={() => {
            window.speechSynthesis.cancel();
            setShowIntro(false);
          }}
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "white",
            border: "none",
            padding: "1rem 3rem",
            fontSize: "1.2rem",
            fontWeight: "bold",
            borderRadius: "50px",
            boxShadow: "0 4px 20px rgba(99, 102, 241, 0.5)",
            cursor: "pointer",
            transition: "transform 0.2s"
          }}
          onMouseOver={(e) => e.target.style.transform = "scale(1.05)"}
          onMouseOut={(e) => e.target.style.transform = "scale(1)"}
        >
          Continue to App &rarr;
        </button>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* PROMO VIDEO OVERLAY */}

      <header className="header">
        <div className="header-content-left">
          <h1 className="title">Vaultify</h1>
          <div className="wallet-pill">
            <span style={{ color: walletBalance < 0 ? "#ef4444" : "#10b981" }}>
              💳 {walletBalance.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="header-content-right">



          {/* PRIMARY ACTION */}
          {!isSelectionMode && (
            <button
              className="add-btn"
              onClick={() => {
                setEditingItem(null);
                setFormData({
                  url: "",
                  title: "",
                  category: activeCategory === "All" ? "" : activeCategory,
                  description: "",
                  userTag: "",
                  channelName: "",
                  amount: "",
                  isIncome: false,
                });

                if (activeCategory === "🔒 Security") {
                  if (!isSecretsUnlocked) {
                    setShowPasswordPrompt(true);
                    return;
                  }
                  setItemType("secret");
                } else {
                  setItemType("video");
                }

                setIsModalOpen(true);
              }}
            >
              + Add Item
            </button>
          )}

          {/* THEME TOGGLE */}
          <button
            className="icon-btn"
            onClick={toggleTheme}
            title="Toggle Theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          {/* MENU TOGGLE */}
          <div style={{ position: "relative" }}>
            <button
              className="icon-btn"
              onClick={() => setShowMenu(!showMenu)}
            >
              ⚙️
            </button>

            {/* DROPDOWN MENU */}
            {showMenu && (
              <div style={{
                position: "absolute",
                top: "120%",
                right: 0,
                width: "220px",
                background: "var(--bg-color)", // solid bg for clearer readability or glass
                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                border: "1px solid var(--glass-border)",
                borderRadius: "16px",
                padding: "0.5rem",
                boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
                zIndex: 200,
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem"
              }}>
                {showInstallButton && deferredPrompt && (
                  <button
                    className="menu-item"
                    onClick={() => {
                      handleInstallClick();
                      setShowMenu(false);
                    }}
                    style={menuItemStyle}
                  >
                    📱 Install App
                  </button>
                )}

                <button
                  className="menu-item"
                  onClick={() => {
                    setWalletInput(String(walletBalance));
                    setShowWalletModal(true);
                    setShowMenu(false);
                  }}
                  style={menuItemStyle}
                >
                  💰 Set Wallet
                </button>

                <button
                  className="menu-item"
                  onClick={() => {
                    toggleAutoSave();
                    // Don't close menu immediately users might want to verify toggle
                  }}
                  style={menuItemStyle}
                >
                  {autoSaveMode ? "⚡ Auto-Save: ON" : "📝 Auto-Save: OFF"}
                </button>

                <button
                  className="menu-item"
                  onClick={() => {
                    setShowStats(true);
                    setShowMenu(false);
                  }}
                  style={menuItemStyle}
                >
                  📅 View Calendar
                </button>

                {isSecretsUnlocked && activeCategory === "🔒 Security" && (
                  <button
                    className="menu-item"
                    onClick={() => {
                      setShowChangePasswordModal(true);
                      setShowMenu(false);
                    }}
                    style={{ ...menuItemStyle, color: "#ef4444" }}
                  >
                    🔑 Change Password
                  </button>
                )}

                <div style={{ height: "1px", background: "var(--glass-border)", margin: "0.25rem 0" }}></div>

                <button
                  className="menu-item"
                  onClick={handleSignOut}
                  style={{ ...menuItemStyle, color: "#ef4444" }}
                >
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* OVERLAY TO CLOSE MENU */}
      {showMenu && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* FEATURE SCROLLING TICKER */}
      <div className="ticker-wrap">
        <div className="ticker-content">
          {[...Array(4)].map((_, i) => ( // Duplicate 4 times for seamless infinite loop
            <React.Fragment key={i}>
              <span className="ticker-item">📺 Universal Storage: Save YouTube, Shorts, Reels & Posts</span>
              <span className="ticker-item">✨</span>
              <span className="ticker-item">🔒 Zero-Knowledge: Your secrets are End-to-End Encrypted</span>
              <span className="ticker-item">✨</span>
              <span className="ticker-item">💰 Smart Wallet: Track Expenses & Savings</span>
              <span className="ticker-item">✨</span>
              <span className="ticker-item">📊 Instant Reports: Generate expense slips in seconds</span>
              <span className="ticker-item">✨</span>
              <span className="ticker-item">⚡ PWA Ready: Install & Use Offline</span>
              <span className="ticker-item">✨</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="categories">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-pill ${activeCategory === cat && !activeTag ? "active" : ""
              }`}
            onClick={() => handleCategoryClick(cat)}
            style={
              cat === "🔒 Security"
                ? { border: "1px solid #ef4444", color: "#ef4444" }
                : {}
            }
          >
            {getCategoryEmoji(cat)} {cat}
          </button>
        ))}
      </div>

      {userTags.length > 0 && (
        <div
          className="categories"
          style={{ marginTop: "0.5rem", paddingTop: "0" }}
        >
          <span
            style={{
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              marginRight: "0.5rem",
              alignSelf: "center",
            }}
          >
            🏷️ My Tags:
          </span>

          {userTags.map((tag) => (
            <button
              key={tag}
              className={`category-pill ${activeTag === tag ? "active" : ""}`}
              style={{
                border: "1px dashed var(--accent-primary)",
                background:
                  activeTag === tag ? "var(--accent-primary)" : "transparent",
              }}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}



      {showStats && (
        <StatsCalendar items={items} onClose={() => setShowStats(false)} />
      )}

      {/* PASSWORD PROMPT MODAL */}
      {showPasswordPrompt && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ maxWidth: "300px", textAlign: "center" }}
          >
            <h3>🔐 Unlock Secrets</h3>
            <p
              style={{
                marginBottom: "1rem",
                fontSize: "0.9rem",
                color: "var(--text-secondary)",
              }}
            >
              Enter your Master Password to decrypt your secure notes.
            </p>
            <input
              type="password"
              className="form-input"
              autoFocus
              placeholder="Master Password"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && unlockSecrets()}
            />
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
              <button
                className="cancel-btn"
                style={{ flex: 1 }}
                onClick={() => setShowPasswordPrompt(false)}
              >
                Cancel
              </button>
              <button
                className="submit-btn"
                style={{ flex: 1 }}
                onClick={unlockSecrets}
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showChangePasswordModal && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ maxWidth: "350px", textAlign: "center" }}
          >
            <h3>🔑 Change Master Password</h3>
            <p
              style={{
                marginBottom: "1rem",
                fontSize: "0.9rem",
                color: "var(--text-secondary)",
              }}
            >
              This will <b>re-encrypt</b> all your secret notes with the new
              password. This process cannot be undone.
            </p>
            <input
              type="password"
              className="form-input"
              autoFocus
              placeholder="New Strong Password"
              value={newPasswordInput}
              onChange={(e) => setNewPasswordInput(e.target.value)}
            />
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
              <button
                className="cancel-btn"
                style={{ flex: 1 }}
                onClick={() => setShowChangePasswordModal(false)}
              >
                Cancel
              </button>
              <button
                className="submit-btn"
                style={{ flex: 1, background: "#ef4444" }}
                onClick={handlePasswordChange}
                disabled={isReEncrypting}
              >
                {isReEncrypting ? "Encrypting..." : "Change Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WALLET MODAL */}
      {showWalletModal && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ maxWidth: "320px", textAlign: "center" }}
          >
            <h3>💰 Wallet</h3>
            <p
              style={{
                marginBottom: "0.5rem",
                fontSize: "0.95rem",
                color: "var(--text-secondary)",
              }}
            >
              Current balance: <strong>{walletBalance.toFixed(2)}</strong>
            </p>
            <input
              type="number"
              className="form-input"
              autoFocus
              placeholder="Enter amount"
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
            />
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
              <button
                className="cancel-btn"
                style={{ flex: 1 }}
                onClick={() => setShowWalletModal(false)}
              >
                Cancel
              </button>
              <button
                className="submit-btn"
                style={{ flex: 1 }}
                onClick={() => {
                  const v = parseFloat(walletInput) || 0;
                  const rounded = Math.round(v * 100) / 100;
                  setWalletBalance(rounded);
                  saveWalletToDB(rounded);
                  setShowWalletModal(false);
                  setToastEmoji("💰");
                  setToastMessage("Wallet updated");
                  setShowToast(true);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center" }}>Loading...</div>
      ) : (
        <div className="video-grid" style={{ alignItems: "start" }}>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`video-card ${item.type === "note" ? "note-card" : ""
                }`}
              style={
                item.type === "secret" ? { border: "1px solid #ef4444" } : {}
              }

            >
              {/* SELECTION CHECKBOX OVERLAY */}
              {isSelectionMode && item.type === 'expense' && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(item.id);
                  }}
                  style={{
                    position: "absolute",
                    top: "10px",
                    left: "10px",
                    zIndex: 20,
                    width: "24px",
                    height: "24px",
                    borderRadius: "6px",
                    background: selectedIds.has(item.id) ? "#10b981" : "rgba(255,255,255,0.2)",
                    border: "2px solid white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.3)"
                  }}
                >
                  {selectedIds.has(item.id) && <span style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>✓</span>}
                </div>
              )}

              {/* CONTENT RENDERING */}
              {["video", "photo", "pdf"].includes(item.type) && (
                <div
                  className="video-thumbnail"
                  style={{
                    position: "relative",
                    aspectRatio: "16/9",
                    width: "100%",
                    overflow: "hidden"
                  }}
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                        if (e.target.nextSibling)
                          e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}

                  {!item.image_url &&
                    item.type === "video" &&
                    getThumbnail(item.url) && (
                      <img src={getThumbnail(item.url)} alt="" />
                    )}

                  {/* DISPLAY PHOTO (Only if no image_url, or if it's a captured photo with url) */}
                  {item.type === "photo" && !item.image_url && item.url && (
                    <img
                      src={item.url}
                      alt="Photo"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )}

                  {/* DISPLAY PDF */}
                  {item.type === "pdf" && (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: "#e11d48",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                      }}
                    >
                      <span style={{ fontSize: "3rem" }}>📄</span>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "white",
                          marginTop: "1rem",
                          textDecoration: "underline",
                          fontWeight: "bold",
                          pointerEvents: "auto",
                          zIndex: 10,
                        }}
                      >
                        Download / View PDF
                      </a>
                    </div>
                  )}

                  {/* DISPLAY RECORDED VIDEO (no thumbnail) */}
                  {item.type === "video" &&
                    !item.image_url &&
                    !getThumbnail(item.url) &&
                    !item.url.includes("instagram") && (
                      <div
                        style={{
                          width: "100%",
                          height: "auto",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <video
                          src={item.url}
                          controls
                          style={{ width: "100%", maxHeight: "450px" }}
                        />
                      </div>
                    )}

                  <div
                    className="insta-fallback"
                    style={{
                      display:
                        !item.image_url &&
                          item.url &&
                          item.url.includes("instagram.com")
                          ? "flex"
                          : "none",
                      width: "100%",
                      height: "100%",
                      position: item.image_url ? "absolute" : "relative",
                      top: 0,
                      left: 0,
                      background:
                        "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "3rem",
                        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
                      }}
                    >
                      📸
                    </span>
                    <span
                      style={{
                        fontSize: "1rem",
                        fontWeight: "600",
                        marginTop: "0.5rem",
                        textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                      }}
                    >
                      View Reel
                    </span>
                  </div>

                  {!item.image_url &&
                    !getThumbnail(item.url) &&
                    !item.url?.includes("instagram.com") &&
                    item.type !== "pdf" &&
                    item.type !== "photo" &&
                    item.type !== "video" && (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          minHeight: "180px",
                          background: "#333",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        📝
                      </div>
                    )}

                  <a href={item.url} target="_blank" className="play-overlay">
                    ▶
                  </a>
                </div>
              )}

              <div className="video-info" style={{ flex: "none" }}>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    opacity: 0.7,
                  }}
                >
                  📅{" "}
                  {new Date(item.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>

                <h3 className="video-title">
                  {item.type === "secret"
                    ? "🔒 " + item.title.replace("🔒 ", "")
                    : item.title || "Untitled"}
                </h3>

                {item.type === "expense" && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      fontWeight: 700,
                      color: item.is_income ? "#10b981" : "#ef4444",
                    }}
                  >
                    {item.is_income ? "Income" : "Expense"}:{" "}
                    {(parseFloat(item.amount) || 0) >= 0
                      ? item.is_income
                        ? "+"
                        : "-"
                      : ""}
                    ₹{Math.abs(parseFloat(item.amount) || 0).toFixed(2)}
                  </div>
                )}

                {/* SECURE CONTENT VIEWER */}
                {item.type === "secret" && isSecretsUnlocked ? (
                  <DecryptedNote item={item} password={masterPassword} />
                ) : item.type === "secret" ? (
                  <div
                    style={{
                      padding: "1rem",
                      background: "#222",
                      borderRadius: "4px",
                      marginTop: "0.5rem",
                      color: "#666",
                      fontStyle: "italic",
                    }}
                  >
                    *** Encrypted Content ***
                  </div>
                ) : (
                  <p
                    style={{
                      marginTop: "0.5rem",
                      fontSize: "0.9rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {item.notes}
                  </p>
                )}

                {/* Tag Display ... */}
                {item.metadata?.user_tag && (
                  <div
                    className="video-tag"
                    style={{
                      display: "inline-block",
                      marginTop: "0.5rem",
                      marginBottom: "0.25rem",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: "rgba(99, 102, 241, 0.1)",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                      color: "var(--accent-primary)",
                      fontSize: "0.8rem",
                      fontWeight: "700",
                    }}
                  >
                    📌 {item.metadata.user_tag}
                  </div>
                )}

                <div className="video-actions">
                  <button
                    className="add-btn"
                    onClick={() => handleEdit(item)}
                    style={{
                      padding: "4px 12px",
                      fontSize: "0.8rem",
                      marginRight: "auto",
                      background: "transparent",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  >
                    🏷️ Edit / Append
                  </button>
                  <button
                    className="icon-btn delete"
                    type="button"
                    style={{
                      color: "#ef4444",
                      border: "1px solid rgba(239,68,68,0.3)",
                      background: "rgba(239,68,68,0.1)",
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteItem(item.id);
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
      }

      {/* EXPENSE REPORT DRAWER */}
      {isSelectionMode && (
        <div style={{
          position: "fixed",
          top: "100px",
          right: "20px",
          width: "300px",
          maxHeight: "calc(100vh - 120px)",
          background: "var(--glass-bg)",
          backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)",
          borderRadius: "16px",
          padding: "1.5rem",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          zIndex: 900,
          display: "flex",
          flexDirection: "column",
          color: "var(--text-primary)",
          overflowY: "auto"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem" }}>📊 Expense Report</h3>
            <button
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedIds(new Set());
              }}
              style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.2rem" }}
              title="Close"
            >
              ✖
            </button>
          </div>

          {selectedIds.size === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontStyle: "italic", fontSize: "0.9rem" }}>
              Select expense items from your list to generate a report.
            </p>
          ) : (
            <>
              <div style={{
                flex: 1,
                overflowY: "auto",
                marginBottom: "1rem",
                borderTop: "1px solid var(--border-color)",
                borderBottom: "2px solid var(--border-color)",
                padding: "1rem 0",
                fontFamily: "monospace" // Mono font for alignment look
              }}>
                {items
                  .filter(i => selectedIds.has(i.id))
                  .map(item => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                      <div style={{ display: "flex", flex: 1, gap: "8px" }}>
                        <span style={{ color: "var(--text-secondary)" }}>
                          {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <span style={{ fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }}>{item.title}</span>
                      </div>
                      <span style={{ fontWeight: "bold" }}>
                        {parseFloat(item.amount) || 0}
                      </span>
                    </div>
                  ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", fontSize: "1.1rem" }}>
                <strong>Total:</strong>
                <strong>
                  ₹{items
                    .filter(i => selectedIds.has(i.id))
                    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)
                    .toFixed(2)}
                </strong>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", flexDirection: "column" }}>
                <button
                  onClick={() => {
                    const selected = items.filter(i => selectedIds.has(i.id));
                    // Formatted Report Text
                    let msg = "📊 *EXPENSE REPORT*\n";
                    msg += "--------------------------------\n";
                    msg += "Date       | Item         | Amount\n";
                    msg += "--------------------------------\n";

                    selected.forEach(i => {
                      const d = new Date(i.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      const t = i.title.length > 12 ? i.title.substring(0, 11) + "." : i.title.padEnd(12, " ");
                      const a = (parseFloat(i.amount) || 0).toString().padStart(6, " ");
                      msg += `${d.padEnd(10, " ")} | ${t} | ${a}\n`;
                    });

                    const total = selected.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
                    msg += "--------------------------------\n";
                    msg += `TOTAL: ${total.toFixed(2).padStart(23, " ")}\n`;
                    msg += "--------------------------------\n";

                    navigator.clipboard.writeText(msg).then(() => {
                      setToastEmoji("📋");
                      setToastMessage("Report Copied!");
                      setShowToast(true);
                    });
                  }}
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    border: "none",
                    color: "white",
                    padding: "0.8rem",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.4)"
                  }}
                >
                  <span>📋 Copy Report</span>
                </button>

                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textAlign: "center", marginTop: "0.5rem" }}>
                  Select items &rarr; Copy Report &rarr; Send anywhere
                </p>
              </div>
            </>
          )}
        </div>
      )}


      {/* ADD/EDIT MODAL */}
      {
        isModalOpen && (
          <div
            className="modal-overlay"
            onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
          >
            <div className="modal-content">
              <h2 style={{ marginTop: 0, marginBottom: "1.5rem" }}>
                {editingItem ? "Edit Details" : "Add New Item"}
              </h2>

              {!editingItem && (
                <div className="type-selector">
                  <button
                    className={`type-btn ${itemType === "video" ? "active" : ""}`}
                    onClick={() => setItemType("video")}
                  >
                    Video
                  </button>
                  <button
                    className={`type-btn ${itemType === "note" ? "active" : ""}`}
                    onClick={() => setItemType("note")}
                  >
                    Note
                  </button>
                  <button
                    className={`type-btn ${itemType === "pdf" ? "active" : ""}`}
                    onClick={() => setItemType("pdf")}
                  >
                    📄 PDF
                  </button>
                  <button
                    className={`type-btn ${itemType === "photo" ? "active" : ""}`}
                    onClick={() => startCamera("photo")}
                  >
                    📸 Photo
                  </button>
                  <button
                    className={`type-btn ${itemType === "record" ? "active" : ""
                      }`}
                    onClick={() => startCamera("video")}
                  >
                    📹 Record
                  </button>
                  <button
                    className={`type-btn ${itemType === "expense" ? "active" : ""
                      }`}
                    onClick={() => setItemType("expense")}
                    style={{ color: "#b45309", borderColor: "#f59e0b" }}
                  >
                    💸 Expense
                  </button>
                  <button
                    className={`type-btn ${itemType === "secret" ? "active" : ""
                      }`}
                    onClick={() => {
                      if (!isSecretsUnlocked) {
                        setShowPasswordPrompt(true);
                        setIsModalOpen(false);
                        return;
                      }
                      setItemType("secret");
                    }}
                    style={{
                      color: "#ef4444",
                      borderColor: "#ef4444",
                      borderStyle: "solid",
                    }}
                  >
                    🔒 Secret
                  </button>
                </div>
              )}

              {/* EXPENSE UI */}
              {itemType === "expense" && (
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                  />
                  <div
                    style={{
                      marginTop: "0.5rem",
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "center",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.isIncome}
                        onChange={(e) =>
                          setFormData({ ...formData, isIncome: e.target.checked })
                        }
                      />
                      <span style={{ fontSize: "0.9rem" }}>Mark as Income</span>
                    </label>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {!editingItem && itemType === "video" && (
                  <div className="form-group">
                    <label className="form-label">Video URL</label>
                    <input
                      className="form-input"
                      type="url"
                      required
                      value={formData.url}
                      onChange={(e) =>
                        setFormData({ ...formData, url: e.target.value })
                      }
                    />
                  </div>
                )}

                {/* Title Field (Optional for notes/secrets) */}
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>

                {/* Tags */}
                <div className="form-group">
                  <label className="form-label">🏷️ Tag</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Type or Select Tag..."
                    value={formData.userTag}
                    onChange={(e) =>
                      setFormData({ ...formData, userTag: e.target.value })
                    }
                  />
                  {userTags.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                        marginTop: "0.5rem",
                      }}
                    >
                      {userTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, userTag: tag })
                          }
                          style={{
                            background:
                              formData.userTag === tag
                                ? "var(--accent-primary)"
                                : "rgba(255,255,255,0.05)",
                            color:
                              formData.userTag === tag
                                ? "#fff"
                                : "var(--text-secondary)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "12px",
                            padding: "4px 10px",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {itemType === "secret"
                      ? "🔐 Secret Content"
                      : "📝 Description"}
                  </label>
                  <textarea
                    className="form-input"
                    rows="4"
                    placeholder={
                      itemType === "secret"
                        ? "Content here will be ENCRYPTED using your Master Password."
                        : "Description..."
                    }
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                {/* PDF SPECIFIC UI */}
                {!editingItem && itemType === "pdf" && (
                  <div
                    style={{
                      marginBottom: "1.5rem",
                      padding: "1rem",
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: "8px",
                    }}
                  >
                    <label className="form-label">Upload PDF</label>
                    <input
                      type="file"
                      accept=".pdf"
                      className="form-input"
                      onChange={(e) => setPdfFile(e.target.files[0])}
                    />

                    <div style={{ marginTop: "1rem", display: "none" }}></div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!pdfFile) return alert("Select a PDF first!");

                        if (!GEMINI_API_KEY) {
                          alert(
                            "Gemini API Key is missing! Please configure VITE_GEMINI_API_KEY in your .env file."
                          );
                          return;
                        }

                        setIsSummarizing(true);
                        try {
                          const text = await extractTextFromPdf(pdfFile);
                          const aiSummary = await summarizeTextWithGemini(
                            text,
                            GEMINI_API_KEY
                          );
                          setSummary(aiSummary);
                          setFormData((prev) => ({
                            ...prev,
                            description: aiSummary,
                          }));
                        } catch (err) {
                          alert("Error: " + err.message);
                        } finally {
                          setIsSummarizing(false);
                        }
                      }}
                      className="add-btn"
                      disabled={isSummarizing}
                      style={{
                        marginTop: "1rem",
                        width: "100%",
                        background: isSummarizing
                          ? "#666"
                          : "linear-gradient(135deg, #8b5cf6, #d946ef)",
                      }}
                    >
                      {isSummarizing
                        ? "Analyzing PDF..."
                        : "✨ Summarize with AI"}
                    </button>

                    {summary && (
                      <div
                        style={{
                          marginTop: "1rem",
                          padding: "0.5rem",
                          background: "rgba(0,0,0,0.2)",
                          borderRadius: "4px",
                          fontSize: "0.85rem",
                        }}
                      >
                        <strong>Preview:</strong> {summary.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={uploading}
                  >
                    {uploading
                      ? "Saving..."
                      : editingItem
                        ? "Update"
                        : "Save Item"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* CAMERA MODAL */}
      {
        showCamera && (
          <div className="modal-overlay">
            <div
              className="modal-content"
              style={{
                width: "100%",
                maxWidth: "600px",
                padding: "1rem",
                background: "#000",
                position: "relative",
              }}
            >
              {uploading && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.8)",
                    zIndex: 10,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                  }}
                >
                  <div
                    className="loading-spinner"
                    style={{
                      width: "40px",
                      height: "40px",
                      marginBottom: "1rem",
                    }}
                  ></div>
                  <h3>Saving Media...</h3>
                  <p>Please wait while we upload and save.</p>
                </div>
              )}
              <h3 style={{ color: "white", margin: "0 0 1rem 0" }}>
                {cameraMode === "photo" ? "📸 Take Photo" : "📹 Record Video"}
              </h3>

              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "0",
                  paddingBottom: "75%",
                  background: "#222",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                {isRecording && (
                  <div
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      background: "red",
                      color: "white",
                      padding: "5px 10px",
                      borderRadius: "4px",
                      fontWeight: "bold",
                      animation: "pulse 1s infinite",
                    }}
                  >
                    REC
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  marginTop: "1rem",
                  justifyContent: "center",
                }}
              >
                <button className="cancel-btn" onClick={stopCamera}>
                  Cancel
                </button>

                {cameraMode === "photo" ? (
                  <button className="add-btn" onClick={capturePhoto}>
                    Capture Photo
                  </button>
                ) : !isRecording ? (
                  <button
                    className="add-btn"
                    style={{ background: "#ef4444" }}
                    onClick={startRecording}
                  >
                    Start Recording
                  </button>
                ) : (
                  <button
                    className="add-btn"
                    style={{ background: "#333" }}
                    onClick={stopCaptureRecording}
                  >
                    Stop & Save
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* FLOATING EXPENSE SELECT BUTTON (Bottom Right) */}
      {activeTag === "Expenses" && items.some(i => i.type === 'expense') && (
        <button
          onClick={() => {
            setIsSelectionMode(!isSelectionMode);
            setSelectedIds(new Set());
          }}
          style={{
            position: "fixed",
            bottom: "60px",
            right: "20px",
            zIndex: 800,
            background: isSelectionMode ? "#ef4444" : "var(--accent-primary)",
            color: "white",
            border: "none",
            padding: "0.8rem 1.2rem",
            borderRadius: "50px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
          }}
        >
          {isSelectionMode ? "✖ Cancel Details" : "🧾 Report"}
        </button>
      )}

      <footer className="app-footer">
        <p>Developed by Aniket Patil</p>
      </footer>
    </div >
  );
}

export default App;

