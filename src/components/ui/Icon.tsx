interface IconProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 18, className, style }: IconProps) {
  return (
    <svg width={size} height={size} className={className} style={style}>
      <use href={`#ico-${name}`} />
    </svg>
  );
}
