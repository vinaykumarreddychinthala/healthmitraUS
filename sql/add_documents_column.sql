-- Add documents column to reimbursement_claims if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'reimbursement_claims' 
        AND column_name = 'documents'
    ) THEN
        ALTER TABLE reimbursement_claims 
        ADD COLUMN documents JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
