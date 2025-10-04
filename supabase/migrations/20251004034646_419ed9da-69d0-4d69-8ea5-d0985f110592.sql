-- Create integration_settings table to store Notion credentials
CREATE TABLE public.integration_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL,
  api_key TEXT,
  database_id TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, integration_type)
);

-- Enable RLS
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own integration settings"
ON public.integration_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integration settings"
ON public.integration_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integration settings"
ON public.integration_settings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integration settings"
ON public.integration_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Create sync_history table
CREATE TABLE public.sync_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL,
  sync_type TEXT NOT NULL,
  items_synced INTEGER DEFAULT 0,
  status TEXT NOT NULL,
  error_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own sync history"
ON public.sync_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync history"
ON public.sync_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_integration_settings_updated_at
BEFORE UPDATE ON public.integration_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();