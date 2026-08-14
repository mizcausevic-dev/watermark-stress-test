/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Layers,
  Tv,
  BookOpen,
  Network,
  CornerDownRight,
  Info,
  ArrowUpRight,
  ArrowRight,
  Linkedin,
  Github,
  FileText,
  Music,
  Gauge,
  Stamp
} from 'lucide-react';
import BrandMark from './components/BrandMark';
import ImageSandbox from './components/ImageSandbox';
import TextBypassSandbox from './components/TextBypassSandbox';
import ComfyUIWorkflow from './components/ComfyUIWorkflow';
import CredentialShowdown from './components/CredentialShowdown';
import AudioLab from './components/AudioLab';
import AnalysisLab from './components/AnalysisLab';
import Glossary from './components/Glossary';
import { GlossaryTerm } from './components/GlossaryTerm';
import { RESEARCH_BACKGROUNDS } from './data';

type TabId = 'images' | 'text' | 'audio' | 'analysis' | 'showdown' | 'comfy' | 'research';

const TABS: { id: TabId; label: string; short: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'images', label: 'Image Lab', short: 'Images', icon: Layers },
  { id: 'text', label: 'Text Lab', short: 'Text', icon: Tv },
  { id: 'audio', label: 'Audio Lab', short: 'Audio', icon: Music },
  { id: 'analysis', label: 'Analysis', short: 'Analysis', icon: Gauge },
  { id: 'showdown', label: 'Credentials', short: 'Creds', icon: Stamp },
  { id: 'comfy', label: 'Pipeline', short: 'Pipeline', icon: Network },
  { id: 'research', label: 'Briefing', short: 'Briefing', icon: BookOpen },
];

const KG_URL = 'https://kineticgain.com/';
const TRUST_URL = 'https://kineticgain.com/trust/';
const C2PA_URL = 'https://contentcredentials.org/';
const LINKEDIN_URL = 'https://www.linkedin.com/in/mirzacausevic';
const REPO_URL = 'https://github.com/mizcausevic-dev/watermark-stress-test';
const ARTICLE_URL = '/why-watermarks-break/';

/**
 * Hash-addressable workspaces: each lab is deep-linkable / shareable /
 * bookmarkable via a readable fragment (e.g. …/#pipeline). Fragments are not
 * separate documents, so the canonical stays the base URL and SEO is unaffected.
 */
const TAB_SLUGS: Record<TabId, string> = {
  images: 'image',
  text: 'text',
  audio: 'audio',
  analysis: 'analysis',
  showdown: 'credentials',
  comfy: 'pipeline',
  research: 'briefing',
};
const SLUG_TO_TAB = Object.fromEntries(
  Object.entries(TAB_SLUGS).map(([id, slug]) => [slug, id as TabId]),
) as Record<string, TabId>;

