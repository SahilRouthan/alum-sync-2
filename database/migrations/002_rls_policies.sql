-- AlumSync Row Level Security (RLS) Policies & Role Helpers
-- Run after 001_initial_schema.sql

-- Helper function to check current user's role safely
CREATE OR REPLACE FUNCTION public.get_user_role(uid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = uid LIMIT 1;
$$;

-- Trigger function: automatically provision profile & role sub-profile on auth.users insert
-- Note: Public signup restricts role to 'student' or 'alumni'; 'admin' must be provisioned via service role / existing admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role TEXT;
  safe_role TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_full_name TEXT;
BEGIN
  requested_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'student'));
  IF requested_role IN ('student', 'alumni') THEN
    safe_role := requested_role;
  ELSE
    safe_role := 'student';
  END IF;

  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  v_full_name := TRIM(CONCAT(v_first_name, ' ', v_last_name));
  IF v_full_name = '' THEN
    v_full_name := SPLIT_PART(NEW.email, '@', 1);
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name, full_name, role)
  VALUES (NEW.id, LOWER(NEW.email), v_first_name, v_last_name, v_full_name, safe_role)
  ON CONFLICT (id) DO NOTHING;

  IF safe_role = 'student' THEN
    INSERT INTO public.student_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF safe_role = 'alumni' THEN
    -- Link to existing CSV-imported alumni record if email matches, else create new pending record
    UPDATE public.alumni_profiles
      SET user_id = NEW.id,
          full_name = CASE WHEN COALESCE(full_name, '') = '' THEN v_full_name ELSE full_name END
      WHERE LOWER(email) = LOWER(NEW.email) AND user_id IS NULL;

    IF NOT FOUND THEN
      INSERT INTO public.alumni_profiles (user_id, email, full_name, is_verified, verification_status)
      VALUES (NEW.id, LOWER(NEW.email), v_full_name, FALSE, 'pending')
      ON CONFLICT (email) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_import_history ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Authenticated users can view active profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (is_active = TRUE OR id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can update own non-role profile fields"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (
    (id = auth.uid() AND role = public.get_user_role(auth.uid()))
    OR public.get_user_role(auth.uid()) = 'admin'
  );

-- STUDENT PROFILES
CREATE POLICY "Students view own or alumni/admin view student profiles"
  ON public.student_profiles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('alumni', 'admin')
  );

CREATE POLICY "Students manage own student profile"
  ON public.student_profiles FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (user_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

-- ALUMNI PROFILES
CREATE POLICY "Verified alumni visible to authenticated users; own or admin visible always"
  ON public.alumni_profiles FOR SELECT
  TO authenticated
  USING (
    is_verified = TRUE
    OR user_id = auth.uid()
    OR public.get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Alumni update own profile without self-verifying"
  ON public.alumni_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'admin'
    OR (
      user_id = auth.uid()
      AND is_verified = (SELECT ap.is_verified FROM public.alumni_profiles ap WHERE ap.id = alumni_profiles.id)
    )
  );

CREATE POLICY "Admins insert or delete alumni profiles"
  ON public.alumni_profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin' OR user_id = auth.uid());

CREATE POLICY "Admins delete alumni profiles"
  ON public.alumni_profiles FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- ADMIN PROFILES
CREATE POLICY "Only admins can view and manage admin profiles"
  ON public.admin_profiles FOR ALL
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- SKILLS & USER_SKILLS
CREATE POLICY "Authenticated users read skills"
  ON public.skills FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users insert skills"
  ON public.skills FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users read user_skills"
  ON public.user_skills FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users manage own skills or admins manage all"
  ON public.user_skills FOR ALL
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR alumni_profile_id IN (SELECT id FROM public.alumni_profiles WHERE user_id = auth.uid())
    OR public.get_user_role(auth.uid()) = 'admin'
  )
  WITH CHECK (
    profile_id = auth.uid()
    OR alumni_profile_id IN (SELECT id FROM public.alumni_profiles WHERE user_id = auth.uid())
    OR public.get_user_role(auth.uid()) = 'admin'
  );

