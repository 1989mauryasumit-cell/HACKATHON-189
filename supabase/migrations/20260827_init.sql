-- ==============================================================================
-- KRAKEN NETWORK ANALYSIS SYSTEM - DATABASE INIT MIGRATION
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZATIONS
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    jurisdiction TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. PROFILES (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY, -- Maps directly to auth.users.id
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    badge_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('viewer', 'investigator', 'supervisor', 'admin')),
    phone TEXT,
    mfa_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. CASES
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    case_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('open', 'active', 'pending_review', 'closed', 'archived')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. DOCUMENTS
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('fir', 'cdr', 'transaction', 'surveillance', 'social_media', 'criminal_history', 'intel_report')),
    title TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    file_url TEXT,
    file_hash TEXT NOT NULL, -- SHA-256
    file_size INTEGER,
    mime_type TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'queued', 'processing', 'processed', 'failed')),
    error_message TEXT,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    retention_until TIMESTAMP WITH TIME ZONE,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. ENTITIES
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'phone', 'vehicle', 'organization', 'location', 'bank_account', 'event')),
    canonical_name TEXT NOT NULL,
    aliases JSONB DEFAULT '[]'::jsonb NOT NULL,
    attributes JSONB DEFAULT '{}'::jsonb NOT NULL,
    risk_score NUMERIC DEFAULT 0 NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_breakdown JSONB DEFAULT '{}'::jsonb NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    merged_into_id UUID REFERENCES entities(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. ENTITY MENTIONS
CREATE TABLE entity_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    surface_text TEXT NOT NULL,
    char_start INTEGER NOT NULL,
    char_end INTEGER NOT NULL,
    confidence NUMERIC DEFAULT 1.0 NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    extraction_method TEXT NOT NULL CHECK (extraction_method IN ('regex', 'llm', 'manual')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. RELATIONSHIPS
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL CHECK (relation_type IN ('called', 'messaged', 'transacted_with', 'associate_of', 'located_at', 'owns', 'present_at', 'family_of', 'employed_by')),
    weight NUMERIC DEFAULT 1.0 NOT NULL,
    confidence NUMERIC DEFAULT 1.0 NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    first_seen TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE,
    occurrence_count INTEGER DEFAULT 1 NOT NULL,
    evidence JSONB DEFAULT '[]'::jsonb NOT NULL, -- Array of document IDs
    inference_method TEXT NOT NULL CHECK (inference_method IN ('extracted', 'predicted', 'manual')),
    status TEXT NOT NULL CHECK (status IN ('ai_suggested', 'confirmed', 'rejected')),
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. ENTITY METRICS
CREATE TABLE entity_metrics (
    entity_id UUID PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
    degree INTEGER DEFAULT 0 NOT NULL,
    weighted_degree NUMERIC DEFAULT 0.0 NOT NULL,
    betweenness NUMERIC DEFAULT 0.0 NOT NULL,
    pagerank NUMERIC DEFAULT 0.0 NOT NULL,
    closeness NUMERIC DEFAULT 0.0 NOT NULL,
    eigenvector NUMERIC DEFAULT 0.0 NOT NULL,
    community_id INTEGER DEFAULT 0 NOT NULL,
    k_core INTEGER DEFAULT 0 NOT NULL,
    clustering_coefficient NUMERIC DEFAULT 0.0 NOT NULL,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 9. ALERTS
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    explanation TEXT NOT NULL,
    entity_ids JSONB DEFAULT '[]'::jsonb NOT NULL,
    evidence JSONB DEFAULT '[]'::jsonb NOT NULL,
    confidence NUMERIC DEFAULT 1.0 NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    status TEXT NOT NULL CHECK (status IN ('new', 'acknowledged', 'investigating', 'dismissed', 'escalated')),
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 10. CASE ENTITIES (Join table)
CREATE TABLE case_entities (
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    relevance_note TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (case_id, entity_id)
);

-- 11. WATCHLISTS
CREATE TABLE watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notify_on_activity BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 12. WATCHLIST ENTITIES (Join table)
CREATE TABLE watchlist_entities (
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (watchlist_id, entity_id)
);

-- 13. NOTES
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type TEXT NOT NULL CHECK (target_type IN ('entity', 'case', 'alert', 'relationship')),
    target_id UUID NOT NULL,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    mentioned_user_ids JSONB DEFAULT '[]'::jsonb NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 14. SAVED VIEWS
CREATE TABLE saved_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    page TEXT NOT NULL,
    filters JSONB DEFAULT '{}'::jsonb NOT NULL,
    is_shared BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 15. NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 16. REPORT EXPORTS
CREATE TABLE report_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('pdf', 'csv', 'json', 'graphml')),
    file_url TEXT NOT NULL,
    parameters JSONB DEFAULT '{}'::jsonb NOT NULL,
    generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 17. API KEYS
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    scopes JSONB DEFAULT '[]'::jsonb NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 18. AUDIT LOG (Append-only. No updates/deletes permitted)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    details JSONB DEFAULT '{}'::jsonb NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE & JOIN OPTIMIZATION
-- ==============================================================================

-- Foreign Key Indexes
CREATE INDEX idx_profiles_org ON profiles(organization_id);
CREATE INDEX idx_cases_org ON cases(organization_id);
CREATE INDEX idx_cases_assigned ON cases(assigned_to);
CREATE INDEX idx_documents_org ON documents(organization_id);
CREATE INDEX idx_documents_case ON documents(case_id);
CREATE INDEX idx_entities_org ON entities(organization_id);
CREATE INDEX idx_entities_merged ON entities(merged_into_id) WHERE merged_into_id IS NOT NULL;
CREATE INDEX idx_mentions_entity ON entity_mentions(entity_id);
CREATE INDEX idx_mentions_doc ON entity_mentions(document_id);
CREATE INDEX idx_relationships_org ON relationships(organization_id);
CREATE INDEX idx_relationships_source ON relationships(source_entity_id);
CREATE INDEX idx_relationships_target ON relationships(target_entity_id);
CREATE INDEX idx_alerts_org ON alerts(organization_id);
CREATE INDEX idx_alerts_case ON alerts(case_id);
CREATE INDEX idx_watchlists_org ON watchlists(organization_id);
CREATE INDEX idx_audit_org ON audit_log(organization_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);

-- Filter and Full-Text Indexes
CREATE INDEX idx_entities_name_trgm ON entities USING gin (canonical_name gin_trgm_ops);
CREATE INDEX idx_documents_hash ON documents(file_hash);

-- Timestamp filtering indexes
CREATE INDEX idx_documents_created ON documents(created_at);
CREATE INDEX idx_relationships_last_seen ON relationships(last_seen);
CREATE INDEX idx_alerts_detected ON alerts(detected_at);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- Prevent update/delete on audit_log table
CREATE OR REPLACE FUNCTION block_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Updates and deletions are strictly prohibited on the immutable audit_log table.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_audit_log_modification
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION block_audit_log_modification();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function to fetch the user's organization_id from profiles
CREATE OR REPLACE FUNCTION get_user_organization()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id FROM profiles WHERE id = auth.uid();
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organization-level isolation policies (User can only access rows belonging to their organization)
CREATE POLICY org_isolation_organizations ON organizations
    FOR ALL USING (id = get_user_organization());

CREATE POLICY org_isolation_profiles ON profiles
    FOR ALL USING (organization_id = get_user_organization());

CREATE POLICY org_isolation_cases ON cases
    FOR ALL USING (organization_id = get_user_organization());

CREATE POLICY org_isolation_documents ON documents
    FOR ALL USING (organization_id = get_user_organization());

CREATE POLICY org_isolation_entities ON entities
    FOR ALL USING (organization_id = get_user_organization());

-- For entity mentions, we join through entities to verify organization
CREATE POLICY org_isolation_entity_mentions ON entity_mentions
    FOR ALL USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization()
        )
    );

