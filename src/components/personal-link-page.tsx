"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";
import { Twitter, Github, Globe, Mail, Youtube, X, Menu } from "lucide-react";
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

  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-colors duration-300 bg-black`}
    >
      <WebGLBackground />
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div
          data-foreground-card
          className={`w-full max-w-md mx-auto backdrop-blur-lg rounded-2xl p-8 border shadow-2xl border-white/20
           ${isCardOpen ? "" : "pointer-events-none"}`}
          style={{
            opacity: isCardOpen ? 1 : 0,
            transition: "transform 300ms ease, opacity 180ms ease",
          }}
        >
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setIsCardOpen(false)}
              className={`border-white/20 text-white hover:bg-white/10 h-8 w-8 rounded-md border flex items-center justify-center text-lg leading-none`}
              aria-label="Close profile card"
            >
              <X size={16} />
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
                  aria-label={link.name}
                  className="group block w-full"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div
                    className={`flex items-center justify-center gap-3 py-3.5 px-6 border rounded-xl backdrop-blur-sm transition-all duration-300 ease-in-out hover:shadow-lg border-white/30 text-white hover:border-white`}
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

      {!isCardOpen && (
        <Toolbar
          items={[
            {
              key: "logo",
              icon: (
                <Menu size={20} />
              ),
              onPointerDown: () => setIsCardOpen(true),
              onClick: (e) => {
                e.preventDefault();
              },
              ariaLabel: "Open profile card",
            },
          ]}
        />
      )}
    </div>
  );
}
