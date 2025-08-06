"use client";

import Image from "next/image"
import Link from "next/link"
import { Instagram, Twitter, Linkedin, Github, Globe, Mail } from 'lucide-react'
import WebGLBackground from './webgl-background'
import { useTheme } from './theme-context'

export default function Component() {
  const { theme } = useTheme()
  
  const links = [
    {
      name: "Instagram",
      url: "https://instagram.com/username",
      icon: Instagram,
    },
    {
      name: "Twitter",
      url: "https://twitter.com/username",
      icon: Twitter,
    },
    {
      name: "LinkedIn",
      url: "https://linkedin.com/in/username",
      icon: Linkedin,
    },
    {
      name: "GitHub",
      url: "https://github.com/username",
      icon: Github,
    },
    {
      name: "Website",
      url: "https://yourwebsite.com",
      icon: Globe,
    },
    {
      name: "Email",
      url: "mailto:hello@yourwebsite.com",
      icon: Mail,
    },
  ]

  const isDark = theme === 'dark'

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-black' : 'bg-white'
    }`}>
      {/* GPU-Accelerated Animated Background with Ripple Wave */}
      <WebGLBackground />
      
      {/* Main Content Container - Unchanged for visual consistency */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className={`w-full max-w-md mx-auto backdrop-blur-sm rounded-2xl p-8 border shadow-2xl transition-all duration-300 ${
          isDark 
            ? 'bg-black/90 border-white/20' 
            : 'bg-white/90 border-black/20'
        }`}>
          {/* Header Section */}
          <div className="text-center mb-8">
            {/* Profile Picture */}
            <div className="relative w-[120px] h-[120px] mx-auto mb-6">
              <Image
                src="/placeholder.svg?height=120&width=120"
                alt="Profile Picture"
                width={120}
                height={120}
                className={`rounded-full border-2 object-cover shadow-lg transition-colors duration-300 ${
                  isDark ? 'border-white' : 'border-black'
                }`}
              />
            </div>
            
            {/* Username */}
            <h1 className={`text-2xl font-semibold mb-2 font-sans transition-colors duration-300 ${
              isDark ? 'text-white' : 'text-black'
            }`}>
              @username
            </h1>
            
            {/* Bio/Tagline */}
            <p className={`text-sm font-sans transition-colors duration-300 ${
              isDark ? 'text-white/70' : 'text-black/70'
            }`}>
              Creative developer & designer
            </p>
          </div>

          {/* Links Section */}
          <div className="space-y-3">
            {links.map((link, index) => {
              const IconComponent = link.icon
              return (
                <Link
                  key={index}
                  href={link.url}
                  className="group block w-full"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className={`flex items-center justify-center gap-3 py-3.5 px-6 border rounded-xl backdrop-blur-sm transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg ${
                    isDark 
                      ? 'border-white/30 bg-black/50 text-white hover:bg-white hover:text-black hover:border-white'
                      : 'border-black/30 bg-white/50 text-black hover:bg-black hover:text-white hover:border-black'
                  }`}>
                    <IconComponent className="w-5 h-5" />
                    <span className="font-medium font-sans">{link.name}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
