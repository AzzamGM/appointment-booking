interface PicProps {
  src: string;
  alt?: string;
  className?: string;
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
      decoding="async"
      loading="lazy"
      className={`inline-block shrink-0 select-none ${
        fit === 'cover' ? 'object-cover' : 'object-contain'
      } ${className}`}
    />
  );
}
