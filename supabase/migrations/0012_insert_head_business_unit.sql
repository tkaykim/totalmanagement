-- Add HEAD value to bu_code enum
-- Note: Enum value additions must be committed in a separate transaction
-- before they can be used in subsequent migrations
ALTER TYPE bu_code ADD VALUE 'HEAD';

