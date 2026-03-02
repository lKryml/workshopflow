import { useRef, useState } from 'react'
import { supabase } from '../../supabase'
import { toYouTubeEmbed } from '../../lib/utils'
import type { Resource } from '../../types'

type ResourceTab = 'link' | 'embed' | 'file'

const inputCls = 'w-full bg-neutral-900 border border-neutral-800 rounded-md px-4 py-3 text-neutral-200 placeholder-neutral-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none text-sm transition-all hover:border-neutral-700'
const labelCls = 'block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider'

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
    { key: 'link', label: 'رابط', icon: '🔗' },
    { key: 'embed', label: 'فيديو', icon: '🎬' },
    { key: 'file', label: 'ملف', icon: '📄' },
  ]

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0a0a0a] border border-neutral-800 rounded-xl p-8 relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Orange accent line */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-white">📚 إضافة مرجع</h3>
            <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest mt-0.5">Add Resource</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-neutral-600 hover:text-neutral-400 hover:bg-neutral-800 transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {/* Tabs — underline style */}
        <div className="flex border-b border-neutral-900 mb-6">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setError('') }}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                tab === t.key
                  ? 'text-orange-400 border-b-2 border-orange-500 -mb-px'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className={labelCls}>العنوان <span className="text-orange-500">*</span></label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="مثال: دليل الإعداد"
              className={inputCls}
            />
          </div>

          {/* URL (link or embed) */}
          {(tab === 'link' || tab === 'embed') && (
            <div>
              <label className={labelCls}>
                {tab === 'embed' ? 'رابط الفيديو (YouTube)' : 'الرابط'} <span className="text-orange-500">*</span>
              </label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder={tab === 'embed' ? 'https://youtube.com/watch?v=...' : 'https://example.com'}
                className={inputCls}
              />
            </div>
          )}

          {/* File upload */}
          {tab === 'file' && (
            <div>
              <label className={labelCls}>الملف <span className="text-orange-500">*</span></label>
              <input
                ref={fileRef}
                type="file"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-4 py-2.5 text-neutral-400 text-sm outline-none file:bg-neutral-800 file:border-0 file:text-neutral-300 file:text-xs file:font-bold file:py-1 file:px-2 file:rounded file:mr-3 file:cursor-pointer hover:border-neutral-700 transition-all"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className={labelCls}>الوصف <span className="text-neutral-600 font-normal normal-case">(اختياري)</span></label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="ملاحظة مختصرة للطلاب"
              className={inputCls}
            />
          </div>

          {/* Attach to task */}
          <div>
            <label className={labelCls}>ربط بمهمة <span className="text-neutral-600 font-normal normal-case">(اختياري)</span></label>
            <select
              value={taskId ?? ''}
              onChange={e => setTaskId(e.target.value || null)}
              className={`${inputCls} ${!taskId ? 'text-neutral-600' : 'text-neutral-200'}`}
            >
              <option value="">لجميع مهام الجلسة</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-800/40 rounded-md px-3 py-2 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-sm text-sm transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              {uploading ? '⏳ جارٍ الرفع...' : '+ إضافة المرجع'}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-300 rounded-sm text-sm transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
