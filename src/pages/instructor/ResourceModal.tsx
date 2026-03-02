import { useRef, useState } from 'react'
import { supabase } from '../../supabase'
import { toYouTubeEmbed } from '../../lib/utils'
import type { Resource } from '../../types'

type ResourceTab = 'link' | 'embed' | 'file'

export function ResourceModal({
  sessionId,
  tasks,
  onAdd,
  onClose,
}: {
  sessionId: string
  tasks: { id: string; title: string }[]
  onAdd: (resource: Omit<Resource, 'id' | 'created_at' | 'resource_order'>) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<ResourceTab>('link')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [taskId, setTaskId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', background: '#13131f',
    border: '1px solid #2d2d50', borderRadius: 10, color: '#e2e8f0',
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }

  const handleAddLink = () => {
    if (!title.trim() || !url.trim()) { setError('Title and URL are required.'); return }
    onAdd({
      session_id: sessionId, task_id: taskId, module_id: null,
      title, resource_type: 'link', url, file_path: null, description: description || null,
    })
    onClose()
  }

  const handleAddEmbed = () => {
    if (!title.trim() || !url.trim()) { setError('Title and URL are required.'); return }
    const embedUrl = toYouTubeEmbed(url) ?? url
    onAdd({
      session_id: sessionId, task_id: taskId, module_id: null,
      title, resource_type: 'embed', url: embedUrl, file_path: null, description: description || null,
    })
    onClose()
  }

  const handleFileUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file || !title.trim()) { setError('Title and file are required.'); return }
    setUploading(true); setError('')
    const path = `${sessionId}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('resources').upload(path, file, { upsert: true })
    if (upErr) {
      setError('Upload failed: ' + upErr.message + '. Ensure the "resources" storage bucket exists in Supabase.')
      setUploading(false); return
    }
    const { data: { publicUrl } } = supabase.storage.from('resources').getPublicUrl(path)
    onAdd({
      session_id: sessionId, task_id: taskId, module_id: null,
      title, resource_type: 'file', url: null, file_path: publicUrl, description: description || null,
    })
    setUploading(false)
    onClose()
  }

  const handleSubmit = () => {
    setError('')
    if (tab === 'link') handleAddLink()
    else if (tab === 'embed') handleAddEmbed()
    else handleFileUpload()
  }

  const TABS: { key: ResourceTab; label: string; icon: string }[] = [
    { key: 'link', label: 'Link', icon: '🔗' },
    { key: 'embed', label: 'Embed', icon: '🎬' },
    { key: 'file', label: 'File', icon: '📄' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#00000099', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: '#1e1e35', border: '1px solid #2d2d50', borderRadius: 20,
        padding: 28, width: '100%', maxWidth: 460,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 18, fontWeight: 700 }}>📚 Add Resource</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#13131f', borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setError('') }}
              style={{
                flex: 1, padding: '8px', border: 'none', borderRadius: 8, cursor: 'pointer',
                background: tab === t.key ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'transparent',
                color: tab === t.key ? '#fff' : '#64748b', fontWeight: 700, fontSize: 13,
              }}
            >{t.icon} {t.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>TITLE *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Setup Guide" style={inputStyle} />
          </div>

          {(tab === 'link' || tab === 'embed') && (
            <div>
              <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                {tab === 'embed' ? 'VIDEO URL (YouTube supported)' : 'URL'} *
              </label>
              <input
                type="url" value={url} onChange={e => setUrl(e.target.value)}
                placeholder={tab === 'embed' ? 'https://youtube.com/watch?v=...' : 'https://example.com'}
                style={inputStyle}
              />
            </div>
          )}

          {tab === 'file' && (
            <div>
              <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>FILE *</label>
              <input ref={fileRef} type="file" style={{ ...inputStyle, padding: '10px 14px', color: '#94a3b8' }} />
            </div>
          )}

          <div>
            <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>DESCRIPTION (OPTIONAL)</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief note for students" style={inputStyle} />
          </div>

          <div>
            <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>ATTACH TO TASK (OPTIONAL)</label>
            <select
              value={taskId ?? ''}
              onChange={e => setTaskId(e.target.value || null)}
              style={{ ...inputStyle, color: taskId ? '#e2e8f0' : '#4b5563' }}
            >
              <option value="">Session-wide (all tasks)</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>

          {error && (
            <div style={{ background: '#ef444422', borderRadius: 8, padding: '8px 12px', color: '#fca5a5', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              onClick={handleSubmit}
              disabled={uploading}
              style={{
                flex: 1, padding: '12px', borderRadius: 12, border: 'none',
                background: uploading ? '#374151' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                color: '#fff', fontWeight: 700, fontSize: 15, cursor: uploading ? 'not-allowed' : 'pointer',
              }}
            >{uploading ? '⏳ Uploading…' : '+ Add Resource'}</button>
            <button
              onClick={onClose}
              style={{ padding: '12px 20px', background: '#374151', border: 'none', borderRadius: 12, color: '#94a3b8', cursor: 'pointer' }}
            >Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}
