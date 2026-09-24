-- PostgreSQL requires a newly added enum value to be committed before it is
-- referenced by later DML, so the DEETZ enum addition is intentionally isolated.
alter type public.bu_code add value if not exists 'DEETZ' after 'GRIGO';
