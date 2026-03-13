export type DocumentItem = {
  id: string;
  file_name: string;
  s3_key: string;
  bucket_name: string;
  mime_type: string;
  status: string;
  uploaded_by: string;
  created_at: string;
};

export type DocumentsResponse = {
  data: DocumentItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type DocumentPreviewUrlResponse = {
  url: string;
};
