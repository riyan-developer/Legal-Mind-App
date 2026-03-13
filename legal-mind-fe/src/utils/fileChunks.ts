export const createFileChunks = (
  file: File,
  chunkSize = 5 * 1024 * 1024 // 5MB
) => {
  const chunks: Blob[] = [];
  let start = 0;

  while (start < file.size) {
    const end = start + chunkSize;
    chunks.push(file.slice(start, end));
    start = end;
  }

  return chunks;
};