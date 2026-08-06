/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowUpRight,
  BookOpen,
  CornerDownRight,
  ExternalLink,
  FileText,
  Gauge,
  Github,
  Layers,
  Linkedin,
  LockKeyhole,
  Music,
  Network,
  ScanLine,
  ShieldCheck,
  Stamp,
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

type Workspace = {
  id: TabId;
  code: string;
  label: string;
  short: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const WORKSPACES: Workspace[] = [
  {
    id: 'images',
    code: '01',
    label: 'Image Lab',
    short: 'Images',
    description: 'Inject a synthetic carrier, inspect its spectrum, then measure how ordinary edits attenuate the signal.',
    icon: Layers,
  },
  {
    id: 'text',
    code: '02',
    label: 'Text Lab',
    short: 'Text',
    description: 'Explore token-bias watermarking and watch statistical confidence move as the text changes.',
    icon: ScanLine,
  },
  {
    id: 'audio',
    code: '03',
    label: 'Audio Lab',
    short: 'Audio',
    description: 'Examine the same robustness problem through an audio signal and transformation lens.',
    icon: Music,
  },
  {
    id: 'analysis',
    code: '04',
    label: 'Analysis',
    short: 'Analysis',
    description: 'Read the synthetic measurements as evidence, not as a certificate of origin or authorship.',
    icon: Gauge,
  },
  {
    id: 'showdown',
    code: '05',
    label: 'Credentials',
    short: 'Credentials',
    description: 'Compare probabilistic in-band signals with cryptographically signed, tamper-evident provenance.',
    icon: Stamp,
  },
  {
    id: 'comfy',
    code: '06',
    label: 'Pipeline',
    short: 'Pipeline',
    description: 'See how transformations compose across a multi-step media workflow and where provenance can be lost.',
    icon: Network,
  },
  {
    id: 'research',
    code: '07',
    label: 'Briefing',
    short: 'Briefing',
    description: 'Connect the experiments to C2PA, Content Credentials, governance, and responsible-use guidance.',
    icon: BookOpen,
  },
];

const KG_URL = 'https://kineticgain.com/';
const TRUST_URL = 'https://kineticgain.com/trust/';
const C2PA_URL = 'https://contentcredentials.org/';
const LINKEDIN_URL = 'https://www.linkedin.com/in/mirzacausevic';
const REPO_URL = 'https://github.com/mizcausevic-dev/watermark-stress-test';
const ARTICLE_URL = '/why-watermarks-break/';

function getInitialTab(): TabId {
  if (typeof window === 'undefined') return 'images';
  const hash = window.location.hash.replace('#', '') as TabId;
  return WORKSPACES.some((workspace) => workspace.id === hash) ? hash : 'images';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);
  const [activeBgTopic, setActiveBgTopic] = useState<string>('how_synthid_works');

  const activeWorkspace = useMemo(
    () => WORKSPACES.find((workspace) => workspace.id === activeTab) ?? WORKSPACES[0],
    [activeTab],
  );

  const selectWorkspace = useCallback((id: TabId) => {
    setActiveTab(id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${id}`);
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '') as TabId;
      if (WORKSPACES.some((workspace) => workspace.id === hash)) setActiveTab(hash);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const onTabKey = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(event.key)) return;
      event.preventDefault();
      const currentIndex = WORKSPACES.findIndex((workspace) => workspace.id === activeTab);
      const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
      const nextIndex = forward
        ? (currentIndex + 1) % WORKSPACES.length
        : (currentIndex - 1 + WORKSPACES.length) % WORKSPACES.length;
      selectWorkspace(WORKSPACES[nextIndex].id);
      const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons[nextIndex]?.focus();
    },
    [activeTab, selectWorkspace],
  );

  const renderWorkspace = () => {
    const sharedMotion = {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -8 },
      transition: { duration: 0.16 },
    };

    switch (activeTab) {
      case 'images':
        return (
          <motion.div key="images" {...sharedMotion}>
            <ImageSandbox />
          </motion.div>
        );
      case 'text':
        return (
          <motion.div key="text" {...sharedMotion}>
            <TextBypassSandbox />
          </motion.div>
        );
      case 'audio':
        return (
          <motion.div key="audio" {...sharedMotion}>
            <AudioLab />
          </motion.div>
        );
      case 'analysis':
        return (
          <motion.div key="analysis" {...sharedMotion}>
            <AnalysisLab />
          </motion.div>
        );
      case 'showdown':
        return (
          <motion.div key="showdown" {...sharedMotion}>
            <CredentialShowdown />
          </motion.div>
        );
      case 'comfy':
        return (
          <motion.div key="comfy" {...sharedMotion}>
            <ComfyUIWorkflow />
          </motion.div>
        );
      case 'research':
        return (
          <motion.div key="research" {...sharedMotion} className="briefing-view">
            <div className="briefing-layout">
              <div className="briefing-index" aria-label="Provenance briefing topics">
                {RESEARCH_BACKGROUNDS.map((topic, index) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setActiveBgTopic(topic.id)}
                    className={activeBgTopic === topic.id ? 'briefing-topic is-active' : 'briefing-topic'}
                  >
                    <span className="briefing-topic-number">{String(index + 1).padStart(2, '0')}</span>
                    <span>
                      <strong>{topic.title}</strong>
                      <small>{topic.summary}</small>
                    </span>
                  </button>
                ))}
              </div>

              <div className="briefing-detail fx-layer fx-vignette">
                {(() => {
                  const topic = RESEARCH_BACKGROUNDS.find((item) => item.id === activeBgTopic);
                  if (!topic) return null;
                  return (
                    <>
                      <div className="briefing-detail-head">
                        <div>
                          <h3>{topic.title}</h3>
                          <p>{topic.summary}</p>
                        </div>
                        {topic.reference && (
                          <a href={topic.reference} target="_blank" rel="noreferrer" className="text-link">
                            Reference <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      <div className="briefing-points">
                        {topic.details.map((detail, index) => {
                          const splitAt = detail.indexOf(': ');
                          const title = splitAt > -1 ? detail.slice(0, splitAt) : '';
                          const body = splitAt > -1 ? detail.slice(splitAt + 2) : detail;
                          return (
                            <div key={`${topic.id}-${index}`} className="briefing-point">
                              <CornerDownRight className="w-4 h-4" />
                              <div>
                                {title && <h4>{title}</h4>}
                                <p>{body}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="evidence-conclusion">
                        <ShieldCheck className="w-5 h-5" />
                        <p>
                          <strong>Why this lab exists:</strong> mapping where a provenance signal breaks is how you justify
                          the layer that does not. Read <a href={ARTICLE_URL}>Why watermarks break</a>, or explore the{' '}
                          <a href={TRUST_URL} target="_blank" rel="noreferrer">Kinetic Gain Trust Pack</a> for the governance layer.
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            <Glossary />
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="provenance-shell">
      <a className="skip-link" href="#lab-workspace">Skip to lab workspace</a>

      <div className="mobile-masthead">
        <a href="/" className="mobile-brand" aria-label="Provenance Lab home">
          <BrandMark className="w-8 h-8" />
          <span>
            <strong>Provenance Lab</strong>
            <small>Kinetic Gain</small>
          </span>
        </a>
        <a href={ARTICLE_URL} className="mobile-essay-link">Explainer</a>
      </div>

      <div className="provenance-layout">
        <aside className="provenance-sidebar" aria-label="Provenance Lab navigation">
          <div className="sidebar-brand">
            <BrandMark className="sidebar-mark" />
            <div>
              <a href="/" className="sidebar-title">Provenance Lab</a>
              <div className="sidebar-owner">Kinetic Gain</div>
            </div>
          </div>

          <div className="sidebar-rule" />

          <div className="sidebar-project">
            <strong>Watermark Stress Test</strong>
            <p>Interactive evidence lab for the limits of in-band AI content watermarking.</p>
          </div>

          <nav
            className="workspace-nav"
            role="tablist"
            aria-orientation="vertical"
            aria-label="Lab workspaces"
            onKeyDown={onTabKey}
          >
            {WORKSPACES.map((workspace) => {
              const Icon = workspace.icon;
              const active = activeTab === workspace.id;
              return (
                <button
                  key={workspace.id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => selectWorkspace(workspace.id)}
                  className={active ? 'workspace-nav-item is-active' : 'workspace-nav-item'}
                >
                  <span className="workspace-nav-code">{workspace.code}</span>
                  <Icon className="workspace-nav-icon" />
                  <span>{workspace.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="sidebar-evidence fx-layer fx-vignette">
            <LockKeyhole className="w-4 h-4" />
            <div>
              <strong>Evidence posture</strong>
              <span>Watermark: probabilistic</span>
              <span>C2PA: tamper-evident</span>
            </div>
          </div>

          <div className="sidebar-links">
            <a href={ARTICLE_URL}><FileText className="w-4 h-4" /> Why watermarks break</a>
            <a href={C2PA_URL} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /> Content Credentials</a>
            <a href={REPO_URL} target="_blank" rel="noreferrer"><Github className="w-4 h-4" /> Source</a>
            <a href={LINKEDIN_URL} target="_blank" rel="noreferrer"><Linkedin className="w-4 h-4" /> Miz Causevic</a>
          </div>
        </aside>

        <main id="lab-workspace" className="provenance-main">
          <section className="lab-intro fx-layer fx-corner">
            <div className="lab-intro-copy">
              <h1>Provenance Lab</h1>
              <p>
                Stress-test hidden signals, inspect where confidence breaks, and compare probabilistic watermark evidence with
                cryptographically verifiable provenance.
              </p>
            </div>

            <div className="lab-facts" aria-label="Lab facts">
              <div>
                <span>Processing</span>
                <strong>Local browser</strong>
              </div>
              <div>
                <span>Signal</span>
                <strong>Synthetic only</strong>
              </div>
              <div>
                <span>Trust layer</span>
                <strong>C2PA lens</strong>
              </div>
            </div>
          </section>

          <section className="scope-note fx-layer fx-vignette" aria-label="Responsible use scope">
            <div className="scope-mark">i</div>
            <p>
              <strong>Educational simulation.</strong> This lab injects its own synthetic watermark and analyses it entirely in your browser.
              It does not detect, contain, or remove Google SynthID or any production watermark, and nothing you load is uploaded. The point is
              to show why <GlossaryTerm id="in-band">in-band watermarks</GlossaryTerm> are fragile, and why durable provenance needs cryptographic{' '}
              <a href={C2PA_URL} target="_blank" rel="noreferrer">Content Credentials (C2PA)</a>.
            </p>
          </section>

          <div className="mobile-workspace-switcher">
            <label htmlFor="workspace-select">Workspace</label>
            <select
              id="workspace-select"
              value={activeTab}
              onChange={(event) => selectWorkspace(event.target.value as TabId)}
            >
              {WORKSPACES.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>{workspace.code} · {workspace.label}</option>
              ))}
            </select>
          </div>

          <section className="workspace-heading">
            <div className="workspace-heading-main">
              <span className="workspace-sequence">{activeWorkspace.code}</span>
              <div>
                <h2>{activeWorkspace.label}</h2>
                <p>{activeWorkspace.description}</p>
              </div>
            </div>
            <div className="workspace-status" aria-label="Workspace status">
              <span className="status-dot" />
              Client-side simulation
            </div>
          </section>

          <section className="workspace-frame" aria-live="polite">
            <AnimatePresence mode="wait">{renderWorkspace()}</AnimatePresence>
          </section>

          <section className="principle-strip" aria-label="Evidence principles">
            <div>
              <span>01</span>
              <strong>Asserted is not verified.</strong>
              <p>A watermark detector returns evidence, not a provenance certificate.</p>
            </div>
            <div>
              <span>02</span>
              <strong>Absence proves little.</strong>
              <p>A weakened in-band signal can disappear without revealing why.</p>
            </div>
            <div>
              <span>03</span>
              <strong>Make tampering visible.</strong>
              <p>Signed provenance turns integrity loss into an auditable state.</p>
            </div>
          </section>

          <footer className="lab-footer">
            <div>
              <BrandMark className="w-5 h-5" />
              <span>Watermark Stress Test · Kinetic Gain Provenance Lab</span>
            </div>
            <div>
              <a href={ARTICLE_URL}>Explainer</a>
              <a href={TRUST_URL} target="_blank" rel="noreferrer">Trust Pack</a>
              <a href={KG_URL} target="_blank" rel="noreferrer">Kinetic Gain <ArrowUpRight className="w-3 h-3" /></a>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
