'use client';

import { RefObject, useEffect } from 'react';

type NavInput = HTMLInputElement;

const NAV_ATTR = 'data-pricing-nav-cell';
const MODE_ATTR = 'data-pricing-nav-mode';

function isNavInput(target: EventTarget | null): target is NavInput {
  return target instanceof HTMLInputElement && !target.disabled && target.type !== 'hidden';
}

function navInputs(root: HTMLElement): NavInput[] {
  return Array.from(root.querySelectorAll<NavInput>(`input[${NAV_ATTR}]`))
    .filter(input => !input.disabled && input.type !== 'hidden');
}

function setMode(input: NavInput, mode: 'edit' | 'navigate') {
  input.setAttribute(MODE_ATTR, mode);
  if (mode === 'edit') {
    requestAnimationFrame(() => {
      try {
        const length = input.value.length;
        input.setSelectionRange?.(length, length);
      } catch {
        // Number/date inputs do not support text selection APIs in every browser.
      }
    });
  }
}

function focusInput(input: NavInput, mode: 'edit' | 'navigate') {
  setMode(input, mode);
  input.focus();
  if (mode === 'navigate') {
    try {
      input.select();
    } catch {
      // Keep focus visible even when a control cannot be selected.
    }
  }
}

function isPrintableKey(event: KeyboardEvent) {
  return event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey;
}

function canStartInput(input: NavInput, key: string) {
  if (input.type !== 'number') return true;
  return /[0-9.-]/.test(key);
}

function replaceInputValue(input: NavInput, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function rowAligned(from: DOMRect, candidates: NavInput[], direction: 'up' | 'down') {
  const centerX = from.left + from.width / 2;
  const centerY = from.top + from.height / 2;

  return candidates
    .map(input => ({ input, rect: input.getBoundingClientRect() }))
    .filter(({ rect }) => direction === 'up'
      ? rect.top + rect.height / 2 < centerY - 4
      : rect.top + rect.height / 2 > centerY + 4)
    .sort((a, b) => {
      const aY = Math.abs((a.rect.top + a.rect.height / 2) - centerY);
      const bY = Math.abs((b.rect.top + b.rect.height / 2) - centerY);
      const aX = Math.abs((a.rect.left + a.rect.width / 2) - centerX);
      const bX = Math.abs((b.rect.left + b.rect.width / 2) - centerX);
      return aY - bY || aX - bX;
    })[0]?.input;
}

function moveFrom(root: HTMLElement, current: NavInput, direction: 'left' | 'right' | 'up' | 'down' | 'next' | 'previous') {
  const inputs = navInputs(root);
  const index = inputs.indexOf(current);
  if (index < 0) return;

  const nextByOrder =
    direction === 'next' || direction === 'right'
      ? inputs[index + 1] ?? (direction === 'next' ? inputs[0] : undefined)
      : direction === 'previous' || direction === 'left'
        ? inputs[index - 1] ?? (direction === 'previous' ? inputs[inputs.length - 1] : undefined)
        : undefined;

  const nextByPosition =
    direction === 'up' || direction === 'down'
      ? rowAligned(current.getBoundingClientRect(), inputs.filter(input => input !== current), direction)
      : undefined;

  const next = nextByPosition ?? nextByOrder;
  if (next) focusInput(next, 'navigate');
}

export function usePricingKeyboardNav(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootElement = root;

    const markInputs = () => {
      rootElement.querySelectorAll<HTMLInputElement>('input').forEach(input => {
        if (!input.disabled && input.type !== 'hidden') input.setAttribute(NAV_ATTR, 'true');
      });
    };

    markInputs();
    const observer = new MutationObserver(markInputs);
    observer.observe(rootElement, { childList: true, subtree: true });

    function handlePointerDown(event: PointerEvent) {
      if (isNavInput(event.target)) event.target.dataset.pricingPointerIntent = 'edit';
    }

    function handleFocusIn(event: FocusEvent) {
      if (!isNavInput(event.target)) return;
      const mode = event.target.dataset.pricingPointerIntent === 'edit' ? 'edit' : 'navigate';
      delete event.target.dataset.pricingPointerIntent;
      setMode(event.target, mode);
      if (mode === 'navigate') {
        try {
          event.target.select();
        } catch {
          // Keep focus visible even when a control cannot be selected.
        }
      }
    }

    function handleClick(event: MouseEvent) {
      if (isNavInput(event.target)) setMode(event.target, 'edit');
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!isNavInput(event.target)) return;
      const input = event.target;
      const mode = input.getAttribute(MODE_ATTR) ?? 'edit';

      if (mode === 'edit') {
        if (event.key === 'Tab') {
          event.preventDefault();
          moveFrom(rootElement, input, event.shiftKey ? 'previous' : 'next');
        } else if (event.key === 'Enter') {
          event.preventDefault();
          moveFrom(rootElement, input, 'down');
        }
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveFrom(rootElement, input, 'left');
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveFrom(rootElement, input, 'right');
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveFrom(rootElement, input, 'up');
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        event.preventDefault();
        moveFrom(rootElement, input, 'down');
        return;
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        moveFrom(rootElement, input, event.shiftKey ? 'previous' : 'next');
        return;
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        replaceInputValue(input, '');
        focusInput(input, 'edit');
        return;
      }
      if (isPrintableKey(event) && canStartInput(input, event.key)) {
        event.preventDefault();
        replaceInputValue(input, event.key);
        focusInput(input, 'edit');
      }
    }

    rootElement.addEventListener('pointerdown', handlePointerDown, true);
    rootElement.addEventListener('focusin', handleFocusIn, true);
    rootElement.addEventListener('click', handleClick, true);
    rootElement.addEventListener('keydown', handleKeyDown, true);

    return () => {
      observer.disconnect();
      rootElement.removeEventListener('pointerdown', handlePointerDown, true);
      rootElement.removeEventListener('focusin', handleFocusIn, true);
      rootElement.removeEventListener('click', handleClick, true);
      rootElement.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [rootRef]);
}
