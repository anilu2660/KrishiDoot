import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import { LeafIcon } from '../components/ui.jsx'

gsap.registerPlugin(ScrollTrigger)

const STATS = [
  { value: 19,  suffix: '',   label: 'States covered'           },
  { value: 94,  suffix: '%',  label: 'Negotiation success rate' },
  { value: 50,  suffix: '+',  label: 'Crops supported'          },
  { value: 2,   suffix: 'x',  label: 'Average price uplift'     },
]

const PAIN_POINTS = [
  { title: 'No price transparency',  desc: 'Buyers quote arbitrary prices. Farmers have no real-time reference point.' },
  { title: 'Information asymmetry',  desc: 'Buyers access APMC data in real time. Most farmers never see these numbers.' },
  { title: 'Perishability pressure', desc: 'Spoilage risk forces farmers to accept whatever is offered, however low.' },
  { title: 'No negotiation support', desc: 'Farmers negotiate alone against experienced traders every single day.' },
]

const STEPS = [
  {
    number: '01',
    title:  'Grade your crop',
    desc:   'Take a single photo. Gemini 1.5 Pro applies Agmark grading standards and estimates your price band in under 10 seconds.',
    badge:  'Gemini Vision',
    to:     '/grade',
    cta:    'Try grading',
  },
  {
    number: '02',
    title:  'Know your floor price',
    desc:   "We fetch today's official APMC modal price and compute your BATNA — factoring in your actual transport cost.",
    badge:  'data.gov.in',
    to:     '/market',
    cta:    'Check prices',
  },
  {
    number: '03',
    title:  'Let the AI negotiate',
    desc:   'Our LangGraph agent opens negotiation, adapts strategy based on crop perishability (Conceder vs Boulware), and closes at the best possible price.',
    badge:  'LangGraph',
    to:     '/negotiate',
    cta:    'Start negotiation',
  },
]

const FEATURES = [
  {
    title: 'Agmark AI Grading',
    desc:  'Gemini Vision analyses your crop photo against official Agmark standards. Grade A, B, or C with confidence score.',
    tag:   'Computer Vision',
    paths: [
      'M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z',
      'M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z',
    ],
  },
  {
    title: 'Live APMC Prices',
    desc:  'Real-time official modal prices across 19 states and 50+ crops from data.gov.in. Updated every day at market open.',
    tag:   'Live Data',
    paths: [
      'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
    ],
  },
  {
    title: 'Strategy-Aware Agent',
    desc:  'Conceder for perishables, Boulware for non-perishables. Proven game-theory negotiation tactics adapted per crop.',
    tag:   'AI Agent',
    paths: [
      'M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.97zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.97z',
    ],
  },
  {
    title: 'BATNA Price Floor',
    desc:  'Your reservation price factors in your actual transport cost. The AI enforces your floor on every single negotiation round — it is never exposed to the buyer.',
    tag:   'Guardrails',
    paths: [
      'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
    ],
  },
  {
    title: 'Telegram Interface',
    desc:  'Negotiate from any phone via Telegram — no smartphone required. Works on 2G data, anywhere in India.',
    tag:   'Accessible',
    paths: [
      'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3',
    ],
  },
  {
    title: 'Installable PWA',
    desc:  'Install directly from Chrome on Android. No app store, no waiting, no storage bloat. Works offline for price lookups.',
    tag:   'PWA',
    paths: [
      'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3',
    ],
  },
]

const TECH = [
  { name: 'Gemini 1.5 Pro',  role: 'Vision analysis & dialogue' },
  { name: 'LangGraph',       role: 'Agent orchestration graph' },
  { name: 'data.gov.in',     role: 'Official APMC price feed' },
  { name: 'FastAPI',         role: 'Async Python API server' },
  { name: 'Supabase',        role: 'PostgreSQL database' },
  { name: 'PWA + Telegram',  role: 'Zero-friction delivery' },
]

// Unsplash photo IDs for testimonial strip
const FARMER_PHOTOS = [
  { id: 'photo-1594548474069-44c35052e541', name: 'Raju M.',   state: 'Karnataka',   crop: 'Tomato', gain: '₹3,200' },
  { id: 'photo-1559827291-72f26f0f3812',   name: 'Sunita D.', state: 'Maharashtra', crop: 'Onion',  gain: '₹4,800' },
  { id: 'photo-1507003211169-0a1dd7228f2d', name: 'Vikram S.', state: 'Punjab',      crop: 'Wheat',  gain: '₹6,100' },
]

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-red-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function ArrowDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 animate-bounce">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

