import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import { analyzeUrl, getPredefinedCategories, getCategoryEmoji } from './urlAnalyzer'
import { storeToken, removeToken } from './indexedDBHelper'
import SuccessToast from './components/SuccessToast'
import StatsCalendar from './components/StatsCalendar' // New Import
import { enrichMetadata } from './metadataFetcher'
import { analyzeContentWithMetadata } from './categoryHelper'
import './App.css'

function App() {
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('video_vault_token'))
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showStats, setShowStats] = useState(false) // New Stats Modal State
  const [editingItem, setEditingItem] = useState(null)
  const [activeCategory, setActiveCategory] = useState('All')
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
    notes: '',
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

  // Handle Share Target API
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
          notes: ''
        })
        setItemType('video')
        setIsModalOpen(true)
      }
      window.history.replaceState({}, '', '/')
    }
  }, [sessionToken, autoSaveMode])

  // Persist token
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

  // Auto-focus input
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

  const categories = ['All', ...new Set(items.map(i => i.category).filter(Boolean))]

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

      const newItem = {
        user_token: sessionToken,
        type: 'video',
        url: url,
        title: finalTitle,
        category: contentAnalysis?.fullCategory || analysis.suggestedCategory || 'Videos',
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
      setToastEmoji(contentAnalysis?.emoji || analysis.emoji || '✅')
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
      notes: item.notes || '',
      channelName: item.channel_name || ''
    })

    if (item.metadata) {
      setEnrichedMetadata(item.metadata)
    } else {
      setEnrichedMetadata({
        title: item.title,
        thumbnail: item.thumbnail_url || item.image_url,
        channelName: item.channel_name,
        creatorProfile: item.creator_profile,
        description: item.content_description
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (itemType === 'video' && !formData.url) return
    if (itemType === 'note' && !formData.notes) return

    try {
      setUploading(true)
      let imageUrl = null

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('screenshots').upload(fileName, selectedFile)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('screenshots').getPublicUrl(fileName)
        imageUrl = publicUrl
      }

      let finalTitle = formData.title
      if (!finalTitle || finalTitle.trim() === '') {
        if (itemType === 'video') {
          const videoId = extractVideoId(formData.url)
          finalTitle = videoId ? `Video ${videoId.substring(0, 8)}` : 'Untitled Video'
        } else {
          finalTitle = `Note ${new Date().toLocaleDateString()}`
        }
      }

      if (editingItem) {
        // UPDATE ITEM
        const updates = {
          type: itemType,
          url: formData.url,
          category: formData.category,
          notes: formData.notes,
          title: finalTitle,
          channel_name: formData.channelName,
          image_url: imageUrl || editingItem.image_url || enrichedMetadata?.thumbnail || null,
          thumbnail_url: enrichedMetadata?.thumbnail || editingItem.thumbnail_url || null,
          creator_profile: enrichedMetadata?.creatorProfile || editingItem.creator_profile || null,
          content_description: enrichedMetadata?.description || editingItem.content_description || null,
          metadata: enrichedMetadata || editingItem.metadata || null
        }

        const { data, error } = await supabase.from('items').update(updates).eq('id', editingItem.id).select()
        if (error) throw error
        if (!data || data.length === 0) throw new Error("Update failed!")

        const updatedItem = data[0]
        setItems(items.map(i => i.id === editingItem.id ? updatedItem : i))
        setToastEmoji('✏️')
        setToastMessage('Item updated!')
        setShowToast(true)

      } else {
        // CREATE ITEM
        const newItem = {
          user_token: sessionToken,
          type: itemType,
          url: formData.url,
          category: formData.category,
          notes: formData.notes,
          title: finalTitle,
          image_url: imageUrl || enrichedMetadata?.thumbnail || null,
          channel_name: formData.channelName || enrichedMetadata?.channelName || null,
          creator_profile: enrichedMetadata?.creatorProfile || null,
          content_description: enrichedMetadata?.description || null,
          thumbnail_url: enrichedMetadata?.thumbnail || null,
          metadata: enrichedMetadata || null,
          created_at: new Date().toISOString()
        }

        const { data, error } = await supabase.from('items').insert([newItem]).select()
        if (error) throw error
        setItems([data[0], ...items])
      }

      setFormData({ url: '', title: '', category: '', notes: '', channelName: '' })
      setSelectedFile(null)
      setUrlAnalysis(null)
      setEnrichedMetadata(null)
      setEditingItem(null)
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

  const filteredItems = activeCategory === 'All' ? items : items.filter(i => i.category === activeCategory)

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
        <button
          className="add-btn"
          onClick={toggleAutoSave}
          style={{
            background: autoSaveMode ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
            minWidth: '140px'
          }}
          title={autoSaveMode ? 'Auto-save ON' : 'Manual mode ON'}
        >
          {autoSaveMode ? '⚡ Auto-Save' : '📝 Manual'}
        </button>
        <button className="add-btn" onClick={() => {
          setEditingItem(null)
          setFormData({ url: '', title: '', category: '', notes: '', channelName: '' })
          setIsModalOpen(true)
        }}>
          + Add Item
        </button>

        {/* STATS BUTTON */}
        <button className="icon-btn" onClick={() => setShowStats(true)} title="Calendar Stats" style={{ marginLeft: '0.5rem' }}>
          📅
        </button>

        <button className="signout-btn" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>

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
              <div className="video-thumbnail">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} style={{ objectFit: 'cover' }} />
                ) : item.type === 'video' && getThumbnail(item.url) ? (
                  <img src={getThumbnail(item.url)} alt={item.title} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, var(--accent-primary), var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '3rem' }}>
                    {item.type === 'video' ? '▶' : '📝'}
                  </div>
                )}
                <div className="thumbnail-badges">
                  <div className="badge-group-left">
                    <span className="video-category-badge">{item.category || 'Uncategorized'}</span>
                  </div>
                </div>
                {item.type === 'video' && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="play-overlay">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" /></svg>
                  </a>
                )}
              </div>

              <div className="video-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                    📅 {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>

                <h3 className="video-title">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                    {item.title || (item.type === 'video' ? 'Untitled Video' : 'Untitled Note')}
                  </a>
                </h3>

                {item.channel_name && (
                  <div className="creator-info" style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {item.creator_profile ? (
                      <a href={item.creator_profile} target="_blank" rel="noopener noreferrer" className="channel-link" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'inherit', textDecoration: 'none' }}>
                        <span style={{ opacity: 0.8 }}>By:</span> <strong>{item.channel_name}</strong>
                      </a>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ opacity: 0.8 }}>By:</span> <strong>{item.channel_name}</strong>
                      </span>
                    )}
                  </div>
                )}

                {item.notes ? (
                  <p className="video-notes">{item.notes}</p>
                ) : (
                  <button
                    onClick={() => handleEdit(item)}
                    style={{ background: 'none', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem', width: '100%', textAlign: 'left', marginBottom: '1rem', cursor: 'pointer', opacity: 0.7 }}
                    onMouseEnter={e => e.target.style.opacity = '1'}
                    onMouseLeave={e => e.target.style.opacity = '0.7'}
                  >
                    + Add description / notes...
                  </button>
                )}
                <div className="video-actions">
                  <button className="icon-btn edit" onClick={() => handleEdit(item)} title="Edit" style={{ marginRight: '0.25rem' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button className="icon-btn delete" onClick={() => deleteItem(item.id)} title="Delete">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STATS MODAL */}
      {showStats && <StatsCalendar items={items} onClose={() => setShowStats(false)} />}

      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="modal-content">
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
            <div className="type-selector">
              <button className={`type-btn ${itemType === 'video' ? 'active' : ''}`} onClick={() => setItemType('video')}>Video Link</button>
              <button className={`type-btn ${itemType === 'note' ? 'active' : ''}`} onClick={() => setItemType('note')}>Text Note</button>
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
                      onChange={async e => {
                        const newUrl = e.target.value
                        setFormData({ ...formData, url: newUrl })
                        if (newUrl) {
                          const analysis = analyzeUrl(newUrl)
                          setUrlAnalysis(analysis)
                          setFetchingMetadata(true)
                          try {
                            const metadata = await enrichMetadata(newUrl)
                            setEnrichedMetadata(metadata)
                            const contentAnalysis = analyzeContentWithMetadata(newUrl, metadata, analysis)
                            if (!formData.category || urlAnalysis?.suggestedCategory === formData.category) {
                              setFormData(prev => ({
                                ...prev,
                                url: newUrl,
                                category: contentAnalysis.fullCategory || analysis.suggestedCategory || ''
                              }))
                            }
                            if (!formData.title && metadata.title) setFormData(prev => ({ ...prev, title: metadata.title }))
                            if (!formData.channelName && metadata.channelName) setFormData(prev => ({ ...prev, channelName: metadata.channelName }))
                          } catch (err) { console.error(err) } finally { setFetchingMetadata(false) }
                        } else {
                          setUrlAnalysis(null)
                          setEnrichedMetadata(null)
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="add-btn" onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText()
                        if (text) {
                          setFormData({ ...formData, url: text })
                          const analysis = analyzeUrl(text)
                          setUrlAnalysis(analysis)
                          setFetchingMetadata(true)
                          try {
                            const metadata = await enrichMetadata(text)
                            setEnrichedMetadata(metadata)
                            const contentAnalysis = analyzeContentWithMetadata(text, metadata, analysis)
                            setFormData({
                              ...formData,
                              url: text,
                              category: contentAnalysis.fullCategory || analysis.suggestedCategory || '',
                              title: metadata.title || '',
                              channelName: metadata.channelName || ''
                            })
                          } catch (err) { console.error(err) } finally { setFetchingMetadata(false) }
                        }
                      } catch (err) { console.error(err) }
                    }} title="Paste from Clipboard">📋</button>
                  </div>
                  {fetchingMetadata && <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--accent-primary)' }}>Analyzing content...</div>}
                </div>
              )}
              {itemType === 'video' && (
                <div className="form-group">
                  <label className="form-label">Channel Name (Optional)</label>
                  <input className="form-input" type="text" placeholder="e.g. T-Series" value={formData.channelName} onChange={e => setFormData({ ...formData, channelName: e.target.value })} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Title (Optional)</label>
                <input className="form-input" type="text" placeholder="Summarize this video..." value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input className="form-input" type="text" list="category-suggestions" placeholder="e.g. Music, Cooking..." value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                <datalist id="category-suggestions">{categories.filter(c => c !== 'All').map(cat => <option key={cat} value={cat} />)}</datalist>
              </div>
              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <textarea className="form-input" rows="3" placeholder="Why is this interesting?" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={uploading}>
                  {uploading ? 'Saving...' : (editingItem ? 'Update Item' : 'Save Item')}
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
