import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import { analyzeUrl, getPredefinedCategories, getCategoryEmoji } from './urlAnalyzer'
import SuccessToast from './components/SuccessToast'
import './App.css'

function App() {
  // We use a simple token string for the session now
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('video_vault_token'))
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')
  const [uploading, setUploading] = useState(false)

  // Auto-save mode (default: ON)
  const [autoSaveMode, setAutoSaveMode] = useState(() => {
    const saved = localStorage.getItem('auto_save_mode')
    return saved !== null ? saved === 'true' : true // Default to true
  })

  // Success toast state
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastEmoji, setToastEmoji] = useState('✅')

  // Form State
  const [itemType, setItemType] = useState('video')
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    category: '',
    notes: ''
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [urlAnalysis, setUrlAnalysis] = useState(null) // Smart URL detection result

  // Ref for auto-focus
  const urlInputRef = useRef(null)

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallButton, setShowInstallButton] = useState(false)

  // Register Service Worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration)
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error)
        })
    }

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallButton(true)
    })
  }, [])

  // Handle Share Target API - Check URL params for shared content
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const sharedUrl = urlParams.get('url') || urlParams.get('text')
    const sharedTitle = urlParams.get('title')

    if (sharedUrl && sessionToken) {
      // Analyze the URL for smart categorization
      const analysis = analyzeUrl(sharedUrl)
      setUrlAnalysis(analysis)

      // AUTO-SAVE MODE: Save directly without showing modal
      if (autoSaveMode) {
        autoSaveSharedLink(sharedUrl, sharedTitle, analysis)
      } else {
        // MANUAL MODE: Show modal for confirmation
        setFormData({
          url: sharedUrl,
          title: sharedTitle || '',
          category: analysis.suggestedCategory || '',
          notes: ''
        })
        setItemType('video')
        setIsModalOpen(true)
      }

      // Clean URL params
      window.history.replaceState({}, '', '/')
    }
  }, [sessionToken, autoSaveMode])

  // Persist token
  useEffect(() => {
    if (sessionToken) {
      localStorage.setItem('video_vault_token', sessionToken)
      fetchItems()
    } else {
      localStorage.removeItem('video_vault_token')
      setItems([])
    }
  }, [sessionToken])

  // Auto-focus URL input when modal opens
  useEffect(() => {
    if (isModalOpen && itemType === 'video' && urlInputRef.current) {
      setTimeout(() => urlInputRef.current?.focus(), 100)
    }
  }, [isModalOpen, itemType])

  const fetchItems = async () => {
    if (!sessionToken) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_token', sessionToken) // Filter by our custom token
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching items:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const categories = ['All', ...new Set(items.map(i => i.category).filter(Boolean))]

  // Extract video ID from YouTube or Instagram URL
  const extractVideoId = (url) => {
    try {
      if (!url) return null

      // YouTube patterns
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        // https://www.youtube.com/watch?v=VIDEO_ID
        if (url.includes('v=')) {
          return url.split('v=')[1]?.split('&')[0]
        }
        // https://youtu.be/VIDEO_ID
        if (url.includes('youtu.be/')) {
          return url.split('youtu.be/')[1]?.split('?')[0]
        }
        // https://www.youtube.com/embed/VIDEO_ID
        if (url.includes('embed/')) {
          return url.split('embed/')[1]?.split('?')[0]
        }
      }

      // Instagram patterns
      if (url.includes('instagram.com')) {
        // https://www.instagram.com/reel/VIDEO_ID/
        // https://www.instagram.com/p/VIDEO_ID/
        const match = url.match(/\/(reel|p)\/([^\/\?]+)/)
        if (match) return match[2]
      }
    } catch (e) {
      console.error('Error extracting video ID', e)
    }
    return null
  }

  // Auto-save shared link without showing modal
  const autoSaveSharedLink = async (url, title, analysis) => {
    try {
      setUploading(true)

      // Auto-generate title if empty
      let finalTitle = title
      if (!finalTitle || finalTitle.trim() === '') {
        const videoId = extractVideoId(url)
        finalTitle = videoId ? `Video ${videoId.substring(0, 8)}` : 'Saved Link'
      }

      const newItem = {
        user_token: sessionToken,
        type: 'video',
        url: url,
        title: finalTitle,
        category: analysis.suggestedCategory || 'Videos',
        notes: '',
        image_url: null,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('items')
        .insert([newItem])
        .select()

      if (error) throw error

      // Add to items list
      setItems([data[0], ...items])

      // Show success toast
      setToastEmoji(analysis.emoji || '✅')
      setToastMessage(`Saved to ${analysis.suggestedCategory || 'Videos'}!`)
      setShowToast(true)

      // Switch to the category view
      if (analysis.suggestedCategory) {
        setActiveCategory(analysis.suggestedCategory)
      }

    } catch (error) {
      console.error('Error auto-saving:', error.message)
      // Show error toast
      setToastEmoji('❌')
      setToastMessage('Failed to save. Please try again.')
      setShowToast(true)
    } finally {
      setUploading(false)
    }
  }

  const getThumbnail = (url) => {
    try {
      if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
        const videoId = extractVideoId(url)
        if (videoId) {
          return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        }
      }
    } catch (e) {
      console.error('Error parsing URL', e)
    }
    return null
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (itemType === 'video' && !formData.url) return
    if (itemType === 'note' && !formData.notes) return

    try {
      setUploading(true)
      let imageUrl = null

      // Upload Image if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('screenshots')
          .upload(fileName, selectedFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('screenshots')
          .getPublicUrl(fileName)

        imageUrl = publicUrl
      }

      // Auto-generate title if empty
      let finalTitle = formData.title
      if (!finalTitle || finalTitle.trim() === '') {
        if (itemType === 'video') {
          const videoId = extractVideoId(formData.url)
          finalTitle = videoId ? `Video ${videoId.substring(0, 8)}` : 'Untitled Video'
        } else {
          finalTitle = `Note ${new Date().toLocaleDateString()}`
        }
      }

      const newItem = {
        user_token: sessionToken, // Link to our token
        type: itemType,
        ...formData,
        title: finalTitle,
        image_url: imageUrl,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('items')
        .insert([newItem])
        .select()

      if (error) throw error

      setItems([data[0], ...items])
      setFormData({ url: '', title: '', category: '', notes: '' })
      setSelectedFile(null)
      setUrlAnalysis(null) // Reset URL analysis
      setIsModalOpen(false)
    } catch (error) {
      alert('Error saving item: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const deleteItem = async (id) => {
    if (confirm('Are you sure you want to delete this?')) {
      try {
        const { error } = await supabase
          .from('items')
          .delete()
          .eq('id', id)

        if (error) throw error
        setItems(items.filter(i => i.id !== id))
      } catch (error) {
        alert('Error deleting item: ' + error.message)
      }
    }
  }

  const handleSignOut = () => {
    setSessionToken(null)
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    }

    setDeferredPrompt(null)
    setShowInstallButton(false)
  }

  const toggleAutoSave = () => {
    const newValue = !autoSaveMode
    setAutoSaveMode(newValue)
    localStorage.setItem('auto_save_mode', newValue.toString())

    // Show toast notification
    setToastEmoji(newValue ? '⚡' : '📝')
    setToastMessage(newValue ? 'Auto-save enabled!' : 'Manual mode enabled')
    setShowToast(true)
  }

  const filteredItems = activeCategory === 'All'
    ? items
    : items.filter(i => i.category === activeCategory)

  if (!sessionToken) {
    return <Auth onLogin={(token) => setSessionToken(token)} />
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="title">Video Vault</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {showInstallButton && (
            <button
              className="add-btn"
              onClick={handleInstallClick}
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              📱 Install App
            </button>
          )}
          <button
            className="add-btn"
            onClick={toggleAutoSave}
            style={{
              background: autoSaveMode
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              minWidth: '140px'
            }}
            title={autoSaveMode ? 'Auto-save ON' : 'Manual mode ON'}
          >
            {autoSaveMode ? '⚡ Auto-Save' : '📝 Manual'}
          </button>
          <button className="add-btn" onClick={() => setIsModalOpen(true)}>
            + Add Item
          </button>
          <button className="cancel-btn" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      <div className="categories">
        {categories.map(cat => (
          <button
            key={cat}
            className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat !== 'All' && <span style={{ marginRight: '0.25rem' }}>{getCategoryEmoji(cat)}</span>}
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
      ) : (
        <div className="video-grid">
          {filteredItems.map(item => (
            <div key={item.id} className={`video-card ${item.type === 'note' ? 'note-card' : ''}`}>
              {/* Thumbnail / Image Area */}
              <div className="video-thumbnail">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} style={{ objectFit: 'cover' }} />
                ) : item.type === 'video' && getThumbnail(item.url) ? (
                  <img src={getThumbnail(item.url)} alt={item.title} />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(45deg, var(--accent-primary), var(--accent-secondary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '3rem'
                  }}>
                    {item.type === 'video' ? '▶' : '📝'}
                  </div>
                )}

                {item.type === 'video' && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.3)',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      color: 'white'
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0}
                  >
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
                    </svg>
                  </a>
                )}
              </div>

              <div className="video-info">
                <span className="video-category">{item.category || 'Uncategorized'}</span>
                <h3 className="video-title">{item.title || (item.type === 'video' ? 'Untitled Video' : 'Untitled Note')}</h3>
                <p className="video-notes">{item.notes}</p>
                <div className="video-actions">
                  <button
                    className="icon-btn delete"
                    onClick={() => deleteItem(item.id)}
                    title="Delete"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="modal-content">
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Add New Item</h2>

            <div className="type-selector">
              <button
                className={`type-btn ${itemType === 'video' ? 'active' : ''}`}
                onClick={() => setItemType('video')}
              >
                Video Link
              </button>
              <button
                className={`type-btn ${itemType === 'note' ? 'active' : ''}`}
                onClick={() => setItemType('note')}
              >
                Text Note
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {itemType === 'video' && (
                <div className="form-group">
                  <label className="form-label">Video URL</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      ref={urlInputRef}
                      className="form-input"
                      type="url"
                      required={itemType === 'video'}
                      placeholder="https://youtube.com/... or https://instagram.com/..."
                      value={formData.url}
                      onChange={e => {
                        const newUrl = e.target.value
                        setFormData({ ...formData, url: newUrl })

                        // Analyze URL and auto-suggest category
                        if (newUrl) {
                          const analysis = analyzeUrl(newUrl)
                          setUrlAnalysis(analysis)

                          // Auto-fill category if not already set or if it was auto-suggested before
                          if (!formData.category || urlAnalysis?.suggestedCategory === formData.category) {
                            setFormData(prev => ({ ...prev, url: newUrl, category: analysis.suggestedCategory || '' }))
                          }
                        } else {
                          setUrlAnalysis(null)
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="add-btn"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText()
                          if (text) {
                            setFormData({ ...formData, url: text })

                            // Analyze pasted URL
                            const analysis = analyzeUrl(text)
                            setUrlAnalysis(analysis)
                            setFormData({ ...formData, url: text, category: analysis.suggestedCategory || '' })
                          }
                        } catch (err) {
                          alert('Failed to read clipboard. Please paste manually.')
                        }
                      }}
                      style={{
                        padding: '0.75rem 1rem',
                        whiteSpace: 'nowrap',
                        fontSize: '0.875rem'
                      }}
                    >
                      📋 Paste
                    </button>
                  </div>

                  {/* Smart Detection Banner */}
                  {urlAnalysis && urlAnalysis.confidence !== 'low' && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem 1rem',
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      color: 'var(--text-primary)'
                    }}>
                      <span style={{ fontSize: '1.25rem' }}>{urlAnalysis.emoji}</span>
                      <div>
                        <strong>Detected:</strong> {urlAnalysis.description}
                        {urlAnalysis.suggestedCategory && (
                          <span style={{ marginLeft: '0.5rem', opacity: 0.8 }}>
                            → Category: <strong>{urlAnalysis.suggestedCategory}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Title (Optional)</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder={itemType === 'video' ? "Auto-generated if left empty" : "My Note Title"}
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>

                {/* Show predefined categories with emojis */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginBottom: '0.75rem'
                }}>
                  {/* Suggested category first if detected */}
                  {urlAnalysis && urlAnalysis.suggestedCategory && (
                    <>
                      <div style={{
                        width: '100%',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.25rem',
                        fontWeight: '600'
                      }}>
                        ✨ SUGGESTED
                      </div>
                      <button
                        key={urlAnalysis.suggestedCategory}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: urlAnalysis.suggestedCategory })}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '20px',
                          border: formData.category === urlAnalysis.suggestedCategory
                            ? '2px solid var(--accent-primary)'
                            : '2px solid rgba(99, 102, 241, 0.5)',
                          background: formData.category === urlAnalysis.suggestedCategory
                            ? 'var(--accent-primary)'
                            : 'rgba(99, 102, 241, 0.1)',
                          color: formData.category === urlAnalysis.suggestedCategory
                            ? 'white'
                            : 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        {urlAnalysis.emoji} {urlAnalysis.suggestedCategory}
                      </button>
                      <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', margin: '0.5rem 0' }} />
                    </>
                  )}

                  {/* Show existing user categories */}
                  {categories.filter(c => c !== 'All').length > 0 && (
                    <>
                      <div style={{
                        width: '100%',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.25rem',
                        fontWeight: '600'
                      }}>
                        YOUR CATEGORIES
                      </div>
                      {categories.filter(c => c !== 'All' && c !== urlAnalysis?.suggestedCategory).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat })}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            border: formData.category === cat
                              ? '2px solid var(--accent-primary)'
                              : '1px solid var(--border-color)',
                            background: formData.category === cat
                              ? 'var(--accent-primary)'
                              : 'var(--bg-secondary)',
                            color: formData.category === cat
                              ? 'white'
                              : 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: formData.category === cat ? '600' : '400',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          onMouseEnter={e => {
                            if (formData.category !== cat) {
                              e.target.style.borderColor = 'var(--accent-primary)'
                            }
                          }}
                          onMouseLeave={e => {
                            if (formData.category !== cat) {
                              e.target.style.borderColor = 'var(--border-color)'
                            }
                          }}
                        >
                          {getCategoryEmoji(cat)} {cat}
                        </button>
                      ))}
                      <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', margin: '0.5rem 0' }} />
                    </>
                  )}

                  {/* Show predefined categories */}
                  <div style={{
                    width: '100%',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.25rem',
                    fontWeight: '600'
                  }}>
                    QUICK SELECT
                  </div>
                  {getPredefinedCategories()
                    .filter(predef =>
                      !categories.includes(predef.name) &&
                      predef.name !== urlAnalysis?.suggestedCategory
                    )
                    .map(predef => (
                      <button
                        key={predef.name}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: predef.name })}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '20px',
                          border: formData.category === predef.name
                            ? '2px solid var(--accent-primary)'
                            : '1px solid var(--border-color)',
                          background: formData.category === predef.name
                            ? 'var(--accent-primary)'
                            : 'var(--bg-secondary)',
                          color: formData.category === predef.name
                            ? 'white'
                            : 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: formData.category === predef.name ? '600' : '400',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                        onMouseEnter={e => {
                          if (formData.category !== predef.name) {
                            e.target.style.borderColor = 'var(--accent-primary)'
                          }
                        }}
                        onMouseLeave={e => {
                          if (formData.category !== predef.name) {
                            e.target.style.borderColor = 'var(--border-color)'
                          }
                        }}
                      >
                        {predef.emoji} {predef.name}
                      </button>
                    ))}
                </div>

                {/* Input for new category or custom entry */}
                <input
                  className="form-input"
                  type="text"
                  placeholder="Or type a new category..."
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{itemType === 'video' ? 'Notes (Optional)' : 'Content'}</label>
                <textarea
                  className="form-textarea"
                  placeholder={itemType === 'video' ? "Add your thoughts here..." : "Write your note here..."}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  required={itemType === 'note'}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Screenshot / Image (Optional)</label>
                <input
                  className="form-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="add-btn" disabled={uploading}>
                  {uploading ? 'Uploading...' : `Save ${itemType === 'video' ? 'Video' : 'Note'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Toast Notification */}
      {showToast && (
        <SuccessToast
          message={toastMessage}
          emoji={toastEmoji}
          onClose={() => setShowToast(false)}
          duration={3000}
        />
      )}
    </div>
  )
}

export default App
