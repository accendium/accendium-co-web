"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type ProfileCardVariant = "dark" | "light";

/** How long the card stays out of the way on load, leaving the liquid alone. */
const ENTRANCE_DELAY_MS = 3000;
/** How long it then takes to drift into focus. */
const ENTRANCE_DURATION_MS = 1800;
/** How far out of focus it starts. */
const ENTRANCE_BLUR = "8px";
/**
 * Eased off both ends rather than rushed at the front the way `ease-out` is,
 * which spends most of a long fade already nearly opaque. This is a
 * cubic-bezier standing in for the smoothstep the liquid fades its own orb in
 * with, so the card arrives out of nothing on the same curve.
 */
const ENTRANCE_EASING = "cubic-bezier(0.4, 0, 0.6, 1)";

// ---------------------------------------------------------------------------
// Float and tilt
// ---------------------------------------------------------------------------

/** Viewing distance. Shorter exaggerates the perspective; longer flattens it. */
const PERSPECTIVE_PX = 1200;

/**
 * The idle drift, as four sine waves on periods that do not divide into each
 * other, so the card wanders rather than visibly repeating a loop. All four
 * start at zero, so it eases out of rest instead of snapping to an offset.
 */
const FLOAT_LIFT_PX = 5;
const FLOAT_DRIFT_PX = 6;
const FLOAT_TILT_DEG = 1.2;
const FLOAT_LIFT_PERIOD_S = 7;
const FLOAT_DRIFT_PERIOD_S = 9;
const FLOAT_PITCH_PERIOD_S = 11;
const FLOAT_YAW_PERIOD_S = 13;
/**
 * How long the drift takes to wind down once the pointer takes over, and to
 * wind back up afterwards. Slower than the lean, so handing over reads as the
 * card settling under the cursor rather than as two motions swapping.
 */
const FLOAT_PAUSE_RESPONSE_S = 0.45;

/** How far the card leans at the very corner of a hover. */
const HOVER_TILT_DEG = 8;
/**
 * Time constant for chasing the hover, in seconds: the tilt closes ~63% of the
 * gap to the pointer in this long. Framerate-independent, so it settles at the
 * same rate whatever the display is doing.
 */
const TILT_RESPONSE_S = 0.15;

const TAU = Math.PI * 2;

/**
 * "waiting" is the pause on load, "revealing" the slow drift in, and "done"
 * hands the card back to the quick transition the open/close toggle wants.
 */
type EntrancePhase = "waiting" | "revealing" | "done";

/**
 * Every colour is spelled out per variant rather than left to the theme
 * tokens, so the card reads correctly on top of whichever background it is
 * layered over regardless of the document theme.
 */
const VARIANTS: Record<
  ProfileCardVariant,
  {
    card: string;
    logoSrc: string;
    logo: string;
    title: string;
    subtitle: string;
    closeButton: string;
    linkButton: string;
  }
> = {
  dark: {
    card: "border-white/20 bg-transparent",
    logoSrc: "/logo_white.svg",
    logo: "[filter:drop-shadow(0_0_8px_rgba(255,255,255,0.6))_drop-shadow(0_0_16px_rgba(255,255,255,0.35))]",
    title:
      "text-white [text-shadow:0_0_12px_rgba(255,255,255,0.5),0_0_24px_rgba(255,255,255,0.3)]",
    subtitle: "text-white/70",
    closeButton:
      "border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white focus-visible:ring-white/40",
    linkButton:
      "border-white/30 bg-transparent text-white hover:border-white hover:bg-white/10 hover:text-white focus-visible:ring-white/40",
  },
  light: {
    card: "border-black/10 bg-white/55",
    logoSrc: "/logo_dark.svg",
    logo: "[filter:drop-shadow(0_1px_3px_rgba(255,255,255,0.9))]",
    title: "text-neutral-900",
    subtitle: "text-neutral-700",
    closeButton:
      "border-black/15 bg-white/50 text-neutral-900 hover:bg-white/80 hover:text-neutral-900 focus-visible:ring-black/30",
    linkButton:
      "border-black/15 bg-white/50 text-neutral-900 hover:border-black/40 hover:bg-white/80 hover:text-neutral-900 focus-visible:ring-black/30",
  },
};

