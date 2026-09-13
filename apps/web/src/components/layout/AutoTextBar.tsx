import './layout.css';

interface AutoTextBarProps {
  readonly text: string;
}

export function AutoTextBar({ text }: AutoTextBarProps) {
  return (
    <div className="autotext-bar" aria-hidden="true">
      <span className="autotext-bar__text">{text}</span>
    </div>
  );
}
