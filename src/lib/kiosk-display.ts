export const requestKioskFullscreen = async () => {
  if (typeof document === "undefined") return false;
  const element: any = document.documentElement;
  const request =
    element.requestFullscreen ||
    element.webkitRequestFullscreen ||
    element.mozRequestFullScreen ||
    element.msRequestFullscreen;

  if (!request) return false;

  try {
    await request.call(element);
    return true;
  } catch {
    return false;
  }
};

export const exitKioskFullscreen = async () => {
  if (typeof document === "undefined") return;
  const doc: any = document;
  const exit =
    doc.exitFullscreen ||
    doc.webkitExitFullscreen ||
    doc.mozCancelFullScreen ||
    doc.msExitFullscreen;

  if (!exit) return;

  try {
    await exit.call(doc);
  } catch {
    // no-op
  }
};
