'use client';

import { motion } from 'framer-motion';

export function BrandLogo({ className = "h-12 w-auto", animate = true }: { className?: string; animate?: boolean }) {
  return (
    <motion.div 
      className={`relative flex items-center gap-3 ${className}`}
      initial={animate ? { scale: 0.8, opacity: 0 } : false}
      animate={animate ? { scale: 1, opacity: 1 } : false}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <div className="relative h-12 w-12 group">
        {/* Shadow/Glow effect */}
        <div className="absolute inset-0 bg-green-400 blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
        
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 drop-shadow-md"
        >
          {/* Main Fruit Body - Dynamic Shape */}
          <motion.path
            d="M50 85C75 85 90 65 90 45C90 25 75 15 50 15C25 15 10 25 10 45C10 65 25 85 50 85Z"
            fill="url(#fruitGradient)"
            animate={animate ? { 
              scale: [1, 1.05, 1],
              rotate: [0, 2, -2, 0]
            } : {}}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          />
          
          {/* Leaf */}
          <motion.path
            d="M50 20C50 20 55 5 70 5C70 5 65 25 50 25L50 20Z"
            fill="#22C55E"
            initial={{ rotate: -20 }}
            animate={animate ? { rotate: [ -20, -10, -20] } : {}}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />

          {/* Digital Shine/Check */}
          <path
            d="M35 48L45 58L65 35"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-90"
          />

          <defs>
            <linearGradient id="fruitGradient" x1="10" y1="15" x2="90" y2="85" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4ADE80" />
              <stop offset="1" stopColor="#16A34A" />
            </linearGradient>
          </defs>
        </svg>

        {/* Floating sparkles */}
        {animate && (
          <>
            <motion.div 
              className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
            />
            <motion.div 
              className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-green-300 rounded-full"
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.8 }}
            />
          </>
        )}
      </div>

      <div className="flex flex-col">
        <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-800 tracking-tighter leading-none">
          Fruta<span className="text-orange-500">POS</span>
        </span>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
          Fresh Tech Market
        </span>
      </div>
    </motion.div>
  );
}