type ProfileCardProps = {
  links: Array<{
    name: string;
    url: string;
    icon: React.ElementType;
  }>;
  isCardOpen?: boolean;
  setIsCardOpen?: (open: boolean) => void;
  /** Colour scheme to render against the page background (default: dark). */
  variant?: ProfileCardVariant;
};

export default function ProfileCard({
  links,
  isCardOpen,
  setIsCardOpen,
  variant = "dark",
}: ProfileCardProps) {
  const styles = VARIANTS[variant];
  const [phase, setPhase] = useState<EntrancePhase>("waiting");
  const cardRef = useRef<HTMLDivElement>(null);
  /**
   * What the pointer is asking of the card: the lean it wants in degrees, and
   * whether it is on the card at all, which is what stills the drift.
   */
  const hover = useRef({ pitch: 0, yaw: 0, over: false });

  useEffect(() => {
    const reveal = setTimeout(() => setPhase("revealing"), ENTRANCE_DELAY_MS);
    const settle = setTimeout(
      () => setPhase("done"),
      ENTRANCE_DELAY_MS + ENTRANCE_DURATION_MS
    );
    return () => {
      clearTimeout(reveal);
      clearTimeout(settle);
    };
  }, []);

  // The card drifts on its own and leans toward the pointer, both driven from
  // one loop so they compose into a single transform.
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    // Perpetual motion is exactly what this asks to be spared, so sit it out.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const handlePointerMove = (event: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      // -1..1 from the middle of the card, before the lean is scaled off it.
      const fromCentreX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const fromCentreY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      // CSS grows Y downwards, so a pointer below the middle pitches the
      // bottom edge towards the viewer: the card leans into the pointer.
      hover.current.pitch = fromCentreY * HOVER_TILT_DEG;
      hover.current.yaw = -fromCentreX * HOVER_TILT_DEG;
      hover.current.over = true;
    };
    const handlePointerLeave = () => {
      hover.current.pitch = 0;
      hover.current.yaw = 0;
      hover.current.over = false;
    };

    card.addEventListener("pointermove", handlePointerMove);
    card.addEventListener("pointerleave", handlePointerLeave);
    card.addEventListener("pointercancel", handlePointerLeave);

    let frame = 0;
    let previous = performance.now();
    // The lean as it stands, easing towards the target a frame at a time.
    const tilt = { pitch: 0, yaw: 0 };
    // How much of the drift is running, 1 idle to 0 under the pointer, and the
    // drift's own clock, which is wound by that same amount.
    let drifting = 1;
    let driftTime = 0;

    const render = (now: number) => {
      // Clamped so a stalled or backgrounded tab does not snap the card over
      // on the first frame back.
      const delta = Math.min(0.1, Math.max(0, (now - previous) / 1000));
      previous = now;

      const chase = 1 - Math.exp(-delta / TILT_RESPONSE_S);
      tilt.pitch += (hover.current.pitch - tilt.pitch) * chase;
      tilt.yaw += (hover.current.yaw - tilt.yaw) * chase;

      // Winding the clock by the same amount that scales the amplitude slows
      // the drift to a stop rather than cutting it, and holds its phase: it
      // picks up where it was rather than somewhere further along.
      const settle = 1 - Math.exp(-delta / FLOAT_PAUSE_RESPONSE_S);
      drifting += ((hover.current.over ? 0 : 1) - drifting) * settle;
      driftTime += delta * drifting;

      const wave = (period: number, amplitude: number) =>
        Math.sin((driftTime / period) * TAU) * amplitude * drifting;

      const drift = wave(FLOAT_DRIFT_PERIOD_S, FLOAT_DRIFT_PX);
      const lift = wave(FLOAT_LIFT_PERIOD_S, FLOAT_LIFT_PX);
      const pitch = wave(FLOAT_PITCH_PERIOD_S, FLOAT_TILT_DEG);
      const yaw = wave(FLOAT_YAW_PERIOD_S, FLOAT_TILT_DEG);

      card.style.transform =
        `translate3d(${drift.toFixed(3)}px, ${lift.toFixed(3)}px, 0) ` +
        `rotateX(${(tilt.pitch + pitch).toFixed(3)}deg) ` +
        `rotateY(${(tilt.yaw + yaw).toFixed(3)}deg)`;

      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      card.removeEventListener("pointermove", handlePointerMove);
      card.removeEventListener("pointerleave", handlePointerLeave);
      card.removeEventListener("pointercancel", handlePointerLeave);
      card.style.transform = "";
    };
  }, []);

  // Closing the card under the pointer never fires pointerleave, so the lean
  // has to be dropped here or it would still be held on the way back in.
  useEffect(() => {
    if (!isCardOpen) {
      hover.current.pitch = 0;
      hover.current.yaw = 0;
      hover.current.over = false;
    }
  }, [isCardOpen]);

  // Hidden rather than merely transparent, so the invisible card cannot
  // swallow clicks meant for the background, and is out of the tab order.
  const waiting = phase === "waiting";

  return (
    // The wrapper spans the viewport purely to centre the card, so it must not
    // swallow clicks meant for whatever sits behind it.
    <div
      className="relative z-10 min-h-screen flex items-center justify-center p-4 pointer-events-none"
      style={{ perspective: `${PERSPECTIVE_PX}px` }}
    >
      <Card
        ref={cardRef}
        data-foreground-component
        className={`w-full select-none max-w-md mx-auto backdrop-blur-lg rounded-2xl p-8 border shadow-2xl gap-0 ${styles.card}
           ${isCardOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        style={{
          visibility: waiting ? "hidden" : "visible",
          opacity: isCardOpen && !waiting ? 1 : 0,
          // Held blurred while it waits, which is the state the reveal
          // transitions out of.
          filter: waiting ? `blur(${ENTRANCE_BLUR})` : "blur(0px)",
          transition:
            phase === "revealing"
              ? `opacity ${ENTRANCE_DURATION_MS}ms ${ENTRANCE_EASING}, filter ${ENTRANCE_DURATION_MS}ms ${ENTRANCE_EASING}`
              : "opacity 180ms ease",
          // The float and the lean are written straight to the transform each
          // frame, with their own easing, so nothing may transition it here.
          willChange: "transform",
        }}
      >
        <CardHeader className="pb-4 pr-0">
          <CardTitle className="sr-only">Profile</CardTitle>
          <CardAction>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setIsCardOpen?.(false)}
              className={styles.closeButton}
              aria-label="Close profile card"
            >
              <X size={16} />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-8 px-0">
          <div className="text-center">
            <div className="relative w-[120px] h-[120px] mx-auto mb-6">
              <Image
                src={styles.logoSrc}
                alt="Profile Picture"
                width={120}
                height={120}
                className={`rounded-none border-2 object-cover transition-colors duration-300 border-none ${styles.logo}`}
              />
            </div>
            <CardTitle
              className={`text-2xl font-sans mb-2 ${styles.title}`}
            >
              accendium.
            </CardTitle>
            <p className={`text-sm font-sans ${styles.subtitle}`}>
              developer and creator.
            </p>
          </div>

          <div className="space-y-3">
            {links.map((link, index) => {
              const IconComponent = link.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  className={`w-full justify-center gap-3 py-3.5 px-6 rounded-xl backdrop-blur-sm hover:shadow-lg font-medium font-sans ${styles.linkButton}`}
                  asChild
                >
                  <Link
                    href={link.url}
                    aria-label={link.name}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <IconComponent className="w-5 h-5" />
                    {link.name}
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
