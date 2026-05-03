import { motion } from 'motion/react';

interface FocusTextProps {
  text: string;
}

export default function FocusText({ text }: { text: string }) {
  return (
    <div className="relative h-20 md:h-28 w-full flex items-center overflow-hidden rounded-2xl bg-black/10">
      {/* Blurred Background Text - Layer 1 */}
      <div className="absolute left-10 text-white/10 blur-md select-none">
        <h2 className="font-serif text-5xl md:text-7xl font-bold italic whitespace-nowrap uppercase tracking-tighter">
          {text}
        </h2>
      </div>

      {/* Blurred Background Text - Layer 2 (Slightly less blur) */}
      <div className="absolute left-10 text-white/20 blur-[4px] select-none">
        <h2 className="font-serif text-5xl md:text-7xl font-bold italic whitespace-nowrap uppercase tracking-tighter">
          {text}
        </h2>
      </div>

      {/* Moving Focus Window */}
      <motion.div
        className="absolute h-[80%] z-10 w-48 md:w-72 overflow-hidden flex items-center bg-white/5 backdrop-blur-none border-x border-white/20"
        initial={{ left: '-30%' }}
        animate={{ left: '110%' }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          ease: [0.45, 0, 0.55, 1],
          repeatDelay: 0.5
        }}
      >
        {/* The "Clear" Text inside - moves opposite to stay static relative to background */}
        <motion.div 
          className="absolute h-full flex items-center pl-10"
          initial={{ x: '30%' }}
          animate={{ x: '-110%' }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: [0.45, 0, 0.55, 1],
            repeatDelay: 0.5
          }}
          style={{ width: '2000px' }}
        >
          <h2 className="font-serif text-5xl md:text-7xl font-bold italic text-white whitespace-nowrap uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            {text}
          </h2>
        </motion.div>

        {/* Focus Brackets */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-white dropdown-shadow-lg" />
          <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-white dropdown-shadow-lg" />
          <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-white dropdown-shadow-lg" />
          <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-white dropdown-shadow-lg" />
        </div>
      </motion.div>

      {/* Extra glow line following the window */}
      <motion.div
        className="absolute h-full w-[2px] bg-gradient-to-b from-transparent via-white/40 to-transparent z-20"
        initial={{ left: '-30%' }}
        animate={{ left: '110%' }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          ease: [0.45, 0, 0.55, 1],
          repeatDelay: 0.5
        }}
      />
    </div>
  );
}
