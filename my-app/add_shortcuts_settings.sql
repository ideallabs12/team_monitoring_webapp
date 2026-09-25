-- Add JSONB column for shortcut settings with a default value
ALTER TABLE public.system_settings
ADD COLUMN IF NOT EXISTS shortcuts_config JSONB DEFAULT '{"enabled": true, "u": true, "t": true, "r": true, "s": true, "d": true, "m": true, "a": true, "l": true}'::jsonb;
