let compressionProgress = 0;
let isCompleted = false;

export function getCompressionProgress() {
  return {
    progress: compressionProgress,
    isCompleted,
  };
}

export function setCompressionProgress(progress: number) {
  compressionProgress = progress;
  isCompleted = progress >= 100;
}

export function resetCompressionProgress() {
  compressionProgress = 0;
  isCompleted = false;
}