CREATE POLICY org_isolation_relationships ON relationships
    FOR ALL USING (organization_id = get_user_organization());

CREATE POLICY org_isolation_entity_metrics ON entity_metrics
    FOR ALL USING (
        entity_id IN (
            SELECT id FROM entities WHERE organization_id = get_user_organization()
        )
    );

CREATE POLICY org_isolation_alerts ON alerts
    FOR ALL USING (organization_id = get_user_organization());

CREATE POLICY org_isolation_case_entities ON case_entities
    FOR ALL USING (
        case_id IN (
            SELECT id FROM cases WHERE organization_id = get_user_organization()
        )
    );

CREATE POLICY org_isolation_watchlists ON watchlists
    FOR ALL USING (organization_id = get_user_organization());

CREATE POLICY org_isolation_watchlist_entities ON watchlist_entities
    FOR ALL USING (
        watchlist_id IN (
            SELECT id FROM watchlists WHERE organization_id = get_user_organization()
        )
    );

-- Notes RLS policy: author must belong to the user's organization
CREATE POLICY org_isolation_notes ON notes
    FOR ALL USING (
        author_id IN (
            SELECT id FROM profiles WHERE organization_id = get_user_organization()
        )
    );

CREATE POLICY org_isolation_saved_views ON saved_views
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY org_isolation_notifications ON notifications
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY org_isolation_report_exports ON report_exports
    FOR ALL USING (
        case_id IN (
            SELECT id FROM cases WHERE organization_id = get_user_organization()
        )
    );

CREATE POLICY org_isolation_api_keys ON api_keys
    FOR ALL USING (organization_id = get_user_organization());

CREATE POLICY org_isolation_audit_log ON audit_log
    FOR ALL USING (organization_id = get_user_organization());
