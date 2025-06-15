const GAP = 20;

/**
 * Recalculates and applies the vertical position for all floating cards.
 * Cards are stacked vertically with a fixed gap.
 */
function layoutCards() {
  const cards = [...document.querySelectorAll('[data-itf-card]')];
  // Sort cards based on their creation order
  cards.sort((a, b) => parseInt(a.dataset.order) - parseInt(b.dataset.order));
  
  let top = 20; // Initial top offset
  cards.forEach(card => {
    card.style.top = `${top}px`;
    top += card.offsetHeight + GAP;
  });
}
