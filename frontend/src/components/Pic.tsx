// Small wrapper for the sketch-icon SVGs so sizing and a11y stay consistent.
// Icons are decorative by default (alt="") — pass `alt` when one carries meaning.

interface PicProps {
  src: string;
  alt?: string;
  /** Tailwind size classes, e.g. "h-6 w-6". Defaults to a small inline icon. */
  className?: string;
  /** "contain" (default) letterboxes the art; "cover" fills the frame — use for avatars. */
  fit?: 'contain' | 'cover';
  title?: string;
}

export default function Pic({ src, alt = '', className = 'h-6 w-6', fit = 'contain', title }: PicProps) {
  return (
    <img
      src={src}
      alt={alt}
      title={title}
      draggable={false}
      className={`inline-block shrink-0 select-none ${
        fit === 'cover' ? 'object-cover' : 'object-contain'
      } ${className}`}
    />
  );
}
