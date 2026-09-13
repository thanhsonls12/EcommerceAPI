ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

CREATE INDEX IF NOT EXISTS "Product_searchVector_idx"
ON "Product"
USING GIN ("searchVector");

CREATE OR REPLACE FUNCTION refresh_product_search_vector(target_product_id integer)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE "Product" p
  SET "searchVector" =
    setweight(to_tsvector('simple', coalesce(p.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(b.name, '')), 'B') ||
    setweight(
      to_tsvector(
        'simple',
        coalesce(
          (
            SELECT string_agg(c.name, ' ')
            FROM "_CategoryToProduct" cp
            JOIN "Category" c
              ON c.id = cp."A"
            WHERE cp."B" = p.id
              AND c."deletedAt" IS NULL
          ),
          ''
        )
      ),
      'C'
    )
  FROM "Brand" b
  WHERE p.id = target_product_id
    AND b.id = p."brandId";
END;
$$;

CREATE OR REPLACE FUNCTION product_search_vector_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM refresh_product_search_vector(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION product_category_search_vector_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_product_search_vector(OLD."B");
    RETURN OLD;
  END IF;

  PERFORM refresh_product_search_vector(NEW."B");

  IF TG_OP = 'UPDATE' AND OLD."B" <> NEW."B" THEN
    PERFORM refresh_product_search_vector(OLD."B");
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION brand_search_vector_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  product_row record;
BEGIN
  FOR product_row IN
    SELECT id
    FROM "Product"
    WHERE "brandId" = NEW.id
  LOOP
    PERFORM refresh_product_search_vector(product_row.id);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION category_search_vector_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  product_row record;
BEGIN
  FOR product_row IN
    SELECT cp."B" AS id
    FROM "_CategoryToProduct" cp
    WHERE cp."A" = NEW.id
  LOOP
    PERFORM refresh_product_search_vector(product_row.id);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_search_vector_refresh ON "Product";
CREATE TRIGGER product_search_vector_refresh
AFTER INSERT OR UPDATE OF name, "brandId"
ON "Product"
FOR EACH ROW
EXECUTE FUNCTION product_search_vector_trigger();

DROP TRIGGER IF EXISTS product_category_search_vector_refresh ON "_CategoryToProduct";
CREATE TRIGGER product_category_search_vector_refresh
AFTER INSERT OR UPDATE OR DELETE
ON "_CategoryToProduct"
FOR EACH ROW
EXECUTE FUNCTION product_category_search_vector_trigger();

DROP TRIGGER IF EXISTS brand_search_vector_refresh ON "Brand";
CREATE TRIGGER brand_search_vector_refresh
AFTER UPDATE OF name
ON "Brand"
FOR EACH ROW
EXECUTE FUNCTION brand_search_vector_trigger();

DROP TRIGGER IF EXISTS category_search_vector_refresh ON "Category";
CREATE TRIGGER category_search_vector_refresh
AFTER UPDATE OF name, "deletedAt"
ON "Category"
FOR EACH ROW
EXECUTE FUNCTION category_search_vector_trigger();

SELECT refresh_product_search_vector(id)
FROM "Product";
