-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_articles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mp_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pic_url" TEXT NOT NULL,
    "publish_time" INTEGER NOT NULL,
    "content" TEXT,
    "is_crawled" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_articles" ("created_at", "id", "mp_id", "pic_url", "publish_time", "title", "updated_at") SELECT "created_at", "id", "mp_id", "pic_url", "publish_time", "title", "updated_at" FROM "articles";
DROP TABLE "articles";
ALTER TABLE "new_articles" RENAME TO "articles";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
