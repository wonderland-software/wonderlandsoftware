import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  prepareWithSegments,
  layoutNextLineRange,
  materializeLineRange,
} from "@chenglou/pretext";
import "./App.css";
import BackgroundShader from "./BackgroundShader";
import BrushOverlay from "./BrushOverlay";
import rabbitSprite from "./assets/rabbit_sprite.png";
import servyLogo from "./assets/servy.png";
import gearroomLogo from "./assets/gearroom.png";
import mfjLogo from "./assets/mfj.png";
import metaLogo from "./assets/meta-icon.webp";

const CLIENTS = [
  { name: "Meta", logo: metaLogo },
  { name: "Servy", logo: servyLogo },
  { name: "The Gear Room", logo: gearroomLogo },
  { name: "MFJ", logo: mfjLogo },
];

const FRAME_WIDTH = 55;
const FRAME_HEIGHT = 74;
const SHEET_COLS = 4;
const TOTAL_FRAMES = 23;
const SPRITE_ASPECT = FRAME_WIDTH / FRAME_HEIGHT;

const TITLE_TEXT = "AI agents, built on your expertise.";
const TITLE_LINES = ["AI agents,", "built on your expertise."];
const TITLE_FONT_FAMILY =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif";

function useRabbitAnimation() {
  const [frame, setFrame] = useState(0);
  const [direction, setDirection] = useState(1);
  const requestRef = useRef();
  const previousTimeRef = useRef();

  const animate = useCallback(
    (time) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;

        if (deltaTime > 150) {
          setFrame((prevFrame) => {
            const nextFrame = prevFrame + direction;

            if (nextFrame >= TOTAL_FRAMES - 1) {
              setDirection(-1);
              return TOTAL_FRAMES - 1;
            } else if (nextFrame <= 0) {
              setDirection(1);
              return 0;
            }

            if (direction === -1 && prevFrame === 15) {
              return 7;
            }

            return nextFrame;
          });
          previousTimeRef.current = time;
        }
      } else {
        previousTimeRef.current = time;
      }
      requestRef.current = requestAnimationFrame(animate);
    },
    [direction]
  );

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  return useMemo(
    () => ({
      backgroundImage: `url(${rabbitSprite})`,
      backgroundPosition: `${-(frame % SHEET_COLS) * FRAME_WIDTH}px ${
        -Math.floor(frame / SHEET_COLS) * FRAME_HEIGHT
      }px`,
    }),
    [frame]
  );
}

function useAnimatedFavicon() {
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const img = new Image();
    img.src = rabbitSprite;

    let frame = 0;
    let direction = 1;
    let lastTime = 0;
    let rafId;

    const getFaviconLink = () => {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      return link;
    };

    const tick = (time) => {
      if (time - lastTime >= 150) {
        lastTime = time;
        const col = frame % SHEET_COLS;
        const row = Math.floor(frame / SHEET_COLS);
        ctx.clearRect(0, 0, 64, 64);
        ctx.drawImage(
          img,
          col * FRAME_WIDTH, row * FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT,
          0, 0, 64, 64
        );
        getFaviconLink().href = canvas.toDataURL("image/png");

        let next = frame + direction;
        if (next >= TOTAL_FRAMES - 1) {
          direction = -1;
          next = TOTAL_FRAMES - 1;
        } else if (next <= 0) {
          direction = 1;
          next = 0;
        } else if (direction === -1 && frame === 15) {
          next = 7;
        }
        frame = next;
      }
      rafId = requestAnimationFrame(tick);
    };

    img.onload = () => {
      rafId = requestAnimationFrame(tick);
    };

    return () => cancelAnimationFrame(rafId);
  }, []);
}

function useScrollReveal() {
  useEffect(() => {
    // Exclude reveal-immediate elements — they run their own load animation
    const els = document.querySelectorAll(".reveal:not(.reveal-immediate)");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" }
    );

    // Defer by one frame so the browser paints the initial hidden state first
    const raf = requestAnimationFrame(() => {
      els.forEach((el) => observer.observe(el));
    });
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);
}

function useElementWidth(ref) {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.getBoundingClientRect().width);
    update();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}

