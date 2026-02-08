
-- Create enum for document categories
CREATE TYPE public.document_category AS ENUM ('building', 'insurance', 'unit');

-- Create enum for document status
CREATE TYPE public.document_status AS ENUM ('active', 'expired', 'expiring_soon', 'archived');

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category document_category NOT NULL,
  status document_status NOT NULL DEFAULT 'active',
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  expires_at DATE,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Building admins can manage documents"
ON public.documents FOR ALL
USING (is_building_admin(auth.uid(), building_id));

CREATE POLICY "Members and admins can view documents"
ON public.documents FOR SELECT
USING (
  is_building_member(auth.uid(), building_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Unit residents can manage their unit documents"
ON public.documents FOR ALL
USING (
  category = 'unit'
  AND unit_id IS NOT NULL
  AND is_unit_resident(auth.uid(), unit_id)
);

-- Updated_at trigger
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Document owners can delete files"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);
