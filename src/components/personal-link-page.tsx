"use client";

import ProfileCard from "@/components/profile-card";
import { Button } from "@/components/ui/button";
import WebGLBackground from "@/components/webgl-background";
import { Github, Heart, Mail, Twitter, Youtube } from "lucide-react";
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
    name: "Email",
    url: "mailto:contact@accendium.co",
    icon: Mail,
  },
];

export default function Component() {
  const [isCardOpen, setIsCardOpen] = useState(true);

  return (
    <div
      className="min-h-screen relative overflow-hidden transition-colors duration-300 bg-transparent"
    >
      <WebGLBackground />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.55),transparent_28%),radial-gradient(circle_at_bottom,rgba(255,182,213,0.22),transparent_34%)]" />
      <ProfileCard
        links={LINKS}
        isCardOpen={isCardOpen}
        setIsCardOpen={setIsCardOpen}
      />

      {!isCardOpen && (
        <Button
          data-foreground-component
          onClick={() => setIsCardOpen(true)}
          aria-label="Open profile card"
          variant="outline"
          size="icon"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 h-11 w-11 border backdrop-blur-xl bg-white/70 border-pink-200/80 text-pink-500 hover:bg-pink-100 hover:text-pink-600 focus-visible:ring-pink-300/60 focus-visible:ring-offset-pink-100"
        >
          <Heart size={20} className="fill-current" />
        </Button>
      )}
    </div>
  );
}