function useFontsReady() {
  const [ready, setReady] = useState(
    typeof document !== "undefined" && !!document.fonts?.status === false
      ? true
      : document?.fonts?.status === "loaded"
  );

  useEffect(() => {
    if (!document.fonts) {
      setReady(true);
      return;
    }
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}

/**
 * Runs pretext layout over TITLE_TEXT, using a narrower width for lines
 * whose vertical range overlaps the rabbit's bounding box (shrink-wrap).
 */
function useWrappedTitle(containerWidth, fontsReady) {
  return useMemo(() => {
    if (!containerWidth || !fontsReady) return null;

    const fontSize = Math.max(36, Math.min(76, containerWidth * 0.1));
    const lineHeight = fontSize * 1.05;
    const fontWeight = 700;
    const letterSpacingEm = -0.04;
    const letterSpacingPx = letterSpacingEm * fontSize;

    // Rabbit fits into ~3 lines vertically, starts at y=0
    const rabbitHeight = lineHeight * 3;
    const rabbitWidth = rabbitHeight * SPRITE_ASPECT;
    const rabbitGutter = fontSize * 0.45;
    const rabbitTotal = rabbitWidth + rabbitGutter;

    const fontSpec = `${fontWeight} ${fontSize}px ${TITLE_FONT_FAMILY}`;
    const lines = [];
    let y = 0;

    // Each TITLE_LINES segment is laid out independently so the break between
    // them is forced regardless of viewport width; within each segment, pretext
    // wraps based on the available width (narrower while overlapping the rabbit).
    for (const segText of TITLE_LINES) {
      const prepared = prepareWithSegments(segText, fontSpec, {
        letterSpacing: letterSpacingPx,
      });
      let cursor = { segmentIndex: 0, graphemeIndex: 0 };

      for (let safety = 0; safety < 20; safety++) {
        const lineBottom = y + lineHeight;
        const overlapsRabbit = y < rabbitHeight && lineBottom > 0;
        const maxWidth = overlapsRabbit
          ? Math.max(60, containerWidth - rabbitTotal)
          : containerWidth;

        const range = layoutNextLineRange(prepared, cursor, maxWidth);
        if (!range) break;
        const line = materializeLineRange(prepared, range);
        lines.push({
          text: line.text,
          maxWidth,
          measuredWidth: line.width,
          y,
          overlapsRabbit,
        });
        if (
          range.end.segmentIndex === cursor.segmentIndex &&
          range.end.graphemeIndex === cursor.graphemeIndex
        ) {
          y += lineHeight;
          break;
        }
        cursor = range.end;
        y += lineHeight;
      }
    }

    const totalHeight = Math.max(y, rabbitHeight);

    return {
      fontSize,
      lineHeight,
      letterSpacingEm,
      rabbitWidth,
      rabbitHeight,
      rabbitGutter,
      totalHeight,
      lines,
    };
  }, [containerWidth, fontsReady]);
}

function App() {
  const spriteStyle = useRabbitAnimation();
  useAnimatedFavicon();
  useScrollReveal();
  const fontsReady = useFontsReady();

  const titleRef = useRef(null);
  const titleWidth = useElementWidth(titleRef);
  const layout = useWrappedTitle(titleWidth, fontsReady);

  const mailto =
    "mailto:tag@wonderland.software?subject=AI%20Consulting%20Inquiry&body=Hi%20Tag%2C%0A%0AI'd%20like%20to%20explore%20AI%20agents%2C%20automation%2C%20or%20just%20have%20a%20conversation%20about%20my%20business.%0A%0A-%20Company%20%2F%20industry%3A%0A-%20What%20we're%20trying%20to%20solve%3A%0A-%20Tools%20we%20use%20today%3A%0A-%20Timeline%3A%0A%0AThanks!";

  const rabbitInnerScale = layout ? layout.rabbitWidth / FRAME_WIDTH : 1;

  return (
    <>
    <BackgroundShader />
    <BrushOverlay />
    <div className="App">
      <article className="page">
        <div className="wordmark">
          Wonderland Software
        </div>

        <h1
          ref={titleRef}
          className="hero-title"
          aria-label={TITLE_TEXT}
          style={
            layout
              ? {
                  height: layout.totalHeight,
                  fontSize: layout.fontSize,
                  lineHeight: `${layout.lineHeight}px`,
                  letterSpacing: `${layout.letterSpacingEm}em`,
                }
              : undefined
          }
        >
          {layout ? (
            <>
              <div
                className="rabbit-abs"
                aria-hidden="true"
                style={{
                  width: layout.rabbitWidth,
                  height: layout.rabbitHeight,
                }}
              >
                <div
                  className="rabbit-sprite"
                  style={{
                    ...spriteStyle,
                    transform: `scale(${rabbitInnerScale})`,
                  }}
                />
              </div>
              {layout.lines.map((line, i) => (
                <div
                  key={i}
                  className="title-line"
                  aria-hidden="true"
                  style={{
                    top: line.y,
                    width: line.maxWidth,
                  }}
                >
                  {line.text}
                </div>
              ))}
            </>
          ) : (
            // Fallback while width/fonts are measuring — plain text
            <span className="title-fallback">{TITLE_TEXT}</span>
          )}
        </h1>

        <div className="clients">
          <p className="clients-label">Trusted by</p>
          <div className="clients-logos">
            {CLIENTS.map((c) => (
              <img key={c.name} src={c.logo} alt={c.name} className="client-logo" />
            ))}
          </div>
        </div>

        <ol className="services">
          <li className="service">
            <span className="service-num">01</span>
            <div className="service-body">
              <h3 className="service-title">Strategy Conversations.</h3>
              <p>
                Before anything gets built, we have a conversation. We sit down
                with you to map where AI can actually upgrade your business, and
                where it shouldn't.
              </p>
            </div>
          </li>

          <li className="service">
            <span className="service-num">02</span>
            <div className="service-body">
              <h3 className="service-title">AI Agents &amp; Automations.</h3>
              <p>
                Custom agents trained on your knowledge, processes, and voice.
                Paired with automations that move work across your tools so
                your team focuses on the decisions that matter.
              </p>
            </div>
          </li>

          <li className="service">
            <span className="service-num">03</span>
            <div className="service-body">
              <h3 className="service-title">Integration &amp; Deployment.</h3>
              <p>
                From proof-of-concept to production, wired into the systems
                and workflows you already rely on.
              </p>
            </div>
          </li>
        </ol>

        <a href={mailto} target="_blank" rel="noopener noreferrer" className="contact-btn">
          email tag@wonderlandsoftware
          <span className="contact-arrow" aria-hidden="true">→</span>
        </a>
      </article>
    </div>
    </>
  );
}

export default App;
