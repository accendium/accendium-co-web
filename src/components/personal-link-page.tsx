"use client";

import ProfileCard from "@/components/profile-card";
import { Button } from "@/components/ui/button";
import WebGLBackground from "@/components/webgl-background";
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
      className={`min-h-screen relative overflow-hidden transition-colors duration-300 bg-black`}
    >
      <WebGLBackground />
      <ProfileCard links={LINKS} isCardOpen={isCardOpen} setIsCardOpen={setIsCardOpen}/>

      {!isCardOpen && (
        <Button
          data-foreground-component
          onClick={() => setIsCardOpen(true)}
          aria-label="Open profile card"
          variant="outline"
          size="icon"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 h-10 w-10 border backdrop-blur bg-black/60 border-white/20 text-white hover:bg-white/10 hover:text-white focus-visible:ring-white/40 focus-visible:ring-offset-black"
        >
          <Menu size={20} />
        </Button>
      )}
    </div>
  );
}
