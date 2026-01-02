'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 bg-[#0a0a0b]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-cyan-600 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-semibold">Intelligent Context</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="#features" className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">Features</Link>
            <Link href="#how-it-works" className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">How it works</Link>
            <Link href="#sdk" className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">SDK</Link>
            <div className="flex items-center gap-3 ml-4">
              <a href="/login" className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">Log in</a>
              <a href="/login" className="px-3 py-1.5 text-xs font-medium bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors">
                Get started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-800/50 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs text-cyan-400">Now in beta</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Give your agents
            <span className="text-cyan-400"> intelligent context</span>
          </h1>
          <p className="text-lg text-zinc-400 mb-8 max-w-xl mx-auto">
            Every AI decision has context—who said what, why it mattered, what the tradeoffs were. We capture all of it, so your agents learn from every interaction.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a href="/login" className="px-4 py-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors">
              Start free
            </a>
            <a href="#sdk" className="px-4 py-2 text-sm font-medium text-zinc-300 border border-zinc-700 hover:border-zinc-600 rounded-md transition-colors">
              View SDK
            </a>
          </div>

          {/* Animated Network Graph */}
          <div className="mt-16 relative w-full max-w-2xl mx-auto h-64 overflow-hidden">
            <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              <defs>
                {/* Gradient for lines */}
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0891b2" stopOpacity="0" />
                  <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
                </linearGradient>

                {/* Glow filter */}
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>

                {/* Pulse animation for data packets */}
                <circle id="packet" r="2" fill="#22d3ee" filter="url(#glow)">
                  <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
                </circle>
              </defs>

              {/* Network connections */}
              <g className="opacity-30">
                {/* Outer ring connections */}
                <line x1="80" y1="60" x2="200" y2="100" stroke="url(#lineGradient)" strokeWidth="1" />
                <line x1="120" y1="140" x2="200" y2="100" stroke="url(#lineGradient)" strokeWidth="1" />
                <line x1="320" y1="60" x2="200" y2="100" stroke="url(#lineGradient)" strokeWidth="1" />
                <line x1="280" y1="140" x2="200" y2="100" stroke="url(#lineGradient)" strokeWidth="1" />
                <line x1="50" y1="100" x2="200" y2="100" stroke="url(#lineGradient)" strokeWidth="1" />
                <line x1="350" y1="100" x2="200" y2="100" stroke="url(#lineGradient)" strokeWidth="1" />
                <line x1="150" y1="30" x2="200" y2="100" stroke="url(#lineGradient)" strokeWidth="1" />
                <line x1="250" y1="30" x2="200" y2="100" stroke="url(#lineGradient)" strokeWidth="1" />
                <line x1="150" y1="170" x2="200" y2="100" stroke="url(#lineGradient)" strokeWidth="1" />
                <line x1="250" y1="170" x2="200" y2="100" stroke="url(#lineGradient)" strokeWidth="1" />

                {/* Cross connections */}
                <line x1="80" y1="60" x2="150" y2="30" stroke="#0891b2" strokeWidth="0.5" strokeOpacity="0.3" />
                <line x1="320" y1="60" x2="250" y2="30" stroke="#0891b2" strokeWidth="0.5" strokeOpacity="0.3" />
                <line x1="120" y1="140" x2="150" y2="170" stroke="#0891b2" strokeWidth="0.5" strokeOpacity="0.3" />
                <line x1="280" y1="140" x2="250" y2="170" stroke="#0891b2" strokeWidth="0.5" strokeOpacity="0.3" />
                <line x1="50" y1="100" x2="80" y2="60" stroke="#0891b2" strokeWidth="0.5" strokeOpacity="0.3" />
                <line x1="50" y1="100" x2="120" y2="140" stroke="#0891b2" strokeWidth="0.5" strokeOpacity="0.3" />
                <line x1="350" y1="100" x2="320" y2="60" stroke="#0891b2" strokeWidth="0.5" strokeOpacity="0.3" />
                <line x1="350" y1="100" x2="280" y2="140" stroke="#0891b2" strokeWidth="0.5" strokeOpacity="0.3" />
              </g>

              {/* Animated data packets flowing to center */}
              <circle r="2" fill="#22d3ee" filter="url(#glow)">
                <animateMotion dur="3s" repeatCount="indefinite">
                  <mpath href="#path1" />
                </animateMotion>
                <animate attributeName="opacity" values="0;1;1;0" dur="3s" repeatCount="indefinite" />
              </circle>
              <path id="path1" d="M80,60 L200,100" fill="none" className="invisible" />

              <circle r="2" fill="#22d3ee" filter="url(#glow)">
                <animateMotion dur="2.5s" repeatCount="indefinite" begin="0.5s">
                  <mpath href="#path2" />
                </animateMotion>
                <animate attributeName="opacity" values="0;1;1;0" dur="2.5s" repeatCount="indefinite" begin="0.5s" />
              </circle>
              <path id="path2" d="M320,60 L200,100" fill="none" className="invisible" />

              <circle r="2" fill="#22d3ee" filter="url(#glow)">
                <animateMotion dur="2.8s" repeatCount="indefinite" begin="1s">
                  <mpath href="#path3" />
                </animateMotion>
                <animate attributeName="opacity" values="0;1;1;0" dur="2.8s" repeatCount="indefinite" begin="1s" />
              </circle>
              <path id="path3" d="M50,100 L200,100" fill="none" className="invisible" />

              <circle r="2" fill="#22d3ee" filter="url(#glow)">
                <animateMotion dur="3.2s" repeatCount="indefinite" begin="1.5s">
                  <mpath href="#path4" />
                </animateMotion>
                <animate attributeName="opacity" values="0;1;1;0" dur="3.2s" repeatCount="indefinite" begin="1.5s" />
              </circle>
              <path id="path4" d="M150,170 L200,100" fill="none" className="invisible" />

              <circle r="2" fill="#22d3ee" filter="url(#glow)">
                <animateMotion dur="2.6s" repeatCount="indefinite" begin="2s">
                  <mpath href="#path5" />
                </animateMotion>
                <animate attributeName="opacity" values="0;1;1;0" dur="2.6s" repeatCount="indefinite" begin="2s" />
              </circle>
              <path id="path5" d="M350,100 L200,100" fill="none" className="invisible" />

              <circle r="2" fill="#22d3ee" filter="url(#glow)">
                <animateMotion dur="2.9s" repeatCount="indefinite" begin="0.8s">
                  <mpath href="#path6" />
                </animateMotion>
                <animate attributeName="opacity" values="0;1;1;0" dur="2.9s" repeatCount="indefinite" begin="0.8s" />
              </circle>
              <path id="path6" d="M250,30 L200,100" fill="none" className="invisible" />

              {/* Outer context nodes */}
              <g filter="url(#glow)">
                <circle cx="80" cy="60" r="4" fill="#0891b2">
                  <animate attributeName="r" values="4;5;4" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle cx="320" cy="60" r="4" fill="#0891b2">
                  <animate attributeName="r" values="4;5;4" dur="2.5s" repeatCount="indefinite" begin="0.5s" />
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="2.5s" repeatCount="indefinite" begin="0.5s" />
                </circle>
                <circle cx="120" cy="140" r="4" fill="#0891b2">
                  <animate attributeName="r" values="4;5;4" dur="2.8s" repeatCount="indefinite" begin="1s" />
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="2.8s" repeatCount="indefinite" begin="1s" />
                </circle>
                <circle cx="280" cy="140" r="4" fill="#0891b2">
                  <animate attributeName="r" values="4;5;4" dur="3.2s" repeatCount="indefinite" begin="1.5s" />
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="3.2s" repeatCount="indefinite" begin="1.5s" />
                </circle>
                <circle cx="50" cy="100" r="3" fill="#0e7490">
                  <animate attributeName="opacity" values="0.4;0.8;0.4" dur="4s" repeatCount="indefinite" />
                </circle>
                <circle cx="350" cy="100" r="3" fill="#0e7490">
                  <animate attributeName="opacity" values="0.4;0.8;0.4" dur="4s" repeatCount="indefinite" begin="2s" />
                </circle>
                <circle cx="150" cy="30" r="3" fill="#0e7490">
                  <animate attributeName="opacity" values="0.4;0.8;0.4" dur="3.5s" repeatCount="indefinite" begin="1s" />
                </circle>
                <circle cx="250" cy="30" r="3" fill="#0e7490">
                  <animate attributeName="opacity" values="0.4;0.8;0.4" dur="3.5s" repeatCount="indefinite" begin="0.5s" />
                </circle>
                <circle cx="150" cy="170" r="3" fill="#0e7490">
                  <animate attributeName="opacity" values="0.4;0.8;0.4" dur="4s" repeatCount="indefinite" begin="1.5s" />
                </circle>
                <circle cx="250" cy="170" r="3" fill="#0e7490">
                  <animate attributeName="opacity" values="0.4;0.8;0.4" dur="4s" repeatCount="indefinite" begin="0.8s" />
                </circle>
              </g>

              {/* Central agent node */}
              <g filter="url(#glow)">
                <circle cx="200" cy="100" r="16" fill="#0c0c0d" stroke="#22d3ee" strokeWidth="2">
                  <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="200" cy="100" r="20" fill="none" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.3">
                  <animate attributeName="r" values="20;24;20" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="200" cy="100" r="26" fill="none" stroke="#22d3ee" strokeWidth="0.5" strokeOpacity="0.2">
                  <animate attributeName="r" values="26;32;26" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite" />
                </circle>
                {/* Agent icon */}
                <path
                  d="M200,92 L200,92 M194,104 L200,98 L206,104 M194,100 L200,106 L206,100"
                  stroke="#22d3ee"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="200" cy="94" r="3" fill="#22d3ee" />
              </g>

              {/* Labels */}
              <text x="80" y="48" textAnchor="middle" className="fill-zinc-600 text-[8px]">emails</text>
              <text x="320" y="48" textAnchor="middle" className="fill-zinc-600 text-[8px]">calls</text>
              <text x="120" y="158" textAnchor="middle" className="fill-zinc-600 text-[8px]">docs</text>
              <text x="280" y="158" textAnchor="middle" className="fill-zinc-600 text-[8px]">meetings</text>
              <text x="200" y="140" textAnchor="middle" className="fill-cyan-400 text-[10px] font-medium">agent</text>
            </svg>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-semibold mb-4">Your CRM knows the deal closed. But why?</h2>
          <p className="text-zinc-400 leading-relaxed">
            When a rep overrides your AI, there&apos;s a reason. Maybe the CFO mentioned something in a call.
            Maybe the timing felt off. That knowledge lives in someone&apos;s head—until now. Intelligent Context
            captures the full picture: the reasoning, the sources, who said what and how much it mattered.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-zinc-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold mb-2">What gets logged, gets learned</h2>
            <p className="text-sm text-zinc-500">The infrastructure layer for smarter agents</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
                title: 'Decision Traces',
                description: 'Log the full picture at decision time: the action, the reasoning, who influenced it, and how confident the agent was.',
              },
              {
                icon: 'M13 10V3L4 14h7v7l9-11h-7z',
                title: 'Grounded Decisions',
                description: 'Connect every decision to your org\'s capabilities and goals. Agents know what you can actually deliver.',
              },
              {
                icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
                title: 'Pattern Discovery',
                description: 'Analyze thousands of decisions at once. Find what actually drives good outcomes. Turn tribal knowledge into policy.',
              },
            ].map((feature) => (
              <div key={feature.title} className="p-5 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                <div className="w-8 h-8 rounded bg-cyan-600/20 flex items-center justify-center mb-4">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={feature.icon} />
                  </svg>
                </div>
                <h3 className="text-sm font-medium mb-2">{feature.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Shift */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <p className="text-xs text-zinc-600 uppercase tracking-wide mb-3">Today</p>
              <h3 className="text-lg font-medium mb-3 text-zinc-400">Traditional CRMs</h3>
              <ul className="space-y-2 text-xs text-zinc-500">
                <li className="flex items-start gap-2">
                  <span className="text-zinc-600 mt-0.5">×</span>
                  <span>Only stores final outcomes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-600 mt-0.5">×</span>
                  <span>Can&apos;t tell you why things happened</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-600 mt-0.5">×</span>
                  <span>All input treated equally</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-600 mt-0.5">×</span>
                  <span>Insights require manual digging</span>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs text-cyan-400 uppercase tracking-wide mb-3">With Intelligent Context</p>
              <h3 className="text-lg font-medium mb-3 text-zinc-100">Full Decision History</h3>
              <ul className="space-y-2 text-xs text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">✓</span>
                  <span>Every decision logged with reasoning</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">✓</span>
                  <span>Know exactly why agents acted</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">✓</span>
                  <span>Sources weighted by role and influence</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">✓</span>
                  <span>Patterns surface automatically</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold mb-2">How it works</h2>
            <p className="text-sm text-zinc-500">Three steps to smarter agents</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Log decisions', description: 'Use our SDK to capture what your agent did, why, and what context influenced it.' },
              { step: '2', title: 'Capture overrides', description: 'When humans correct the AI, we extract the implicit rule so it doesn\'t happen again.' },
              { step: '3', title: 'Find patterns', description: 'See what\'s working across thousands of decisions. Build policies from real data.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-8 h-8 rounded-full bg-cyan-600 text-white text-sm font-medium flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-sm font-medium mb-2">{item.title}</h3>
                <p className="text-xs text-zinc-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SDK Example */}
      <section id="sdk" className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold mb-2">Simple to integrate</h2>
            <p className="text-sm text-zinc-500">A few lines of Python to get started</p>
          </div>
          <div className="rounded-lg bg-[#0c0c0d] border border-zinc-800/50 overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-800/50">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            </div>
            <pre className="p-4 text-[11px] leading-relaxed overflow-x-auto">
              <code>
                <span className="text-zinc-500"># Log a decision with full reasoning trace</span>{'\n'}
                <span className="text-zinc-200">decision = cg.decisions.create(</span>{'\n'}
                <span className="text-zinc-200">    agent_id=</span><span className="text-amber-400">"sales-agent"</span><span className="text-zinc-200">,</span>{'\n'}
                <span className="text-zinc-200">    action_taken=</span><span className="text-amber-400">"Prioritized forecasting over CRM updates"</span><span className="text-zinc-200">,</span>{'\n'}
                <span className="text-zinc-200">    confidence=</span><span className="text-cyan-400">0.9</span><span className="text-zinc-200">,</span>{'\n'}
                <span className="text-zinc-200">    reasoning=</span><span className="text-amber-400">"Decision-maker needs 90%+ accuracy for IPO"</span><span className="text-zinc-200">,</span>{'\n'}
                <span className="text-zinc-200">    sources=[</span>{'\n'}
                <span className="text-zinc-200">        {'{'}</span><span className="text-amber-400">"type"</span><span className="text-zinc-200">: </span><span className="text-amber-400">"MEETING"</span><span className="text-zinc-200">, </span><span className="text-amber-400">"participant"</span><span className="text-zinc-200">: </span><span className="text-amber-400">"Michael"</span><span className="text-zinc-200">,</span>{'\n'}
                <span className="text-zinc-200">         </span><span className="text-amber-400">"role"</span><span className="text-zinc-200">: </span><span className="text-amber-400">"decision_maker"</span><span className="text-zinc-200">, </span><span className="text-amber-400">"weight"</span><span className="text-zinc-200">: </span><span className="text-cyan-400">0.9</span><span className="text-zinc-200">{'}'}</span>{'\n'}
                <span className="text-zinc-200">    ]</span>{'\n'}
                <span className="text-zinc-200">)</span>{'\n\n'}
                <span className="text-zinc-500"># Discover patterns across decision graphs</span>{'\n'}
                <span className="text-zinc-200">patterns = cg.patterns.discover(confidence_threshold=</span><span className="text-cyan-400">0.7</span><span className="text-zinc-200">)</span>
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-zinc-900/30">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-semibold mb-4">Make your agents smarter with every decision</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Start logging decisions today. Free while in beta.
          </p>
          <a href="/login" className="inline-block px-6 py-2.5 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors">
            Get started free
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-zinc-800/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-cyan-600 flex items-center justify-center">
              <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xs text-zinc-500">Intelligent Context</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/login" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Log in</a>
            <a href="#" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Docs</a>
            <a href="#" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
