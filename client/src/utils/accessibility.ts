// Accessibility utilities and helpers

// Keyboard navigation constants
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End'
} as const;

// ARIA live region announcer
export class LiveRegionAnnouncer {
  private static instance: LiveRegionAnnouncer;
  private liveRegion: HTMLElement | null = null;

  private constructor() {
    this.createLiveRegion();
  }

  public static getInstance(): LiveRegionAnnouncer {
    if (!LiveRegionAnnouncer.instance) {
      LiveRegionAnnouncer.instance = new LiveRegionAnnouncer();
    }
    return LiveRegionAnnouncer.instance;
  }

  private createLiveRegion(): void {
    if (typeof window === 'undefined') return;

    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.setAttribute('class', 'sr-only');
    this.liveRegion.style.position = 'absolute';
    this.liveRegion.style.left = '-10000px';
    this.liveRegion.style.width = '1px';
    this.liveRegion.style.height = '1px';
    this.liveRegion.style.overflow = 'hidden';

    document.body.appendChild(this.liveRegion);
  }

  public announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.liveRegion) return;

    this.liveRegion.setAttribute('aria-live', priority);
    this.liveRegion.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = '';
      }
    }, 1000);
  }
}

// Focus management utilities
export const focusUtils = {
  // Trap focus within an element
  trapFocus: (element: HTMLElement): (() => void) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === KEYBOARD_KEYS.TAB) {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable?.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable?.focus();
          }
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    firstFocusable?.focus();

    // Return cleanup function
    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  },

  // Save and restore focus
  saveFocus: (): (() => void) => {
    const activeElement = document.activeElement as HTMLElement;
    return () => {
      if (activeElement && typeof activeElement.focus === 'function') {
        activeElement.focus();
      }
    };
  },

  // Move focus to element with announcement
  focusWithAnnouncement: (element: HTMLElement, message: string) => {
    element.focus();
    LiveRegionAnnouncer.getInstance().announce(message);
  }
};

// Keyboard navigation helpers
export const keyboardNavigation = {
  // Handle arrow key navigation in a list
  handleListNavigation: (
    e: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    onIndexChange: (newIndex: number) => void
  ) => {
    let newIndex = currentIndex;

    switch (e.key) {
      case KEYBOARD_KEYS.ARROW_UP:
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case KEYBOARD_KEYS.ARROW_DOWN:
        e.preventDefault();
        newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      case KEYBOARD_KEYS.HOME:
        e.preventDefault();
        newIndex = 0;
        break;
      case KEYBOARD_KEYS.END:
        e.preventDefault();
        newIndex = items.length - 1;
        break;
      default:
        return;
    }

    onIndexChange(newIndex);
    items[newIndex]?.focus();
  },

  // Handle tab panel navigation
  handleTabNavigation: (
    e: KeyboardEvent,
    tabs: string[],
    currentTab: string,
    onTabChange: (newTab: string) => void
  ) => {
    const currentIndex = tabs.indexOf(currentTab);
    let newIndex = currentIndex;

    switch (e.key) {
      case KEYBOARD_KEYS.ARROW_LEFT:
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case KEYBOARD_KEYS.ARROW_RIGHT:
        e.preventDefault();
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case KEYBOARD_KEYS.HOME:
        e.preventDefault();
        newIndex = 0;
        break;
      case KEYBOARD_KEYS.END:
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    onTabChange(tabs[newIndex]);
  }
};

// Color contrast utilities
export const colorContrast = {
  // Check if color combination meets WCAG AA standards
  meetsContrastRequirement: (foreground: string, background: string): boolean => {
    // This is a simplified version - in a real app, you'd use a proper color contrast library
    const luminance1 = getLuminance(foreground);
    const luminance2 = getLuminance(background);
    const contrast = (Math.max(luminance1, luminance2) + 0.05) / (Math.min(luminance1, luminance2) + 0.05);
    return contrast >= 4.5; // WCAG AA standard
  }
};

// Helper function to calculate luminance (simplified)
function getLuminance(color: string): number {
  // This is a very basic implementation
  // In production, use a proper color parsing library
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  const [rs, gs, bs] = [r, g, b].map(c => 
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Screen reader utilities
export const screenReader = {
  // Create descriptive text for complex UI elements
  describeElement: (
    elementType: string,
    state: Record<string, any>,
    context?: string
  ): string => {
    let description = elementType;
    
    if (context) {
      description += ` in ${context}`;
    }
    
    // Add state information
    const stateDescriptions = [];
    if (state.selected) stateDescriptions.push('selected');
    if (state.expanded) stateDescriptions.push('expanded');
    if (state.disabled) stateDescriptions.push('disabled');
    if (state.loading) stateDescriptions.push('loading');
    
    if (stateDescriptions.length > 0) {
      description += `, ${stateDescriptions.join(', ')}`;
    }
    
    return description;
  },

  // Create progress announcements
  announceProgress: (current: number, total: number, item?: string): string => {
    const itemText = item ? ` ${item}` : '';
    return `${current} of ${total}${itemText}`;
  },

  // Create loading announcements
  announceLoading: (action: string): string => {
    return `Loading ${action}, please wait`;
  },

  // Create success announcements
  announceSuccess: (action: string): string => {
    return `${action} completed successfully`;
  },

  // Create error announcements
  announceError: (action: string, error?: string): string => {
    const errorText = error ? `: ${error}` : '';
    return `Error ${action}${errorText}`;
  }
};

// Form accessibility helpers
export const formAccessibility = {
  // Generate proper ARIA attributes for form fields
  getFieldAttributes: (
    fieldId: string,
    label: string,
    error?: string,
    description?: string,
    required?: boolean
  ) => {
    const attributes: Record<string, any> = {
      id: fieldId,
      'aria-label': label,
      'aria-required': required || false
    };

    if (error) {
      attributes['aria-invalid'] = true;
      attributes['aria-describedby'] = `${fieldId}-error`;
    }

    if (description) {
      attributes['aria-describedby'] = `${fieldId}-description`;
    }

    if (error && description) {
      attributes['aria-describedby'] = `${fieldId}-description ${fieldId}-error`;
    }

    return attributes;
  }
};

// Reduced motion utilities
export const reducedMotion = {
  // Check if user prefers reduced motion
  prefersReducedMotion: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Apply appropriate animation duration
  getAnimationDuration: (defaultDuration: number): number => {
    return reducedMotion.prefersReducedMotion() ? 0 : defaultDuration;
  }
};

// Export the live region announcer instance
export const announcer = LiveRegionAnnouncer.getInstance();