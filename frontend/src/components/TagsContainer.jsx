import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';

/**
 * Компонент для отображения тегов с адаптивным скрытием
 */
export const TagsContainer = React.memo(({ tags, onTagClick }) => {
  const [visibleCount, setVisibleCount] = useState(1);
  const containerRef = useRef(null);

  const updateVisibleCount = useCallback(() => {
    if (!containerRef.current || !tags.length) return;
    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    if (containerWidth < 80) {
      setVisibleCount(1);
      return;
    }
    const measureElement = document.createElement('span');
    measureElement.style.visibility = 'hidden';
    measureElement.style.position = 'absolute';
    measureElement.style.fontSize = '12px';
    measureElement.style.fontWeight = '500';
    measureElement.style.padding = '8px';
    measureElement.style.whiteSpace = 'nowrap';
    measureElement.style.borderRadius = '8px';
    document.body.appendChild(measureElement);
    measureElement.textContent = '+99';
    const plusWidth = measureElement.offsetWidth;
    const gap = 4;
    let totalWidth = 0;
    let maxTags = 1;
    for (let i = 0; i < tags.length; i++) {
      measureElement.textContent = tags[i];
      const tagWidth = measureElement.offsetWidth;
      const remainingTags = tags.length - i - 1;
      const needsPlus = remainingTags > 0;
      if (i === 0) {
        totalWidth = tagWidth;
        maxTags = 1;
      } else {
        const nextWidth = totalWidth + gap + tagWidth + (needsPlus ? plusWidth + gap : 0);
        if (nextWidth <= containerWidth) {
          totalWidth += gap + tagWidth;
          maxTags++;
        } else {
          break;
        }
      }
    }
    document.body.removeChild(measureElement);
    setVisibleCount(Math.max(1, maxTags));
  }, [tags.length]);

  useEffect(() => {
    const timers = [
      setTimeout(updateVisibleCount, 0),
      setTimeout(updateVisibleCount, 50),
      setTimeout(updateVisibleCount, 200),
      setTimeout(updateVisibleCount, 500)
    ];
    const handleResize = () => {
      clearTimeout(handleResize.timer);
      handleResize.timer = setTimeout(updateVisibleCount, 100);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      timers.forEach(timer => clearTimeout(timer));
      window.removeEventListener('resize', handleResize);
      clearTimeout(handleResize.timer);
    };
  }, [updateVisibleCount]);

  const visibleTags = useMemo(() => tags.slice(0, visibleCount), [tags, visibleCount]);
  const remainingCount = useMemo(() => tags.length - visibleCount, [tags.length, visibleCount]);

  return (
    <div ref={containerRef} className="flex items-center gap-1 overflow-hidden sm:overflow-x-auto">
      {visibleTags.map((tag, index) => (
        <button
          key={`${tag}-${index}-${visibleCount}`}
          onClick={() => onTagClick && onTagClick(tag)}
          className="inline-block px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg whitespace-nowrap flex-shrink-0 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
          title={`Фильтровать по тегу: ${tag}`}
        >
          #{tag}
        </button>
      ))}
      {remainingCount > 0 && (
        <span
          className="inline-block px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg whitespace-nowrap flex-shrink-0"
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
});

export default TagsContainer;
