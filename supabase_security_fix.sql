-- ============================================
-- SUPABASE SECURITY FIX
-- Enables Row Level Security (RLS) on all tables
-- and creates policies for authenticated users only
-- ============================================

-- ============================================
-- 1. PATIENTS TABLE
-- Contains: Personal information, medical records, images
-- Sensitivity: HIGH
-- ============================================

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.patients;
DROP POLICY IF EXISTS "Enable read for authenticated users only" ON public.patients;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.patients;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.patients;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.patients;

-- Create comprehensive policy for authenticated users
CREATE POLICY "Enable all operations for authenticated users only" 
ON public.patients
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Block anonymous access completely
CREATE POLICY "Block anonymous access" 
ON public.patients
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- ============================================
-- 2. APPOINTMENTS TABLE
-- Contains: Medical appointments, patient IDs, notes
-- Sensitivity: HIGH
-- ============================================

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.appointments;
DROP POLICY IF EXISTS "Enable read for authenticated users only" ON public.appointments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.appointments;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.appointments;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.appointments;

-- Create comprehensive policy for authenticated users
CREATE POLICY "Enable all operations for authenticated users only" 
ON public.appointments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Block anonymous access completely
CREATE POLICY "Block anonymous access" 
ON public.appointments
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- ============================================
-- 3. PAYMENTS TABLE
-- Contains: Financial records, payment amounts
-- Sensitivity: VERY HIGH
-- ============================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Enable read for authenticated users only" ON public.payments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.payments;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.payments;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.payments;

-- Create comprehensive policy for authenticated users
CREATE POLICY "Enable all operations for authenticated users only" 
ON public.payments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Block anonymous access completely
CREATE POLICY "Block anonymous access" 
ON public.payments
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- ============================================
-- 4. INVENTORY TABLE
-- Contains: Supply inventory, stock levels
-- Sensitivity: MEDIUM
-- ============================================

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.inventory;
DROP POLICY IF EXISTS "Enable read for authenticated users only" ON public.inventory;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.inventory;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.inventory;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.inventory;

-- Create comprehensive policy for authenticated users
CREATE POLICY "Enable all operations for authenticated users only" 
ON public.inventory
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Block anonymous access completely
CREATE POLICY "Block anonymous access" 
ON public.inventory
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- ============================================
-- 5. STORAGE BUCKET: patient-files
-- Contains: Medical images, patient documents
-- Sensitivity: VERY HIGH
-- ============================================

-- Enable RLS on the storage bucket
UPDATE storage.buckets SET public = false WHERE id = 'patient-files';

-- Drop existing storage policies if any
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable read for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Enable upload for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON storage.objects;

-- Create policy for the patient-files bucket - authenticated users only
CREATE POLICY "Enable all operations for authenticated users on patient-files" 
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'patient-files')
WITH CHECK (bucket_id = 'patient-files');

-- Block anonymous access to patient-files
CREATE POLICY "Block anonymous access to patient-files" 
ON storage.objects
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- ============================================
-- VERIFICATION QUERIES
-- Run these to confirm RLS is enabled
-- ============================================

-- Check RLS status on all tables (using pg_class for better compatibility)
SELECT 
    n.nspname as schemaname,
    c.relname as tablename,
    c.relrowsecurity as rowsecurity_enabled,
    c.relforcerowsecurity as force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname IN ('patients', 'appointments', 'payments', 'inventory')
AND n.nspname = 'public'
AND c.relkind = 'r';  -- 'r' = ordinary table

-- Check policies on all tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles::text,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('patients', 'appointments', 'payments', 'inventory')
AND schemaname = 'public';
