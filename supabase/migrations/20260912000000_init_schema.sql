-- ==============================================================================
-- SupplyGuard Supabase Database Migration
-- Table: public.scans
-- Security: Row Level Security (RLS) enabled
-- Functions: save_scan_record, get_scan_by_id, get_user_scans
-- ==============================================================================

-- Create scans table if it does not exist
CREATE TABLE IF NOT EXISTS public.scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    repository_url TEXT,
    owner TEXT,
    repository TEXT,
    branch TEXT DEFAULT 'HEAD',
    subpath TEXT,
    status TEXT NOT NULL DEFAULT 'queued',
    status_message TEXT,
    dependency_count INTEGER DEFAULT 0,
    overall_risk_score NUMERIC(5, 2) DEFAULT 0,
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    safe_count INTEGER DEFAULT 0,
    raw_result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_scan_id ON public.scans(scan_id);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON public.scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_user_created ON public.scans(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own scans
DROP POLICY IF EXISTS "Users can view their own scans" ON public.scans;
CREATE POLICY "Users can view their own scans"
    ON public.scans
    FOR SELECT
    USING (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claim.sub', true));

-- Users can insert/update their own scans or service role
DROP POLICY IF EXISTS "Users can insert their own scans" ON public.scans;
CREATE POLICY "Users can insert their own scans"
    ON public.scans
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claim.sub', true));

DROP POLICY IF EXISTS "Users can update their own scans" ON public.scans;
CREATE POLICY "Users can update their own scans"
    ON public.scans
    FOR UPDATE
    USING (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claim.sub', true));

-- ==============================================================================
-- RPC Functions for Backend API (Definer privileges to ensure reliable ingestion)
-- ==============================================================================

-- 1. save_scan_record
CREATE OR REPLACE FUNCTION public.save_scan_record(payload JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.scans (
        scan_id,
        user_id,
        repository_url,
        owner,
        repository,
        branch,
        subpath,
        status,
        status_message,
        dependency_count,
        overall_risk_score,
        critical_count,
        high_count,
        medium_count,
        low_count,
        safe_count,
        raw_result,
        completed_at
    )
    VALUES (
        payload->>'scan_id',
        payload->>'user_id',
        payload->>'repository_url',
        payload->>'owner',
        payload->>'repository',
        COALESCE(payload->>'branch', 'HEAD'),
        payload->>'subpath',
        COALESCE(payload->>'status', 'queued'),
        payload->>'status_message',
        COALESCE((payload->>'dependency_count')::INTEGER, 0),
        COALESCE((payload->>'overall_risk_score')::NUMERIC, 0),
        COALESCE((payload->>'critical_count')::INTEGER, 0),
        COALESCE((payload->>'high_count')::INTEGER, 0),
        COALESCE((payload->>'medium_count')::INTEGER, 0),
        COALESCE((payload->>'low_count')::INTEGER, 0),
        COALESCE((payload->>'safe_count')::INTEGER, 0),
        payload->'raw_result',
        (payload->>'completed_at')::TIMESTAMPTZ
    )
    ON CONFLICT (scan_id) DO UPDATE SET
        repository_url = EXCLUDED.repository_url,
        owner = EXCLUDED.owner,
        repository = EXCLUDED.repository,
        branch = EXCLUDED.branch,
        subpath = EXCLUDED.subpath,
        status = EXCLUDED.status,
        status_message = EXCLUDED.status_message,
        dependency_count = EXCLUDED.dependency_count,
        overall_risk_score = EXCLUDED.overall_risk_score,
        critical_count = EXCLUDED.critical_count,
        high_count = EXCLUDED.high_count,
        medium_count = EXCLUDED.medium_count,
        low_count = EXCLUDED.low_count,
        safe_count = EXCLUDED.safe_count,
        raw_result = EXCLUDED.raw_result,
        completed_at = EXCLUDED.completed_at;
END;
$$;

-- 2. get_scan_by_id
CREATE OR REPLACE FUNCTION public.get_scan_by_id(p_scan_id TEXT, p_user_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_raw_result JSONB;
BEGIN
    SELECT raw_result INTO v_raw_result
    FROM public.scans
    WHERE scan_id = p_scan_id AND user_id = p_user_id;

    RETURN v_raw_result;
END;
$$;

-- 3. get_user_scans
CREATE OR REPLACE FUNCTION public.get_user_scans(p_user_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_scans JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(raw_result ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_scans
    FROM public.scans
    WHERE user_id = p_user_id;

    RETURN v_scans;
END;
$$;