export default function Landing() {
  const lenisRef = useRef(null)

  const scrollTo = (id) => {
    lenisRef.current?.scrollTo(document.querySelector(id), { offset: -72, duration: 1.4 })
  }

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) })
    lenisRef.current = lenis
    const rafFn = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(rafFn)
    gsap.ticker.lagSmoothing(0)
    lenis.on('scroll', ScrollTrigger.update)

    const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    heroTl
      .fromTo('.ld-nav',    { y: -24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0)
      .fromTo('.ld-badge',  { y: 12,  opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.35)
      .fromTo('.ld-word',   { y: 52,  opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.055 }, 0.55)
      .fromTo('.ld-sub',    { y: 20,  opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.95)
      .fromTo('.ld-cta',    { y: 18,  opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 }, 1.15)
      .fromTo('.ld-card-a', { y: 40,  opacity: 0, scale: 0.94 }, { y: 0, opacity: 1, scale: 1, duration: 0.8 }, 0.8)
      .fromTo('.ld-card-b', { y: 30,  opacity: 0, x: 20 },       { y: 0, opacity: 1, x: 0,  duration: 0.7 }, 1.0)
      .fromTo('.ld-card-c', { y: 30,  opacity: 0, x: -20 },      { y: 0, opacity: 1, x: 0,  duration: 0.7 }, 1.1)

    document.querySelectorAll('[data-count]').forEach((el) => {
      const target = parseFloat(el.dataset.count)
      const obj = { val: 0 }
      gsap.to(obj, {
        val: target, duration: 2, ease: 'power1.out',
        onUpdate() { el.textContent = target % 1 === 0 ? Math.round(obj.val) : obj.val.toFixed(1) },
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      })
    })

    gsap.utils.toArray('.ld-reveal').forEach((el) => {
      gsap.fromTo(el,
        { y: 44, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.75, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 86%', once: true } }
      )
    })

    gsap.utils.toArray('.ld-stagger').forEach((parent) => {
      gsap.fromTo(parent.querySelectorAll(':scope > *'),
        { y: 32, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.65, stagger: 0.1, ease: 'power2.out',
          scrollTrigger: { trigger: parent, start: 'top 82%', once: true } }
      )
    })

    document.querySelectorAll('.ld-step').forEach((el, i) => {
      gsap.fromTo(el,
        { x: i % 2 === 0 ? -50 : 50, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true } }
      )
    })

    ScrollTrigger.create({
      start: 'top -60',
      onEnter:     () => gsap.to('.ld-nav', { backgroundColor: 'rgba(17,24,39,0.98)', boxShadow: '0 1px 32px rgba(0,0,0,0.4)', duration: 0.3 }),
      onLeaveBack: () => gsap.to('.ld-nav', { backgroundColor: 'rgba(17,24,39,0.85)', boxShadow: 'none', duration: 0.3 }),
    })

    gsap.fromTo('.ld-cta-section',
      { scale: 0.97, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.9, ease: 'power2.out',
        scrollTrigger: { trigger: '.ld-cta-section', start: 'top 85%', once: true } }
    )

    return () => {
      heroTl.kill()
      lenis.destroy()
      gsap.ticker.remove(rafFn)
      gsap.ticker.lagSmoothing(60, 1000)
      ScrollTrigger.getAll().forEach((st) => st.kill())
    }
  }, [])

  return (
    <div className="font-sans bg-gray-950 text-white antialiased overflow-x-hidden">

      {/* NAV */}
      <nav className="ld-nav fixed top-0 inset-x-0 z-50 bg-gray-900/85 backdrop-blur-md border-b border-gray-800/60">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center text-white">
              <LeafIcon />
            </div>
            <span className="font-semibold text-white tracking-tight">
              KrishiDoot<span className="text-green-400">.AI</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm text-gray-400 font-medium">
            <button onClick={() => scrollTo('#how-it-works')} className="hover:text-white transition-colors">How it works</button>
            <button onClick={() => scrollTo('#features')}    className="hover:text-white transition-colors">Features</button>
            <button onClick={() => scrollTo('#technology')}  className="hover:text-white transition-colors">Technology</button>
          </div>

          <Link to="/grade" className="bg-green-600 hover:bg-green-500 active:scale-95 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all duration-150">
            Open App
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex items-center pt-16 relative overflow-hidden">
        {/* Hero background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&q=80&auto=format&fit=crop)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-950/92 to-gray-900/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />

        {/* Glow accents */}
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-green-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-green-600/6 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-5 py-24 w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div className="max-w-lg">
              <div className="ld-badge inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-7 tracking-wide">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                AI-powered negotiation for Indian farmers
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold text-white leading-[1.15] tracking-tight mb-1">
                {['Stop', 'leaving', 'money'].map((w, i) => (
                  <span key={i} className="ld-word inline-block" style={{ marginRight: '0.22em' }}>{w}</span>
                ))}
                <br />
                {['at', 'the'].map((w, i) => (
                  <span key={i} className="ld-word inline-block" style={{ marginRight: '0.22em' }}>{w}</span>
                ))}
                <span className="ld-word inline-block text-green-400">mandi.</span>
              </h1>

              <p className="ld-sub text-base sm:text-lg text-gray-400 leading-relaxed mt-6 mb-8">
                KrishiDoot uses real APMC data and a LangGraph AI agent to negotiate on your behalf —
                so experienced traders can never lowball you again.
              </p>

              <div className="flex flex-wrap gap-3 mb-5">
                <Link to="/grade" className="ld-cta bg-green-600 hover:bg-green-500 active:scale-95 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-150 text-sm">
                  Get started free
                </Link>
                <button onClick={() => scrollTo('#how-it-works')} className="ld-cta border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white active:scale-95 font-medium px-6 py-3 rounded-lg transition-all duration-150 text-sm">
                  See how it works
                </button>
              </div>

              <p className="ld-cta text-xs text-gray-600 font-medium">
                No signup required · Works on any phone · Free to use
              </p>
            </div>

            {/* Hero product cards */}
            <div className="relative flex justify-center lg:justify-end min-h-[320px]">
              <div className="ld-card-a relative z-20 bg-gray-900/90 backdrop-blur rounded-2xl border border-gray-700/60 shadow-2xl p-5 w-72 mt-8">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tomato · Karnataka</p>
                    <p className="text-[11px] text-gray-600 mt-0.5">APMC Modal Price</p>
                  </div>
                  <span className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    Live
                  </span>
                </div>
                <p className="text-3xl font-bold text-white tracking-tight">
                  ₹28.50<span className="text-sm font-normal text-gray-500 ml-1">/kg</span>
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-1 rounded-md font-semibold">
                    Floor: ₹26.50/kg
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-800 flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-300">AI negotiating</p>
                    <p className="text-[11px] text-gray-500">Round 2 of 5 · Boulware strategy</p>
                  </div>
                </div>
              </div>

              <div className="ld-card-b absolute -bottom-4 -right-2 lg:right-4 z-30 bg-green-600 rounded-xl shadow-xl shadow-green-900/40 p-4 text-white w-44">
                <p className="text-xs text-green-200 font-medium">AI saved you</p>
                <p className="text-2xl font-bold tracking-tight mt-0.5">₹4,200</p>
                <p className="text-xs text-green-200 mt-1">200 kg wheat · this week</p>
              </div>

              <div className="ld-card-c absolute -top-2 -left-2 lg:-left-8 z-30 bg-gray-900 rounded-xl border border-gray-700 shadow-xl p-3.5">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Agmark Grade</p>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-xl font-black text-green-400">A</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Premium</p>
                    <p className="text-[11px] text-gray-500">94% confidence</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-20">
            <button onClick={() => scrollTo('#stats')} className="flex flex-col items-center gap-2 text-gray-600 hover:text-gray-400 transition-colors">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Scroll</span>
              <ArrowDown />
            </button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section id="stats" className="py-16 bg-gray-900 border-y border-gray-800">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-800 rounded-2xl overflow-hidden">
            {STATS.map((s, i) => (
              <div key={i} className="bg-gray-900 px-8 py-8 text-center">
                <p className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  <span data-count={s.value}>{s.value}</span>{s.suffix}
                </p>
                <p className="text-sm text-gray-500 mt-2">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="py-28 bg-gray-950">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="ld-reveal">
              <p className="text-xs font-bold text-green-400 uppercase tracking-[0.18em] mb-4">The Problem</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                Farmers lose 30–40%<br />of income at the mandi.
              </h2>
              <p className="text-gray-400 mt-5 leading-relaxed text-base">
                The system is fundamentally stacked against farmers. Traders have real-time data,
                negotiation experience, and market leverage. Farmers walk in with none of that.
              </p>
              <Link to="/negotiate" className="inline-flex items-center gap-2 mt-7 text-sm font-semibold text-green-400 hover:text-green-300 transition-colors">
                See how we fix this <ChevronRight />
              </Link>
            </div>

            <div className="ld-stagger grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PAIN_POINTS.map((p, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
                  <div className="w-7 h-7 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center mb-3">
                    <CrossIcon />
                  </div>
                  <p className="font-semibold text-white text-sm mb-1.5">{p.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FARMER PHOTO STRIP */}
      <section className="py-20 bg-gray-900 border-y border-gray-800">
        <div className="max-w-6xl mx-auto px-5">
          <div className="ld-reveal text-center mb-12">
            <p className="text-xs font-bold text-green-400 uppercase tracking-[0.18em] mb-3">Real farmers, real results</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Extra income from every harvest.</h2>
          </div>
          <div className="ld-stagger grid grid-cols-1 sm:grid-cols-3 gap-6">
            {FARMER_PHOTOS.map((f, i) => (
              <div key={i} className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden group hover:border-green-500/30 transition-all duration-300">
                <div className="h-48 overflow-hidden relative">
                  <img
                    src={`https://images.unsplash.com/${f.id}?w=600&q=80&auto=format&fit=crop`}
                    alt={`Farmer ${f.name}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 to-transparent" />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-white text-sm">{f.name}</p>
                    <span className="text-xs font-bold text-green-400">{f.gain} extra</span>
                  </div>
                  <p className="text-xs text-gray-500">{f.crop} farmer · {f.state}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-28 bg-gray-950">
        <div className="max-w-6xl mx-auto px-5">
          <div className="ld-reveal max-w-xl mb-16">
            <p className="text-xs font-bold text-green-400 uppercase tracking-[0.18em] mb-4">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">Three steps to a fair price.</h2>
            <p className="text-gray-400 mt-4 leading-relaxed">From photo to final price in under five minutes.</p>
          </div>
          <div className="space-y-5">
            {STEPS.map((step, i) => (
              <div key={i} className="ld-step bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-900/10 transition-all duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="flex-shrink-0">
                    <span className="text-6xl font-black text-gray-800 leading-none select-none">{step.number}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-base sm:text-lg font-bold text-white">{step.title}</h3>
                      <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-md font-mono font-medium">{step.badge}</span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed max-w-xl">{step.desc}</p>
                  </div>
                  <Link to={step.to} className="flex-shrink-0 inline-flex items-center gap-1.5 border border-gray-700 text-gray-300 hover:border-green-500/50 hover:text-green-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                    {step.cta} <ChevronRight />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES SWIPER */}
      <section id="features" className="py-28 bg-gray-900 overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 mb-14">
          <div className="ld-reveal">
            <p className="text-xs font-bold text-green-400 uppercase tracking-[0.18em] mb-4">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              Everything a farmer needs<br className="hidden sm:block" /> to win at the mandi.
            </h2>
          </div>
        </div>
        <div className="pl-5 md:pl-[max(1.25rem,calc((100vw-72rem)/2+1.25rem))]">
          <Swiper
            modules={[Autoplay, Pagination]}
            spaceBetween={14}
            slidesPerView={1.1}
            breakpoints={{
              540:  { slidesPerView: 1.8 },
              768:  { slidesPerView: 2.4 },
              1024: { slidesPerView: 3.2 },
            }}
            autoplay={{ delay: 3800, disableOnInteraction: false, pauseOnMouseEnter: true }}
            pagination={{ clickable: true }}
            loop
            style={{ paddingBottom: '48px' }}
          >
            {FEATURES.map((f, i) => (
              <SwiperSlide key={i} style={{ height: 'auto' }}>
                <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 h-full flex flex-col hover:border-green-500/30 hover:shadow-lg hover:shadow-green-900/10 transition-all duration-300 cursor-default group">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:border-green-500/30 transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-green-400">
                        {f.paths.map((d, di) => (
                          <path key={di} strokeLinecap="round" strokeLinejoin="round" d={d} />
                        ))}
                      </svg>
                    </div>
                    <span className="text-xs font-mono text-gray-600 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-md">{f.tag}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm mb-2">{f.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed flex-1">{f.desc}</p>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* TECHNOLOGY */}
      <section id="technology" className="py-28 bg-gray-950">
        <div className="max-w-6xl mx-auto px-5">
          <div className="ld-reveal max-w-xl mb-14">
            <p className="text-xs font-bold text-green-400 uppercase tracking-[0.18em] mb-4">Technology</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              Built on proven,<br />production-grade infrastructure.
            </h2>
            <p className="text-gray-400 mt-4 leading-relaxed">
              Every component is chosen for reliability, accuracy, and availability at scale across rural India.
            </p>
          </div>
          <div className="ld-stagger grid grid-cols-2 sm:grid-cols-3 gap-4">
            {TECH.map((t, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-green-500/30 hover:shadow-md hover:shadow-green-900/10 transition-all duration-200 group">
                <div className="w-8 h-8 bg-green-500/10 rounded-lg mb-4 flex items-center justify-center group-hover:bg-green-500/15 transition-colors">
                  <div className="w-3 h-3 bg-green-400 rounded-sm" />
                </div>
                <p className="font-bold text-white text-sm">{t.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 px-5 bg-gray-950">
        <div className="ld-cta-section max-w-4xl mx-auto bg-gradient-to-br from-green-700 to-green-800 rounded-3xl px-8 py-16 sm:px-16 text-center overflow-hidden relative border border-green-600/30">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-green-500/20 rounded-full pointer-events-none blur-2xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-green-900/40 rounded-full pointer-events-none blur-2xl" />
          <div className="relative z-10">
            <p className="text-green-300 text-xs font-bold uppercase tracking-[0.2em] mb-5">Get started today</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-5">
              Your next mandi deal<br />should be a fair one.
            </h2>
            <p className="text-green-100/80 text-base leading-relaxed mb-9 max-w-lg mx-auto">
              KrishiDoot.AI is free, requires no sign-up, and works on any phone. Start with a single crop photo.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/grade" className="bg-white text-green-700 font-bold px-8 py-3.5 rounded-xl hover:bg-green-50 active:scale-95 transition-all duration-150 text-sm">
                Grade my crop
              </Link>
              <Link to="/market" className="border border-green-500/50 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-green-600/30 active:scale-95 transition-all duration-150 text-sm">
                Check mandi prices
              </Link>
            </div>
            <p className="text-green-300/60 text-xs mt-6 font-medium">Works on any phone · No app store · 100% free</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-14 bg-gray-950 border-t border-gray-900">
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex flex-col md:flex-row justify-between gap-10 mb-10">
            <div className="max-w-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-green-600 rounded-md flex items-center justify-center text-white">
                  <LeafIcon className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-white tracking-tight">
                  KrishiDoot<span className="text-green-400">.AI</span>
                </span>
              </div>
              <p className="text-gray-600 text-xs leading-relaxed">
                AI-powered negotiation for Indian farmers. Get the price you deserve at every mandi.
              </p>
            </div>
            <div className="flex gap-16">
              <div>
                <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-4">App</p>
                <div className="space-y-3">
                  {[
                    { to: '/grade',     label: 'Grade Crop'   },
                    { to: '/market',    label: 'Mandi Prices' },
                    { to: '/negotiate', label: 'Negotiate'    },
                  ].map(({ to, label }) => (
                    <Link key={to} to={to} className="block text-xs text-gray-600 hover:text-white transition-colors">{label}</Link>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-4">Technology</p>
                <div className="space-y-3">
                  {['Gemini Vision', 'LangGraph', 'APMC API', 'FastAPI'].map((t) => (
                    <p key={t} className="text-xs text-gray-700">{t}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-gray-900 flex flex-col sm:flex-row justify-between gap-2">
            <p className="text-xs text-gray-700">© 2026 KrishiDoot.AI. Built for Indian farmers.</p>
            <p className="text-xs text-gray-700">DPDP Act 2023 compliant · data.gov.in APMC data</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
