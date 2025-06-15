/**
 * Extends the current text selection to include the full sentence it's part of.
 * This is used to provide context for word translations.
 * @param {Selection} sel The window.Selection object.
 * @returns {{fullSentence: string, anchorNode: Node}}
 */
function extendToSentence(sel) {
  if (!sel || sel.rangeCount === 0) {
    return { fullSentence: '', anchorNode: null };
  }

  const selectionText = sel.toString().trim();
  const range = sel.getRangeAt(0);
  const container = range.commonAncestorContainer;

  // Find the nearest block-level or significant ancestor element.
  let parentElement = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
  while (parentElement && window.getComputedStyle(parentElement).display.startsWith('inline')) {
    parentElement = parentElement.parentElement;
  }
  
  if (!parentElement || !parentElement.textContent) {
    return { fullSentence: selectionText, anchorNode: sel.anchorNode };
  }

  const allText = parentElement.textContent;
  const selIndex = allText.indexOf(selectionText);

  if (selIndex === -1) {
    // Fallback if the exact text isn't found (e.g., due to different whitespace)
    return { fullSentence: selectionText, anchorNode: sel.anchorNode };
  }

  // Find sentence start by looking for terminators before the selection.
  let startIndex = 0;
  for (let i = selIndex; i > 0; i--) {
    if ('.?!'.includes(allText[i]) && allText[i+1] === ' ') {
      startIndex = i + 2; // Start after the terminator and space
      break;
    }
  }

  // Find sentence end by looking for terminators after the selection.
  let endIndex = allText.length;
  for (let i = selIndex + selectionText.length; i < allText.length; i++) {
    if ('.?!'.includes(allText[i])) {
      endIndex = i + 1;
      break;
    }
  }

  const fullSentence = allText.substring(startIndex, endIndex).trim();
  
  // If the sentence extraction fails or is empty, return the original selection
  return { fullSentence: fullSentence || selectionText, anchorNode: sel.anchorNode };
}
