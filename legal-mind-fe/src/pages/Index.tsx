import { toast } from "sonner";
import { ChatLayout } from "@/components/templates/ChatLayout";
import type { AttachedFile } from "@/components/organisms/ChatComposer";
import { useAuth } from "@/hooks/useAuth";
import { useUploadPresignedParts } from "@/hooks/useMultipartUpload";

const Index = () => {
  const { canUpload } = useAuth();
  const { mutate: uploadFile } = useUploadPresignedParts();

  const handleUploadDocument = (file: AttachedFile) => {
    if (!canUpload) {
      toast.error("Upload is restricted to Admin and Partner roles.");
      return;
    }

    toast.info(`Uploading ${file.name}...`);

    uploadFile(
      {
        file: file.file,
      },
      {
        onSuccess: () => {
          toast.success(`${file.name} uploaded. Indexing has started.`);
        },
        onError: () => {
          toast.error(`Failed to upload ${file.name}.`);
        },
      }
    );
  };

  return <ChatLayout onUploadDocument={handleUploadDocument} />;
};

export default Index;
