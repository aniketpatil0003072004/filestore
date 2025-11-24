import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import './App.css'

function App() {
  // We use a simple token string for the session now
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('video_vault_token'))
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')
  const [uploading, setUploading] = useState(false)

  // Form State
  const [itemType, setItemType] = useState('video')
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    category: '',
    notes: ''
  })
  const [selectedFile, setSelectedFile] = useState(null)

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

  const getThumbnail = (url) => {
    try {
      if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
        const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop()
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
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

      const newItem = {
        user_token: sessionToken, // Link to our token
        type: itemType,
        ...formData,
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
                  <input
                    className="form-input"
                    type="url"
                    required={itemType === 'video'}
                    placeholder="https://youtube.com/..."
                    value={formData.url}
                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                  />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  className="form-input"
                  type="text"
                  required
                  placeholder={itemType === 'video' ? "My Germany Trip" : "Trip Itinerary"}
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Travel, Music, Coding..."
                  list="category-suggestions"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                />
                <datalist id="category-suggestions">
                  {categories.filter(c => c !== 'All').map(c => <option key={c} value={c} />)}
                </datalist>
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
    </div>
  )
}

export default App
