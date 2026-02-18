"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";
import { Twitter, Github, Globe, Mail, Youtube } from "lucide-react";
import WebGLBackground from "@/components/webgl-background";
import Toolbar from "@/components/ui/toolbar";

const LINKS = [
  {
    name: "YouTube",
    url: "https://www.youtube.com/@ccendium",
    icon: Youtube,
  },
  {
    name: "Twitter",
    url: "https://twitter.com/ccendium",
    icon: Twitter,
  },
  {
    name: "GitHub",
    url: "https://github.com/accendium",
    icon: Github,
  },
  {
    name: "Email",
    url: "mailto:contact@accendium.co",
    icon: Mail,
  },
];

export default function Component() {
  const [isCardOpen, setIsCardOpen] = useState(true);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const [shrinkStyle, setShrinkStyle] = useState<CSSProperties | undefined>(undefined);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const logoBtnRef = useRef<HTMLButtonElement | null>(null);

  const closeCard = () => {
    const cardEl = cardRef.current;
    const btnEl = logoBtnRef.current;
    if (!cardEl) {
      setIsCardOpen(false);
      return;
    }
    const startRect = cardEl.getBoundingClientRect();
    const endRect = btnEl
      ? btnEl.getBoundingClientRect()
      : (() => {
          const rem =
            parseFloat(getComputedStyle(document.documentElement).fontSize) ||
            16;
          const buttonSize = 3 * rem;
          const bottomOffset = 1.5 * rem;
          const left = window.innerWidth / 2 - buttonSize / 2;
          const top = window.innerHeight - bottomOffset - buttonSize;
          return { left, top, width: buttonSize, height: buttonSize };
        })();
    const translateX =
      endRect.left + endRect.width / 2 - (startRect.left + startRect.width / 2);
    const translateY =
      endRect.top + endRect.height / 2 - (startRect.top + startRect.height / 2);
    const scaleX = Math.max(0.1, endRect.width / startRect.width);
    const scaleY = Math.max(0.1, endRect.height / startRect.height);
    setIsToolbarVisible(true);
    setShrinkStyle({
      transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`,
    });
    window.setTimeout(() => {
      setIsCardOpen(false);
      window.setTimeout(() => {
        setShrinkStyle(undefined);
        setIsToolbarVisible(true);
      }, 320);
    }, 300);
  };

  const openCard = () => {
    setIsToolbarVisible(false);
    const cardEl = cardRef.current;
    const btnEl = logoBtnRef.current;
    if (!cardEl || !btnEl) {
      setShrinkStyle(undefined);
      setIsCardOpen(true);
      return;
    }
    const endRect = cardEl.getBoundingClientRect();
    const startRect = btnEl.getBoundingClientRect();
    const translateX =
      startRect.left + startRect.width / 2 - (endRect.left + endRect.width / 2);
    const translateY =
      startRect.top + startRect.height / 2 - (endRect.top + endRect.height / 2);
    const scaleX = Math.max(0.1, startRect.width / endRect.width);
    const scaleY = Math.max(0.1, startRect.height / endRect.height);
    setShrinkStyle({
      transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`,
    });
    requestAnimationFrame(() => {
      setIsCardOpen(true);
      requestAnimationFrame(() => {
        setShrinkStyle({ transform: "translate(0px, 0px) scale(1, 1)" });
      });
    });
  };

  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-colors duration-300 bg-black`}
    >
      <WebGLBackground />
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div
          ref={cardRef}
          data-foreground-card
          className={`w-full max-w-md mx-auto backdrop-blur-sm rounded-2xl p-8 border shadow-2xl bg-black/90 border-white/20
           ${isCardOpen ? "" : "pointer-events-none"}`}
          style={{
            ...(shrinkStyle || {}),
            opacity: isCardOpen ? 1 : 0,
            transition: "transform 300ms ease, opacity 180ms ease",
          }}
        >
          <div className="flex justify-end mb-4">
            <button
              onClick={closeCard}
              className={`border-white/20 text-white hover:bg-white/10`}
              aria-label="Close profile card"
            >
              ×
            </button>
          </div>
          <div className="text-center mb-8">
            <div className="relative w-[120px] h-[120px] mx-auto mb-6">
              <Image
                src="/logo_white.svg"
                alt="Profile Picture"
                width={120}
                height={120}
                className={`rounded-none border-2 object-cover shadow-lg transition-colors duration-300 border-none`}
              />
            </div>

            <h1
              className={`text-2xl font-semibold mb-2 font-sans transition-colors duration-300 text-white`}
            >
              accendium.
            </h1>

            <p
              className={`text-sm font-sans transition-colors duration-300 text-white/70`}
            >
              developer and creator.
            </p>
          </div>

          <div className="space-y-3">
            {LINKS.map((link, index) => {
              const IconComponent = link.icon;
              return (
                <Link
                  key={index}
                  href={link.url}
                  className="group block w-full"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div
                    className={`flex items-center justify-center gap-3 py-3.5 px-6 border rounded-xl backdrop-blur-sm transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg border-white/30 bg-black/50 text-white hover:bg-white hover:text-black hover:border-white`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="font-medium font-sans">{link.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {isToolbarVisible && (
        <Toolbar
          items={[
            {
              key: "logo",
              icon: (
                <Image
                  src="/logo_white.svg"
                  alt="Open profile card"
                  width={20}
                  height={20}
                  className="opacity-90"
                />
              ),
              onPointerDown: openCard,
              onClick: (e) => {
                e.preventDefault();
              },
              buttonRef: logoBtnRef,
              ariaLabel: "Open profile card",
            },
          ]}
        />
      )}
    </div>
  );
}
