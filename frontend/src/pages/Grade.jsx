import { useState } from 'react'
import axios from 'axios'
import { INPUT_CLS, SELECT_CLS, ErrorAlert, SpinnerIcon } from '../components/ui.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const CROPS = ['tomato', 'wheat', 'onion', 'potato', 'rice', 'maize', 'soybean', 'cotton']

const GRADE_STYLE = {
  A: { label: 'Premium',        text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30', glow: 'shadow-green-500/10' },
  B: { label: 'Standard',       text: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30', glow: 'shadow-amber-500/10' },
  C: { label: 'Below Standard', text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',   glow: 'shadow-red-500/10'   },
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-gray-600">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}

export default function Grade() {
  const [imageB64, setImageB64]         = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [cropType, setCropType]         = useState('tomato')
  const [result, setResult]             = useState(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)
      setImageB64(reader.result.split(',')[1])
      setResult(null)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleGrade = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post(`${API}/grade/crop`, { image_b64: imageB64, crop_type: cropType })
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  const gradeStyle = result ? GRADE_STYLE[result.grade] : null

  return (
    <div className="pt-6 space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-white">Crop Grading</h1>
        <p className="text-sm text-gray-400 mt-0.5">AI applies Agmark standards and estimates your price band.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Crop type</label>
          <select className={SELECT_CLS} value={cropType} onChange={e => { setCropType(e.target.value); setResult(null) }}>
            {CROPS.map(c => (
              <option key={c} value={c} className="bg-gray-800">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Crop photo</label>
          <label className="block cursor-pointer">
            <div className={`rounded-xl border-2 border-dashed transition-all ${
              imagePreview
                ? 'border-green-500/40 bg-green-500/5'
                : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
            } flex items-center justify-center overflow-hidden`} style={{ minHeight: '160px' }}>
              {imagePreview
                ? <img src={imagePreview} alt="crop preview" className="max-h-48 w-full object-contain p-2" />
                : (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <UploadIcon />
                    <p className="text-sm text-gray-500">Tap to take photo or upload</p>
                    <p className="text-xs text-gray-600">Opens rear camera on mobile</p>
                  </div>
                )
              }
            </div>
            <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
          </label>
        </div>

        <ErrorAlert error={error} />

        <button
          onClick={handleGrade}
          disabled={!imageB64 || loading}
          className="w-full bg-green-600 hover:bg-green-500 active:scale-95 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {loading ? <><SpinnerIcon /> Analysing with Gemini Vision...</> : 'Analyse Crop'}
        </button>
      </div>

      {result && gradeStyle && (
        <div className={`bg-gray-900 border rounded-xl p-4 space-y-4 shadow-lg ${gradeStyle.border} ${gradeStyle.glow}`}>
          <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${gradeStyle.bg} ${gradeStyle.border}`}>
            <div>
              <p className="text-xs font-medium text-gray-500">Agmark Grade</p>
              <p className={`text-2xl font-bold mt-0.5 ${gradeStyle.text}`}>
                Grade {result.grade}
                <span className="text-sm font-normal text-gray-400 ml-2">{gradeStyle.label}</span>
              </p>
            </div>
            <div className={`text-5xl font-black ${gradeStyle.text} opacity-15`}>{result.grade}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
              <p className="text-xs text-gray-500 font-medium">Estimated Price</p>
              <p className="text-sm font-semibold text-white mt-1">{result.estimated_price_band}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
              <p className="text-xs text-gray-500 font-medium">AI Confidence</p>
              <p className="text-sm font-semibold text-white mt-1">{(result.confidence * 100).toFixed(0)}%</p>
            </div>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">{result.agmark_standard}</p>

          {result.defects.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-300 mb-2">Defects detected</p>
              <ul className="space-y-1.5">
                {result.defects.map((d, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* DPDP notice */}
      <p className="text-xs text-gray-600 text-center leading-relaxed pb-2">
        Photos processed by Gemini Vision. Not stored. DPDP Act 2023 compliant.
      </p>
    </div>
  )
}
