import { Link } from 'react-router-dom'

const FEATURES = [
  {
    to: '/grade',
    title: 'Grade My Crop',
    description: 'AI-powered Agmark grading from a photo',
    badge: 'Gemini Vision',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-green-700">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
      </svg>
    ),
  },
  {
    to: '/market',
    title: 'Today\'s Mandi Prices',
    description: 'Live APMC modal prices by crop & state',
    badge: 'data.gov.in',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-green-700">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    to: '/negotiate',
    title: 'Negotiate Price',
    description: 'AI agent negotiates on your behalf using real data',
    badge: 'LangGraph',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-green-700">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.97zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.97z" />
      </svg>
    ),
  },
]

export default function Home() {
  return (
    <div className="pt-6 space-y-5">
      {/* Hero */}
      <div>
        <p className="text-xs font-medium text-green-700 uppercase tracking-widest mb-1">AI Negotiation Platform</p>
        <h1 className="text-2xl font-semibold text-gray-900 leading-snug">
          Get a fair price<br />at the mandi.
        </h1>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          KrishiDoot uses real APMC market data and AI to negotiate on your behalf — so buyers can't lowball you.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="space-y-2.5">
        {FEATURES.map(({ to, title, description, badge, icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl px-4 py-4 shadow-sm hover:border-green-200 hover:shadow-md active:scale-[0.99] transition-all duration-150 group"
          >
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-green-100 transition-colors">
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">{badge}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-gray-300 flex-shrink-0 group-hover:text-green-600 transition-colors">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        ))}
      </div>

      {/* DPDP Notice */}
      <div className="border border-gray-100 rounded-xl p-4 bg-white">
        <p className="text-xs font-semibold text-gray-700 mb-1">Data & Privacy — DPDP Act 2023</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          Your crop images and negotiation data are processed solely to improve your price outcomes.
          Data is <span className="font-medium text-gray-600">never shared with buyers</span>.
          By using this app you consent to this processing.
        </p>
      </div>

      {/* Stack Attribution */}
      <p className="text-center text-xs text-gray-300 pb-2">
        Gemini Vision · LangGraph · APMC data.gov.in
      </p>
    </div>
  )
}
