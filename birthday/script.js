const stage = document.querySelector(".story-stage");

if (stage) {
  const stories = JSON.parse(stage.dataset.stories || "[]");
  const storyDisplay = document.getElementById("story-display");
  const storyPosition = document.getElementById("story-position");
  const currentStoryIdInput = document.getElementById("current-story-id");
  const prevButton = document.getElementById("prev-story");
  const nextButton = document.getElementById("next-story");
  let storyOrder = shuffle([...stories]);
  let currentIndex = 0;

  function renderStory() {
    if (!storyOrder.length) {
      return;
    }

    const currentStory = storyOrder[currentIndex];
    storyDisplay.textContent = currentStory.story;
    storyPosition.textContent = `Story ${currentIndex + 1} of ${storyOrder.length}`;
    if (currentStoryIdInput) {
      currentStoryIdInput.value = currentStory.id || "";
    }
  }

  function goNext() {
    currentIndex = (currentIndex + 1) % storyOrder.length;
    renderStory();
  }

  function goPrev() {
    currentIndex = (currentIndex - 1 + storyOrder.length) % storyOrder.length;
    renderStory();
  }

  prevButton?.addEventListener("click", goPrev);
  nextButton?.addEventListener("click", goNext);

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      goNext();
    }

    if (event.key === "ArrowLeft") {
      goPrev();
    }
  });

  renderStory();
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items;
}
