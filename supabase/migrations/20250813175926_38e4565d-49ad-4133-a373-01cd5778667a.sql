-- Add view_token column to runs table
ALTER TABLE public.runs ADD COLUMN view_token text;

-- Enable Row Level Security on runs and jobs tables
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for runs table
CREATE POLICY "Allow read access to runs with matching view_token" 
ON public.runs 
FOR SELECT 
USING (
  COALESCE(auth.jwt() ->> 'view_token', '') = view_token
);

-- Create RLS policies for jobs table
CREATE POLICY "Allow read access to jobs with matching view_token" 
ON public.jobs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.runs 
    WHERE runs.run_id = jobs.run_id 
    AND runs.view_token = COALESCE(auth.jwt() ->> 'view_token', '')
  )
);

-- Enable realtime for both tables
ALTER TABLE public.runs REPLICA IDENTITY FULL;
ALTER TABLE public.jobs REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;