-- RESUMES & RESUME ANALYSIS
CREATE POLICY "Students view own resumes; admins view all"
  ON public.resumes FOR SELECT
  TO authenticated
  USING (student_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Students manage own resumes"
  ON public.resumes FOR ALL
  TO authenticated
  USING (student_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (student_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Students view own resume analysis; admins view all"
  ON public.resume_analysis FOR SELECT
  TO authenticated
  USING (student_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Students manage own resume analysis"
  ON public.resume_analysis FOR ALL
  TO authenticated
  USING (student_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (student_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

-- MENTORSHIP REQUESTS & CONNECTIONS
CREATE POLICY "Participants and admins view mentorship requests"
  ON public.mentorship_requests FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR alumni_user_id = auth.uid()
    OR alumni_id IN (SELECT id FROM public.alumni_profiles WHERE user_id = auth.uid())
    OR public.get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Students create mentorship requests"
  ON public.mentorship_requests FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Participants and admins update mentorship requests"
  ON public.mentorship_requests FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
    OR alumni_user_id = auth.uid()
    OR alumni_id IN (SELECT id FROM public.alumni_profiles WHERE user_id = auth.uid())
    OR public.get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Participants and admins view mentorship connections"
  ON public.mentorship_connections FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR alumni_user_id = auth.uid()
    OR alumni_id IN (SELECT id FROM public.alumni_profiles WHERE user_id = auth.uid())
    OR public.get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Participants and admins manage mentorship connections"
  ON public.mentorship_connections FOR ALL
  TO authenticated
  USING (
    student_id = auth.uid()
    OR alumni_user_id = auth.uid()
    OR public.get_user_role(auth.uid()) = 'admin'
  );

-- CONVERSATIONS & MESSAGES
CREATE POLICY "Participants view own conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (participant_one = auth.uid() OR participant_two = auth.uid());

CREATE POLICY "Participants create conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (participant_one = auth.uid() OR participant_two = auth.uid());

CREATE POLICY "Participants update own conversations"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (participant_one = auth.uid() OR participant_two = auth.uid());

CREATE POLICY "Participants view messages in their conversations"
  ON public.messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users send messages as themselves"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Receivers mark messages read"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid());

-- COMMUNITY POSTS, COMMENTS, LIKES
CREATE POLICY "Authenticated users read approved posts or own/admin"
  ON public.community_posts FOR SELECT
  TO authenticated
  USING (is_approved = TRUE OR author_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Authenticated users create posts"
  ON public.community_posts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors or admins update/delete posts"
  ON public.community_posts FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Authors or admins delete posts"
  ON public.community_posts FOR DELETE
  TO authenticated
  USING (author_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Authenticated users read comments"
  ON public.post_comments FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users create comments"
  ON public.post_comments FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors or admins delete comments"
  ON public.post_comments FOR DELETE
  TO authenticated
  USING (author_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Authenticated users read likes"
  ON public.post_likes FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users manage own likes"
  ON public.post_likes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- EVENTS & REGISTRATIONS
CREATE POLICY "Authenticated users view events"
  ON public.events FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Alumni and admins create events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) IN ('alumni', 'admin') AND organizer_id = auth.uid());

CREATE POLICY "Organizers or admins update/delete events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (organizer_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Organizers or admins delete events"
  ON public.events FOR DELETE
  TO authenticated
  USING (organizer_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Authenticated users view event registrations"
  ON public.event_registrations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users manage own event registrations"
  ON public.event_registrations FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (user_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

-- JOB OPPORTUNITIES
CREATE POLICY "Authenticated users view active jobs"
  ON public.job_opportunities FOR SELECT
  TO authenticated
  USING (is_active = TRUE OR posted_by = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Alumni and admins create jobs"
  ON public.job_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) IN ('alumni', 'admin') AND posted_by = auth.uid());

CREATE POLICY "Posters or admins update/delete jobs"
  ON public.job_opportunities FOR UPDATE
  TO authenticated
  USING (posted_by = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Posters or admins delete jobs"
  ON public.job_opportunities FOR DELETE
  TO authenticated
  USING (posted_by = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

-- NOTIFICATIONS
CREATE POLICY "Users view and update own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users mark own notifications read"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- IMPORT HISTORY (ADMIN ONLY)
CREATE POLICY "Only admins view import history"
  ON public.alumni_import_history FOR ALL
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');
