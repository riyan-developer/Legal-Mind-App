import type {
  CitationDocumentContext,
  CitationRecord,
  RetrievedChunk,
} from './chats.types.js';

const asRecord = (value: unknown) =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const asString = (value: unknown) => (typeof value === 'string' ? value : '');

const asNumber = (value: unknown, fallback = 1) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const truncateText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }

  const clipped = value.slice(0, maxLength).trimEnd();
  const lastSpace = clipped.lastIndexOf(' ');

  return `${(lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}...`;
};

const normalizeCitationText = (value: unknown, maxLength?: number) => {
  const normalized = asString(value)
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();

  if (!normalized) {
    return '';
  }

  return maxLength ? truncateText(normalized, maxLength) : normalized;
};

const deriveSearchText = (value: unknown) => {
  const normalized = normalizeCitationText(value);

  if (!normalized) {
    return undefined;
  }

  const sentenceMatch = normalized.match(/(.+?[.!?])(?:\s|$)/);
  const sentence = sentenceMatch?.[1]?.trim() ?? '';

  if (sentence.length >= 24 && sentence.length <= 180) {
    return sentence;
  }

  const keyword = normalized.split(' ').slice(0, 18).join(' ').trim();
  return keyword ? truncateText(keyword, 180) : undefined;
};

export const buildFallbackCitations = (
  chunks: RetrievedChunk[],
  documentContext: CitationDocumentContext,
): CitationRecord[] =>
  chunks
    .map((chunk, index) => {
      const excerpt = normalizeCitationText(chunk.chunk_text, 360);

      if (!excerpt) {
        return null;
      }

      const citation: CitationRecord = {
        id: index + 1,
        documentName: documentContext.documentName,
        documentId: documentContext.documentId,
        s3Key: documentContext.documentS3Key ?? undefined,
        page: Math.max(chunk.page_number ?? 1, 1),
        excerpt,
        highlightText: normalizeCitationText(chunk.section_title, 120) || undefined,
        searchText: deriveSearchText(chunk.chunk_text),
        chunkId: chunk.id,
      };

      return citation;
    })
    .filter((citation): citation is CitationRecord => Boolean(citation));

export const normalizeGeneratedCitations = (
  rawCitations: Array<Record<string, unknown>>,
  chunks: RetrievedChunk[],
  documentContext: CitationDocumentContext,
) => {
  const chunkById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const fallbackCitations = buildFallbackCitations(chunks, documentContext);

  const normalized = rawCitations
    .map((rawCitation, index) => {
      const citation = asRecord(rawCitation);
      const chunkId = asString(citation.chunkId || citation.chunk_id);
      const sourceChunk = (chunkId ? chunkById.get(chunkId) : undefined) ?? chunks[index];
      const excerpt = normalizeCitationText(
        citation.excerpt || citation.text || sourceChunk?.chunk_text,
        360,
      );

      if (!excerpt) {
        return null;
      }

      const normalizedCitation: CitationRecord = {
        id: Math.max(asNumber(citation.id, index + 1), 1),
        documentName:
          normalizeCitationText(citation.documentName || citation.document_name, 160) ||
          documentContext.documentName,
        documentId:
          normalizeCitationText(citation.documentId || citation.document_id, 120) ||
          documentContext.documentId,
        s3Key:
          normalizeCitationText(citation.s3Key || citation.s3_key, 512) ||
          documentContext.documentS3Key ||
          undefined,
        page: Math.max(
          asNumber(citation.page || citation.page_number || sourceChunk?.page_number, 1),
          1,
        ),
        excerpt,
        highlightText:
          normalizeCitationText(
            citation.highlightText || citation.highlight_text || sourceChunk?.section_title,
            120,
          ) || undefined,
        searchText:
          normalizeCitationText(citation.searchText || citation.search_text, 180) ||
          deriveSearchText(sourceChunk?.chunk_text),
        chunkId: chunkId || sourceChunk?.id,
      };

      return normalizedCitation;
    })
    .filter((citation): citation is CitationRecord => Boolean(citation));

  return normalized.length > 0 ? normalized : fallbackCitations;
};
