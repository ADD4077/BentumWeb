import React from 'react';

function ShinyText({
  text,
  speed = 2.9,
  delay = 0,
  color = '#10b981',
  shineColor = '#22d3ee',
  spread = 125,
  direction = 'left',
  yoyo = false,
  pauseOnHover = false,
  disabled = false,
  className = '',
}) {
  const animationName = yoyo ? 'shinyTextYoyo' : 'shinyTextLoop';
  const directionMultiplier = direction === 'right' ? '-1' : '1';

  return (
    <span
      className={`shiny-text ${pauseOnHover ? 'shiny-text--pause-hover' : ''} ${disabled ? 'shiny-text--disabled' : ''} ${className}`.trim()}
      style={{
        '--shiny-base': color,
        '--shiny-glow': shineColor,
        '--shiny-spread': `${spread}%`,
        '--shiny-duration': `${speed}s`,
        '--shiny-delay': `${delay}s`,
        '--shiny-direction': directionMultiplier,
        '--shiny-animation': animationName,
      }}
    >
      <span className="shiny-text__base">{text}</span>
      <span className="shiny-text__shine" aria-hidden="true">
        {text}
      </span>
    </span>
  );
}

export default ShinyText;
