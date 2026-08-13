const currentEntry = document.querySelector("[data-entry-closes]");

if (currentEntry) {
  const closesAt = Date.parse(currentEntry.dataset.entryCloses);

  if (Number.isFinite(closesAt) && Date.now() >= closesAt) {
    currentEntry.hidden = true;
  }
}
