# accendium.co Personal Link Site

This is a modern, animated personal link page built with Next.js, TypeScript, and Tailwind CSS. It features a dynamic, interactive WebGL background that responds to mouse movements and clicks, creating a unique and engaging user experience.

## ✨ Features

- **Interactive WebGL Background**: A GPU-accelerated particle animation that reacts to cursor movement and clicks.
- **Dark/Light Mode**: The theme adapts to the user's system preference.
- **Responsive Design**: Looks great on all devices, from mobile to desktop.
- **Built with Modern Tech**:
  - [Next.js](https://nextjs.org/) (App Router)
  - [React](https://react.dev/)
  - [TypeScript](https://www.typescriptlang.org/)
  - [Tailwind CSS](https://tailwindcss.com/)

## ✅ Todo

- [x] Fix: Background dots centering
- [x] Fix: Mobile touch 'stickiness' (touching and releasing shouldn't continue animating on UI)
- [x] Fix: Clicking in foreground card shouldn't trigger background animation 
- [ ] Visual: Add lerping to background animation to make it prettier
- [ ] Visual: Add glow effect to background dots
- [ ] Feat: Add pretty melodic sound effect when clicking the background

## Fun Ideas

- [ ] Add theme changing effect every time background is clicked (or theme change button, paint icon)
  - Should ripple outward originating from the click, LERP everything

---

## Next.js Boilerplate Information

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

### Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

### Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

### Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
