import { useCallback, useEffect, useRef, useState } from 'react';

let activePreview = null;

export default function useCardPreview() {
  const timer = useRef(null);
  const [position, setPosition] = useState(null);
  const close = useCallback(function dismiss() {
    clearTimeout(timer.current);
    setPosition(null);
    if (activePreview === dismiss) activePreview = null;
  }, []);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (activePreview === close) activePreview = null;
    },
    [close],
  );
  function open(element, delay = 280) {
    clearTimeout(timer.current);
    const rect = element.getBoundingClientRect();
    const side = window.innerWidth - rect.right >= 290 ? 'right' : 'left';
    timer.current = setTimeout(() => {
      activePreview?.();
      activePreview = close;
      setPosition(side);
    }, delay);
  }
  return {
    position,
    close,
    handlers: {
      onPointerEnter: (event) => {
        if (event.pointerType !== 'touch') open(event.currentTarget);
      },
      onPointerLeave: close,
      onFocus: (event) => {
        if (
          !event.currentTarget.contains(event.relatedTarget) &&
          window.matchMedia('(hover: hover)').matches
        )
          open(event.currentTarget, 0);
      },
      onBlur: (event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      },
      onKeyDown: (event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          close();
        }
      },
    },
  };
}
