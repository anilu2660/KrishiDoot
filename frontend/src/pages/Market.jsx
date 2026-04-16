import { useState } from 'react'
import axios from 'axios'
import { INPUT_CLS, SELECT_CLS, InfoIcon, ErrorAlert, SpinnerIcon } from '../components/ui.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const CROPS = ['tomato', 'wheat', 'onion', 'potato', 'rice', 'maize', 'soybean', 'cotton', 'sugarcane', 'bajra', 'jowar', 'mustard']

const STATES = [
  'Andhra Pradesh', 'Bihar', 'Chhattisgarh', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu',
  'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

export default function Market() {
  const [crop, setCrop]           = useState('tomato')
  const [state, setState]         = useState('Karnataka')
  const [transportCost, setTransportCost] = useState('2.00')
  const [result, setResult]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const fetchPrice = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await axios.get(`${API}/market/price`, {
        params: { crop: crop.toLowerCase(), state: state.toLowerCase().replace(/ /g, '_') },
      })
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  const transport = parseFloat(transportCost) || 0
  const batna = result ? Math.max(0, result.modal_price_per_kg - transport).toFixed(2) : null

  return (
    <div className="pt-6 space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-white">Mandi Prices</h1>
        <p className="text-sm text-gray-400 mt-0.5">Live APMC modal prices — updated daily from data.gov.in.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Crop</label>
            <select className={SELECT_CLS} value={crop} onChange={e => { setCrop(e.target.value); setResult(null) }}>
              {CROPS.map(c => (
                <option key={c} value={c} className="bg-gray-800">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">State</label>
            <select className={SELECT_CLS} value={state} onChange={e => { setState(e.target.value); setResult(null) }}>
              {STATES.map(s => (
                <option key={s} value={s} className="bg-gray-800">{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Transportation cost — BATNA formula input */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Transportation cost (₹/kg)
            <span className="ml-1 text-gray-600 font-normal">— used to compute your BATNA</span>
          </label>
          <input
            type="number"
            step="0.50"
            min="0"
            className={INPUT_CLS}
            value={transportCost}
            onChange={e => { setTransportCost(e.target.value); setResult(null) }}
            placeholder="e.g. 2.00"
          />
        </div>

        <ErrorAlert error={error} />

        <button
          onClick={fetchPrice}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-500 active:scale-95 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {loading ? <><SpinnerIcon /> Fetching APMC data...</> : 'Check Price'}
        </button>
      </div>

      {result && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">APMC Result</p>
              <p className="text-sm font-semibold text-white mt-0.5 capitalize">
                {result.crop} · {state}
              </p>
            </div>
            <span className="flex items-center gap-1.5 text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full font-medium">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Live
            </span>
          </div>

          <div className="grid grid-cols-2 divide-x divide-gray-800">
            <div className="p-5 text-center">
              <p className="text-xs text-gray-500 font-medium">Modal Price</p>
              <p className="text-3xl font-bold text-white mt-1.5 tracking-tight">
                ₹{result.modal_price_per_kg}
              </p>
              <p className="text-xs text-gray-600 mt-1">per kg</p>
            </div>
            <div className="p-5 text-center">
              <p className="text-xs text-gray-500 font-medium">Your Floor (BATNA)</p>
              <p className="text-3xl font-bold text-green-400 mt-1.5 tracking-tight">
                ₹{batna}
              </p>
              <p className="text-xs text-gray-600 mt-1">per kg</p>
            </div>
          </div>

          {/* BATNA formula breakdown */}
          <div className="px-4 pb-4">
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 mb-3">
              <p className="text-xs text-gray-500 font-medium mb-2">BATNA Formula</p>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-white">₹{result.modal_price_per_kg}</span>
                <span className="text-gray-600">modal price</span>
                <span className="text-gray-500 mx-1">−</span>
                <span className="text-white">₹{transport.toFixed(2)}</span>
                <span className="text-gray-600">transport</span>
                <span className="text-gray-500 mx-1">=</span>
                <span className="text-green-400 font-bold">₹{batna}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-green-500/5 border border-green-500/15 rounded-xl p-3">
              <InfoIcon />
              <p className="text-xs text-gray-400 leading-relaxed">
                Your BATNA is the absolute minimum. The modal price is today's most common trade price.{' '}
                <span className="font-semibold text-green-400">Do not accept below ₹{batna}/kg.</span>
              </p>
            </div>
          </div>

          <div className="px-4 pb-3">
            <p className="text-xs text-gray-700 text-center">Source: data.gov.in APMC API · Updates daily</p>
          </div>
        </div>
      )}

      {!result && !loading && !error && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="w-10 h-10 text-gray-700 mx-auto mb-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <p className="text-sm text-gray-500">Select crop and state, enter your transport cost, then tap Check Price.</p>
        </div>
      )}
    </div>
  )
}
