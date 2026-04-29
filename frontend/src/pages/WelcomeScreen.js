import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Bot,
  Globe2,
  GraduationCap,
  Languages,
  LayoutDashboard,
  Music2,
  Palette,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import '../styles/WelcomeScreen.css';

const SCENE_DURATIONS = [3000, 4500, 5500, 8000, 5500, 3500];
const FADE_DURATION = 700;
const ENTRY_DURATION = 800;

const SCENE_START_OFFSETS = [];
let accumulatedOffset = 0;
SCENE_DURATIONS.forEach((duration) => {
  SCENE_START_OFFSETS.push(accumulatedOffset);
  accumulatedOffset += duration;
});

const SCENE_END_OFFSETS = SCENE_START_OFFSETS.map(
  (startOffset, index) => startOffset + SCENE_DURATIONS[index]
);
const TOTAL_DURATION = accumulatedOffset;

const featureRows = [
  {
    icon: BookOpen,
    title: 'Interactive Picture Books',
    description: 'Animated, touch-responsive stories for ages 2-6',
  },
  {
    icon: Music2,
    title: 'Audio Rhymes & Songs',
    description: 'Catchy, educational nursery rhymes with karaoke mode',
  },
  {
    icon: Palette,
    title: 'Digital Activity Sheets',
    description: 'Colouring, tracing, and puzzles - no printing needed',
  },
  {
    icon: Bot,
    title: 'Virtual Storyteller',
    description: 'AI-guided read-aloud sessions with voice modulation',
  },
  {
    icon: LayoutDashboard,
    title: 'Authority Dashboard',
    description: 'Track usage, favourite books, and child engagement metrics',
  },
  {
    icon: Trophy,
    title: 'Weekly Wonder Challenges',
    description: 'Fun quizzes and rewards for little learners',
  },
];

const authorityPoints = [
  {
    icon: ShieldCheck,
    title: 'Zero Paper, Pure Wonder',
    description: 'Fully digital, child-safe, and ad-free environment.',
  },
  {
    icon: Globe2,
    title: 'Anytime, Anywhere Access',
    description: 'For classroom, home, or hybrid learning.',
  },
  {
    icon: GraduationCap,
    title: 'Curriculum-Aligned',
    description: 'Designed for NEP 2020 foundational stage.',
  },
  {
    icon: Languages,
    title: 'Multilingual Stories & Rhymes',
    description: 'Hindi, English, and regional languages.',
  },
];

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const getCurrentSceneIndex = (elapsedMs) => {
  const sceneIndex = SCENE_END_OFFSETS.findIndex((endOffset) => elapsedMs < endOffset);
  return sceneIndex === -1 ? SCENE_DURATIONS.length - 1 : sceneIndex;
};

