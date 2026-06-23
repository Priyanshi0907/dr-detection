import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/**
 * TypeWriter — reveals text one character at a time.
 * Props: text, speed (ms/char, default 40), className, delay (ms, default 0)
 */
export function TypeWriter({ text = '', speed = 40, className = '', delay = 0 }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    setDisplayed('');
    let i = 0;
    const timer = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, started]);

  return (
    <span className={className}>
      {displayed}
      {displayed.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-0.5 h-[1em] bg-current ml-0.5 align-middle"
        />
      )}
    </span>
  );
}

/**
 * WordReveal — staggered word-by-word fade + slide-up animation.
 * Props: text, className (per-word), delay (stagger, default 0.08s)
 */
export function WordReveal({ text = '', className = '', stagger = 0.08, once = true }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once });

  const words = text.split(' ');

  return (
    <span ref={ref} style={{ display: 'inline' }}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
          animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{ duration: 0.5, delay: i * stagger, ease: 'easeOut' }}
          style={{ display: 'inline-block', marginRight: '0.25em' }}
          className={className}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

/**
 * GradientShimmer — text with an animated shimmer gradient sweep.
 * Props: text, className, colors (gradient stops array)
 */
export function GradientShimmer({ text = '', className = '', tag: Tag = 'span' }) {
  return (
    <Tag
      className={className}
      style={{
        background: 'linear-gradient(90deg, #0B7285 0%, #14B8A6 40%, #FFC107 60%, #0B7285 100%)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'shimmer 3s linear infinite',
      }}
    >
      {text}
    </Tag>
  );
}

/**
 * AnimatedCounter — counts up from 0 to a target number on mount / inView.
 * Props: value (number), suffix (string), duration (s), className
 */
export function AnimatedCounter({ value, suffix = '', prefix = '', duration = 1.5, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const step = (timestamp) => {
      const elapsed = (timestamp - start) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{count}{suffix}
    </span>
  );
}

/**
 * HighlightReveal — underline highlight that sweeps in from left on scroll-into-view.
 */
export function HighlightReveal({ children, color = '#14B8A6', className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });

  return (
    <span ref={ref} className={`relative inline-block ${className}`}>
      {children}
      <motion.span
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          bottom: '-2px',
          left: 0,
          right: 0,
          height: '3px',
          background: color,
          borderRadius: '2px',
          transformOrigin: 'left',
        }}
      />
    </span>
  );
}