const tabFromHash = (): TabId => {
  if (typeof window === 'undefined') return 'images';
  return SLUG_TO_TAB[window.location.hash.replace(/^#/, '')] ?? 'images';
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>(tabFromHash);
  const [activeBgTopic, setActiveBgTopic] = useState<string>('how_synthid_works');

  const onTabKey = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const idx = TABS.findIndex((t) => t.id === activeTab);
    const next = e.key === 'ArrowRight' ? (idx + 1) % TABS.length : (idx - 1 + TABS.length) % TABS.length;
    setActiveTab(TABS[next].id);
    const btns = e.currentTarget.querySelectorAll('button');
    (btns[next] as HTMLButtonElement | undefined)?.focus();
  }, [activeTab]);

  // Keep the URL fragment in sync with the active workspace (shareable deep link).
  // Leaves the bare homepage URL clean for the default tab.
  useEffect(() => {
    const slug = TAB_SLUGS[activeTab];
    const current = window.location.hash.replace(/^#/, '');
    if (current === slug) return;
    if (!current && activeTab === 'images') return;
    window.history.replaceState(null, '', `#${slug}`);
  }, [activeTab]);

  // Respond to back/forward navigation and manual fragment edits.
  useEffect(() => {
    const onHash = () => {
      const t = SLUG_TO_TAB[window.location.hash.replace(/^#/, '')];
      if (t) setActiveTab(t);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-white font-sans selection:bg-cyan-500/25 selection:text-cyan-200 relative overflow-x-hidden">

      {/* Skip link: first focusable element, lets keyboard users bypass the tablist. */}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-3 focus:left-3 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-cyan-400 focus:text-black focus:font-bold focus:text-sm">Skip to main content</a>

      {/* Animated Mesh Background Elements */}
      {/* Tech-noir atmosphere: cold teal + steel masses, no purple/synthwave. */}
      <div className="absolute top-[-12%] left-[-12%] w-[52%] h-[52%] bg-[#083039]/50 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-14%] right-[-12%] w-[58%] h-[58%] bg-[#080f18]/70 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[16%] right-[6%] w-[34%] h-[34%] bg-cyan-500/[0.09] rounded-full blur-[110px] pointer-events-none" />

      {/* Header Container */}
      <header className="sticky top-0 z-50 h-16 flex items-center justify-between border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">

          <div className="flex items-center gap-3">
            <BrandMark className="w-9 h-9 text-white/90 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white/90">
                  Watermark <span className="text-cyan-400">Stress Test</span>
                </h1>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono uppercase tracking-widest hidden sm:inline-block">
                  Educational
                </span>
              </div>
              <div className="text-[10px] text-white/40 font-mono leading-none mt-0.5 hidden sm:block">
                Content provenance · Kinetic Gain
              </div>
            </div>
          </div>

          <nav
            role="tablist"
            aria-label="Lab views (use arrow keys)"
            onKeyDown={onTabKey}
            className="flex items-center gap-1 sm:gap-2 overflow-x-auto p-0.5 bg-white/5 backdrop-blur-md rounded-xl border border-white/10"
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold leading-none cursor-pointer transition whitespace-nowrap ${
                    active
                      ? 'bg-white/10 border border-white/20 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.short}</span>
                </button>
              );
            })}
          </nav>

          <a
            href={KG_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden lg:flex items-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-full transition"
          >
            <span className="text-[10px] text-white/60 font-mono tracking-widest uppercase">Kinetic Gain</span>
            <ArrowUpRight className="w-3 h-3 text-white/40" />
          </a>

        </div>
      </header>

      {/* Main content body grid layout space */}
      <main id="main" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8 outline-none">

        {/* Honest scope banner — the integrity guardrail, made unmissable */}
        <div className="flex items-start gap-3 bg-amber-500/[0.06] border border-amber-500/25 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <p className="text-[11px] sm:text-xs text-amber-100/80 leading-relaxed">
            <strong className="text-amber-200">Educational simulation.</strong> This lab injects its own
            <em> synthetic</em> watermark and analyses it entirely in your browser. It does <strong>not</strong> detect,
            contain, or remove Google SynthID or any production watermark, and nothing you load is uploaded. The point is
            to show <em>why</em> <GlossaryTerm id="in-band">in-band watermarks</GlossaryTerm> are fragile — and why durable provenance needs cryptographic
            {' '}<a href={C2PA_URL} target="_blank" rel="noreferrer" className="underline decoration-dotted hover:text-white">Content Credentials (C2PA)</a>.
          </p>
        </div>

        {/* Overview header callout card in Glassmorphic theme */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 translate-x-12 -translate-y-12 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-2 max-w-2xl">
            <h2 className="text-lg font-bold tracking-tight text-white/90">
              Why hidden watermarks break — and what actually proves origin
            </h2>
            <p className="text-xs text-white/60 leading-relaxed">
              <GlossaryTerm id="steganographic-watermark">Steganographic watermarks</GlossaryTerm> (the family
              systems like Google&apos;s <GlossaryTerm id="synthid">SynthID</GlossaryTerm> belong to) hide a recoverable
              signal in frequency coefficients or <GlossaryTerm id="latents">model latents</GlossaryTerm>. They survive
              casual edits, but a signal hidden <em>inside</em> the pixels can be attenuated by edits that target where
              it lives — <GlossaryTerm id="notch-filter">notch filtering</GlossaryTerm>,
              {' '}<GlossaryTerm id="bilateral-denoise">denoising</GlossaryTerm>, re-encoding, rescaling, or paraphrasing.
              Use the labs to feel that fragility first-hand,
              then read why <strong className="text-white/80">cryptographically signed provenance</strong> is the
              durable layer underneath.
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0 bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-[10px] text-white/50">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Mode: <strong className="text-white/80">In-browser simulation</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span>Signal: <strong className="text-white/80">Synthetic ring carrier</strong> <span className="text-white/35">(teaching signal)</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              <span>Goal: <strong className="text-cyan-300">Make the case for C2PA</strong></span>
            </div>
          </div>
        </div>

        {/* Dynamic Display of Lab Workspace Views */}
        {/* No mode="wait": the active tab mounts immediately (present in the DOM
            for crawlers / non-painting panes) instead of waiting on an exit
            animation that a throttled requestAnimationFrame never completes. */}
        <div className="min-h-[460px]">
          <AnimatePresence>
            {activeTab === 'images' && (
              <motion.div
                key="images"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
              >
                <ImageSandbox />
              </motion.div>
            )}

            {activeTab === 'text' && (
              <motion.div
                key="text"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
              >
                <TextBypassSandbox />
              </motion.div>
            )}

            {activeTab === 'audio' && (
              <motion.div key="audio" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <AudioLab />
              </motion.div>
            )}

            {activeTab === 'analysis' && (
              <motion.div key="analysis" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <AnalysisLab />
              </motion.div>
            )}

            {activeTab === 'showdown' && (
              <motion.div key="showdown" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <CredentialShowdown />
              </motion.div>
            )}

            {activeTab === 'comfy' && (
              <motion.div
                key="comfy"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
              >
                <ComfyUIWorkflow />
              </motion.div>
            )}

            {activeTab === 'research' && (
              <motion.div
                key="research"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* Topic navigation */}
                <div id="topics-nav" className="md:col-span-4 flex flex-col gap-3">
                  <div className="text-[10px] uppercase font-bold text-white/40 font-mono tracking-wider px-2">
                    Provenance Briefing
                  </div>

                  {RESEARCH_BACKGROUNDS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveBgTopic(t.id)}
                      className={`p-3 text-left rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                        activeBgTopic === t.id
                          ? 'bg-white/10 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.15)]'
                          : 'bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/20 text-white/60'
                      }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold leading-tight">{t.title}</span>
                        <span className="text-[10px] text-white/40 truncate mt-1">{t.summary}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  ))}
                </div>

                {/* Topic detail renderer */}
                <div id="topic-detail" className="md:col-span-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-xl space-y-5">
                  {(() => {
                    const topic = RESEARCH_BACKGROUNDS.find(r => r.id === activeBgTopic);
                    if (!topic) return null;
                    return (
                      <>
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h3 className="text-base font-bold text-white/95">{topic.title}</h3>
                            <p className="text-xs text-white/50 mt-1">{topic.summary}</p>
                          </div>
                          {topic.reference && (
                            <a
                              href={topic.reference}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-mono px-2 py-1 rounded bg-black/40 border border-white/10 text-cyan-400 hover:text-white transition shrink-0 flex items-center gap-1"
                            >
                              Reference <ArrowUpRight className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-4">
                          {topic.details.map((detail, index) => {
                            const splitAt = detail.indexOf(': ');
                            const title = splitAt > -1 ? detail.slice(0, splitAt) : '';
                            const body = splitAt > -1 ? detail.slice(splitAt + 2) : detail;
                            return (
                              <div key={index} className="flex gap-3 items-start">
                                <CornerDownRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                  {title && <h4 className="text-xs font-bold text-white/90">{title}</h4>}
                                  <p className="text-xs text-white/50 leading-relaxed font-sans">{body}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-3.5 bg-cyan-950/15 border border-cyan-800/30 rounded-lg flex gap-3 text-cyan-300">
                          <ShieldCheck className="w-5 h-5 shrink-0" />
                          <p className="text-[11px] font-medium leading-relaxed font-sans text-cyan-100">
                            <strong>Why this lab exists:</strong> mapping where a provenance signal breaks is how you
                            justify the layer that doesn&apos;t — cryptographic Content Credentials. Read the full essay,
                            {' '}<a href={ARTICLE_URL} className="underline decoration-dotted hover:text-white">Why watermarks break</a>,
                            or explore {' '}<a href={TRUST_URL} target="_blank" rel="noreferrer" className="underline decoration-dotted hover:text-white">Kinetic Gain&apos;s Trust Pack</a> for the governance side.
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                </div>

                <Glossary />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>

      <footer className="bg-[#070910]/70 backdrop-blur-md border-t border-white/5 z-10 mt-12 w-full">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-6 flex flex-col gap-5">

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
            {/* Identity + byline */}
            <div className="flex flex-col gap-1.5 max-w-md">
              <div className="flex items-center gap-2 text-white/80 text-xs font-bold">
                <BrandMark className="w-5 h-5 text-white/70" />
                Watermark Stress Test
              </div>
              <p className="text-[11px] text-white/45 leading-relaxed">
                Built by <span className="text-white/70 font-semibold">Miz Causevic</span> — Platform &amp; Security Engineering Lead.
                An educational provenance project under <a href={KG_URL} target="_blank" rel="noreferrer" className="text-cyan-400/80 hover:text-cyan-300 underline decoration-dotted">Kinetic Gain LLC</a>.
              </p>
            </div>

            {/* Link columns */}
            <div className="flex flex-wrap gap-x-10 gap-y-5 text-[11px]">
              <div className="flex flex-col gap-2">
                <span className="text-[9px] uppercase font-bold tracking-widest text-white/30 font-mono">Learn</span>
                <a href={ARTICLE_URL} className="flex items-center gap-1.5 text-white/55 hover:text-white transition"><FileText className="w-3.5 h-3.5" /> Why watermarks break</a>
                <a href={C2PA_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-white/55 hover:text-white transition"><ArrowUpRight className="w-3.5 h-3.5" /> C2PA / Content Credentials</a>
                <a href={TRUST_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-white/55 hover:text-white transition"><ArrowUpRight className="w-3.5 h-3.5" /> Kinetic Gain Trust Pack</a>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[9px] uppercase font-bold tracking-widest text-white/30 font-mono">Connect</span>
                <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-white/55 hover:text-white transition"><Linkedin className="w-3.5 h-3.5" /> LinkedIn</a>
                <a href={KG_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-white/55 hover:text-white transition"><ShieldCheck className="w-3.5 h-3.5" /> kineticgain.com</a>
                <a href={REPO_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-white/55 hover:text-white transition"><Github className="w-3.5 h-3.5" /> Source (GitHub)</a>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-4 border-t border-white/5 text-[10px] text-white/30 font-mono tracking-wider">
            <span>Educational simulation · no real watermark is processed · nothing leaves your browser</span>
            <span className="text-white/40">Apache-2.0 · © 2026 Miz Causevic</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
