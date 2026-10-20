/** Shrinks a logo to a small PNG so it can be saved with the client. */
export function fileToLogo(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, max / Math.max(image.width, image.height, 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) { URL.revokeObjectURL(url); reject(new Error("Could not read this image")); return; }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read this image")); };
    image.src = url;
  });
}

export const clientColors = ["#2F6FDB", "#1D9E5A", "#7C5CD6", "#D6457A", "#E08A1E", "#0F8F8F", "#5A6B7D", "#B7864B"];
