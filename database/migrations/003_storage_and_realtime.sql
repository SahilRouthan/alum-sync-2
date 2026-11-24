-- AlumSync Storage Buckets, Realtime Publication & Base Skills Seed
-- Run after 002_rls_policies.sql

-- Create Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('resumes', 'resumes', FALSE, 10485760, ARRAY['application/pdf']),
  ('avatars', 'avatars', TRUE, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for resumes (private per student folder <user_id>/<filename>)
CREATE POLICY "Students upload own resumes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Students and admins read own resumes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.get_user_role(auth.uid()) = 'admin'
    )
  );

CREATE POLICY "Students delete own resumes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS for avatars (public read, owner upload/update/delete)
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Enable Realtime on messaging & notifications tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Seed core skills taxonomy for consistent normalization
INSERT INTO public.skills (name, normalized_name, category) VALUES
  ('JavaScript', 'javascript', 'technical'),
  ('TypeScript', 'typescript', 'technical'),
  ('Python', 'python', 'technical'),
  ('Java', 'java', 'technical'),
  ('C++', 'c++', 'technical'),
  ('React', 'react', 'technical'),
  ('Node.js', 'node.js', 'technical'),
  ('Express.js', 'express.js', 'technical'),
  ('Next.js', 'next.js', 'technical'),
  ('SQL', 'sql', 'technical'),
  ('PostgreSQL', 'postgresql', 'technical'),
  ('MongoDB', 'mongodb', 'technical'),
  ('Tailwind CSS', 'tailwind css', 'technical'),
  ('HTML5', 'html5', 'technical'),
  ('CSS3', 'css3', 'technical'),
  ('Docker', 'docker', 'tool'),
  ('Kubernetes', 'kubernetes', 'tool'),
  ('AWS', 'aws', 'tool'),
  ('Google Cloud', 'google cloud', 'tool'),
  ('Git', 'git', 'tool'),
  ('Machine Learning', 'machine learning', 'technical'),
  ('Deep Learning', 'deep learning', 'technical'),
  ('Natural Language Processing', 'natural language processing', 'technical'),
  ('Data Analysis', 'data analysis', 'technical'),
  ('System Design', 'system design', 'domain'),
  ('REST APIs', 'rest apis', 'technical'),
  ('GraphQL', 'graphql', 'technical'),
  ('Product Management', 'product management', 'domain'),
  ('Agile', 'agile', 'domain'),
  ('UI/UX Design', 'ui/ux design', 'domain'),
  ('Communication', 'communication', 'soft'),
  ('Leadership', 'leadership', 'soft'),
  ('Problem Solving', 'problem solving', 'soft'),
  ('Teamwork', 'teamwork', 'soft'),
  ('Public Speaking', 'public speaking', 'soft'),
  ('Project Management', 'project management', 'soft'),
  ('Critical Thinking', 'critical thinking', 'soft')
ON CONFLICT (normalized_name) DO NOTHING;
