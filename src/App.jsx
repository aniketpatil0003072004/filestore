import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import { analyzeUrl, getPredefinedCategories, getCategoryEmoji } from './urlAnalyzer'
import { storeToken, removeToken } from './indexedDBHelper'
import SuccessToast from './components/SuccessToast'
import StatsCalendar from './components/StatsCalendar'
import { enrichMetadata } from './metadataFetcher'
import { analyzeContentWithMetadata } from './categoryHelper'
import './App.css'

function App() {
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('video_vault_token'))
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const [activeCategory, setActiveCategory] = useState('All')
  const [activeTag, setActiveTag] = useState(null)

  const [uploading, setUploading] = useState(false)
  const [fetchingMetadata, setFetchingMetadata] = useState(false)

  // Auto-save mode (default: ON)
  const [autoSaveMode, setAutoSaveMode] = useState(() => {
    const saved = localStorage.getItem('auto_save_mode')
    return saved !== null ? saved === 'true' : true
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
    description: '',
    userTag: '',
    channelName: ''
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [urlAnalysis, setUrlAnalysis] = useState(null)
  const [enrichedMetadata, setEnrichedMetadata] = useState(null)

  const urlInputRef = useRef(null)

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallButton, setShowInstallButton] = useState(false)

  // Register Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          if (registration.active) {
            registration.active.postMessage({
              type: 'SUPABASE_CONFIG',
              url: import.meta.env.VITE_SUPABASE_URL,
              key: import.meta.env.VITE_SUPABASE_ANON_KEY
            })
          }
        })
        .catch((error) => console.log('SW registration failed:', error))
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallButton(true)
    })
  }, [])

  // Handle Share Target
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const sharedUrl = urlParams.get('url') || urlParams.get('text')
    const sharedTitle = urlParams.get('title')
    const manualMode = urlParams.get('manual') === 'true'

    if (sharedUrl && sessionToken) {
      const analysis = analyzeUrl(sharedUrl)
      setUrlAnalysis(analysis)

      if (autoSaveMode && !manualMode) {
        autoSaveSharedLink(sharedUrl, sharedTitle, analysis)
      } else {
        setFormData({
          url: sharedUrl,
          title: sharedTitle || '',
          category: analysis.suggestedCategory || '',
          description: '',
          userTag: ''
        })
        setItemType('video')
        setIsModalOpen(true)
      }
      window.history.replaceState({}, '', '/')
    }
  }, [sessionToken, autoSaveMode])

  useEffect(() => {
    if (sessionToken) {
      localStorage.setItem('video_vault_token', sessionToken)
      storeToken(sessionToken).catch(err => console.error(err))
      fetchItems()
    } else {
      localStorage.removeItem('video_vault_token')
      removeToken().catch(err => console.error(err))
      setItems([])
    }
  }, [sessionToken])

  useEffect(() => {
    if (isModalOpen && itemType === 'video' && urlInputRef.current && !editingItem) {
      setTimeout(() => urlInputRef.current?.focus(), 100)
    }
  }, [isModalOpen, itemType, editingItem])

  const fetchItems = async () => {
    if (!sessionToken) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_token', sessionToken)
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching items:', error.message)
    } finally {
      setLoading(false)
    }
  }

  // extract all unique categories
  const categories = ['All', 'YouTube Videos', 'YouTube Shorts', 'Instagram Reels', 'Movies', 'Instagram Posts', ...new Set(items.map(i => i.category).filter(Boolean))]

  // NEW: Extract all unique USER TAGS from metadata for Autocomplete
  const userTags = [...new Set(items.map(i => i.metadata?.user_tag).filter(Boolean))];

  const extractVideoId = (url) => {
    try {
      if (!url) return null
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        if (url.includes('v=')) return url.split('v=')[1]?.split('&')[0]
        if (url.includes('youtu.be/')) return url.split('youtu.be/')[1]?.split('?')[0]
        if (url.includes('embed/')) return url.split('embed/')[1]?.split('?')[0]
      }
      if (url.includes('instagram.com')) {
        const match = url.match(/\/(reel|p)\/([^\/\?]+)/)
        if (match) return match[2]
      }
    } catch (e) { console.error(e) }
    return null
  }

  const autoSaveSharedLink = async (url, title, analysis) => {
    try {
      setUploading(true)
      let metadata = null
      let contentAnalysis = null
      try {
        metadata = await enrichMetadata(url)
        contentAnalysis = analyzeContentWithMetadata(url, metadata, analysis)
      } catch (err) {
        console.error('Auto-save metadata fetch error:', err)
      }
      let finalTitle = title
      if (!finalTitle || finalTitle.trim() === '') {
        if (metadata?.title) {
          finalTitle = metadata.title
        } else {
          const videoId = extractVideoId(url)
          finalTitle = videoId ? `Video ${videoId.substring(0, 8)}` : 'Saved Link'
        }
      }

      // AUTO SAVE DEFAULTS TO PLATFORM CATEGORY (NO AUTO-TAGGING)
      const newItem = {
        user_token: sessionToken,
        type: 'video',
        url: url,
        title: finalTitle,
        category: contentAnalysis?.fullCategory || 'Other Links',
        notes: '',
        image_url: metadata?.thumbnail || null,
        channel_name: metadata?.channelName || null,
        creator_profile: metadata?.creatorProfile || null,
        content_description: metadata?.description || null,
        thumbnail_url: metadata?.thumbnail || null,
        metadata: metadata || null,
        created_at: new Date().toISOString()
      }
      const { data, error } = await supabase.from('items').insert([newItem]).select()
      if (error) throw error
      setItems([data[0], ...items])
      setToastEmoji(contentAnalysis?.emoji || '✅')
      setToastMessage(`Saved to ${newItem.category}!`)
      setShowToast(true)
      if (newItem.category) setActiveCategory(newItem.category)
    } catch (error) {
      console.error('Error auto-saving:', error.message)
      setToastEmoji('❌')
      setToastMessage('Failed to save.')
      setShowToast(true)
    } finally {
      setUploading(false)
    }
  }

  const getThumbnail = (url) => {
    try {
      if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
        const videoId = extractVideoId(url)
        if (videoId) return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      }
    } catch (e) { console.error(e) }
    return null
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setItemType(item.type)
    setFormData({
      url: item.url || '',
      title: item.title || '',
      category: item.category || '',
      description: item.notes || '',
      userTag: item.metadata?.user_tag || '',
      channelName: item.channel_name || ''
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!editingItem) {
      if (itemType === 'video' && !formData.url) return
      if (itemType === 'note' && !formData.description) return
    }

    try {
      setUploading(true)

      if (editingItem) {
        const baseMetadata = editingItem.metadata || {};
        const finalMetadata = {
          ...baseMetadata,
          user_tag: formData.userTag
        };

        const updates = {
          notes: formData.description,
          metadata: finalMetadata
        }

        const { data, error } = await supabase
          .from('items')
          .update(updates)
          .eq('id', editingItem.id) // Strict ID match
          .select()

        if (error) throw error

        if (!data || data.length === 0) {
          await fetchItems();
          throw new Error("Update blocked! Please run the SQL fix provided.")
        }

        const updatedItem = data[0]
        setItems(items.map(i => i.id === editingItem.id ? updatedItem : i))

        setToastEmoji('🏷️')
        setToastMessage('Tag Updated!')
        setShowToast(true)

      } else {
        // CREATE NEW ITEM
        let imageUrl = null
        if (selectedFile) {
          const fileExt = selectedFile.name.split('.').pop()
          const fileName = `${Date.now()}.${fileExt}`
          const { error: upload } = await supabase.storage.from('screenshots').upload(fileName, selectedFile)
          if (!upload) {
            const { data: { publicUrl } } = supabase.storage.from('screenshots').getPublicUrl(fileName)
            imageUrl = publicUrl
          }
        }

        let finalTitle = formData.title
        if (!finalTitle && itemType === 'video') {
          const videoId = extractVideoId(formData.url)
          finalTitle = videoId ? `Video ${videoId.substring(0, 8)}` : 'Untitled'
        }

        // Analyze for Categorization ONCE
        let analysis = analyzeUrl(formData.url);
        let metadata = null
        try { if (itemType === 'video') metadata = await enrichMetadata(formData.url) } catch (e) { }

        let contentAnalysis = analyzeContentWithMetadata(formData.url, metadata, analysis);

        const newItem = {
          user_token: sessionToken,
          type: itemType,
          url: formData.url,
          category: contentAnalysis.fullCategory, // STRICT PLATFORM CATEGORY
          notes: formData.description,
          metadata: { ...(metadata || {}), user_tag: formData.userTag }, // USER TAG STORED HERE
          title: finalTitle || (metadata?.title) || 'Untitled',
          image_url: imageUrl || metadata?.thumbnail || null,
          channel_name: formData.channelName || metadata?.channelName,
          created_at: new Date().toISOString()
        }

        const { data, error } = await supabase.from('items').insert([newItem]).select()
        if (error) throw error
        setItems([data[0], ...items])
      }

      setFormData({ url: '', title: '', category: '', description: '', userTag: '', channelName: '' })
      setSelectedFile(null)
      setUrlAnalysis(null)
      setEnrichedMetadata(null)
      setEditingItem(null)
      setIsModalOpen(false)
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const deleteItem = async (id) => {
    if (confirm('Are you sure you want to delete this?')) {
      try {
        const { error } = await supabase.from('items').delete().eq('id', id)
        if (error) throw error
        setItems(items.filter(i => i.id !== id))
        fetchItems()
      } catch (error) {
        alert('Error: ' + error.message)
      }
    }
  }

  const handleSignOut = () => setSessionToken(null)
  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    setDeferredPrompt(null)
    setShowInstallButton(false)
  }
  const toggleAutoSave = () => {
    const newValue = !autoSaveMode
    setAutoSaveMode(newValue)
    localStorage.setItem('auto_save_mode', newValue.toString())
    setToastEmoji(newValue ? '⚡' : '📝')
    setToastMessage(newValue ? 'Auto-save enabled!' : 'Manual mode enabled')
    setShowToast(true)
  }

  const filteredItems = activeTag
    ? items.filter(i => i.metadata?.user_tag === activeTag)
    : (activeCategory === 'All' ? items : items.filter(i => i.category === activeCategory))

  if (!sessionToken) return <Auth onLogin={(token) => setSessionToken(token)} />

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="title">Video Vault</h1>
      </header>

      <div className="control-bar">
        {showInstallButton && (
          <button className="add-btn" onClick={handleInstallClick} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            📱 Install App
          </button>
        )}
        <button className="add-btn" onClick={toggleAutoSave} style={{ background: autoSaveMode ? '#f59e0b' : '#6366f1', minWidth: '140px' }}>
          {autoSaveMode ? '⚡ Auto-Save' : '📝 Manual'}
        </button>
        <button className="add-btn" onClick={() => {
          setEditingItem(null)
          setFormData({ url: '', title: '', category: '', description: '', userTag: '', channelName: '' })
          setIsModalOpen(true)
        }}>
          + Add Item
        </button>
        <button className="icon-btn" onClick={() => setShowStats(true)}>📅</button>
        <button className="signout-btn" onClick={handleSignOut}>Sign Out</button>
      </div>

      <div className="categories">
        {/* Force Unique Filter from Set */}
        {[...new Set(categories)].map(cat => (
          <button key={cat}
            className={`category-pill ${activeCategory === cat && !activeTag ? 'active' : ''}`}
            onClick={() => { setActiveCategory(cat); setActiveTag(null); }}
          >
            {getCategoryEmoji(cat)} {cat}
          </button>
        ))}
      </div>

      {userTags.length > 0 && (
        <div className="categories" style={{ marginTop: '0.5rem', paddingTop: '0' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginRight: '0.5rem', alignSelf: 'center' }}>
            🏷️ My Tags:
          </span>
          {userTags.map(tag => (
            <button key={tag}
              className={`category-pill ${activeTag === tag ? 'active' : ''}`}
              style={{
                border: '1px dashed var(--accent-primary)',
                background: activeTag === tag ? 'var(--accent-primary)' : 'transparent'
              }}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading ? <div style={{ textAlign: 'center' }}>Loading...</div> : (
        <div className="video-grid">
          {filteredItems.map(item => (
            <div key={item.id} className={`video-card ${item.type === 'note' ? 'note-card' : ''}`}>
              <div className="video-thumbnail">
                {item.image_url ? <img src={item.image_url} alt="" style={{ objectFit: 'cover' }} /> :
                  (item.type === 'video' && getThumbnail(item.url)) ? <img src={getThumbnail(item.url)} alt="" /> :
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '3rem' }}>{item.type === 'video' ? '▶' : '📝'}</div>}

                <div className="thumbnail-badges">
                  <span className="video-category-badge">{item.category || 'Uncategorized'}</span>
                </div>
                {item.type === 'video' && <a href={item.url} target="_blank" className="play-overlay">▶</a>}
              </div>

              <div className="video-info">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                  📅 {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>

                <h3 className="video-title">
                  <a href={item.url} target="_blank" style={{ color: 'inherit', textDecoration: 'none' }}>
                    {item.title || 'Untitled'}
                  </a>
                </h3>

                {item.metadata?.user_tag && (
                  <div className="video-tag" style={{
                    display: 'inline-block', marginTop: '0.5rem', marginBottom: '0.25rem',
                    padding: '4px 10px', borderRadius: '6px',
                    background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: '700'
                  }}>
                    📌 {item.metadata.user_tag}
                  </div>
                )}

                {item.notes && (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem', marginBottom: '1rem', lineHeight: '1.4' }}>
                    {item.notes}
                  </p>
                )}

                {(!item.metadata?.user_tag && !item.notes) && <div style={{ marginBottom: '1rem' }} />}

                <div className="video-actions">
                  <button
                    className="add-btn"
                    onClick={() => handleEdit(item)}
                    style={{ padding: '4px 12px', fontSize: '0.8rem', marginRight: 'auto', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    🏷️ Tag
                  </button>
                  <button className="icon-btn delete" onClick={() => deleteItem(item.id)}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showStats && <StatsCalendar items={items} onClose={() => setShowStats(false)} />}

      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="modal-content">
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>{editingItem ? 'Edit Details' : 'Add New Item'}</h2>

            {!editingItem && (
              <div className="type-selector">
                <button className={`type-btn ${itemType === 'video' ? 'active' : ''}`} onClick={() => setItemType('video')}>Video Link</button>
                <button className={`type-btn ${itemType === 'note' ? 'active' : ''}`} onClick={() => setItemType('note')}>Text Note</button>
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {!editingItem && itemType === 'video' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Video URL</label>
                    <input className="form-input" type="url" required value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input className="form-input" type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input className="form-input" type="text" list="cat-list" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                    <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">🏷️ Tag (Short Label)</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Type or Select Tag..."
                  list="tag-suggestions" // LINKED TO DATALIST
                  value={formData.userTag}
                  onChange={e => setFormData({ ...formData, userTag: e.target.value })}
                  autoFocus
                />
                {/* NEW TAG SUGGESTIONS DROPDOWN */}
                <datalist id="tag-suggestions">
                  {userTags.map(tag => <option key={tag} value={tag} />)}
                </datalist>
              </div>

              <div className="form-group">
                <label className="form-label">📝 Description</label>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="What is this video about?"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={uploading}>
                  {uploading ? 'Saving...' : (editingItem ? 'Update' : 'Save Item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
