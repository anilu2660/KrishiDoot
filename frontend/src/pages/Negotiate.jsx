import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { INPUT_CLS, SELECT_CLS, ErrorAlert, SpinnerIcon } from '../components/ui.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const CROPS = [
  { value: 'tomato',    label: 'Tomato',    perishable: true  },
  { value: 'onion',     label: 'Onion',     perishable: true  },
  { value: 'potato',    label: 'Potato',    perishable: false },
  { value: 'wheat',     label: 'Wheat',     perishable: false },
  { value: 'rice',      label: 'Rice',      perishable: false },
  { value: 'maize',     label: 'Maize',     perishable: false },
  { value: 'soybean',   label: 'Soybean',   perishable: false },
  { value: 'cotton',    label: 'Cotton',    perishable: false },
  { value: 'sugarcane', label: 'Sugarcane', perishable: false },
]

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  )
}

const STRATEGIES = {
  conceder: {
    label: 'Conceder',
    desc: 'Makes early concessions to close the deal fast. Best for perishable crops at risk of spoilage.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  boulware: {
    label: 'Boulware',
    desc: 'Holds firm at asking price for most of the negotiation. Best for non-perishables with long shelf life.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
}

export default function Negotiate() {
  const [step, setStep]                   = useState('setup')
  const [form, setForm]                   = useState({ crop_type: 'tomato', quantity_kg: 100, mandi_location: 'Bengaluru, Karnataka' })
  const [strategy, setStrategy]           = useState('conceder')
  const [strategyLocked, setStrategyLocked] = useState(false)
  const [session, setSession]             = useState(null)
  const [messages, setMessages]           = useState([])
  const [counterOffer, setCounterOffer]   = useState('')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState(null)
  const chatRef                           = useRef(null)

  // Auto-detect strategy from crop perishability
  useEffect(() => {
    if (strategyLocked) return
    const crop = CROPS.find(c => c.value === form.crop_type)
    setStrategy(crop?.perishable ? 'conceder' : 'boulware')
  }, [form.crop_type, strategyLocked])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  const startNegotiation = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post(`${API}/negotiate/start`, {
        ...form,
        farmer_id: 'demo-farmer-' + Date.now(),
      })
      setSession(res.data)
      setMessages([{
        role: 'agent',
        text: `Opening ask for ${form.crop_type} (${form.quantity_kg} kg): ₹${res.data.initial_ask}/kg\nFloor price (BATNA): ₹${res.data.batna_price}/kg — I will not go below this.\nStrategy: ${STRATEGIES[strategy].label}`,
        price: res.data.initial_ask,
      }])
      setStep('negotiating')
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  const sendOffer = async () => {
    const offer = parseFloat(counterOffer)
    if (isNaN(offer) || offer <= 0) return
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post(`${API}/negotiate/respond`, {
        session_id: session.session_id,
        buyer_counter_offer: offer,
      })
      setMessages(prev => [
        ...prev,
        { role: 'buyer', text: `Counter offer: ₹${offer}/kg`, price: offer },
        { role: 'agent', text: res.data.agent_dialogue, price: res.data.new_ask },
      ])
      setCounterOffer('')
      if (res.data.status !== 'ongoing') setStep('done')
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'setup') {
    return (
      <div className="pt-6 space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-white">AI Negotiation</h1>
          <p className="text-sm text-gray-400 mt-0.5">Set parameters — the AI negotiates using live APMC prices and game theory.</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Crop</label>
            <select className={SELECT_CLS} value={form.crop_type} onChange={e => { setForm({ ...form, crop_type: e.target.value }); setStrategyLocked(false) }}>
              {CROPS.map(c => (
                <option key={c.value} value={c.value} className="bg-gray-800">{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Quantity (kg)</label>
            <input type="number" className={INPUT_CLS} value={form.quantity_kg}
              onChange={e => setForm({ ...form, quantity_kg: parseFloat(e.target.value) })} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Mandi location</label>
            <input type="text" className={INPUT_CLS} placeholder="e.g. Bengaluru, Karnataka"
              value={form.mandi_location} onChange={e => setForm({ ...form, mandi_location: e.target.value })} />
          </div>

          {/* Strategy selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-400">Negotiation Strategy</label>
              {strategyLocked && (
                <button onClick={() => setStrategyLocked(false)} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                  Reset to auto
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(STRATEGIES).map(([key, s]) => (
                <button
                  key={key}
                  onClick={() => { setStrategy(key); setStrategyLocked(true) }}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    strategy === key
                      ? `${s.bg} border-opacity-100`
                      : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${strategy === key ? s.color : 'text-gray-300'}`}>{s.label}</span>
                    {strategy === key && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${s.badge}`}>
                        {strategyLocked ? 'manual' : 'auto'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <ErrorAlert error={error} />

          <button
            onClick={startNegotiation}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 active:scale-95 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? <><SpinnerIcon /> Fetching market prices...</> : 'Start Negotiation'}
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-300 mb-3">How it works</p>
          <ol className="space-y-2">
            {[
              "AI fetches today's APMC modal price for your crop & location",
              'Computes your BATNA — the minimum you should accept',
              'Opens negotiation with a strategic ask price',
              'Adapts Conceder (perishable) or Boulware (non-perishable) strategy',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-xs text-gray-500 leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    )
  }

  const strat = STRATEGIES[strategy]

  return (
    <div className="pt-4 flex flex-col" style={{ height: 'calc(100vh - 130px)' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-white">Live Negotiation</h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${strat.badge}`}>
              {strat.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 capitalize">{form.crop_type} · {form.quantity_kg} kg · {form.mandi_location}</p>
        </div>
        {session && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Floor (BATNA)</p>
            <p className="text-sm font-semibold text-green-400">₹{session.batna_price}/kg</p>
          </div>
        )}
      </div>

      <div ref={chatRef} className="flex-1 overflow-y-auto space-y-3 bg-gray-900 border border-gray-800 rounded-xl p-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'agent' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 ${
              m.role === 'agent'
                ? 'bg-gray-800 border border-gray-700 text-gray-200'
                : 'bg-green-600 text-white'
            }`}>
              <p className={`text-xs font-semibold mb-1 ${m.role === 'agent' ? 'text-green-400' : 'text-green-200'}`}>
                {m.role === 'agent' ? 'KrishiDoot AI' : 'Buyer'}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-line">{m.text}</p>
              <p className={`text-xs mt-1.5 font-medium ${m.role === 'agent' ? 'text-gray-500' : 'text-green-200'}`}>
                ₹{m.price}/kg
              </p>
            </div>
          </div>
        ))}
        {step === 'done' && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-center">
            <p className="text-sm font-semibold text-green-400">Negotiation complete</p>
            <p className="text-xs text-gray-500 mt-0.5">Review the final agreed price above.</p>
          </div>
        )}
      </div>

      {step === 'negotiating' && (
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            className={INPUT_CLS}
            placeholder="Enter buyer's offer (₹/kg)"
            value={counterOffer}
            onChange={e => setCounterOffer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendOffer()}
          />
          <button
            onClick={sendOffer}
            disabled={loading || !counterOffer}
            className="bg-green-600 hover:bg-green-500 text-white px-4 rounded-lg font-medium disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            {loading ? <SpinnerIcon /> : <SendIcon />}
            <span className="text-sm">Send</span>
          </button>
        </div>
      )}

      <ErrorAlert error={error} />
    </div>
  )
}
