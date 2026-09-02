"use client";

import LiquidToyBackground from "@/components/liquid-toy-background";
import ProfileCard from "@/components/profile-card";
import { Button } from "@/components/ui/button";
import { Github, Mail, Menu, Twitter, Youtube, Cloud } from "lucide-react";
import { useState } from "react";

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
    name: "Soundcloud",
    url: "https://soundcloud.com/accendium",
    icon: Cloud,
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
      // select-none: dragging the background paints the liquid, and a drag that
      // also starts a text selection both highlights the page and hands Firefox
      // a different repaint path, which costs the card its frosted backdrop.
      className={`min-h-screen relative overflow-hidden select-none transition-colors duration-300 bg-neutral-300`}
    >
      <LiquidToyBackground />
      <ProfileCard
        links={LINKS}
        isCardOpen={isCardOpen}
        setIsCardOpen={setIsCardOpen}
        variant="light"
      />

      {!isCardOpen && (
        <Button
          data-foreground-component
          onClick={() => setIsCardOpen(true)}
          aria-label="Open profile card"
          variant="outline"
          size="icon"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 h-10 w-10 border backdrop-blur bg-white/60 border-black/15 text-neutral-900 hover:bg-white/85 hover:text-neutral-900 focus-visible:ring-black/30 focus-visible:ring-offset-white"
        >
          <Menu size={20} />
        </Button>
      )}
    </div>
  );
}
