# LegalMind

LegalMind is split into three services:

- `legal-mind-fe`: React frontend, Tailwind UI, chat screen, auth flow, uploads, citations, Playwright tests
- `legal-mind-expressjs`: main API, auth/JWT, upload orchestration, Supabase reads/writes, audit logs, WebSocket fanout
- `legal-mind-python`: PDF extraction, chunking, embeddings, SNS ingestion, grounded answer streaming

## Core stack

- Frontend: React + Tailwind CSS
- API: Express + Supabase + WebSocket server
- AI service: FastAPI + OpenAI
- Storage: S3 for uploaded PDFs
- Database: Supabase for users, documents, chunks, chats, messages, audit logs

## How file upload works

1. User uploads a PDF from the frontend.
2. Express starts S3 multipart upload, creates a `documents` row, and creates a linked `chat`.
3. Express emits a WebSocket document update so the sidebar/chat screen can show `Uploading` or `Indexing`.
4. After the file is completed in S3, Python receives the SNS notification at `/sns/s3-upload-complete`.
5. Python downloads the PDF from S3, extracts text page by page, chunks it, and creates embeddings with OpenAI.
6. Python sends the indexed chunks back to Express.
7. Express stores the chunks in Supabase, marks the document as `indexed`, and broadcasts the final realtime update.

## How question answering works

1. User sends a message from the chat screen.
2. Express saves the user message and creates an empty assistant placeholder message.
3. Express asks Python for the question embedding.
4. Express runs Supabase retrieval against the document chunks and gets the most relevant context.
5. Express sends the question plus retrieved chunks to Python `/answers/stream`.
6. Python builds a grounded prompt and streams answer deltas from OpenAI.
7. Express forwards those deltas to the frontend over WebSocket so the answer appears live.
8. When streaming completes, Express saves the final assistant message and citations in Supabase.
9. On refresh, the frontend reloads the persisted messages and citations from Supabase-backed API responses.

## OpenAI usage

OpenAI is used in two places:

- Embeddings: convert document chunks and user questions into vectors for retrieval
- Answer generation: generate a grounded answer only from the retrieved chunks, then stream the answer back token by token

This keeps answers tied to the uploaded document instead of answering from general model memory.

## Realtime / sockets

- Express hosts a WebSocket server on `/ws`
- The client connects with the app JWT token
- The client subscribes to chat IDs
- Express pushes document status updates and message streaming updates to only the subscribed chats

This is what makes the sidebar and active chat update in real time during upload, indexing, and answer streaming.

## Frontend structure

The frontend follows an Atomic Design style:

- `atoms`: smallest UI pieces
- `molecules`: small grouped controls
- `organisms`: larger blocks like sidebar, source panel, message list
- `templates`: page layouts such as the chat layout
- `pages`: route-level screens such as home, callback, chat

There is also a generated `components/ui` layer for shared UI primitives.

## Citations

- Citations are generated from the retrieved chunks
- They are stored with assistant messages
- Clicking a citation opens the right-side source panel
- The panel shows the excerpt and navigates the PDF viewer to the cited page

## Auth

- Frontend signs in with Supabase OAuth
- Express exchanges the Supabase session for the app JWT
- The app JWT is used for protected API calls and the WebSocket connection
- Role-based access control is enforced for actions like upload

## Audit logging

Express records audit logs for important actions, including:

- login
- logout
- file upload
- chat message submission
- viewing chat messages

## Testing

- Frontend browser flow is covered with Playwright
- Main spec: `legal-mind-fe/tests/grounded-chat.spec.ts`
- It simulates login, document upload, question submission, grounded answer rendering, and citation opening

## Mental model

Use Express as the system coordinator:

- auth
- uploads
- database
- websocket events
- persistence

Use Python as the document and AI worker:

- parse PDFs
- create embeddings
- stream answers

Use the frontend as the thin client:

- upload files
- send questions
- render streamed messages
- show citations and PDF context
