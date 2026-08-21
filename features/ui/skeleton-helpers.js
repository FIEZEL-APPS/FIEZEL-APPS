/* Skeleton HTML Helpers - Ready to use in component rendering */

const SkeletonHelpers = {
  /* Vocabulary feature skeleton */
  vocabularySkeleton: () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton" style="height: 12px; width: 60%; margin-bottom: 12px;"></div>
      <div class="skeleton" style="height: 48px; margin-bottom: 12px;"></div>
      <div class="skeleton" style="height: 40px;"></div>
    </div>
    <div class="skeleton-card">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton" style="height: 12px; width: 60%; margin-bottom: 12px;"></div>
      <div class="skeleton" style="height: 48px; margin-bottom: 12px;"></div>
      <div class="skeleton" style="height: 40px;"></div>
    </div>
    <div class="skeleton-card">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton" style="height: 12px; width: 60%; margin-bottom: 12px;"></div>
      <div class="skeleton" style="height: 48px; margin-bottom: 12px;"></div>
      <div class="skeleton" style="height: 40px;"></div>
    </div>
  `,

  /* Grammar lesson skeleton */
  grammaryLessonSkeleton: () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-title" style="width: 80%;"></div>
      <div class="skeleton" style="height: 12px; width: 100%; margin-bottom: 8px;"></div>
      <div class="skeleton" style="height: 12px; width: 100%; margin-bottom: 8px;"></div>
      <div class="skeleton" style="height: 12px; width: 70%;"></div>
    </div>
    <div style="height: 300px; background: var(--panel-soft); border-radius: var(--radius-md); animation: pulse 1.5s ease-in-out infinite;"></div>
  `,

  /* Reading comprehension skeleton */
  readingSkeleton: () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton" style="height: 12px; width: 90%; margin-bottom: 8px;"></div>
      <div class="skeleton" style="height: 12px; width: 88%; margin-bottom: 8px;"></div>
      <div class="skeleton" style="height: 12px; width: 92%;"></div>
    </div>
    <div class="skeleton-grid" style="grid-template-columns: 1fr;">
      <div class="skeleton-card">
        <div class="skeleton" style="height: 14px; width: 100%; margin-bottom: 12px;"></div>
        <div class="skeleton" style="height: 40px;"></div>
      </div>
      <div class="skeleton-card">
        <div class="skeleton" style="height: 14px; width: 100%; margin-bottom: 12px;"></div>
        <div class="skeleton" style="height: 40px;"></div>
      </div>
      <div class="skeleton-card">
        <div class="skeleton" style="height: 14px; width: 100%; margin-bottom: 12px;"></div>
        <div class="skeleton" style="height: 40px;"></div>
      </div>
    </div>
  `,

  /* Progress/Stats skeleton */
  statsSkeleton: () => `
    <div class="skeleton-grid" style="grid-template-columns: repeat(2, 1fr);">
      <div style="background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 16px;">
        <div class="skeleton" style="height: 12px; width: 60%; margin-bottom: 12px;"></div>
        <div class="skeleton" style="height: 28px; width: 80%;"></div>
      </div>
      <div style="background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 16px;">
        <div class="skeleton" style="height: 12px; width: 60%; margin-bottom: 12px;"></div>
        <div class="skeleton" style="height: 28px; width: 80%;"></div>
      </div>
      <div style="background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 16px;">
        <div class="skeleton" style="height: 12px; width: 60%; margin-bottom: 12px;"></div>
        <div class="skeleton" style="height: 28px; width: 80%;"></div>
      </div>
      <div style="background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 16px;">
        <div class="skeleton" style="height: 12px; width: 60%; margin-bottom: 12px;"></div>
        <div class="skeleton" style="height: 28px; width: 80%;"></div>
      </div>
    </div>
  `,

  /* List/feed skeleton */
  listSkeleton: (count = 3) => {
    const items = Array(count)
      .fill(null)
      .map(
        () => `
      <div class="skeleton-card">
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
          <div class="skeleton-avatar"></div>
          <div style="flex: 1;">
            <div class="skeleton" style="height: 12px; width: 70%; margin-bottom: 6px;"></div>
            <div class="skeleton" style="height: 10px; width: 40%;"></div>
          </div>
        </div>
        <div class="skeleton" style="height: 12px; width: 100%; margin-bottom: 8px;"></div>
        <div class="skeleton" style="height: 12px; width: 95%;"></div>
      </div>
    `
      )
      .join('');
    return items;
  },

  /* Grid of items skeleton */
  gridSkeleton: (cols = 3, rows = 2) => {
    const total = cols * rows;
    const items = Array(total)
      .fill(null)
      .map(
        () => `
      <div style="background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 16px;">
        <div class="skeleton" style="height: 120px; margin-bottom: 12px; border-radius: 8px;"></div>
        <div class="skeleton" style="height: 14px; width: 90%; margin-bottom: 8px;"></div>
        <div class="skeleton" style="height: 12px; width: 60%;"></div>
      </div>
    `
      )
      .join('');

    return `<div class="skeleton-grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>`;
  },

  /* Render skeleton with container */
  renderSkeleton: (elementId, skeletonHTML) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = skeletonHTML;
      window.FiezelUI?.setLoadingState(element, true);
    }
  },

  /* Replace skeleton with actual content */
  hideSkeleton: (elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
      window.FiezelUI?.setLoadingState(element, false);
    }
  }
};

// Make available globally
window.SkeletonHelpers = SkeletonHelpers;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SkeletonHelpers;
}
