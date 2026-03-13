
export const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export const isPdfFile = (file: File) => {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}