-- Unique constraint on purchases for idempotent webhook upserts and per-user/product uniqueness.
ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_user_product_env_unique UNIQUE (user_id, product_id, environment);
