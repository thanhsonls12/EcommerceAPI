CREATE TABLE "ProductMedia" (
    "id" SERIAL NOT NULL,
    "url" VARCHAR(1000) NOT NULL,
    "storageKey" VARCHAR(1000),
    "type" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "productId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductMedia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductMedia_productId_idx" ON "ProductMedia"("productId");

ALTER TABLE "ProductMedia"
ADD CONSTRAINT "ProductMedia_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

INSERT INTO "ProductMedia" ("url", "storageKey", "type", "productId")
SELECT
    image_url,
    CASE
        WHEN image_url LIKE '%/storage/v1/object/public/%'
            THEN regexp_replace(image_url, '^.*/storage/v1/object/public/[^/]+/', '')
        ELSE NULL
    END,
    'IMAGE'::"MediaType",
    product.id
FROM "Product" product
CROSS JOIN LATERAL unnest(product.images) AS image_url;