function WelcomeScreen() {
  const navigate = useNavigate();
  const animationFrameRef = useRef(null);
  const lastFrameTimeRef = useRef(null);
  const elapsedTimeRef = useRef(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || elapsedTimeRef.current >= TOTAL_DURATION) {
      return undefined;
    }

    const tick = (timestamp) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }

      const delta = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;

      const nextElapsed = Math.min(elapsedTimeRef.current + delta, TOTAL_DURATION);
      elapsedTimeRef.current = nextElapsed;
      setElapsedMs(nextElapsed);

      if (nextElapsed < TOTAL_DURATION) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      lastFrameTimeRef.current = null;
    };
  }, [isPaused]);

  useEffect(() => {
    if (elapsedMs >= TOTAL_DURATION) {
      navigate('/login', { replace: true });
    }
  }, [elapsedMs, navigate]);

  const handleSkip = (event) => {
    event.stopPropagation();
    navigate('/login', { replace: true });
  };

  const handlePauseToggle = () => {
    if (elapsedTimeRef.current >= TOTAL_DURATION) {
      return;
    }

    setIsPaused((previousState) => !previousState);
  };

  const currentScene = getCurrentSceneIndex(elapsedMs);
  const currentSceneStart = SCENE_START_OFFSETS[currentScene];
  const currentSceneDuration = SCENE_DURATIONS[currentScene];
  const sceneElapsed = elapsedMs - currentSceneStart;
  const fadeStart = Math.max(currentSceneDuration - FADE_DURATION, FADE_DURATION);
  const entryProgress = clamp(sceneElapsed / ENTRY_DURATION, 0, 1);
  const fadeProgress =
    sceneElapsed >= fadeStart
      ? clamp((sceneElapsed - fadeStart) / Math.max(currentSceneDuration - fadeStart, 1), 0, 1)
      : 0;
  const progressRatio = clamp(elapsedMs / TOTAL_DURATION, 0, 1);

  let sceneOpacity = entryProgress;
  let sceneTranslateY = (1 - entryProgress) * 18;
  let sceneScale = 0.985 + 0.015 * entryProgress;

  if (sceneElapsed >= fadeStart) {
    sceneOpacity = 1 - fadeProgress;
    sceneTranslateY = fadeProgress * 18;
    sceneScale = 1 - 0.015 * fadeProgress;
  } else if (sceneElapsed >= ENTRY_DURATION) {
    sceneOpacity = 1;
    sceneTranslateY = 0;
    sceneScale = 1;
  }

  const renderScene = () => {
    switch (currentScene) {
      case 0:
        return (
          <div className="welcome-logo-scene">
            <div className="welcome-logo-halo" />
            <img
              src="/wonder-logo.png"
              alt="Wonder Learning India"
              className="welcome-logo welcome-logo--intro"
            />
          </div>
        );
      case 1:
        return (
          <div className="welcome-brand-scene">
            <img
              src="/wonder-logo.png"
              alt="Wonder Learning India"
              className="welcome-logo welcome-logo--lifted"
            />
            <p className="welcome-brand-line">
              Wonder Learning India&apos;s Digital Library for young minds
            </p>
          </div>
        );
      case 2:
        return (
          <div className="welcome-copy-scene">
            <h1 className="welcome-title">
              Namaste, Future Shapers! &#128075;
            </h1>
            <p className="welcome-subtitle">
              Empowering India&apos;s Preschools with a Digital Treasure Trove
            </p>
            <p className="welcome-quote">
              &ldquo;Where little fingers tap, curious eyes explore, and young hearts fall in
              love with learning.&rdquo;
            </p>
          </div>
        );
      case 3:
        return (
          <div className="welcome-table-scene">
            <div className="welcome-section-heading">
              <Sparkles size={18} />
              <span>Feature Highlights</span>
            </div>
            <div className="welcome-feature-table">
              <div className="welcome-feature-table__header">Feature</div>
              <div className="welcome-feature-table__header">What It Includes</div>
              {featureRows.map(({ icon: Icon, title, description }) => (
                <React.Fragment key={title}>
                  <div className="welcome-feature-table__cell welcome-feature-table__cell--title">
                    <Icon size={18} />
                    <span>{title}</span>
                  </div>
                  <div className="welcome-feature-table__cell">{description}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="welcome-points-scene">
            <div className="welcome-section-heading">
              <Sparkles size={18} />
              <span>Key Points for Preschool Authorities</span>
            </div>
            <div className="welcome-points-grid">
              {authorityPoints.map(({ icon: Icon, title, description }) => (
                <div className="welcome-point-card" key={title}>
                  <div className="welcome-point-icon">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h2>{title}</h2>
                    <p>{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return (
          <div className="welcome-closing-scene">
            <p className="welcome-closing-line">
              &ldquo;Give your preschool the gift of digital wonder - join Wonder Learning India
              today.&rdquo;
            </p>
          </div>
        );
    }
  };

  return (
    <div
      className={`welcome-screen ${isPaused ? 'welcome-screen--paused' : ''}`}
      onClick={handlePauseToggle}
    >
      <div className="welcome-screen__orb welcome-screen__orb--one" />
      <div className="welcome-screen__orb welcome-screen__orb--two" />
      <div className="welcome-screen__orb welcome-screen__orb--three" />

      <button type="button" className="welcome-skip-button" onClick={handleSkip}>
        Skip Intro
      </button>

      <div
        key={currentScene}
        className="welcome-scene-shell"
        style={{
          opacity: sceneOpacity,
          transform: `translateY(${sceneTranslateY}px) scale(${sceneScale})`,
        }}
      >
        {renderScene()}
      </div>

      <div className="welcome-progress-rail" aria-hidden="true">
        <div
          className="welcome-progress-bar"
          style={{ transform: `scaleX(${progressRatio})` }}
        />
      </div>
    </div>
  );
}

export default WelcomeScreen;
