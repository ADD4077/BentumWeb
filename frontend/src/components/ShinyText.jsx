import React from 'react';

function ShinyText({
  text,
  speed = 4.8,
  delay = 0,
  color = '#10b981',
  shineColor = '#22d3ee',
  pauseOnHover = false,
  disabled = false,
  className = '',
}) {
  return (
    <span
      className={`shiny-text ${pauseOnHover ? 'shiny-text--pause-hover' : ''} ${disabled ? 'shiny-text--disabled' : ''} ${className}`.trim()}
      style={{
        '--shiny-base': color,
        '--shiny-glow': shineColor,
        '--shiny-duration': `${speed}s`,
        '--shiny-delay': `${delay}s`,
      }}
    >
      <span className={`shiny-text__base ${disabled ? 'shiny-text__base--static' : ''}`}>{text}</span>
    </span>
  );
}

export default ShinyText;
